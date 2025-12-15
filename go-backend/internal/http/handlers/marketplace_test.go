package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"

	"github.com/turboline-ai/turbostream/go-backend/internal/models"
	"github.com/turboline-ai/turbostream/go-backend/internal/services"
	"github.com/turboline-ai/turbostream/go-backend/internal/socket"
)

func setupMarketplaceHandler(t *testing.T) (*MarketplaceHandler, *services.MarketplaceService, primitive.ObjectID, func()) {
	ctx := context.Background()

	clientOpts := options.Client().ApplyURI("mongodb://localhost:27017")
	client, err := mongo.Connect(ctx, clientOpts)
	if err != nil {
		t.Skip("MongoDB not available for testing:", err)
		return nil, nil, primitive.NilObjectID, func() {}
	}

	dbName := "test_marketplace_" + primitive.NewObjectID().Hex()
	db := client.Database(dbName)

	marketplaceService := services.NewMarketplaceService(db)
	socketManager := socket.NewManager(nil, nil, marketplaceService)
	handler := NewMarketplaceHandler(marketplaceService, socketManager)

	testUserID := primitive.NewObjectID()

	cleanup := func() {
		_ = db.Drop(ctx)
		_ = client.Disconnect(ctx)
	}

	return handler, marketplaceService, testUserID, cleanup
}

func TestMarketplaceHandler_ListFeeds(t *testing.T) {
	handler, marketplaceService, _, cleanup := setupMarketplaceHandler(t)
	if handler == nil {
		t.Skip("Skipping test: MongoDB not available")
	}
	defer cleanup()

	router := setupTestRouter()
	public := router.Group("/api/marketplace")
	handler.RegisterRoutes(public, public)

	// Create test feeds
	ctx := context.Background()
	feed1 := models.WebSocketFeed{
		Name:     "Public Feed 1",
		URL:      "wss://example.com/feed1",
		Category: "Crypto",
		IsPublic: true,
	}
	_, err := marketplaceService.CreateFeed(ctx, feed1)
	require.NoError(t, err)

	feed2 := models.WebSocketFeed{
		Name:     "Public Feed 2",
		URL:      "wss://example.com/feed2",
		Category: "News",
		IsPublic: true,
	}
	_, err = marketplaceService.CreateFeed(ctx, feed2)
	require.NoError(t, err)

	tests := []struct {
		name           string
		queryParams    string
		expectedStatus int
		checkResponse  func(*testing.T, map[string]interface{})
	}{
		{
			name:           "list all feeds",
			queryParams:    "",
			expectedStatus: http.StatusOK,
			checkResponse: func(t *testing.T, resp map[string]interface{}) {
				assert.True(t, resp["success"].(bool))
				data := resp["data"].([]interface{})
				assert.GreaterOrEqual(t, len(data), 2)
			},
		},
		{
			name:           "filter by category",
			queryParams:    "?category=Crypto",
			expectedStatus: http.StatusOK,
			checkResponse: func(t *testing.T, resp map[string]interface{}) {
				assert.True(t, resp["success"].(bool))
				data := resp["data"].([]interface{})
				assert.GreaterOrEqual(t, len(data), 1)
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req, _ := http.NewRequest(http.MethodGet, "/api/marketplace/feeds"+tt.queryParams, nil)
			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			assert.Equal(t, tt.expectedStatus, w.Code)

			var response map[string]interface{}
			err := json.Unmarshal(w.Body.Bytes(), &response)
			require.NoError(t, err)

			if tt.checkResponse != nil {
				tt.checkResponse(t, response)
			}
		})
	}
}

func TestMarketplaceHandler_GetFeed(t *testing.T) {
	handler, marketplaceService, _, cleanup := setupMarketplaceHandler(t)
	if handler == nil {
		t.Skip("Skipping test: MongoDB not available")
	}
	defer cleanup()

	router := setupTestRouter()
	public := router.Group("/api/marketplace")
	handler.RegisterRoutes(public, public)

	// Create a test feed
	ctx := context.Background()
	feed := models.WebSocketFeed{
		Name:     "Test Feed",
		URL:      "wss://example.com/feed",
		Category: "Test",
		IsPublic: true,
	}
	created, err := marketplaceService.CreateFeed(ctx, feed)
	require.NoError(t, err)

	tests := []struct {
		name           string
		feedID         string
		expectedStatus int
		checkResponse  func(*testing.T, map[string]interface{})
	}{
		{
			name:           "get existing feed",
			feedID:         created.ID.Hex(),
			expectedStatus: http.StatusOK,
			checkResponse: func(t *testing.T, resp map[string]interface{}) {
				assert.True(t, resp["success"].(bool))
				data := resp["data"].(map[string]interface{})
				assert.Equal(t, "Test Feed", data["name"])
			},
		},
		{
			name:           "get non-existent feed",
			feedID:         primitive.NewObjectID().Hex(),
			expectedStatus: http.StatusNotFound,
			checkResponse: func(t *testing.T, resp map[string]interface{}) {
				assert.False(t, resp["success"].(bool))
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req, _ := http.NewRequest(http.MethodGet, "/api/marketplace/feeds/"+tt.feedID, nil)
			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			assert.Equal(t, tt.expectedStatus, w.Code)

			var response map[string]interface{}
			err := json.Unmarshal(w.Body.Bytes(), &response)
			require.NoError(t, err)

			if tt.checkResponse != nil {
				tt.checkResponse(t, response)
			}
		})
	}
}

