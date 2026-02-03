package e2e_test

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"

	"github.com/turboline-ai/turbostream/internal/config"
	transport "github.com/turboline-ai/turbostream/internal/http"
	"github.com/turboline-ai/turbostream/internal/models"
	"github.com/turboline-ai/turbostream/internal/services"
	"github.com/turboline-ai/turbostream/internal/socket"
)

// E2E Test Setup
type E2ETestContext struct {
	router             *gin.Engine
	authService        *services.AuthService
	apiKeyService      *services.APIKeyService
	marketplaceService *services.MarketplaceService
	settingsService    *services.SettingsService
	llmService         *services.LLMService
	socketManager      *socket.Manager
	mongoClient        *mongo.Client
	db                 *mongo.Database
	cleanup            func()
}

func setupE2ETest(t *testing.T) *E2ETestContext {
	ctx := context.Background()

	// Connect to MongoDB
	clientOpts := options.Client().ApplyURI("mongodb://localhost:27017")
	client, err := mongo.Connect(ctx, clientOpts)
	if err != nil {
		t.Skip("MongoDB not available for E2E testing:", err)
		return nil
	}

	// Create unique test database
	dbName := "test_e2e_" + primitive.NewObjectID().Hex()
	db := client.Database(dbName)

	// Create test config
	cfg := config.Config{
		Env:                "test",
		Host:               "localhost",
		Port:               7210,
		CORSOrigin:         "http://localhost:7200",
		JWTSecret:          "test-secret-key-for-e2e-testing",
		MongoURI:           "mongodb://localhost:27017",
		MongoDatabase:      dbName,
		EncryptionKey:      "test-encryption-key-32-chars!!",
		DefaultTimeout:     15 * time.Second,
		DefaultAIProvider:  "azure-openai",
		TokenQuotaPerMonth: 1000000,
		LLMMaxTokens:       1024,
		LLMTemperature:     0.7,
		LLMContextLimit:    50,
	}

	// Initialize services
	authService := services.NewAuthService(cfg, client, db)
	apiKeyService := services.NewAPIKeyService(db)
	marketplaceService := services.NewMarketplaceService(db)
	settingsService := services.NewSettingsService(db)
	azureService := services.NewAzureOpenAI(cfg)
	llmService, _ := services.NewLLMService(cfg)

	// Initialize socket manager
	socketManager := socket.NewManager(authService, apiKeyService, azureService, marketplaceService, []string{cfg.CORSOrigin})
	if llmService != nil {
		socketManager.SetLLMService(llmService)
	}

	// Build router
	router := transport.BuildEngine(transport.RouterDeps{
		Config:      cfg,
		AuthService: authService,
		Marketplace: marketplaceService,
		Settings:    settingsService,
		LLM:         llmService,
		Sockets:     socketManager,
	})

	cleanup := func() {
		_ = db.Drop(ctx)
		_ = client.Disconnect(ctx)
	}

	return &E2ETestContext{
		router:             router,
		authService:        authService,
		apiKeyService:      apiKeyService,
		marketplaceService: marketplaceService,
		settingsService:    settingsService,
		llmService:         llmService,
		socketManager:      socketManager,
		mongoClient:        client,
		db:                 db,
		cleanup:            cleanup,
	}
}

