package integration

import (
	"context"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"

	"github.com/turboline-ai/turbostream/go-backend/internal/config"
	transport "github.com/turboline-ai/turbostream/go-backend/internal/http"
	"github.com/turboline-ai/turbostream/go-backend/internal/http/handlers"
	"github.com/turboline-ai/turbostream/go-backend/internal/services"
	"github.com/turboline-ai/turbostream/go-backend/internal/socket"
)

type TestServer struct {
	Server            *httptest.Server
	WSServer          *httptest.Server
	Client            *http.Client
	AuthService       *services.AuthService
	MarketplaceService *services.MarketplaceService
	SocketManager     *socket.Manager
	Config            config.Config
	DB                *mongo.Database
	cleanup           func()
}

func SetupTestServer(t *testing.T) *TestServer {
	gin.SetMode(gin.TestMode)

	// Connect to MongoDB
	ctx := context.Background()
	clientOpts := options.Client().ApplyURI("mongodb://localhost:27017")
	client, err := mongo.Connect(ctx, clientOpts)
	if err != nil {
		t.Skip("MongoDB not available for integration testing:", err)
		return nil
	}

	// Create unique test database
	dbName := "test_integration_" + primitive.NewObjectID().Hex()
	db := client.Database(dbName)

	// Setup configuration
	cfg := config.Config{
		Port:               8080,
		MongoURI:           "mongodb://localhost:27017",
		MongoDatabase:      dbName,
		JWTSecret:          "test-jwt-secret-integration",
		TokenQuotaPerMonth: 1000000,
	}

	// Initialize services
	authService := services.NewAuthService(cfg, client, db)
	marketplaceService := services.NewMarketplaceService(db)
	azureService := &services.AzureOpenAI{} // Mock for testing
	socketManager := socket.NewManager(authService, azureService, marketplaceService)

	// Setup router
	router := gin.New()
	router.Use(gin.Recovery())

	// Auth routes (public + protected)
	authHandler := handlers.NewAuthHandler(authService)
	publicAuth := router.Group("/api/auth")
	authHandler.RegisterPublic(publicAuth)
	protectedAuth := router.Group("/api/auth", transport.AuthMiddleware(authService))
	authHandler.RegisterProtected(protectedAuth)

	// Marketplace routes (public + protected)
	marketplaceHandler := handlers.NewMarketplaceHandler(marketplaceService, socketManager)
	marketplacePublic := router.Group("/api/marketplace")
	marketplaceProtected := router.Group("/api/marketplace", transport.AuthMiddleware(authService))
	marketplaceHandler.RegisterRoutes(marketplacePublic, marketplaceProtected)

	// Setup HTTP server
	httpServer := httptest.NewServer(router)

	// Setup WebSocket server
	wsRouter := gin.New()
	wsRouter.GET("/ws", func(c *gin.Context) {
		socketManager.Handle(c.Writer, c.Request)
	})
	wsServer := httptest.NewServer(wsRouter)

	cleanup := func() {
		httpServer.Close()
		wsServer.Close()
		_ = db.Drop(ctx)
		_ = client.Disconnect(ctx)
	}

	return &TestServer{
		Server:             httpServer,
		WSServer:           wsServer,
		Client:             &http.Client{Timeout: 30 * time.Second},
		AuthService:        authService,
		MarketplaceService: marketplaceService,
		SocketManager:      socketManager,
		Config:             cfg,
		DB:                 db,
		cleanup:            cleanup,
	}
}

func (ts *TestServer) Close() {
	if ts.cleanup != nil {
		ts.cleanup()
	}
}

func (ts *TestServer) URL(path string) string {
	return fmt.Sprintf("%s%s", ts.Server.URL, path)
}

func (ts *TestServer) WSURL() string {
	// Convert http:// to ws://
	url := ts.WSServer.URL + "/ws"
	if url[0:7] == "http://" {
		return "ws://" + url[7:]
	}
	if url[0:8] == "https://" {
		return "wss://" + url[8:]
	}
	return url
}
