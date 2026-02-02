package handlers

import (
	"context"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson/primitive"

	"github.com/turboline-ai/turbostream/internal/services"
)

// APIKeyHandler handles HTTP requests for API key management
type APIKeyHandler struct {
	Service *services.APIKeyService
}

// NewAPIKeyHandler creates a new API key handler instance
func NewAPIKeyHandler(service *services.APIKeyService) *APIKeyHandler {
	return &APIKeyHandler{Service: service}
}

// RegisterRoutes attaches API key endpoints to a router group (requires authentication)
func (h *APIKeyHandler) RegisterRoutes(r *gin.RouterGroup) {
	r.POST("/api-keys", h.createAPIKey)
	r.GET("/api-keys", h.listAPIKeys)
	r.DELETE("/api-keys/:id", h.revokeAPIKey)
}

// createAPIKey godoc
// @Summary      Create new API key
// @Description  Generates a new API key with specified name and scopes for websocket operations
// @Tags         api-keys
// @Accept       json
// @Produce      json
// @Param        request body object{name=string,scopes=[]string} true "API key details"
// @Success      201 {object} object{success=bool,message=string,apiKey=object{_id=string,name=string,prefix=string,lastChars=string,scopes=[]string,createdAt=string},key=string}
// @Failure      400 {object} object{success=bool,message=string}
// @Failure      401 {object} object{success=bool,message=string}
// @Security     BearerAuth
// @Router       /api/auth/api-keys [post]
func (h *APIKeyHandler) createAPIKey(c *gin.Context) {
	var body struct {
		Name   string   `json:"name" binding:"required"`
		Scopes []string `json:"scopes" binding:"required,min=1"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "invalid payload: name and scopes required"})
		return
	}

	// Validate scopes
	for _, scope := range body.Scopes {
		if !services.ValidScopes[scope] {
			c.JSON(http.StatusBadRequest, gin.H{
				"success": false,
				"message": "invalid scope: " + scope + ". Valid scopes: websocket:subscribe, websocket:llm, websocket:topic, websocket:*",
			})
			return
		}
	}

	userID := c.MustGet("userId").(primitive.ObjectID)
	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	apiKey, rawKey, err := h.Service.GenerateKey(ctx, userID, body.Name, body.Scopes)
	if err != nil {
		if err == services.ErrDuplicateKeyName {
			c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "API key with this name already exists"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "failed to generate API key"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"message": "API key created successfully. Store this key securely - it will not be shown again.",
		"apiKey":  apiKey,
		"key":     rawKey,
	})
}

// listAPIKeys godoc
// @Summary      List API keys
// @Description  Retrieves all active API keys for the authenticated user
// @Tags         api-keys
// @Accept       json
// @Produce      json
// @Success      200 {object} object{success=bool,apiKeys=[]object}
// @Failure      401 {object} object{success=bool,message=string}
// @Failure      500 {object} object{success=bool,message=string}
// @Security     BearerAuth
// @Router       /api/auth/api-keys [get]
func (h *APIKeyHandler) listAPIKeys(c *gin.Context) {
	userID := c.MustGet("userId").(primitive.ObjectID)
	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	keys, err := h.Service.ListKeys(ctx, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "failed to retrieve API keys"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"apiKeys": keys,
	})
}

// revokeAPIKey godoc
// @Summary      Revoke API key
// @Description  Revokes (deactivates) an API key by ID
// @Tags         api-keys
// @Accept       json
// @Produce      json
// @Param        id path string true "API Key ID"
// @Success      200 {object} object{success=bool,message=string}
// @Failure      400 {object} object{success=bool,message=string}
// @Failure      401 {object} object{success=bool,message=string}
// @Failure      404 {object} object{success=bool,message=string}
// @Security     BearerAuth
// @Router       /api/auth/api-keys/{id} [delete]
func (h *APIKeyHandler) revokeAPIKey(c *gin.Context) {
	keyIDStr := c.Param("id")
	keyID, err := primitive.ObjectIDFromHex(keyIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "invalid API key ID"})
		return
	}

	userID := c.MustGet("userId").(primitive.ObjectID)
	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	if err := h.Service.RevokeKey(ctx, userID, keyID); err != nil {
		if err.Error() == "API key not found" {
			c.JSON(http.StatusNotFound, gin.H{"success": false, "message": "API key not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "failed to revoke API key"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "API key revoked successfully",
	})
}
