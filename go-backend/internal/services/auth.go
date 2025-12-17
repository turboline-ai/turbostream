package services

import (
	"context"
	"encoding/base64"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/pquerna/otp/totp"
	"github.com/skip2/go-qrcode"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"golang.org/x/crypto/bcrypt"

	"github.com/turboline-ai/turbostream/go-backend/internal/config"
	"github.com/turboline-ai/turbostream/go-backend/internal/models"
)

// AuthService handles user authentication, sessions, and 2FA
type AuthService struct {
	cfg    config.Config
	client *mongo.Client
	db     *mongo.Database
}

// NewAuthService creates a new authentication service instance
func NewAuthService(cfg config.Config, client *mongo.Client, db *mongo.Database) *AuthService {
	return &AuthService{cfg: cfg, client: client, db: db}
}

// users returns the MongoDB users collection
func (s *AuthService) users() *mongo.Collection {
	return s.db.Collection("users")
}

// sessions returns the MongoDB sessions collection
func (s *AuthService) sessions() *mongo.Collection {
	return s.db.Collection("sessions")
}

// loginActivity returns the MongoDB login activity collection
func (s *AuthService) loginActivity() *mongo.Collection {
	return s.db.Collection("login_activity")
}

// Register creates a new user and returns a JWT + safe payload.
func (s *AuthService) Register(ctx context.Context, email, password, name string) (string, models.User, error) {
	email = strings.ToLower(strings.TrimSpace(email))
	if email == "" || password == "" {
		return "", models.User{}, errors.New("email and password required")
	}

	exists, err := s.users().CountDocuments(ctx, bson.M{"email": email})
	if err != nil {
		return "", models.User{}, err
	}
	if exists > 0 {
		return "", models.User{}, errors.New("user already exists")
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return "", models.User{}, err
	}

	now := time.Now()
	user := models.User{
		Email:     email,
		Password:  string(hash),
		Name:      name,
		CreatedAt: now,
		TokenUsage: &models.TokenUsage{
			CurrentMonth:     now.Format("2006-01"),
			TokensUsed:       0,
			Limit:            s.cfg.TokenQuotaPerMonth,
			LastResetDate:    now,
			OverdraftAllowed: true,
		},
	}

	res, err := s.users().InsertOne(ctx, user)
	if err != nil {
		return "", models.User{}, err
	}
	user.ID = res.InsertedID.(primitive.ObjectID)

	token, err := s.generateToken(user)
	return token, user, err
}

// Login authenticates a user with email/password and optional 2FA, returns JWT token
func (s *AuthService) Login(ctx context.Context, email, password, totpToken string, ip, ua string) (string, models.User, error) {
	email = strings.ToLower(strings.TrimSpace(email))
	var user models.User
	err := s.users().FindOne(ctx, bson.M{"email": email}).Decode(&user)
	if err != nil {
		return "", models.User{}, errors.New("invalid email or password")
	}

	if bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(password)) != nil {
		return "", models.User{}, errors.New("invalid email or password")
	}

	if user.TwoFactor {
		ok, err := s.verifyTotpOrBackup(ctx, user, totpToken)
		if err != nil || !ok {
			return "", user, errors.New("two-factor authentication required")
		}
	}

	now := time.Now()
	_, _ = s.users().UpdateByID(ctx, user.ID, bson.M{"$set": bson.M{"lastLogin": now}})
	_, _ = s.loginActivity().InsertOne(ctx, models.LoginActivity{
		UserID:    user.ID,
		IPAddress: ip,
		UserAgent: ua,
		Success:   true,
		Timestamp: now,
	})

	token, err := s.generateToken(user)
	if err != nil {
		return "", models.User{}, err
	}

	_ = s.createSession(ctx, user.ID, ua, ip)

	return token, user, nil
}

// generateToken creates a JWT token for the authenticated user with 7-day expiration
func (s *AuthService) generateToken(user models.User) (string, error) {
	claims := jwt.MapClaims{
		"userId":   user.ID.Hex(),
		"email":    user.Email,
		"username": user.Name,
		"exp":      time.Now().Add(7 * 24 * time.Hour).Unix(),
		"iat":      time.Now().Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(s.cfg.JWTSecret))
}

// ParseToken validates and parses a JWT token, returning the claims
func (s *AuthService) ParseToken(tokenStr string) (jwt.MapClaims, error) {
	token, err := jwt.Parse(tokenStr, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method")
		}
		return []byte(s.cfg.JWTSecret), nil
	})
	if err != nil || !token.Valid {
		return nil, errors.New("invalid token")
	}
	if claims, ok := token.Claims.(jwt.MapClaims); ok {
		return claims, nil
	}
	return nil, errors.New("invalid token payload")
}

