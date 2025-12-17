package services

import (
	"context"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"golang.org/x/crypto/bcrypt"

	"github.com/turboline-ai/turbostream/go-backend/internal/config"
	"github.com/turboline-ai/turbostream/go-backend/internal/models"
)

// setupTestDB creates an in-memory MongoDB connection for testing
func setupTestDB(t *testing.T) (*mongo.Client, *mongo.Database, func()) {
	ctx := context.Background()

	// Use a test MongoDB connection (requires MongoDB running locally)
	// For CI/CD, you'd use testcontainers or similar
	clientOpts := options.Client().ApplyURI("mongodb://localhost:27017")
	client, err := mongo.Connect(ctx, clientOpts)
	if err != nil {
		t.Skip("MongoDB not available for testing:", err)
		return nil, nil, func() {}
	}

	// Create a unique database for this test
	dbName := "test_turbostream_" + primitive.NewObjectID().Hex()
	db := client.Database(dbName)

	cleanup := func() {
		_ = db.Drop(ctx)
		_ = client.Disconnect(ctx)
	}

	return client, db, cleanup
}

func setupAuthService(t *testing.T) (*AuthService, func()) {
	client, db, cleanup := setupTestDB(t)
	if client == nil {
		return nil, func() {}
	}

	cfg := config.Config{
		JWTSecret:          "test-secret-key-for-testing-only",
		TokenQuotaPerMonth: 1000000,
	}

	service := NewAuthService(cfg, client, db)
	return service, cleanup
}

func TestAuthService_Register(t *testing.T) {
	service, cleanup := setupAuthService(t)
	if service == nil {
		t.Skip("Skipping test: MongoDB not available")
	}
	defer cleanup()

	ctx := context.Background()

	tests := []struct {
		name        string
		email       string
		password    string
		username    string
		wantErr     bool
		errContains string
	}{
		{
			name:     "successful registration",
			email:    "test@example.com",
			password: "password123",
			username: "Test User",
			wantErr:  false,
		},
		{
			name:        "empty email",
			email:       "",
			password:    "password123",
			username:    "Test User",
			wantErr:     true,
			errContains: "email and password required",
		},
		{
			name:        "empty password",
			email:       "test2@example.com",
			password:    "",
			username:    "Test User",
			wantErr:     true,
			errContains: "email and password required",
		},
		{
			name:     "email normalization",
			email:    "  NORMALIZATION@EXAMPLE.COM  ",
			password: "password123",
			username: "Test User",
			wantErr:  false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			token, user, err := service.Register(ctx, tt.email, tt.password, tt.username)

			if tt.wantErr {
				assert.Error(t, err)
				if tt.errContains != "" {
					assert.Contains(t, err.Error(), tt.errContains)
				}
				return
			}

			require.NoError(t, err)
			assert.NotEmpty(t, token)
			assert.NotEmpty(t, user.ID)
			assert.NotEmpty(t, user.Email)
			// Note: Password is returned as hashed value from Register
			// This is OK for registration as it's only used internally
			assert.NotNil(t, user.TokenUsage)
			assert.Equal(t, int64(0), user.TokenUsage.TokensUsed)
			assert.Equal(t, int64(1000000), user.TokenUsage.Limit)
		})
	}

	// Test duplicate email
	t.Run("duplicate email", func(t *testing.T) {
		email := "duplicate@example.com"
		_, _, err := service.Register(ctx, email, "password1", "User1")
		require.NoError(t, err)

		_, _, err = service.Register(ctx, email, "password2", "User2")
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "user already exists")
	})
}

