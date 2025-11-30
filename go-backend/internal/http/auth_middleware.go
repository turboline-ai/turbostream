package http

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson/primitive"

	"github.com/manasmudbari/realtime-crypto-analyzer/go-backend/internal/services"
)

// AuthMiddleware verifies the JWT and injects userId/email/username into the context.
func AuthMiddleware(auth *services.AuthService) gin.HandlerFunc {
	return func(c *gin.Context) {
		header := c.GetHeader("Authorization")
		if header == "" || !strings.HasPrefix(strings.ToLower(header), "bearer ") {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"success": false, "message": "missing token"})
			return
		}
		token := strings.TrimSpace(strings.TrimPrefix(header, "Bearer"))
		claims, err := auth.ParseToken(token)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"success": false, "message": "invalid token"})
			return
		}
		userIDStr, _ := claims["userId"].(string)
		userOID, err := primitive.ObjectIDFromHex(userIDStr)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"success": false, "message": "invalid token"})
			return
		}
		c.Set("userId", userOID)
		c.Set("userEmail", claims["email"])
		c.Set("username", claims["username"])
		c.Next()
	}
}