// E2E Test 1: Complete User Authentication Journey
func TestE2E_UserAuthenticationWorkflow(t *testing.T) {
	testCtx := setupE2ETest(t)
	if testCtx == nil {
		return
	}
	defer testCtx.cleanup()

	router := testCtx.router

	// Step 1: Register a new user
	t.Run("Step1_Register", func(t *testing.T) {
		payload := map[string]interface{}{
			"email":    "e2e@test.com",
			"password": "SecurePass123!",
			"username": "E2E Test User",
		}
		body, _ := json.Marshal(payload)

		req := httptest.NewRequest(http.MethodPost, "/api/auth/register", bytes.NewBuffer(body))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()

		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusCreated, w.Code)
		var response map[string]interface{}
		json.Unmarshal(w.Body.Bytes(), &response)
		assert.True(t, response["success"].(bool))
		assert.NotEmpty(t, response["token"])
	})

	// Step 2: Login with the registered user
	var authToken string
	t.Run("Step2_Login", func(t *testing.T) {
		payload := map[string]interface{}{
			"email":    "e2e@test.com",
			"password": "SecurePass123!",
		}
		body, _ := json.Marshal(payload)

		req := httptest.NewRequest(http.MethodPost, "/api/auth/login", bytes.NewBuffer(body))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()

		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
		var response map[string]interface{}
		json.Unmarshal(w.Body.Bytes(), &response)
		assert.True(t, response["success"].(bool))
		authToken = response["token"].(string)
		assert.NotEmpty(t, authToken)
	})

	// Step 3: Access protected resource (/api/auth/me)
	t.Run("Step3_AccessProtectedResource", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/auth/me", nil)
		req.Header.Set("Authorization", "Bearer "+authToken)
		w := httptest.NewRecorder()

		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
		var response map[string]interface{}
		json.Unmarshal(w.Body.Bytes(), &response)
		assert.True(t, response["success"].(bool))
		user := response["user"].(map[string]interface{})
		assert.Equal(t, "e2e@test.com", user["email"])
		assert.Equal(t, "E2E Test User", user["username"])
	})

	// Step 4: Change password
	t.Run("Step4_ChangePassword", func(t *testing.T) {
		payload := map[string]interface{}{
			"currentPassword": "SecurePass123!",
			"newPassword":     "NewSecurePass456!",
		}
		body, _ := json.Marshal(payload)

		req := httptest.NewRequest(http.MethodPost, "/api/auth/change-password", bytes.NewBuffer(body))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Authorization", "Bearer "+authToken)
		w := httptest.NewRecorder()

		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
		var response map[string]interface{}
		json.Unmarshal(w.Body.Bytes(), &response)
		assert.True(t, response["success"].(bool))
	})

	// Step 5: Login with new password
	t.Run("Step5_LoginWithNewPassword", func(t *testing.T) {
		payload := map[string]interface{}{
			"email":    "e2e@test.com",
			"password": "NewSecurePass456!",
		}
		body, _ := json.Marshal(payload)

		req := httptest.NewRequest(http.MethodPost, "/api/auth/login", bytes.NewBuffer(body))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()

		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
		var response map[string]interface{}
		json.Unmarshal(w.Body.Bytes(), &response)
		assert.True(t, response["success"].(bool))
		assert.NotEmpty(t, response["token"])
	})

	// Step 6: Verify old password no longer works
	t.Run("Step6_OldPasswordFails", func(t *testing.T) {
		payload := map[string]interface{}{
			"email":    "e2e@test.com",
			"password": "SecurePass123!",
		}
		body, _ := json.Marshal(payload)

		req := httptest.NewRequest(http.MethodPost, "/api/auth/login", bytes.NewBuffer(body))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()

		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusUnauthorized, w.Code)
	})
}

