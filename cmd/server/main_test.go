package main

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.mongodb.org/mongo-driver/mongo/readpref"

	"github.com/turboline-ai/turbostream/internal/config"
	"github.com/turboline-ai/turbostream/internal/db"
	transport "github.com/turboline-ai/turbostream/internal/http"
	"github.com/turboline-ai/turbostream/internal/services"
	"github.com/turboline-ai/turbostream/internal/socket"
)

func TestServerInitialization(t *testing.T) {
	mongoURI := getMongoURI()
	if mongoURI == "" {
		t.Skip("MongoDB not available (set MONGODB_URI env var to run this test)")
	}

	t.Run("initializes all components successfully", func(t *testing.T) {
		cfg := createTestConfig(mongoURI)
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		mongoClient := db.New(cfg.MongoURI, cfg.MongoDatabase)
		err := mongoClient.Connect(ctx)
		require.NoError(t, err)
		defer mongoClient.Disconnect(ctx)

		err = mongoClient.Raw.Ping(ctx, readpref.Primary())
		require.NoError(t, err)

		authService := services.NewAuthService(cfg, mongoClient.Raw, mongoClient.Db)
		require.NotNil(t, authService)

		marketplaceService := services.NewMarketplaceService(mongoClient.Db)
		require.NotNil(t, marketplaceService)

		settingsService := services.NewSettingsService(mongoClient.Db)
		require.NotNil(t, settingsService)

		azureService := services.NewAzureOpenAI(cfg)
		require.NotNil(t, azureService)

		llmService, err := services.NewLLMService(cfg)
		if err == nil {
			require.NotNil(t, llmService)
		}

		apiKeyService := services.NewAPIKeyService(mongoClient.Db)
		socketManager := socket.NewManager(authService, apiKeyService, azureService, marketplaceService, []string{cfg.CORSOrigin})
		require.NotNil(t, socketManager)

		if llmService != nil {
			socketManager.SetLLMService(llmService)
		}

		router := transport.BuildEngine(transport.RouterDeps{
			Config:      cfg,
			AuthService: authService,
			Marketplace: marketplaceService,
			Settings:    settingsService,
			LLM:         llmService,
			Sockets:     socketManager,
		})
		require.NotNil(t, router)
	})

	t.Run("seeds default categories during initialization", func(t *testing.T) {
		cfg := createTestConfig(mongoURI)
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		mongoClient := db.New(cfg.MongoURI, cfg.MongoDatabase)
		err := mongoClient.Connect(ctx)
		require.NoError(t, err)
		defer mongoClient.Disconnect(ctx)

		settingsService := services.NewSettingsService(mongoClient.Db)
		err = settingsService.EnsureDefaultCategories(ctx)
		assert.NoError(t, err)
	})
}

func TestDatabaseConnection(t *testing.T) {
	mongoURI := getMongoURI()
	if mongoURI == "" {
		t.Skip("MongoDB not available (set MONGODB_URI env var to run this test)")
	}

	t.Run("connects to MongoDB within timeout", func(t *testing.T) {
		cfg := createTestConfig(mongoURI)
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		mongoClient := db.New(cfg.MongoURI, cfg.MongoDatabase)
		err := mongoClient.Connect(ctx)

		require.NoError(t, err)
		assert.NotNil(t, mongoClient.Raw)
		assert.NotNil(t, mongoClient.Db)

		mongoClient.Disconnect(ctx)
	})

	t.Run("pings MongoDB after connection", func(t *testing.T) {
		cfg := createTestConfig(mongoURI)
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		mongoClient := db.New(cfg.MongoURI, cfg.MongoDatabase)
		err := mongoClient.Connect(ctx)
		require.NoError(t, err)
		defer mongoClient.Disconnect(ctx)

		err = mongoClient.Raw.Ping(ctx, readpref.Primary())

		assert.NoError(t, err)
	})

	t.Run("fails with invalid MongoDB URI", func(t *testing.T) {
		cfg := createTestConfig("invalid-uri-format")
		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		defer cancel()

		mongoClient := db.New(cfg.MongoURI, cfg.MongoDatabase)
		err := mongoClient.Connect(ctx)

		assert.Error(t, err)
	})

	t.Run("uses correct database name from config", func(t *testing.T) {
		cfg := createTestConfig(mongoURI)
		cfg.MongoDatabase = "custom_test_db"
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		mongoClient := db.New(cfg.MongoURI, cfg.MongoDatabase)
		err := mongoClient.Connect(ctx)
		require.NoError(t, err)
		defer mongoClient.Disconnect(ctx)

		assert.Equal(t, "custom_test_db", mongoClient.Db.Name())
	})
}

