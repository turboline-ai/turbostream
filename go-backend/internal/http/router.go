package http

import (
	"net/http"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"

	"github.com/manasmudbari/realtime-crypto-analyzer/go-backend/internal/config"
	"github.com/manasmudbari/realtime-crypto-analyzer/go-backend/internal/http/handlers"
	"github.com/manasmudbari/realtime-crypto-analyzer/go-backend/internal/services"
	"github.com/manasmudbari/realtime-crypto-analyzer/go-backend/internal/socket"
)

type RouterDeps struct {
	Config      config.Config
	AuthService *services.AuthService
	Marketplace *services.MarketplaceService
	Settings    *services.SettingsService
	Sockets     *socket.Manager
}

// BuildEngine wires up the HTTP and Socket.IO server.
func BuildEngine(deps RouterDeps) *gin.Engine {
	router := gin.New()
	router.Use(gin.Logger())
	router.Use(gin.Recovery())
	router.Use(cors.New(cors.Config{
		AllowOrigins:     []string{deps.Config.CORSOrigin},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	handlers.HealthHandler(router)

	// Auth routes (public + protected)
	authHandler := handlers.NewAuthHandler(deps.AuthService)
	publicAuth := router.Group("/api/auth")
	authHandler.RegisterPublic(publicAuth)
	protectedAuth := router.Group("/api/auth", AuthMiddleware(deps.AuthService))
	authHandler.RegisterProtected(protectedAuth)

	// Marketplace routes
	marketplaceHandler := handlers.NewMarketplaceHandler(deps.Marketplace, deps.Sockets)
	marketplacePublic := router.Group("/api/marketplace")
	marketplaceProtected := router.Group("/api/marketplace", AuthMiddleware(deps.AuthService))
	marketplaceHandler.RegisterRoutes(marketplacePublic, marketplaceProtected)

	// Settings
	settingsHandler := handlers.NewSettingsHandler(deps.Settings)
	settingsGroup := router.Group("/api/settings")
	settingsHandler.RegisterRoutes(settingsGroup)

	// Filters – stub endpoints for frontend compatibility
	router.GET("/api/filters", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"success": true, "data": []interface{}{}})
	})
	router.GET("/api/filter-presets", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"success": true, "data": []interface{}{}})
	})

	router.NoRoute(func(c *gin.Context) {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "message": "route not found"})
	})

	return router
}
