package handlers

import (
	"context"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/manasmudbari/realtime-crypto-analyzer/go-backend/internal/services"
)

type SettingsHandler struct {
	Service *services.SettingsService
}

func NewSettingsHandler(svc *services.SettingsService) *SettingsHandler {
	return &SettingsHandler{Service: svc}
}

func (h *SettingsHandler) RegisterRoutes(r *gin.RouterGroup) {
	r.GET("/categories", h.categories)
	r.GET("/categories/:key", h.category)
	r.GET("/all", h.allSettings)
	// User-scoped stubs for compatibility with the existing frontend.
	r.GET("/user/categories", h.userCategories)
	r.POST("/user/categories", h.createUserCategory)
	r.PUT("/user/categories/:key", h.updateUserCategory)
	r.DELETE("/user/categories/:key", h.deleteUserCategory)
	r.GET("/user/categories/check/:key", h.checkCategoryKey)
}

func (h *SettingsHandler) categories(c *gin.Context) {
	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()
	cats, err := h.Service.ListCategories(ctx)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "categories": cats})
}

func (h *SettingsHandler) category(c *gin.Context) {
	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()
	key := c.Param("key")
	cat, err := h.Service.GetCategory(ctx, key)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}
	if cat == nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "message": "not found"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": cat})
}

func (h *SettingsHandler) allSettings(c *gin.Context) {
	// For parity with the TS backend, this simply returns categories for now.
	h.categories(c)
}

// ---- User categories stubs (no persistence yet) ----

func (h *SettingsHandler) userCategories(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"success": true, "data": []interface{}{}})
}

func (h *SettingsHandler) createUserCategory(c *gin.Context) {
	var body struct {
		Label string `json:"label"`
		Key   string `json:"key"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "invalid payload"})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": map[string]interface{}{
			"_id":       "temporary-id",
			"key":       body.Key,
			"label":     body.Label,
			"scope":     "user",
			"userId":    c.GetString("userId"), // may be empty if unauthenticated
			"isActive":  true,
			"createdAt": time.Now(),
			"updatedAt": time.Now(),
		},
	})
}

func (h *SettingsHandler) updateUserCategory(c *gin.Context) {
	key := c.Param("key")
	var body map[string]interface{}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "invalid payload"})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": map[string]interface{}{
			"key":       key,
			"label":     body["label"],
			"scope":     "user",
			"isActive":  true,
			"updatedAt": time.Now(),
		},
	})
}

func (h *SettingsHandler) deleteUserCategory(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "deleted"})
}

func (h *SettingsHandler) checkCategoryKey(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"success": true, "data": map[string]interface{}{"available": true}})
}
