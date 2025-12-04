package handlers

import (
	"context"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson/primitive"

	"github.com/turboline-ai/turbostream/go-backend/internal/services"
)

type AuthHandler struct {
	Service *services.AuthService
}

func NewAuthHandler(service *services.AuthService) *AuthHandler {
	return &AuthHandler{Service: service}
}

// RegisterPublic attaches endpoints that do not require authentication.
func (h *AuthHandler) RegisterPublic(r *gin.RouterGroup) {
	r.POST("/register", h.register)
	r.POST("/login", h.login)
}

// RegisterProtected attaches endpoints that require a valid JWT.
func (h *AuthHandler) RegisterProtected(r *gin.RouterGroup) {
	r.GET("/me", h.me)
	r.POST("/logout", h.logout)
	r.POST("/change-password", h.changePassword)
	r.POST("/2fa/setup", h.twoFactorSetup)
	r.POST("/2fa/enable", h.enableTwoFactor)
	r.POST("/2fa/disable", h.disableTwoFactor)
	r.GET("/2fa/backup-codes/status", h.backupCodeStatus)
	r.POST("/2fa/backup-codes/regenerate", h.regenerateBackupCodes)
	r.GET("/sessions", h.sessions)
	r.DELETE("/sessions/:id", h.terminateSession)
	r.POST("/sessions/terminate-others", h.terminateOthers)
	r.GET("/login-activity", h.loginActivity)
}
func (h *AuthHandler) register(c *gin.Context) {
	var body struct {
		Email    string `json:"email"`
		Password string `json:"password"`
		Name     string `json:"name"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "invalid payload"})
		return
	}
	ctx, cancel := contextWithTimeout(c)
	defer cancel()

	token, user, err := h.Service.Register(ctx, body.Email, body.Password, body.Name)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"success": true, "message": "User registered successfully", "token": token, "user": user})
}

func (h *AuthHandler) login(c *gin.Context) {
	var body struct {
		Email     string `json:"email"`
		Password  string `json:"password"`
		TotpToken string `json:"totpToken"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "invalid payload"})
		return
	}
	ctx, cancel := contextWithTimeout(c)
	defer cancel()

	token, user, err := h.Service.Login(ctx, body.Email, body.Password, body.TotpToken, c.ClientIP(), c.Request.UserAgent())
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "message": err.Error(), "requiresTwoFactor": user.TwoFactor})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Login successful", "token": token, "user": user})
}

func (h *AuthHandler) me(c *gin.Context) {
	userID := c.MustGet("userId").(primitive.ObjectID)
	ctx, cancel := contextWithTimeout(c)
	defer cancel()
	user, err := h.Service.GetUser(ctx, userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "message": "User not found"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "user": user})
}

func (h *AuthHandler) GetTokenUsage(c *gin.Context) {
	userID := c.MustGet("userId").(primitive.ObjectID)
	ctx, cancel := contextWithTimeout(c)
	defer cancel()
	user, err := h.Service.GetUser(ctx, userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "message": "User not found"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "tokenUsage": user.TokenUsage})
}

func (h *AuthHandler) logout(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Logout successful"})
}

func (h *AuthHandler) changePassword(c *gin.Context) {
	var body struct {
		CurrentPassword string `json:"currentPassword"`
		NewPassword     string `json:"newPassword"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "invalid payload"})
		return
	}
	userID := c.MustGet("userId").(primitive.ObjectID)
	ctx, cancel := contextWithTimeout(c)
	defer cancel()
	if err := h.Service.ChangePassword(ctx, userID, body.CurrentPassword, body.NewPassword); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true})
}

func (h *AuthHandler) twoFactorSetup(c *gin.Context) {
	email := c.GetString("userEmail")
	secret, qr, manual, err := h.Service.TwoFactorSetup(email)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{"secret": secret, "qrCodeUrl": qr, "manualEntryKey": manual}})
}

func (h *AuthHandler) enableTwoFactor(c *gin.Context) {
	var body struct {
		Secret string `json:"secret"`
		Token  string `json:"token"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "invalid payload"})
		return
	}
	userID := c.MustGet("userId").(primitive.ObjectID)
	ctx, cancel := contextWithTimeout(c)
	defer cancel()
	codes, err := h.Service.EnableTwoFactor(ctx, userID, body.Secret, body.Token)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "backupCodes": codes})
}

func (h *AuthHandler) disableTwoFactor(c *gin.Context) {
	userID := c.MustGet("userId").(primitive.ObjectID)
	ctx, cancel := contextWithTimeout(c)
	defer cancel()
	if err := h.Service.DisableTwoFactor(ctx, userID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true})
}

func (h *AuthHandler) backupCodeStatus(c *gin.Context) {
	userID := c.MustGet("userId").(primitive.ObjectID)
	ctx, cancel := contextWithTimeout(c)
	defer cancel()
	count, err := h.Service.GetBackupCodeStatus(ctx, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "unusedCount": count})
}

func (h *AuthHandler) regenerateBackupCodes(c *gin.Context) {
	var body struct {
		Token string `json:"token"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "invalid payload"})
		return
	}
	userID := c.MustGet("userId").(primitive.ObjectID)
	ctx, cancel := contextWithTimeout(c)
	defer cancel()
	codes, err := h.Service.RegenerateBackupCodes(ctx, userID, body.Token)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "backupCodes": codes})
}

func (h *AuthHandler) sessions(c *gin.Context) {
	userID := c.MustGet("userId").(primitive.ObjectID)
	ctx, cancel := contextWithTimeout(c)
	defer cancel()
	sessions, err := h.Service.GetSessions(ctx, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "sessions": sessions})
}

func (h *AuthHandler) terminateSession(c *gin.Context) {
	userID := c.MustGet("userId").(primitive.ObjectID)
	sid, err := primitive.ObjectIDFromHex(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "invalid session id"})
		return
	}
	ctx, cancel := contextWithTimeout(c)
	defer cancel()
	if err := h.Service.TerminateSession(ctx, userID, sid); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true})
}

func (h *AuthHandler) terminateOthers(c *gin.Context) {
	userID := c.MustGet("userId").(primitive.ObjectID)
	ctx, cancel := contextWithTimeout(c)
	defer cancel()
	count, err := h.Service.TerminateOtherSessions(ctx, userID, primitive.NilObjectID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "terminatedCount": count})
}

func (h *AuthHandler) loginActivity(c *gin.Context) {
	userID := c.MustGet("userId").(primitive.ObjectID)
	limit := int64(10)
	if l := c.Query("limit"); l != "" {
		if parsed, err := strconv.ParseInt(l, 10, 64); err == nil && parsed > 0 {
			limit = parsed
		}
	}
	ctx, cancel := contextWithTimeout(c)
	defer cancel()
	activities, err := h.Service.GetLoginActivity(ctx, userID, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "activities": activities})
}

// contextWithTimeout aligns request-scoped timeouts with the config default.
func contextWithTimeout(c *gin.Context) (context.Context, context.CancelFunc) {
	return context.WithTimeout(c.Request.Context(), 15*time.Second)
}
