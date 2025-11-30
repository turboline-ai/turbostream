package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/mongo/readpref"

	"github.com/manasmudbari/realtime-crypto-analyzer/go-backend/internal/config"
	"github.com/manasmudbari/realtime-crypto-analyzer/go-backend/internal/db"
	transport "github.com/manasmudbari/realtime-crypto-analyzer/go-backend/internal/http"
	"github.com/manasmudbari/realtime-crypto-analyzer/go-backend/internal/services"
	"github.com/manasmudbari/realtime-crypto-analyzer/go-backend/internal/socket"
)

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

	if err := settingsService.EnsureDefaultCategories(ctx); err != nil {
		log.Printf("⚠️  failed to seed settings categories: %v", err)
	}

	socketManager := socket.NewManager(azureService, marketplaceService)

	gin.SetMode(gin.ReleaseMode)

	router := transport.BuildEngine(transport.RouterDeps{
		Config:      cfg,
		AuthService: authService,
		Marketplace: marketplaceService,
		Settings:    settingsService,
		Sockets:     socketManager,
	})

	addr := fmt.Sprintf("%s:%d", cfg.Host, cfg.Port)
	log.Printf("🚀 Go backend listening on %s (CORS: %s)", addr, cfg.CORSOrigin)
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/ws" {
			socketManager.Handle(w, r)
			return
		}
		router.ServeHTTP(w, r)
	})

	if err := http.ListenAndServe(addr, handler); err != nil {
		log.Fatalf("server error: %v", err)
	}
}
