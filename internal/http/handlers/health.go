package handlers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

// HealthHandler registers a health check endpoint to monitor service status
func HealthHandler(r *gin.Engine) {
	r.GET("/health", healthCheck)
}

// healthCheck returns service health status
// @Summary      Health check
// @Description  Returns service health status and available services
// @Tags         Health
// @Produce      json
// @Success      200  {object}  map[string]interface{}
// @Router       /health [get]
func healthCheck(c *gin.Context) {
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
}