// E2E Test 2: Complete Marketplace Workflow
func TestE2E_MarketplaceWorkflow(t *testing.T) {
	testCtx := setupE2ETest(t)
	if testCtx == nil {
		return
	}
	defer testCtx.cleanup()

	router := testCtx.router
	var authToken string
	var userID primitive.ObjectID
	var feedID string

	// Setup: Create and authenticate a user
	t.Run("Setup_CreateUser", func(t *testing.T) {
		payload := map[string]interface{}{
			"email":    "marketplace@test.com",
			"password": "TestPass123!",
			"username": "Marketplace User",
		}
		body, _ := json.Marshal(payload)

		req := httptest.NewRequest(http.MethodPost, "/api/auth/register", bytes.NewBuffer(body))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()

		router.ServeHTTP(w, req)

		require.Equal(t, http.StatusCreated, w.Code)
		var response map[string]interface{}
		json.Unmarshal(w.Body.Bytes(), &response)
		authToken = response["token"].(string)

		// Get user ID from token
		claims, _ := testCtx.authService.ParseToken(authToken)
		userIDStr := claims["userId"].(string)
		userID, _ = primitive.ObjectIDFromHex(userIDStr)
	})

	// Step 1: Create a new feed
	t.Run("Step1_CreateFeed", func(t *testing.T) {
		payload := map[string]interface{}{
			"name":           "E2E Test Feed",
			"description":    "A feed for end-to-end testing",
			"url":            "wss://example.com/e2e-feed",
			"category":       "Testing",
			"isPublic":       true,
			"connectionType": "websocket",
			"eventName":      "message",
			"dataFormat":     "json",
		}
		body, _ := json.Marshal(payload)

		req := httptest.NewRequest(http.MethodPost, "/api/marketplace/feeds", bytes.NewBuffer(body))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Authorization", "Bearer "+authToken)
		w := httptest.NewRecorder()

		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusCreated, w.Code)
		var response map[string]interface{}
		json.Unmarshal(w.Body.Bytes(), &response)
		assert.True(t, response["success"].(bool))
		feed := response["data"].(map[string]interface{})
		feedID = feed["_id"].(string)
		assert.Equal(t, "E2E Test Feed", feed["name"])
	})

	// Step 2: List all feeds and verify our feed is there
	t.Run("Step2_ListFeeds", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/marketplace/feeds", nil)
		w := httptest.NewRecorder()

		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
		var response map[string]interface{}
		json.Unmarshal(w.Body.Bytes(), &response)
		assert.True(t, response["success"].(bool))
		feeds := response["data"].([]interface{})
		assert.GreaterOrEqual(t, len(feeds), 1)

		// Verify our feed exists
		found := false
		for _, f := range feeds {
			feed := f.(map[string]interface{})
			if feed["_id"].(string) == feedID {
				found = true
				assert.Equal(t, "E2E Test Feed", feed["name"])
				break
			}
		}
		assert.True(t, found, "Created feed should be in the list")
	})

	// Step 3: Search for the feed
	t.Run("Step3_SearchFeed", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/marketplace/feeds/search?q=E2E", nil)
		w := httptest.NewRecorder()

		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
		var response map[string]interface{}
		json.Unmarshal(w.Body.Bytes(), &response)
		assert.True(t, response["success"].(bool))
		feeds := response["data"].([]interface{})
		assert.GreaterOrEqual(t, len(feeds), 1)
	})

	// Step 4: Get feed details
	t.Run("Step4_GetFeedDetails", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/marketplace/feeds/"+feedID, nil)
		w := httptest.NewRecorder()

		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
		var response map[string]interface{}
		json.Unmarshal(w.Body.Bytes(), &response)
		assert.True(t, response["success"].(bool))
		feed := response["data"].(map[string]interface{})
		assert.Equal(t, "E2E Test Feed", feed["name"])
		assert.Equal(t, "A feed for end-to-end testing", feed["description"])
	})

	// Step 5: Subscribe to the feed
	t.Run("Step5_SubscribeToFeed", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPost, "/api/marketplace/subscribe/"+feedID, nil)
		req.Header.Set("Authorization", "Bearer "+authToken)
		w := httptest.NewRecorder()

		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
		var response map[string]interface{}
		json.Unmarshal(w.Body.Bytes(), &response)
		assert.True(t, response["success"].(bool))
	})

	// Step 6: Verify subscription exists
	t.Run("Step6_VerifySubscription", func(t *testing.T) {
		ctx := context.Background()
		subs, err := testCtx.marketplaceService.GetSubscriptions(ctx, userID.Hex())
		require.NoError(t, err)
		assert.GreaterOrEqual(t, len(subs), 1)

		// Find our subscription
		found := false
		for _, sub := range subs {
			if sub.FeedID == feedID {
				found = true
				break
			}
		}
		assert.True(t, found, "Subscription should exist")
	})

	// Step 7: Unsubscribe from the feed
	t.Run("Step7_UnsubscribeFromFeed", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPost, "/api/marketplace/unsubscribe/"+feedID, nil)
		req.Header.Set("Authorization", "Bearer "+authToken)
		w := httptest.NewRecorder()

		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
		var response map[string]interface{}
		json.Unmarshal(w.Body.Bytes(), &response)
		assert.True(t, response["success"].(bool))
	})

	// Step 8: Verify subscription is removed
	t.Run("Step8_VerifyUnsubscribed", func(t *testing.T) {
		ctx := context.Background()
		subs, err := testCtx.marketplaceService.GetSubscriptions(ctx, userID.Hex())
		require.NoError(t, err)

		// Verify our subscription is gone
		for _, sub := range subs {
			assert.NotEqual(t, feedID, sub.FeedID, "Subscription should be removed")
		}
	})

	// Step 9: Delete the feed
	t.Run("Step9_DeleteFeed", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodDelete, "/api/marketplace/feeds/"+feedID, nil)
		req.Header.Set("Authorization", "Bearer "+authToken)
		w := httptest.NewRecorder()

		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
		var response map[string]interface{}
		json.Unmarshal(w.Body.Bytes(), &response)
		assert.True(t, response["success"].(bool))
	})

	// Step 10: Verify feed is deleted
	t.Run("Step10_VerifyFeedDeleted", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/marketplace/feeds/"+feedID, nil)
		w := httptest.NewRecorder()

		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusNotFound, w.Code)
	})
}

