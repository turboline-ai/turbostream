package services

import (
	"context"
	"crypto/rand"
	"errors"
	"fmt"
	"hash/crc32"
	"strings"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"golang.org/x/crypto/bcrypt"

	"github.com/turboline-ai/turbostream/internal/models"
)

const (
	keyPrefix      = "ts_live_"
	randomLength   = 32
	checksumLength = 8
	base62Chars    = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"
)

var (
	ErrInvalidKeyFormat   = errors.New("invalid API key format")
	ErrInvalidChecksum    = errors.New("invalid API key checksum")
	ErrInvalidKey         = errors.New("invalid or revoked API key")
	ErrDuplicateKeyName   = errors.New("API key name already exists")
	ErrInsufficientScope  = errors.New("insufficient scope for operation")
)

// ValidScopes defines all allowed websocket scopes
var ValidScopes = map[string]bool{
	"websocket:subscribe": true,
	"websocket:llm":       true,
	"websocket:topic":     true,
	"websocket:*":         true,
}

// APIKeyService handles API key generation, validation, and management
type APIKeyService struct {
	db     *mongo.Database
	client *mongo.Client
}

// NewAPIKeyService creates a new API key service instance
func NewAPIKeyService(db *mongo.Database) *APIKeyService {
	return &APIKeyService{db: db}
}

// collection returns the MongoDB api_keys collection
func (s *APIKeyService) collection() *mongo.Collection {
	return s.db.Collection("api_keys")
}

// GenerateKey creates a new API key for a user with given name and scopes
// Returns the APIKey document and the raw key string (only shown once)
func (s *APIKeyService) GenerateKey(ctx context.Context, userID primitive.ObjectID, name string, scopes []string) (*models.APIKey, string, error) {
	// Validate scopes
	for _, scope := range scopes {
		if !ValidScopes[scope] {
			return nil, "", fmt.Errorf("invalid scope: %s", scope)
		}
	}

	// Check for duplicate name
	count, err := s.collection().CountDocuments(ctx, bson.M{
		"userId":   userID,
		"name":     name,
		"isActive": true,
	})
	if err != nil {
		return nil, "", err
	}
	if count > 0 {
		return nil, "", ErrDuplicateKeyName
	}

	// Generate secure key
	rawKey, err := s.generateSecureKey()
	if err != nil {
		return nil, "", err
	}

	// Hash the key for storage
	keyHash, err := s.hashKey(rawKey)
	if err != nil {
		return nil, "", err
	}

	// Extract last 8 characters for display
	parts := strings.Split(rawKey, "_")
	if len(parts) != 4 {
		return nil, "", ErrInvalidKeyFormat
	}
	lastChars := parts[len(parts)-1] // The checksum part

	now := time.Now()
	apiKey := &models.APIKey{
		UserID:    userID,
		Name:      name,
		KeyHash:   keyHash,
		Prefix:    keyPrefix,
		LastChars: lastChars,
		Scopes:    scopes,
		IsActive:  true,
		CreatedAt: now,
	}

	res, err := s.collection().InsertOne(ctx, apiKey)
	if err != nil {
		return nil, "", err
	}
	apiKey.ID = res.InsertedID.(primitive.ObjectID)

	return apiKey, rawKey, nil
}

// ValidateKey validates a raw API key and returns the associated APIKey document
func (s *APIKeyService) ValidateKey(ctx context.Context, rawKey string) (*models.APIKey, error) {
	// Parse key format: ts_live_<random>_<checksum>
	if !strings.HasPrefix(rawKey, keyPrefix) {
		return nil, ErrInvalidKeyFormat
	}

	parts := strings.Split(rawKey, "_")
	if len(parts) != 4 { // "ts", "live", "<random>", "<checksum>"
		return nil, ErrInvalidKeyFormat
	}

	randomPart := parts[2]
	checksumPart := parts[3]

	// Verify checksum (fast rejection)
	expectedChecksum := s.computeChecksum(randomPart)
	if checksumPart != expectedChecksum {
		return nil, ErrInvalidChecksum
	}

	// Query database by prefix and lastChars (indexed lookup)
	cursor, err := s.collection().Find(ctx, bson.M{
		"prefix":    keyPrefix,
		"lastChars": checksumPart,
		"isActive":  true,
	})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	// Try bcrypt comparison for each candidate (typically 1-2)
	var apiKey models.APIKey
	for cursor.Next(ctx) {
		if err := cursor.Decode(&apiKey); err != nil {
			continue
		}

		// Verify with bcrypt
		if err := bcrypt.CompareHashAndPassword([]byte(apiKey.KeyHash), []byte(rawKey)); err == nil {
			// Check expiration
			if apiKey.ExpiresAt != nil && apiKey.ExpiresAt.Before(time.Now()) {
				return nil, ErrInvalidKey
			}
			return &apiKey, nil
		}
	}

	return nil, ErrInvalidKey
}

