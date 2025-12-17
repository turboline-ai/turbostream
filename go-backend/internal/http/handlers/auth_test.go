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

	"github.com/turboline-ai/turbostream/go-backend/internal/config"
	"github.com/turboline-ai/turbostream/go-backend/internal/services"
)

func setupAuthHandler(t *testing.T) (*AuthHandler, *services.AuthService, func()) {
	ctx := context.Background()

	clientOpts := options.Client().ApplyURI("mongodb://localhost:27017")
	client, err := mongo.Connect(ctx, clientOpts)
	if err != nil {
		t.Skip("MongoDB not available for testing:", err)
		return nil, nil, func() {}
	}

	dbName := "test_turbostream_handlers_" + primitive.NewObjectID().Hex()
	db := client.Database(dbName)

	cfg := config.Config{
		JWTSecret:          "test-secret-key-for-testing-only",
		TokenQuotaPerMonth: 1000000,
	}

	authService := services.NewAuthService(cfg, client, db)
	handler := NewAuthHandler(authService)

	cleanup := func() {
		_ = db.Drop(ctx)
		_ = client.Disconnect(ctx)
	}

	return handler, authService, cleanup
}

func setupTestRouter() *gin.Engine {
	gin.SetMode(gin.TestMode)
	return gin.New()
}