// E2E Test 3: Multi-User Marketplace Interaction
func TestE2E_MultiUserMarketplaceInteraction(t *testing.T) {
	testCtx := setupE2ETest(t)
	if testCtx == nil {
		return
	}
	defer testCtx.cleanup()

	router := testCtx.router
	var user1Token, user2Token string
	var feedID string

	// Setup: Create two users
	t.Run("Setup_CreateUser1", func(t *testing.T) {
		payload := map[string]interface{}{
			"email":    "user1@test.com",
			"password": "Pass123!",
			"username": "User One",
		}
		body, _ := json.Marshal(payload)

		req := httptest.NewRequest(http.MethodPost, "/api/auth/register", bytes.NewBuffer(body))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()

		router.ServeHTTP(w, req)
		require.Equal(t, http.StatusCreated, w.Code)
		var response map[string]interface{}
		json.Unmarshal(w.Body.Bytes(), &response)
		user1Token = response["token"].(string)
	})

	t.Run("Setup_CreateUser2", func(t *testing.T) {
		payload := map[string]interface{}{
			"email":    "user2@test.com",
			"password": "Pass123!",
			"username": "User Two",
		}
		body, _ := json.Marshal(payload)

		req := httptest.NewRequest(http.MethodPost, "/api/auth/register", bytes.NewBuffer(body))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()

		router.ServeHTTP(w, req)
		require.Equal(t, http.StatusCreated, w.Code)
		var response map[string]interface{}
		json.Unmarshal(w.Body.Bytes(), &response)
		user2Token = response["token"].(string)
	})

	// Step 1: User 1 creates a feed
	t.Run("Step1_User1CreatesFeed", func(t *testing.T) {
		payload := map[string]interface{}{
			"name":        "Shared Feed",
			"description": "A feed shared between users",
			"url":         "wss://example.com/shared",
			"category":    "Collaboration",
			"isPublic":    true,
		}
		body, _ := json.Marshal(payload)

		req := httptest.NewRequest(http.MethodPost, "/api/marketplace/feeds", bytes.NewBuffer(body))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Authorization", "Bearer "+user1Token)
		w := httptest.NewRecorder()

		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusCreated, w.Code)
		var response map[string]interface{}
		json.Unmarshal(w.Body.Bytes(), &response)
		feed := response["data"].(map[string]interface{})
		feedID = feed["_id"].(string)
	})

	// Step 2: User 2 can see the feed
	t.Run("Step2_User2SeesFeed", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/marketplace/feeds/"+feedID, nil)
		w := httptest.NewRecorder()

		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
		var response map[string]interface{}
		json.Unmarshal(w.Body.Bytes(), &response)
		assert.True(t, response["success"].(bool))
	})

	// Step 3: User 2 subscribes to the feed
	t.Run("Step3_User2Subscribes", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPost, "/api/marketplace/subscribe/"+feedID, nil)
		req.Header.Set("Authorization", "Bearer "+user2Token)
		w := httptest.NewRecorder()

		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
	})

	// Step 4: User 2 cannot delete User 1's feed
	t.Run("Step4_User2CannotDeleteUser1Feed", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodDelete, "/api/marketplace/feeds/"+feedID, nil)
		req.Header.Set("Authorization", "Bearer "+user2Token)
		w := httptest.NewRecorder()

		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusForbidden, w.Code)
	})

	// Step 5: User 1 can delete their own feed
	t.Run("Step5_User1DeletesOwnFeed", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodDelete, "/api/marketplace/feeds/"+feedID, nil)
		req.Header.Set("Authorization", "Bearer "+user1Token)
		w := httptest.NewRecorder()

		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
	})
}