func TestAuthService_Login(t *testing.T) {
	service, cleanup := setupAuthService(t)
	if service == nil {
		t.Skip("Skipping test: MongoDB not available")
	}
	defer cleanup()

	ctx := context.Background()

	// Create a test user
	email := "login-test@example.com"
	password := "correct-password"
	_, registeredUser, err := service.Register(ctx, email, password, "Login Test")
	require.NoError(t, err)

	tests := []struct {
		name        string
		email       string
		password    string
		totpToken   string
		wantErr     bool
		errContains string
	}{
		{
			name:     "successful login",
			email:    email,
			password: password,
			wantErr:  false,
		},
		{
			name:        "wrong password",
			email:       email,
			password:    "wrong-password",
			wantErr:     true,
			errContains: "invalid email or password",
		},
		{
			name:        "non-existent user",
			email:       "nonexistent@example.com",
			password:    "password123",
			wantErr:     true,
			errContains: "invalid email or password",
		},
		{
			name:     "email case insensitive",
			email:    "LOGIN-TEST@EXAMPLE.COM",
			password: password,
			wantErr:  false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			token, user, err := service.Login(ctx, tt.email, tt.password, tt.totpToken, "127.0.0.1", "test-agent")

			if tt.wantErr {
				assert.Error(t, err)
				if tt.errContains != "" {
					assert.Contains(t, err.Error(), tt.errContains)
				}
				return
			}

			require.NoError(t, err)
			assert.NotEmpty(t, token)
			assert.Equal(t, registeredUser.ID, user.ID)
			// Note: Password is returned as hashed value from Login
			// This is OK as the handler should clear it before sending to client
		})
	}
}

func TestAuthService_GenerateAndParseToken(t *testing.T) {
	service, cleanup := setupAuthService(t)
	if service == nil {
		t.Skip("Skipping test: MongoDB not available")
	}
	defer cleanup()

	user := models.User{
		ID:    primitive.NewObjectID(),
		Email: "token-test@example.com",
		Name:  "Token Test",
	}

	// Test token generation
	token, err := service.generateToken(user)
	require.NoError(t, err)
	assert.NotEmpty(t, token)

	// Test token parsing
	claims, err := service.ParseToken(token)
	require.NoError(t, err)
	assert.Equal(t, user.ID.Hex(), claims["userId"])
	assert.Equal(t, user.Email, claims["email"])
	assert.Equal(t, user.Name, claims["username"])

	// Test invalid token
	_, err = service.ParseToken("invalid.token.here")
	assert.Error(t, err)

	// Test expired token (this would require mocking time or waiting)
	// For now, we just test that a malformed token fails
	_, err = service.ParseToken("")
	assert.Error(t, err)
}

func TestAuthService_ChangePassword(t *testing.T) {
	service, cleanup := setupAuthService(t)
	if service == nil {
		t.Skip("Skipping test: MongoDB not available")
	}
	defer cleanup()

	ctx := context.Background()

	// Create a test user
	email := "password-change@example.com"
	currentPassword := "old-password"
	_, user, err := service.Register(ctx, email, currentPassword, "Password Test")
	require.NoError(t, err)

	tests := []struct {
		name        string
		current     string
		next        string
		wantErr     bool
		errContains string
	}{
		{
			name:    "successful password change",
			current: currentPassword,
			next:    "new-secure-password",
			wantErr: false,
		},
		{
			name:        "wrong current password",
			current:     "wrong-password",
			next:        "new-password",
			wantErr:     true,
			errContains: "current password is incorrect",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := service.ChangePassword(ctx, user.ID, tt.current, tt.next)

			if tt.wantErr {
				assert.Error(t, err)
				if tt.errContains != "" {
					assert.Contains(t, err.Error(), tt.errContains)
				}
				return
			}

			require.NoError(t, err)

			// Verify new password works
			_, _, err = service.Login(ctx, email, tt.next, "", "127.0.0.1", "test")
			assert.NoError(t, err)
		})
	}
}

func TestAuthService_GetUser(t *testing.T) {
	service, cleanup := setupAuthService(t)
	if service == nil {
		t.Skip("Skipping test: MongoDB not available")
	}
	defer cleanup()

	ctx := context.Background()

	// Create a test user
	_, user, err := service.Register(ctx, "getuser@example.com", "password", "Get User Test")
	require.NoError(t, err)

	// Test getting user
	fetchedUser, err := service.GetUser(ctx, user.ID)
	require.NoError(t, err)
	assert.Equal(t, user.ID, fetchedUser.ID)
	assert.Equal(t, user.Email, fetchedUser.Email)
	assert.Empty(t, fetchedUser.Password, "password should not be exposed")
	assert.NotNil(t, fetchedUser.TokenUsage)

	// Test non-existent user
	_, err = service.GetUser(ctx, primitive.NewObjectID())
	assert.Error(t, err)
}