func TestAuthHandler_Register(t *testing.T) {
	handler, _, cleanup := setupAuthHandler(t)
	if handler == nil {
		t.Skip("Skipping test: MongoDB not available")
	}
	defer cleanup()

	router := setupTestRouter()
	public := router.Group("/api/auth")
	handler.RegisterPublic(public)

	tests := []struct {
		name           string
		payload        map[string]string
		expectedStatus int
		checkResponse  func(*testing.T, map[string]interface{})
	}{
		{
			name: "successful registration",
			payload: map[string]string{
				"email":    "test@example.com",
				"password": "password123",
				"name":     "Test User",
			},
			expectedStatus: http.StatusCreated,
			checkResponse: func(t *testing.T, resp map[string]interface{}) {
				assert.True(t, resp["success"].(bool))
				assert.NotEmpty(t, resp["token"])
				user := resp["user"].(map[string]interface{})
				assert.Equal(t, "test@example.com", user["email"])
				assert.Equal(t, "Test User", user["name"])
			},
		},
		{
			name: "missing email",
			payload: map[string]string{
				"password": "password123",
				"name":     "Test User",
			},
			expectedStatus: http.StatusBadRequest,
			checkResponse: func(t *testing.T, resp map[string]interface{}) {
				assert.False(t, resp["success"].(bool))
			},
		},
		{
			name: "duplicate email",
			payload: map[string]string{
				"email":    "duplicate@example.com",
				"password": "password123",
				"name":     "Test User",
			},
			expectedStatus: http.StatusBadRequest,
			checkResponse: func(t *testing.T, resp map[string]interface{}) {
				assert.False(t, resp["success"].(bool))
				assert.Contains(t, resp["message"].(string), "user already exists")
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Pre-create user for duplicate test
			if tt.name == "duplicate email" {
				payload, _ := json.Marshal(tt.payload)
				req, _ := http.NewRequest(http.MethodPost, "/api/auth/register", bytes.NewBuffer(payload))
				req.Header.Set("Content-Type", "application/json")
				w := httptest.NewRecorder()
				router.ServeHTTP(w, req)
			}

			payload, err := json.Marshal(tt.payload)
			require.NoError(t, err)

			req, _ := http.NewRequest(http.MethodPost, "/api/auth/register", bytes.NewBuffer(payload))
			req.Header.Set("Content-Type", "application/json")

			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

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

func TestAuthHandler_Login(t *testing.T) {
	handler, authService, cleanup := setupAuthHandler(t)
	if handler == nil {
		t.Skip("Skipping test: MongoDB not available")
	}
	defer cleanup()

	router := setupTestRouter()
	public := router.Group("/api/auth")
	handler.RegisterPublic(public)

	// Create a test user
	ctx := context.Background()
	email := "login@example.com"
	password := "correctpassword"
	_, _, err := authService.Register(ctx, email, password, "Login Test")
	require.NoError(t, err)

	tests := []struct {
		name           string
		payload        map[string]string
		expectedStatus int
		checkResponse  func(*testing.T, map[string]interface{})
	}{
		{
			name: "successful login",
			payload: map[string]string{
				"email":    email,
				"password": password,
			},
			expectedStatus: http.StatusOK,
			checkResponse: func(t *testing.T, resp map[string]interface{}) {
				assert.True(t, resp["success"].(bool))
				assert.NotEmpty(t, resp["token"])
				user := resp["user"].(map[string]interface{})
				assert.Equal(t, email, user["email"])
			},
		},
		{
			name: "wrong password",
			payload: map[string]string{
				"email":    email,
				"password": "wrongpassword",
			},
			expectedStatus: http.StatusUnauthorized,
			checkResponse: func(t *testing.T, resp map[string]interface{}) {
				assert.False(t, resp["success"].(bool))
				assert.Contains(t, resp["message"].(string), "invalid email or password")
			},
		},
		{
			name: "non-existent user",
			payload: map[string]string{
				"email":    "nonexistent@example.com",
				"password": "password123",
			},
			expectedStatus: http.StatusUnauthorized,
			checkResponse: func(t *testing.T, resp map[string]interface{}) {
				assert.False(t, resp["success"].(bool))
			},
		},
		{
			name: "empty credentials",
			payload: map[string]string{
				"email":    "",
				"password": "",
			},
			expectedStatus: http.StatusUnauthorized,
			checkResponse: func(t *testing.T, resp map[string]interface{}) {
				assert.False(t, resp["success"].(bool))
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			payload, err := json.Marshal(tt.payload)
			require.NoError(t, err)

			req, _ := http.NewRequest(http.MethodPost, "/api/auth/login", bytes.NewBuffer(payload))
			req.Header.Set("Content-Type", "application/json")

			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

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

func TestAuthHandler_Me(t *testing.T) {
	handler, authService, cleanup := setupAuthHandler(t)
	if handler == nil {
		t.Skip("Skipping test: MongoDB not available")
	}
	defer cleanup()

	router := setupTestRouter()
	protected := router.Group("/api/auth")
	handler.RegisterProtected(protected)

	// Create a test user
	ctx := context.Background()
	_, user, err := authService.Register(ctx, "me@example.com", "password", "Me Test")
	require.NoError(t, err)

	tests := []struct {
		name           string
		userID         primitive.ObjectID
		expectedStatus int
		checkResponse  func(*testing.T, map[string]interface{})
	}{
		{
			name:           "get user info",
			userID:         user.ID,
			expectedStatus: http.StatusOK,
			checkResponse: func(t *testing.T, resp map[string]interface{}) {
				assert.True(t, resp["success"].(bool))
				userData := resp["user"].(map[string]interface{})
				assert.Equal(t, "me@example.com", userData["email"])
			},
		},
		{
			name:           "non-existent user",
			userID:         primitive.NewObjectID(),
			expectedStatus: http.StatusNotFound,
			checkResponse: func(t *testing.T, resp map[string]interface{}) {
				assert.False(t, resp["success"].(bool))
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req, _ := http.NewRequest(http.MethodGet, "/api/auth/me", nil)

			// Mock authentication middleware by setting userId in context
			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)
			c.Request = req
			c.Set("userId", tt.userID)

			handler.me(c)

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

func TestAuthHandler_ChangePassword(t *testing.T) {
	handler, authService, cleanup := setupAuthHandler(t)
	if handler == nil {
		t.Skip("Skipping test: MongoDB not available")
	}
	defer cleanup()

	// Create a test user
	ctx := context.Background()
	currentPassword := "oldpassword"
	_, user, err := authService.Register(ctx, "change@example.com", currentPassword, "Change Test")
	require.NoError(t, err)

	tests := []struct {
		name           string
		payload        map[string]string
		expectedStatus int
		checkResponse  func(*testing.T, map[string]interface{})
	}{
		{
			name: "successful password change",
			payload: map[string]string{
				"currentPassword": currentPassword,
				"newPassword":     "newsecurepassword",
			},
			expectedStatus: http.StatusOK,
			checkResponse: func(t *testing.T, resp map[string]interface{}) {
				assert.True(t, resp["success"].(bool))
			},
		},
		{
			name: "wrong current password",
			payload: map[string]string{
				"currentPassword": "wrongpassword",
				"newPassword":     "newsecurepassword",
			},
			expectedStatus: http.StatusBadRequest,
			checkResponse: func(t *testing.T, resp map[string]interface{}) {
				assert.False(t, resp["success"].(bool))
				assert.Contains(t, resp["message"].(string), "incorrect")
			},
		},
		{
			name:           "invalid payload",
			payload:        map[string]string{},
			expectedStatus: http.StatusBadRequest,
			checkResponse: func(t *testing.T, resp map[string]interface{}) {
				assert.False(t, resp["success"].(bool))
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			payload, err := json.Marshal(tt.payload)
			require.NoError(t, err)

			req, _ := http.NewRequest(http.MethodPost, "/api/auth/change-password", bytes.NewBuffer(payload))
			req.Header.Set("Content-Type", "application/json")

			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)
			c.Request = req
			c.Set("userId", user.ID)

			handler.changePassword(c)

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

func TestAuthHandler_TwoFactorSetup(t *testing.T) {
	handler, _, cleanup := setupAuthHandler(t)
	if handler == nil {
		t.Skip("Skipping test: MongoDB not available")
	}
	defer cleanup()

	req, _ := http.NewRequest(http.MethodPost, "/api/auth/2fa/setup", nil)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = req
	c.Set("userEmail", "2fa@example.com")

	handler.twoFactorSetup(c)

	assert.Equal(t, http.StatusOK, w.Code)

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	require.NoError(t, err)

	assert.True(t, response["success"].(bool))
	data := response["data"].(map[string]interface{})
	assert.NotEmpty(t, data["secret"])
	assert.NotEmpty(t, data["qrCodeUrl"])
	assert.NotEmpty(t, data["manualEntryKey"])
	assert.Contains(t, data["qrCodeUrl"].(string), "data:image/png;base64,")
}

func TestAuthHandler_Logout(t *testing.T) {
	handler, _, cleanup := setupAuthHandler(t)
	if handler == nil {
		t.Skip("Skipping test: MongoDB not available")
	}
	defer cleanup()

	req, _ := http.NewRequest(http.MethodPost, "/api/auth/logout", nil)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = req

	handler.logout(c)

	assert.Equal(t, http.StatusOK, w.Code)

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	require.NoError(t, err)

	assert.True(t, response["success"].(bool))
	assert.Contains(t, response["message"].(string), "Logout successful")
}
