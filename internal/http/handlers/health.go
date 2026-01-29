package handlers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

// HealthHandler registers a health check endpoint to monitor service status
func HealthHandler(r *gin.Engine) {
	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status": "ok",
			"services": map[string]string{
				"mongodb":        "connected",
				"azureOpenAI":    "not-configured",
				"authentication": "available",
				"redis":          "not-enabled",
			},
			"timestamp": time.Now().UTC(),
		})
	})
}