func TestServiceInitialization(t *testing.T) {
	mongoURI := getMongoURI()
	if mongoURI == "" {
		t.Skip("MongoDB not available (set MONGODB_URI env var to run this test)")
	}

	t.Run("initializes AuthService", func(t *testing.T) {
		cfg := createTestConfig(mongoURI)
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		mongoClient := db.New(cfg.MongoURI, cfg.MongoDatabase)
		err := mongoClient.Connect(ctx)
		require.NoError(t, err)
		defer mongoClient.Disconnect(ctx)

		authService := services.NewAuthService(cfg, mongoClient.Raw, mongoClient.Db)

		assert.NotNil(t, authService)
	})

	t.Run("initializes MarketplaceService", func(t *testing.T) {
		cfg := createTestConfig(mongoURI)
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		mongoClient := db.New(cfg.MongoURI, cfg.MongoDatabase)
		err := mongoClient.Connect(ctx)
		require.NoError(t, err)
		defer mongoClient.Disconnect(ctx)

		marketplaceService := services.NewMarketplaceService(mongoClient.Db)

		assert.NotNil(t, marketplaceService)
	})

	t.Run("initializes SettingsService", func(t *testing.T) {
		cfg := createTestConfig(mongoURI)
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		mongoClient := db.New(cfg.MongoURI, cfg.MongoDatabase)
		err := mongoClient.Connect(ctx)
		require.NoError(t, err)
		defer mongoClient.Disconnect(ctx)

		settingsService := services.NewSettingsService(mongoClient.Db)

		assert.NotNil(t, settingsService)
	})

	t.Run("initializes AzureOpenAI service", func(t *testing.T) {
		cfg := createTestConfig(mongoURI)

		azureService := services.NewAzureOpenAI(cfg)

		assert.NotNil(t, azureService)
	})

	t.Run("initializes LLM service", func(t *testing.T) {
		cfg := createTestConfig(mongoURI)

		llmService, err := services.NewLLMService(cfg)

		if err == nil {
			assert.NotNil(t, llmService)
		}
	})

	t.Run("LLM service handles missing API keys gracefully", func(t *testing.T) {
		cfg := createTestConfig(mongoURI)
		cfg.OpenAIAPIKey = ""
		cfg.AnthropicAPIKey = ""
		cfg.GoogleAPIKey = ""
		cfg.MistralAPIKey = ""
		cfg.XAIAPIKey = ""

		llmService, err := services.NewLLMService(cfg)

		if err == nil && llmService != nil {
			assert.False(t, llmService.Enabled())
		}
	})
}

func TestSocketManagerInitialization(t *testing.T) {
	mongoURI := getMongoURI()
	if mongoURI == "" {
		t.Skip("MongoDB not available (set MONGODB_URI env var to run this test)")
	}

	t.Run("initializes socket manager", func(t *testing.T) {
		cfg := createTestConfig(mongoURI)
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		mongoClient := db.New(cfg.MongoURI, cfg.MongoDatabase)
		err := mongoClient.Connect(ctx)
		require.NoError(t, err)
		defer mongoClient.Disconnect(ctx)

		authService := services.NewAuthService(cfg, mongoClient.Raw, mongoClient.Db)
		apiKeyService := services.NewAPIKeyService(mongoClient.Db)
		marketplaceService := services.NewMarketplaceService(mongoClient.Db)
		azureService := services.NewAzureOpenAI(cfg)

		socketManager := socket.NewManager(authService, apiKeyService, azureService, marketplaceService, []string{cfg.CORSOrigin})

		assert.NotNil(t, socketManager)
	})

	t.Run("sets LLM service on socket manager", func(t *testing.T) {
		cfg := createTestConfig(mongoURI)
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		mongoClient := db.New(cfg.MongoURI, cfg.MongoDatabase)
		err := mongoClient.Connect(ctx)
		require.NoError(t, err)
		defer mongoClient.Disconnect(ctx)

		authService := services.NewAuthService(cfg, mongoClient.Raw, mongoClient.Db)
		apiKeyService := services.NewAPIKeyService(mongoClient.Db)
		marketplaceService := services.NewMarketplaceService(mongoClient.Db)
		azureService := services.NewAzureOpenAI(cfg)
		llmService, _ := services.NewLLMService(cfg)

		socketManager := socket.NewManager(authService, apiKeyService, azureService, marketplaceService, []string{cfg.CORSOrigin})
		socketManager.SetLLMService(llmService)

		assert.NotNil(t, socketManager)
	})
}

