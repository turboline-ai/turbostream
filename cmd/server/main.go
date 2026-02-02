package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/mongo/readpref"

	"github.com/turboline-ai/turbostream/internal/config"
	"github.com/turboline-ai/turbostream/internal/db"
	transport "github.com/turboline-ai/turbostream/internal/http"
	"github.com/turboline-ai/turbostream/internal/services"
	"github.com/turboline-ai/turbostream/internal/socket"

	_ "github.com/turboline-ai/turbostream/docs" // Import generated docs
)

// @title           TurboStream API
// @version         1.0
// @description     TurboStream API for real-time data streaming and feed management with AI-powered analysis
// @termsOfService  https://turboline.ai/terms

// @contact.name   API Support
// @contact.url    https://turboline.ai/docs/api
// @contact.email  dev@turboline.ai

// @license.name  MPL-2.0
// @license.url   https://github.com/turboline-ai/turbostream?tab=MPL-2.0-1-ov-file

// @host      localhost:7210
// @BasePath  /

// @securityDefinitions.apikey BearerAuth
// @in header
// @name Authorization
// @description Type "Bearer" followed by a space and JWT token.

// @tag.name Health
// @tag.description Health check endpoints

// @tag.name Authentication
// @tag.description User authentication and authorization

// @tag.name Marketplace
// @tag.description Feed marketplace and subscription management

// @tag.name Settings
// @tag.description Application settings and categories

// @tag.name LLM
// @tag.description AI/LLM integration for feed analysis

func main() {
	cfg := config.Load()

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	mongoClient := db.New(cfg.MongoURI, cfg.MongoDatabase)
	if err := mongoClient.Connect(ctx); err != nil {
		log.Fatalf("failed to connect to MongoDB: %v", err)
	}
	if err := mongoClient.Raw.Ping(ctx, readpref.Primary()); err != nil {
		log.Fatalf("failed to ping MongoDB: %v", err)
	}
	log.Println("✓ MongoDB connected")

	authService := services.NewAuthService(cfg, mongoClient.Raw, mongoClient.Db)
	marketplaceService := services.NewMarketplaceService(mongoClient.Db)
	settingsService := services.NewSettingsService(mongoClient.Db)
	azureService := services.NewAzureOpenAI(cfg)

	// Initialize LLM service with LangChain Go
	llmService, err := services.NewLLMService(cfg)
	if err != nil {
		log.Printf("⚠️  failed to initialize LLM service: %v", err)
	} else if llmService.Enabled() {
		log.Printf("✓ LLM service initialized with providers: %v", llmService.GetAvailableProviders())
	} else {
		log.Printf("⚠️  No LLM providers configured - AI features disabled")
	}

	if err := settingsService.EnsureDefaultCategories(ctx); err != nil {
		log.Printf("⚠️  failed to seed settings categories: %v", err)
	}

	socketManager := socket.NewManager(authService, azureService, marketplaceService, []string{cfg.CORSOrigin})
	socketManager.SetLLMService(llmService)

	gin.SetMode(gin.ReleaseMode)

	router := transport.BuildEngine(transport.RouterDeps{
		Config:      cfg,
		AuthService: authService,
		Marketplace: marketplaceService,
		Settings:    settingsService,
		LLM:         llmService,
		Sockets:     socketManager,
	})

	addr := fmt.Sprintf("%s:%d", cfg.Host, cfg.Port)
	log.Printf("🚀 Go backend listening on %s (CORS: %s)", addr, cfg.CORSOrigin)
	log.Printf("📚 Swagger UI available at http://%s/swagger/index.html", addr)
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/ws" {
			socketManager.Handle(w, r)
			return
		}
		router.ServeHTTP(w, r)
	})

	// Configure HTTP server with proper timeouts to prevent resource exhaustion
	srv := &http.Server{
		Addr:              addr,
		Handler:           handler,
		ReadTimeout:       15 * time.Second, // Max time to read entire request
		WriteTimeout:      15 * time.Second, // Max time to write response
		IdleTimeout:       60 * time.Second, // Max time for keepalive connections
		ReadHeaderTimeout: 5 * time.Second,  // Max time to read request headers
	}

	if err := srv.ListenAndServe(); err != nil {
		log.Fatalf("server error: %v", err)
	}
}