// ListKeys returns all API keys for a user (excluding key hashes)
func (s *APIKeyService) ListKeys(ctx context.Context, userID primitive.ObjectID) ([]models.APIKey, error) {
	cursor, err := s.collection().Find(ctx, bson.M{
		"userId":   userID,
		"isActive": true,
	}, options.Find().SetSort(bson.D{{Key: "createdAt", Value: -1}}))
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var keys []models.APIKey
	if err := cursor.All(ctx, &keys); err != nil {
		return nil, err
	}

	return keys, nil
}

// RevokeKey marks an API key as inactive (soft delete)
func (s *APIKeyService) RevokeKey(ctx context.Context, userID primitive.ObjectID, keyID primitive.ObjectID) error {
	result, err := s.collection().UpdateOne(ctx, bson.M{
		"_id":    keyID,
		"userId": userID,
	}, bson.M{
		"$set": bson.M{
			"isActive": false,
		},
	})
	if err != nil {
		return err
	}
	if result.MatchedCount == 0 {
		return errors.New("API key not found")
	}
	return nil
}

// UpdateLastUsed updates the lastUsedAt timestamp for an API key
func (s *APIKeyService) UpdateLastUsed(ctx context.Context, keyID primitive.ObjectID) error {
	now := time.Now()
	_, err := s.collection().UpdateOne(ctx, bson.M{
		"_id": keyID,
	}, bson.M{
		"$set": bson.M{
			"lastUsedAt": now,
		},
	})
	return err
}

// HasScope checks if an API key has the required scope
func (s *APIKeyService) HasScope(apiKey *models.APIKey, requiredScope string) bool {
	for _, scope := range apiKey.Scopes {
		if scope == "websocket:*" || scope == requiredScope {
			return true
		}
	}
	return false
}

// EnsureIndexes creates necessary database indexes for API keys
func (s *APIKeyService) EnsureIndexes(ctx context.Context) error {
	indexes := []mongo.IndexModel{
		{
			Keys: bson.D{
				{Key: "userId", Value: 1},
				{Key: "isActive", Value: 1},
			},
		},
		{
			Keys: bson.D{
				{Key: "prefix", Value: 1},
				{Key: "lastChars", Value: 1},
			},
		},
		{
			Keys: bson.D{
				{Key: "userId", Value: 1},
				{Key: "name", Value: 1},
			},
			Options: options.Index().SetUnique(true).SetPartialFilterExpression(bson.M{"isActive": true}),
		},
		{
			Keys:    bson.D{{Key: "expiresAt", Value: 1}},
			Options: options.Index().SetExpireAfterSeconds(0).SetSparse(true),
		},
	}

	_, err := s.collection().Indexes().CreateMany(ctx, indexes)
	// Ignore IndexKeySpecsConflict errors (index already exists with same keys)
	if err != nil && !mongo.IsDuplicateKeyError(err) && !strings.Contains(err.Error(), "IndexKeySpecsConflict") {
		return err
	}
	return nil
}

// generateSecureKey generates a secure API key with format: ts_live_<random>_<checksum>
func (s *APIKeyService) generateSecureKey() (string, error) {
	// Generate 24 random bytes for base62 encoding
	randomBytes := make([]byte, 24)
	if _, err := rand.Read(randomBytes); err != nil {
		return "", err
	}

	// Convert to base62
	randomStr := s.encodeBase62(randomBytes)
	if len(randomStr) < randomLength {
		// Pad with additional random characters if needed
		padding := make([]byte, randomLength-len(randomStr))
		if _, err := rand.Read(padding); err != nil {
			return "", fmt.Errorf("failed to generate random padding: %w", err)
		}
		randomStr = randomStr + s.encodeBase62(padding)
	}
	randomStr = randomStr[:randomLength]

	// Compute checksum
	checksum := s.computeChecksum(randomStr)

	// Format: ts_live_<random>_<checksum>
	return fmt.Sprintf("%s%s_%s", keyPrefix, randomStr, checksum), nil
}

// encodeBase62 converts bytes to base62 string
func (s *APIKeyService) encodeBase62(data []byte) string {
	var result strings.Builder
	for _, b := range data {
		result.WriteByte(base62Chars[int(b)%len(base62Chars)])
	}
	return result.String()
}

// computeChecksum computes CRC32 checksum and returns 8 hex characters
func (s *APIKeyService) computeChecksum(data string) string {
	crc := crc32.ChecksumIEEE([]byte(data))
	return fmt.Sprintf("%08x", crc)
}

// hashKey hashes an API key using bcrypt
func (s *APIKeyService) hashKey(rawKey string) (string, error) {
	hash, err := bcrypt.GenerateFromPassword([]byte(rawKey), bcrypt.DefaultCost)
	if err != nil {
		return "", err
	}
	return string(hash), nil
}