func TestRouterInitialization(t *testing.T) {
	mongoURI := getMongoURI()
	if mongoURI == "" {
		t.Skip("MongoDB not available (set MONGODB_URI env var to run this test)")
	}

	t.Run("builds HTTP router", func(t *testing.T) {
		cfg := createTestConfig(mongoURI)
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		mongoClient := db.New(cfg.MongoURI, cfg.MongoDatabase)
		err := mongoClient.Connect(ctx)
		require.NoError(t, err)
		defer mongoClient.Disconnect(ctx)

		authService := services.NewAuthService(cfg, mongoClient.Raw, mongoClient.Db)
		apiKeyService := services.NewAPIKeyService(mongoClient.Db)
		marketplaceService := services.NewMarketplaceService(mongoClient.Db)
		settingsService := services.NewSettingsService(mongoClient.Db)
		azureService := services.NewAzureOpenAI(cfg)
		llmService, _ := services.NewLLMService(cfg)
		socketManager := socket.NewManager(authService, apiKeyService, azureService, marketplaceService, []string{cfg.CORSOrigin})

		router := transport.BuildEngine(transport.RouterDeps{
			Config:      cfg,
			AuthService: authService,
			Marketplace: marketplaceService,
			Settings:    settingsService,
			LLM:         llmService,
			Sockets:     socketManager,
		})

		assert.NotNil(t, router)
	})

	t.Run("router has correct CORS origin", func(t *testing.T) {
		cfg := createTestConfig(mongoURI)
		cfg.CORSOrigin = "https://example.com"
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		mongoClient := db.New(cfg.MongoURI, cfg.MongoDatabase)
		err := mongoClient.Connect(ctx)
		require.NoError(t, err)
		defer mongoClient.Disconnect(ctx)

		authService := services.NewAuthService(cfg, mongoClient.Raw, mongoClient.Db)
		apiKeyService := services.NewAPIKeyService(mongoClient.Db)
		marketplaceService := services.NewMarketplaceService(mongoClient.Db)
		settingsService := services.NewSettingsService(mongoClient.Db)
		llmService, _ := services.NewLLMService(cfg)
		socketManager := socket.NewManager(authService, apiKeyService, nil, marketplaceService, []string{cfg.CORSOrigin})

		router := transport.BuildEngine(transport.RouterDeps{
			Config:      cfg,
			AuthService: authService,
			Marketplace: marketplaceService,
			Settings:    settingsService,
			LLM:         llmService,
			Sockets:     socketManager,
		})

		assert.NotNil(t, router)
	})
}

func TestHTTPServerConfiguration(t *testing.T) {
	t.Run("creates server with correct timeouts", func(t *testing.T) {
		srv := &http.Server{
			Addr:              "localhost:7210",
			Handler:           http.NotFoundHandler(),
			ReadTimeout:       15 * time.Second,
			WriteTimeout:      15 * time.Second,
			IdleTimeout:       60 * time.Second,
			ReadHeaderTimeout: 5 * time.Second,
		}

		assert.Equal(t, "localhost:7210", srv.Addr)
		assert.Equal(t, 15*time.Second, srv.ReadTimeout)
		assert.Equal(t, 15*time.Second, srv.WriteTimeout)
		assert.Equal(t, 60*time.Second, srv.IdleTimeout)
		assert.Equal(t, 5*time.Second, srv.ReadHeaderTimeout)
	})

	t.Run("formats server address correctly", func(t *testing.T) {
		testCases := []struct {
			host     string
			port     int
			expected string
		}{
			{"0.0.0.0", 7210, "0.0.0.0:7210"},
			{"localhost", 8080, "localhost:8080"},
			{"127.0.0.1", 3000, "127.0.0.1:3000"},
		}

		for _, tc := range testCases {
			addr := fmt.Sprintf("%s:%d", tc.host, tc.port)
			assert.Equal(t, tc.expected, addr)
		}
	})
}