func TestMarketplaceHandler_CreateFeed(t *testing.T) {
	handler, _, testUserID, cleanup := setupMarketplaceHandler(t)
	if handler == nil {
		t.Skip("Skipping test: MongoDB not available")
	}
	defer cleanup()

	router := setupTestRouter()
	protected := router.Group("/api/marketplace")
	handler.RegisterRoutes(protected, protected)

	tests := []struct {
		name           string
		payload        map[string]interface{}
		expectedStatus int
		checkResponse  func(*testing.T, map[string]interface{})
	}{
		{
			name: "create feed successfully",
			payload: map[string]interface{}{
				"name":           "New Feed",
				"description":    "A new test feed",
				"url":            "wss://example.com/new",
				"category":       "Test",
				"isPublic":       true,
				"connectionType": "websocket",
				"eventName":      "message",
				"dataFormat":     "json",
			},
			expectedStatus: http.StatusCreated,
			checkResponse: func(t *testing.T, resp map[string]interface{}) {
				assert.True(t, resp["success"].(bool))
				data := resp["data"].(map[string]interface{})
				assert.Equal(t, "New Feed", data["name"])
				assert.NotEmpty(t, data["_id"])
			},
		},
		{
			name: "minimal payload",
			payload: map[string]interface{}{
				"name": "",
				"url":  "",
			},
			expectedStatus: http.StatusCreated,
			checkResponse: func(t *testing.T, resp map[string]interface{}) {
				assert.True(t, resp["success"].(bool))
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			payload, err := json.Marshal(tt.payload)
			require.NoError(t, err)

			req, _ := http.NewRequest(http.MethodPost, "/api/marketplace/feeds", bytes.NewBuffer(payload))
			req.Header.Set("Content-Type", "application/json")

			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)
			c.Request = req
			c.Set("userId", testUserID)
			c.Set("username", "Test User")

			handler.createFeed(c)

			assert.Equal(t, tt.expectedStatus, w.Code)

			var response map[string]interface{}
			err = json.Unmarshal(w.Body.Bytes(), &response)
			require.NoError(t, err)

			if tt.checkResponse != nil {
				tt.checkResponse(t, response)
			}
		})
	}
}

func TestMarketplaceHandler_Subscribe(t *testing.T) {
	handler, marketplaceService, testUserID, cleanup := setupMarketplaceHandler(t)
	if handler == nil {
		t.Skip("Skipping test: MongoDB not available")
	}
	defer cleanup()

	// Create a test feed
	ctx := context.Background()
	feed := models.WebSocketFeed{
		Name:     "Subscribe Test Feed",
		URL:      "wss://example.com/feed",
		Category: "Test",
		IsPublic: true,
	}
	created, err := marketplaceService.CreateFeed(ctx, feed)
	require.NoError(t, err)

	req, _ := http.NewRequest(http.MethodPost, "/api/marketplace/subscribe/"+created.ID.Hex(), nil)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = req
	c.Params = gin.Params{{Key: "feedId", Value: created.ID.Hex()}}
	c.Set("userId", testUserID)

	handler.subscribe(c)

	assert.Equal(t, http.StatusOK, w.Code)

	var response map[string]interface{}
	err = json.Unmarshal(w.Body.Bytes(), &response)
	require.NoError(t, err)

	assert.True(t, response["success"].(bool))
	assert.Contains(t, response["message"].(string), "Subscribed")

	// Verify subscription was created
	subs, err := marketplaceService.GetSubscriptions(ctx, testUserID.Hex())
	require.NoError(t, err)
	assert.GreaterOrEqual(t, len(subs), 1)
}

