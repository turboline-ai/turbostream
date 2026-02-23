package http

import (
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"

	"github.com/turboline-ai/turbostream/internal/config"
	"github.com/turboline-ai/turbostream/internal/http/handlers"
	"github.com/turboline-ai/turbostream/internal/services"
	"github.com/turboline-ai/turbostream/internal/socket"
)

type RouterDeps struct {
	Config        config.Config
	AuthService   *services.AuthService
	APIKeyService *services.APIKeyService
	Marketplace   *services.MarketplaceService
	Settings      *services.SettingsService
	LLM           *services.LLMService
	Sockets       *socket.Manager
	FeedBuffer    *services.FeedBufferService
}

// BuildEngine wires up the HTTP and Socket.IO server.
func BuildEngine(deps RouterDeps) *gin.Engine {
	router := gin.New()
	router.Use(gin.Logger())
	router.Use(gin.Recovery())

	// Security Headers - Add first to apply to all routes
	router.Use(SecurityHeadersMiddleware())

	// Global Rate Limiting - Lenient for general API usage
	router.Use(LenientRateLimitMiddleware())

	// Build server's own origin for API documentation
	// Include both the configured host and localhost for flexibility
	serverOrigin := fmt.Sprintf("http://%s:%d", deps.Config.Host, deps.Config.Port)
	localhostOrigin := fmt.Sprintf("http://localhost:%d", deps.Config.Port)
	allowedOrigins := []string{deps.Config.CORSOrigin, serverOrigin, localhostOrigin}

	router.Use(cors.New(cors.Config{
		AllowOrigins:     allowedOrigins,
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	// API Documentation - Scalar
	router.GET("/docs", ServeScalar)

	// Serve OpenAPI spec for Scalar
	router.StaticFile("/openapi/spec.json", "./docs/openapi.json")

	// Serve built Vite frontend assets
	router.Static("/assets", "./web/dist/assets")
	router.StaticFile("/favicon.ico", "./web/dist/favicon.ico")
	router.StaticFile("/favicon.svg", "./web/dist/favicon.svg")

	handlers.HealthHandler(router)

	// Auth routes (public + protected)
	authHandler := handlers.NewAuthHandler(deps.AuthService)
	// Public auth routes with strict rate limiting to prevent brute force
	publicAuth := router.Group("/api/auth", StrictRateLimitMiddleware())
	authHandler.RegisterPublic(publicAuth)
	// Protected auth routes with moderate rate limiting
	protectedAuth := router.Group("/api/auth", AuthMiddleware(deps.AuthService), ModerateRateLimitMiddleware())
	authHandler.RegisterProtected(protectedAuth)
	protectedAuth.GET("/token-usage", authHandler.GetTokenUsage)

	// API Key routes
	if deps.APIKeyService != nil {
		apiKeyHandler := handlers.NewAPIKeyHandler(deps.APIKeyService)
		apiKeyHandler.RegisterRoutes(protectedAuth)
	}

	// Marketplace routes
	marketplaceHandler := handlers.NewMarketplaceHandler(deps.Marketplace, deps.Sockets)
	marketplaceHandler.Buffer = deps.FeedBuffer
	marketplacePublic := router.Group("/api/marketplace")
	marketplaceProtected := router.Group("/api/marketplace", AuthMiddleware(deps.AuthService))
	marketplaceHandler.RegisterRoutes(marketplacePublic, marketplaceProtected)

	// Settings
	settingsHandler := handlers.NewSettingsHandler(deps.Settings)
	settingsGroup := router.Group("/api/settings")
	settingsHandler.RegisterRoutes(settingsGroup)

	// LLM routes
	if deps.LLM != nil {
		llmHandler := handlers.NewLLMHandler(deps.LLM, deps.Sockets)
		llmPublic := router.Group("/api/llm")
		{
			llmPublic.GET("/providers", llmHandler.GetProviders)
		}
		llmProtected := router.Group("/api/llm", AuthMiddleware(deps.AuthService))
		{
			llmProtected.GET("/context/:feedId", llmHandler.GetFeedContext)
			llmProtected.DELETE("/context/:feedId", llmHandler.ClearFeedContext)
			llmProtected.POST("/query", llmHandler.Query)
			llmProtected.POST("/query/stream", llmHandler.StreamQuery)
			llmProtected.POST("/analyze", llmHandler.Analyze)
		}
	}

	// Filters – stub endpoints for frontend compatibility
	router.GET("/api/filters", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"success": true, "data": []interface{}{}})
	})
	router.GET("/api/filter-presets", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"success": true, "data": []interface{}{}})
	})

	// SPA fallback: serve index.html for all non-API, non-docs browser routes
	router.NoRoute(func(c *gin.Context) {
		path := c.Request.URL.Path
		if strings.HasPrefix(path, "/api/") ||
			strings.HasPrefix(path, "/docs") ||
			strings.HasPrefix(path, "/openapi/") ||
			path == "/ws" {
			c.JSON(http.StatusNotFound, gin.H{"success": false, "message": "route not found"})
			return
		}
		c.File("./web/dist/index.html")
	})

	return router
}