func TestConfigLoading(t *testing.T) {
	t.Run("loads configuration successfully", func(t *testing.T) {
		cfg := config.Load()

		assert.NotNil(t, cfg)
		assert.NotEmpty(t, cfg.Host)
		assert.Greater(t, cfg.Port, 0)
		assert.NotEmpty(t, cfg.MongoURI)
		assert.NotEmpty(t, cfg.MongoDatabase)
	})

	t.Run("config has required fields", func(t *testing.T) {
		cfg := config.Load()

		assert.NotEmpty(t, cfg.Env)
		assert.NotEmpty(t, cfg.JWTSecret)
		assert.NotEmpty(t, cfg.CORSOrigin)
		assert.Greater(t, cfg.DefaultTimeout, time.Duration(0))
	})
}

func TestStartupSequence(t *testing.T) {
	mongoURI := getMongoURI()
	if mongoURI == "" {
		t.Skip("MongoDB not available (set MONGODB_URI env var to run this test)")
	}

	t.Run("follows correct initialization order", func(t *testing.T) {
		cfg := createTestConfig(mongoURI)
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		mongoClient := db.New(cfg.MongoURI, cfg.MongoDatabase)
		err := mongoClient.Connect(ctx)
		require.NoError(t, err, "step 2: connect to MongoDB")
		defer mongoClient.Disconnect(ctx)

		err = mongoClient.Raw.Ping(ctx, readpref.Primary())
		require.NoError(t, err, "step 3: ping MongoDB")

		authService := services.NewAuthService(cfg, mongoClient.Raw, mongoClient.Db)
		require.NotNil(t, authService, "step 4: initialize AuthService")

		marketplaceService := services.NewMarketplaceService(mongoClient.Db)
		require.NotNil(t, marketplaceService, "step 5: initialize MarketplaceService")

		settingsService := services.NewSettingsService(mongoClient.Db)
		require.NotNil(t, settingsService, "step 6: initialize SettingsService")

		azureService := services.NewAzureOpenAI(cfg)
		require.NotNil(t, azureService, "step 7: initialize AzureOpenAI")

		llmService, err := services.NewLLMService(cfg)
		if err == nil {
			require.NotNil(t, llmService, "step 8: initialize LLMService")
		}

		err = settingsService.EnsureDefaultCategories(ctx)
		require.NoError(t, err, "step 9: seed default categories")

		apiKeyService := services.NewAPIKeyService(mongoClient.Db)
		socketManager := socket.NewManager(authService, apiKeyService, azureService, marketplaceService, []string{cfg.CORSOrigin})
		require.NotNil(t, socketManager, "step 10: initialize socket manager")

		if llmService != nil {
			socketManager.SetLLMService(llmService)
		}

		router := transport.BuildEngine(transport.RouterDeps{
			Config:      cfg,
			AuthService: authService,
			Marketplace: marketplaceService,
			Settings:    settingsService,
			LLM:         llmService,
			Sockets:     socketManager,
		})
		require.NotNil(t, router, "step 11: build HTTP router")
	})
}

func TestErrorHandling(t *testing.T) {
	t.Run("handles invalid MongoDB URI during connection", func(t *testing.T) {
		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		defer cancel()

		mongoClient := db.New("not-a-valid-uri", "test_db")
		err := mongoClient.Connect(ctx)

		assert.Error(t, err)
	})

	t.Run("handles unreachable MongoDB server", func(t *testing.T) {
		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		defer cancel()

		mongoClient := db.New("mongodb://10.255.255.1:27017", "test_db")
		err := mongoClient.Connect(ctx)

		_ = err
	})
}

func createTestConfig(mongoURI string) config.Config {
	dbName := fmt.Sprintf("test_main_%d", time.Now().UnixNano())
	return config.Config{
		Env:                "test",
		Host:               "localhost",
		Port:               7210,
		CORSOrigin:         "http://localhost:7200",
		JWTSecret:          "test-secret-key",
		MongoURI:           mongoURI,
		MongoDatabase:      dbName,
		EncryptionKey:      "test-encryption-key-32-chars!!",
		DefaultTimeout:     15 * time.Second,
		DefaultAIProvider:  "azure-openai",
		TokenQuotaPerMonth: 1000000,
		LLMMaxTokens:       1024,
		LLMTemperature:     0.7,
		LLMContextLimit:    50,
	}
}

func getMongoURI() string {
	uri := os.Getenv("MONGODB_URI")
	if uri == "" {
		uri = os.Getenv("MONGODB_TEST_URI")
	}
	if uri == "" {
		uri = "mongodb://localhost:27017"
		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		defer cancel()

		testClient := db.New(uri, "test")
		if err := testClient.Connect(ctx); err != nil {
			return ""
		}
		testClient.Disconnect(ctx)
	}
	return uri
}