func TestAuthService_UpdateTokenUsage(t *testing.T) {
	service, cleanup := setupAuthService(t)
	if service == nil {
		t.Skip("Skipping test: MongoDB not available")
	}
	defer cleanup()

	ctx := context.Background()

	// Create a test user
	_, user, err := service.Register(ctx, "tokens@example.com", "password", "Token Usage Test")
	require.NoError(t, err)

	// Update token usage
	err = service.UpdateTokenUsage(ctx, user.ID, 100)
	require.NoError(t, err)

	// Verify usage was updated
	fetchedUser, err := service.GetUser(ctx, user.ID)
	require.NoError(t, err)
	assert.Equal(t, int64(100), fetchedUser.TokenUsage.TokensUsed)

	// Update again
	err = service.UpdateTokenUsage(ctx, user.ID, 50)
	require.NoError(t, err)

	fetchedUser, err = service.GetUser(ctx, user.ID)
	require.NoError(t, err)
	assert.Equal(t, int64(150), fetchedUser.TokenUsage.TokensUsed)
}

func TestAuthService_TwoFactorSetup(t *testing.T) {
	service, cleanup := setupAuthService(t)
	if service == nil {
		t.Skip("Skipping test: MongoDB not available")
	}
	defer cleanup()

	email := "2fa@example.com"

	secret, qrData, manualKey, err := service.TwoFactorSetup(email)
	require.NoError(t, err)
	assert.NotEmpty(t, secret)
	assert.NotEmpty(t, qrData)
	assert.NotEmpty(t, manualKey)
	assert.Contains(t, qrData, "data:image/png;base64,")
	assert.Equal(t, secret, manualKey)
}

func TestAuthService_MonthlyTokenReset(t *testing.T) {
	service, cleanup := setupAuthService(t)
	if service == nil {
		t.Skip("Skipping test: MongoDB not available")
	}
	defer cleanup()

	ctx := context.Background()

	// Create a test user
	_, user, err := service.Register(ctx, "reset@example.com", "password", "Reset Test")
	require.NoError(t, err)

	// Use some tokens
	err = service.UpdateTokenUsage(ctx, user.ID, 500)
	require.NoError(t, err)

	// Simulate month change by manually updating the user's token usage month
	lastMonth := time.Now().AddDate(0, -1, 0).Format("2006-01")
	_, err = service.users().UpdateByID(ctx, user.ID, bson.M{
		"$set": bson.M{"tokenUsage.currentMonth": lastMonth},
	})
	require.NoError(t, err)

	// GetUser should reset the token usage
	fetchedUser, err := service.GetUser(ctx, user.ID)
	require.NoError(t, err)
	assert.Equal(t, time.Now().Format("2006-01"), fetchedUser.TokenUsage.CurrentMonth)
	assert.Equal(t, int64(0), fetchedUser.TokenUsage.TokensUsed, "tokens should be reset for new month")
}

func TestAuthService_Sessions(t *testing.T) {
	service, cleanup := setupAuthService(t)
	if service == nil {
		t.Skip("Skipping test: MongoDB not available")
	}
	defer cleanup()

	ctx := context.Background()

	// Create a test user
	_, user, err := service.Register(ctx, "sessions@example.com", "password", "Sessions Test")
	require.NoError(t, err)

	// Login to create session
	_, _, err = service.Login(ctx, "sessions@example.com", "password", "", "127.0.0.1", "agent1")
	require.NoError(t, err)

	// Get sessions
	sessions, err := service.GetSessions(ctx, user.ID)
	require.NoError(t, err)
	assert.NotEmpty(t, sessions)
	assert.True(t, sessions[0].IsActive)

	// Terminate session
	err = service.TerminateSession(ctx, user.ID, sessions[0].ID)
	require.NoError(t, err)

	// Verify session is inactive
	sessions, err = service.GetSessions(ctx, user.ID)
	require.NoError(t, err)
	assert.False(t, sessions[0].IsActive)
}

func TestPasswordHashing(t *testing.T) {
	password := "test-password-123"

	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	require.NoError(t, err)

	// Correct password should match
	err = bcrypt.CompareHashAndPassword(hash, []byte(password))
	assert.NoError(t, err)

	// Wrong password should not match
	err = bcrypt.CompareHashAndPassword(hash, []byte("wrong-password"))
	assert.Error(t, err)
}