func TestMarketplaceHandler_Unsubscribe(t *testing.T) {
	handler, marketplaceService, testUserID, cleanup := setupMarketplaceHandler(t)
	if handler == nil {
		t.Skip("Skipping test: MongoDB not available")
	}
	defer cleanup()

	// Create a feed and subscribe
	ctx := context.Background()
	feed := models.WebSocketFeed{
		Name:     "Unsubscribe Test Feed",
		URL:      "wss://example.com/feed",
		Category: "Test",
		IsPublic: true,
	}
	created, err := marketplaceService.CreateFeed(ctx, feed)
	require.NoError(t, err)

	_, err = marketplaceService.Subscribe(ctx, testUserID.Hex(), created.ID.Hex(), "")
	require.NoError(t, err)

	req, _ := http.NewRequest(http.MethodPost, "/api/marketplace/unsubscribe/"+created.ID.Hex(), nil)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = req
	c.Params = gin.Params{{Key: "feedId", Value: created.ID.Hex()}}
	c.Set("userId", testUserID)

	handler.unsubscribe(c)

	assert.Equal(t, http.StatusOK, w.Code)

	var response map[string]interface{}
	err = json.Unmarshal(w.Body.Bytes(), &response)
	require.NoError(t, err)

	assert.True(t, response["success"].(bool))
	assert.Contains(t, response["message"].(string), "Unsubscribed")
}

func TestMarketplaceHandler_DeleteFeed(t *testing.T) {
	handler, marketplaceService, testUserID, cleanup := setupMarketplaceHandler(t)
	if handler == nil {
		t.Skip("Skipping test: MongoDB not available")
	}
	defer cleanup()

	// Create a feed owned by testUser
	ctx := context.Background()
	feed := models.WebSocketFeed{
		Name:      "Delete Test Feed",
		URL:       "wss://example.com/feed",
		Category:  "Test",
		IsPublic:  true,
		OwnerID:   testUserID.Hex(),
		OwnerName: "Test User",
	}
	created, err := marketplaceService.CreateFeed(ctx, feed)
	require.NoError(t, err)

	tests := []struct {
		name           string
		feedID         string
		userID         primitive.ObjectID
		expectedStatus int
		checkResponse  func(*testing.T, map[string]interface{})
	}{
		{
			name:           "delete own feed",
			feedID:         created.ID.Hex(),
			userID:         testUserID,
			expectedStatus: http.StatusOK,
			checkResponse: func(t *testing.T, resp map[string]interface{}) {
				assert.True(t, resp["success"].(bool))
			},
		},
		{
			name:           "delete non-existent feed",
			feedID:         primitive.NewObjectID().Hex(),
			userID:         testUserID,
			expectedStatus: http.StatusForbidden,
			checkResponse: func(t *testing.T, resp map[string]interface{}) {
				assert.False(t, resp["success"].(bool))
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req, _ := http.NewRequest(http.MethodDelete, "/api/marketplace/feeds/"+tt.feedID, nil)

			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)
			c.Request = req
			c.Params = gin.Params{{Key: "id", Value: tt.feedID}}
			c.Set("userId", tt.userID)

			handler.deleteFeed(c)

			assert.Equal(t, tt.expectedStatus, w.Code)

			var response map[string]interface{}
			err = json.Unmarshal(w.Body.Bytes(), &response)
			require.NoError(t, err)

			if tt.checkResponse != nil {
				tt.checkResponse(t, response)
			}
		})
	}
}

func TestMarketplaceHandler_SearchFeeds(t *testing.T) {
	handler, marketplaceService, _, cleanup := setupMarketplaceHandler(t)
	if handler == nil {
		t.Skip("Skipping test: MongoDB not available")
	}
	defer cleanup()

	router := setupTestRouter()
	public := router.Group("/api/marketplace")
	handler.RegisterRoutes(public, public)

	// Create searchable feeds
	ctx := context.Background()
	feed1 := models.WebSocketFeed{
		Name:        "Bitcoin Price Feed",
		Description: "Real-time BTC prices",
		URL:         "wss://example.com/btc",
		Category:    "Crypto",
		IsPublic:    true,
	}
	_, err := marketplaceService.CreateFeed(ctx, feed1)
	require.NoError(t, err)

	tests := []struct {
		name           string
		query          string
		expectedStatus int
		minResults     int
	}{
		{
			name:           "search by name",
			query:          "?q=Bitcoin",
			expectedStatus: http.StatusOK,
			minResults:     1,
		},
		{
			name:           "search with no query",
			query:          "?q=",
			expectedStatus: http.StatusBadRequest,
			minResults:     0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req, _ := http.NewRequest(http.MethodGet, "/api/marketplace/feeds/search"+tt.query, nil)
			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			assert.Equal(t, tt.expectedStatus, w.Code)

			if tt.expectedStatus == http.StatusOK {
				var response map[string]interface{}
				err := json.Unmarshal(w.Body.Bytes(), &response)
				require.NoError(t, err)

				assert.True(t, response["success"].(bool))
				data := response["data"].([]interface{})
				assert.GreaterOrEqual(t, len(data), tt.minResults)
			}
		})
	}
}