// E2E Test 4: Feed Discovery and Filtering
func TestE2E_FeedDiscoveryAndFiltering(t *testing.T) {
	testCtx := setupE2ETest(t)
	if testCtx == nil {
		return
	}
	defer testCtx.cleanup()

	ctx := context.Background()

	// Setup: Create multiple feeds in different categories
	t.Run("Setup_CreateMultipleFeeds", func(t *testing.T) {
		feeds := []models.WebSocketFeed{
			{
				Name:     "Bitcoin Price Feed",
				Category: "Crypto",
				URL:      "wss://example.com/btc",
				IsPublic: true,
			},
			{
				Name:     "Ethereum Price Feed",
				Category: "Crypto",
				URL:      "wss://example.com/eth",
				IsPublic: true,
			},
			{
				Name:     "Tech News Feed",
				Category: "News",
				URL:      "wss://example.com/tech",
				IsPublic: true,
			},
			{
				Name:     "Sports Updates",
				Category: "Sports",
				URL:      "wss://example.com/sports",
				IsPublic: true,
			},
		}

		for _, feed := range feeds {
			_, err := testCtx.marketplaceService.CreateFeed(ctx, feed)
			require.NoError(t, err)
		}
	})

	router := testCtx.router

	// Step 1: List all feeds
	t.Run("Step1_ListAllFeeds", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/marketplace/feeds", nil)
		w := httptest.NewRecorder()

		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
		var response map[string]interface{}
		json.Unmarshal(w.Body.Bytes(), &response)
		feeds := response["data"].([]interface{})
		assert.GreaterOrEqual(t, len(feeds), 4)
	})

	// Step 2: Filter by Crypto category
	t.Run("Step2_FilterByCryptoCategory", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/marketplace/feeds?category=Crypto", nil)
		w := httptest.NewRecorder()

		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
		var response map[string]interface{}
		json.Unmarshal(w.Body.Bytes(), &response)
		feeds := response["data"].([]interface{})
		assert.GreaterOrEqual(t, len(feeds), 2)

		// Verify all are crypto feeds
		for _, f := range feeds {
			feed := f.(map[string]interface{})
			assert.Equal(t, "Crypto", feed["category"])
		}
	})

	// Step 3: Search for Bitcoin
	t.Run("Step3_SearchForBitcoin", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/marketplace/feeds/search?q=Bitcoin", nil)
		w := httptest.NewRecorder()

		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
		var response map[string]interface{}
		json.Unmarshal(w.Body.Bytes(), &response)
		feeds := response["data"].([]interface{})
		assert.GreaterOrEqual(t, len(feeds), 1)

		// Verify Bitcoin feed is in results
		found := false
		for _, f := range feeds {
			feed := f.(map[string]interface{})
			if feed["name"].(string) == "Bitcoin Price Feed" {
				found = true
				break
			}
		}
		assert.True(t, found, "Bitcoin feed should be in search results")
	})

	// Step 4: Search is case-insensitive
	t.Run("Step4_CaseInsensitiveSearch", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/marketplace/feeds/search?q=bitcoin", nil)
		w := httptest.NewRecorder()

		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
		var response map[string]interface{}
		json.Unmarshal(w.Body.Bytes(), &response)
		feeds := response["data"].([]interface{})
		assert.GreaterOrEqual(t, len(feeds), 1)
	})
}

// E2E Test 5: Unauthorized Access Protection
func TestE2E_UnauthorizedAccessProtection(t *testing.T) {
	testCtx := setupE2ETest(t)
	if testCtx == nil {
		return
	}
	defer testCtx.cleanup()

	router := testCtx.router

	// Step 1: Try to access /api/auth/me without token
	t.Run("Step1_AccessMeWithoutToken", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/auth/me", nil)
		w := httptest.NewRecorder()

		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusUnauthorized, w.Code)
	})

	// Step 2: Try to change password without token
	t.Run("Step2_ChangePasswordWithoutToken", func(t *testing.T) {
		payload := map[string]interface{}{
			"currentPassword": "old",
			"newPassword":     "new",
		}
		body, _ := json.Marshal(payload)

		req := httptest.NewRequest(http.MethodPost, "/api/auth/change-password", bytes.NewBuffer(body))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()

		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusUnauthorized, w.Code)
	})

	// Step 3: Try to create feed without token
	t.Run("Step3_CreateFeedWithoutToken", func(t *testing.T) {
		payload := map[string]interface{}{
			"name": "Unauthorized Feed",
			"url":  "wss://example.com/test",
		}
		body, _ := json.Marshal(payload)

		req := httptest.NewRequest(http.MethodPost, "/api/marketplace/feeds", bytes.NewBuffer(body))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()

		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusUnauthorized, w.Code)
	})

	// Step 4: Try with invalid token
	t.Run("Step4_AccessWithInvalidToken", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/auth/me", nil)
		req.Header.Set("Authorization", "Bearer invalid-token-12345")
		w := httptest.NewRecorder()

		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusUnauthorized, w.Code)
	})
}
