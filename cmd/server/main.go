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

// @tag.name api-keys
// @tag.description API key management for programmatic access

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
	apiKeyService := services.NewAPIKeyService(mongoClient.Db)
	marketplaceService := services.NewMarketplaceService(mongoClient.Db)
	settingsService := services.NewSettingsService(mongoClient.Db)
	azureService := services.NewAzureOpenAI(cfg)

	// Create API key indexes
	indexCtx, indexCancel := context.WithTimeout(context.Background(), 10*time.Second)
	if err := apiKeyService.EnsureIndexes(indexCtx); err != nil {
		log.Printf("⚠️  Failed to create API key indexes: %v", err)
	}
	indexCancel()

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

	// In development, pass an empty origins slice so nhooyr.io/websocket sets
	// InsecureSkipVerify: true — the browser Origin (localhost:7200) differs from
	// the backend Host (localhost:7210) causing every WS upgrade to be rejected
	// when a strict pattern list is used.
	var wsOrigins []string
	if cfg.Env != "development" {
		wsOrigins = []string{cfg.CORSOrigin}
	}
	// Feed buffer service — persists incoming messages with TTL for history replay.
	feedBufferService := services.NewFeedBufferService(mongoClient.Db)

	socketManager := socket.NewManager(authService, apiKeyService, azureService, marketplaceService, wsOrigins)
	socketManager.SetLLMService(llmService)
	socketManager.SetFeedBufferService(feedBufferService)

	gin.SetMode(gin.ReleaseMode)

	router := transport.BuildEngine(transport.RouterDeps{
		Config:        cfg,
		AuthService:   authService,
		APIKeyService: apiKeyService,
		Marketplace:   marketplaceService,
		Settings:      settingsService,
		LLM:           llmService,
		Sockets:       socketManager,
		FeedBuffer:    feedBufferService,
	})

	addr := fmt.Sprintf("%s:%d", cfg.Host, cfg.Port)
	log.Printf("🚀 Go backend listening on %s (CORS: %s)", addr, cfg.CORSOrigin)
	log.Printf("📚 API Documentation available at http://%s/docs", addr)
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