// ChangePassword updates a user's password after verifying the current password
func (s *AuthService) ChangePassword(ctx context.Context, userID primitive.ObjectID, current, next string) error {
	var user models.User
	if err := s.users().FindOne(ctx, bson.M{"_id": userID}).Decode(&user); err != nil {
		return err
	}

	if bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(current)) != nil {
		return errors.New("current password is incorrect")
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(next), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	_, err = s.users().UpdateByID(ctx, userID, bson.M{"$set": bson.M{"password": string(hash)}})
	return err
}

// GetUser retrieves a user by ID, handles monthly token quota reset, and removes password from response
func (s *AuthService) GetUser(ctx context.Context, id primitive.ObjectID) (*models.User, error) {
	var user models.User
	if err := s.users().FindOne(ctx, bson.M{"_id": id}).Decode(&user); err != nil {
		return nil, err
	}
	user.Password = "" // Don't expose password

	// Check if the token usage needs to be reset for the new month.
	now := time.Now()
	currentMonth := now.Format("2006-01")
	if user.TokenUsage == nil {
		// If user somehow has no token usage record, create a new one.
		user.TokenUsage = &models.TokenUsage{
			CurrentMonth:     currentMonth,
			TokensUsed:       0,
			Limit:            s.cfg.TokenQuotaPerMonth,
			LastResetDate:    now,
			OverdraftAllowed: true, // Or based on some logic
		}
		// Persist the new token usage record.
		_, err := s.users().UpdateByID(ctx, user.ID, bson.M{"$set": bson.M{"tokenUsage": user.TokenUsage}})
		if err != nil {
			return nil, fmt.Errorf("failed to create token usage record: %w", err)
		}
	} else if user.TokenUsage.CurrentMonth != currentMonth {
		// Month has changed, so reset usage and update the limit.
		user.TokenUsage.CurrentMonth = currentMonth
		user.TokenUsage.TokensUsed = 0
		user.TokenUsage.LastResetDate = now
		user.TokenUsage.Limit = s.cfg.TokenQuotaPerMonth // Ensure limit is updated from config.

		// Persist the changes to the database.
		_, err := s.users().UpdateByID(ctx, user.ID, bson.M{"$set": bson.M{"tokenUsage": user.TokenUsage}})
		if err != nil {
			// If the update fails, we should probably return an error as the user's state is inconsistent.
			return nil, fmt.Errorf("failed to reset token usage: %w", err)
		}
	} else if user.TokenUsage.Limit != s.cfg.TokenQuotaPerMonth {
		// The monthly quota might have changed, so update the user's limit.
		user.TokenUsage.Limit = s.cfg.TokenQuotaPerMonth
		_, err := s.users().UpdateByID(ctx, user.ID, bson.M{"$set": bson.M{"tokenUsage.limit": user.TokenUsage.Limit}})
		if err != nil {
			return nil, fmt.Errorf("failed to update token limit: %w", err)
		}
	}

	return &user, nil
}

// UpdateTokenUsage increments the token usage counter for a user's monthly quota
func (s *AuthService) UpdateTokenUsage(ctx context.Context, userID primitive.ObjectID, tokensUsed int) error {
	_, err := s.users().UpdateByID(ctx, userID, bson.M{
		"$inc": bson.M{"tokenUsage.tokensUsed": tokensUsed},
	})
	return err
}

// TwoFactorSetup generates a TOTP secret and QR code for 2FA enrollment
func (s *AuthService) TwoFactorSetup(email string) (secret, qrData, manualKey string, err error) {
	key, err := totp.Generate(totp.GenerateOpts{
		Issuer:      "RealtimeCrypto",
		AccountName: email,
	})
	if err != nil {
		return "", "", "", err
	}
	png, err := qrcode.Encode(key.URL(), qrcode.Medium, 256)
	if err != nil {
		return "", "", "", err
	}
	return key.Secret(), "data:image/png;base64," + base64.StdEncoding.EncodeToString(png), key.Secret(), nil
}

// EnableTwoFactor activates 2FA for a user after validating TOTP token and generates backup codes
func (s *AuthService) EnableTwoFactor(ctx context.Context, userID primitive.ObjectID, secret, token string) ([]string, error) {
	if ok := totp.Validate(token, secret); !ok {
		return nil, errors.New("invalid verification code")
	}

	backup := generateBackupCodes()
	codes := make([]models.BackupCode, 0, len(backup))
	for _, code := range backup {
		codes = append(codes, models.BackupCode{Code: code, Used: false})
	}

	_, err := s.users().UpdateByID(ctx, userID, bson.M{
		"$set": bson.M{
			"twoFactorEnabled": true,
			"twoFactorSecret":  secret,
			"backupCodes":      codes,
		},
	})
	if err != nil {
		return nil, err
	}

	return backup, nil
}

// DisableTwoFactor removes 2FA from a user's account and clears backup codes
func (s *AuthService) DisableTwoFactor(ctx context.Context, userID primitive.ObjectID) error {
	_, err := s.users().UpdateByID(ctx, userID, bson.M{
		"$set": bson.M{
			"twoFactorEnabled": false,
			"twoFactorSecret":  "",
			"backupCodes":      []models.BackupCode{},
		},
	})
	return err
}

// GetBackupCodeStatus returns the number of unused backup codes for a user
func (s *AuthService) GetBackupCodeStatus(ctx context.Context, userID primitive.ObjectID) (int, error) {
	var user models.User
	if err := s.users().FindOne(ctx, bson.M{"_id": userID}).Decode(&user); err != nil {
		return 0, err
	}
	count := 0
	for _, code := range user.BackupCodes {
		if !code.Used {
			count++
		}
	}
	return count, nil
}

// RegenerateBackupCodes creates a new set of backup codes after TOTP verification
func (s *AuthService) RegenerateBackupCodes(ctx context.Context, userID primitive.ObjectID, totpCode string) ([]string, error) {
	var user models.User
	if err := s.users().FindOne(ctx, bson.M{"_id": userID}).Decode(&user); err != nil {
		return nil, err
	}
	if user.TwoFactor && !totp.Validate(totpCode, user.TwoFactorSecret) {
		return nil, errors.New("invalid verification code")
	}
	backup := generateBackupCodes()
	codes := make([]models.BackupCode, 0, len(backup))
	for _, code := range backup {
		codes = append(codes, models.BackupCode{Code: code, Used: false})
	}
	_, err := s.users().UpdateByID(ctx, userID, bson.M{"$set": bson.M{"backupCodes": codes}})
	return backup, err
}

// GetSessions retrieves all active sessions for a user
func (s *AuthService) GetSessions(ctx context.Context, userID primitive.ObjectID) ([]models.UserSession, error) {
	cursor, err := s.sessions().Find(ctx, bson.M{"userId": userID})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)
	var sessions []models.UserSession
	if err := cursor.All(ctx, &sessions); err != nil {
		return nil, err
	}
	return sessions, nil
}

// TerminateSession deactivates a specific user session
func (s *AuthService) TerminateSession(ctx context.Context, userID primitive.ObjectID, sessionID primitive.ObjectID) error {
	_, err := s.sessions().UpdateOne(ctx, bson.M{"_id": sessionID, "userId": userID}, bson.M{"$set": bson.M{"isActive": false}})
	return err
}

// TerminateOtherSessions deactivates all user sessions except the current one
func (s *AuthService) TerminateOtherSessions(ctx context.Context, userID, currentSessionID primitive.ObjectID) (int64, error) {
	res, err := s.sessions().UpdateMany(ctx, bson.M{"userId": userID, "_id": bson.M{"$ne": currentSessionID}}, bson.M{"$set": bson.M{"isActive": false}})
	if err != nil {
		return 0, err
	}
	return res.ModifiedCount, nil
}

// GetLoginActivity retrieves recent login attempts for a user with optional limit
func (s *AuthService) GetLoginActivity(ctx context.Context, userID primitive.ObjectID, limit int64) ([]models.LoginActivity, error) {
	opts := bson.D{{Key: "$sort", Value: bson.M{"timestamp": -1}}, {Key: "$limit", Value: limit}}
	match := bson.D{{Key: "$match", Value: bson.M{"userId": userID}}}
	cursor, err := s.loginActivity().Aggregate(ctx, mongo.Pipeline{match, opts})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var activities []models.LoginActivity
	if err := cursor.All(ctx, &activities); err != nil {
		return nil, err
	}
	return activities, nil
}

// createSession records a new user session with device and location info
func (s *AuthService) createSession(ctx context.Context, userID primitive.ObjectID, ua, ip string) error {
	session := models.UserSession{
		UserID:       userID,
		UserAgent:    ua,
		UserAgentRaw: ua,
		IPAddress:    ip,
		CreatedAt:    time.Now(),
		LastActive:   time.Now(),
		IsActive:     true,
		DeviceName:   "web",
		DeviceType:   "browser",
	}
	_, err := s.sessions().InsertOne(ctx, session)
	return err
}

// verifyTotpOrBackup validates a 2FA code using either TOTP or backup codes
func (s *AuthService) verifyTotpOrBackup(ctx context.Context, user models.User, code string) (bool, error) {
	if code == "" {
		return false, errors.New("verification code required")
	}
	if totp.Validate(code, user.TwoFactorSecret) {
		return true, nil
	}
	for i, b := range user.BackupCodes {
		if !b.Used && b.Code == code {
			user.BackupCodes[i].Used = true
			user.BackupCodes[i].UsedAt = time.Now()
			_, _ = s.users().UpdateByID(ctx, user.ID, bson.M{"$set": bson.M{"backupCodes": user.BackupCodes}})
			return true, nil
		}
	}
	return false, nil
}

// generateBackupCodes creates 10 random backup codes for 2FA recovery
func generateBackupCodes() []string {
	const count = 10
	codes := make([]string, 0, count)
	for i := 0; i < count; i++ {
		codes = append(codes, strings.ToUpper(uuid.NewString())[:8])
	}
	return codes
}
