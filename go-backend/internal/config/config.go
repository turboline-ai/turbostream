package config

import (
	"log"
	"os"
	"strconv"
	"time"

	"github.com/joho/godotenv"
)

// Config holds server level configuration loaded from environment variables.
type Config struct {
	Env            string
	Host           string
	Port           int
	CORSOrigin     string
	JWTSecret      string
	MongoURI       string
	MongoDatabase  string
	EncryptionKey  string
	DefaultTimeout time.Duration
	// Azure/OpenAI style fields are kept for parity with the TS backend.
	AzureEndpoint      string
	AzureAPIKey        string
	AzureAPIVersion    string
	AzureDeployment    string
	StripeSecretKey    string
	StripePublishable  string
	StripeWebhook      string
	DefaultAIProvider  string
	TokenQuotaPerMonth int64
}

// Load reads configuration from .env.local (for parity with the Node app) and environment variables.
func Load() Config {
	_ = godotenv.Load(".env.local")

	port := parseInt(getEnv("BACKEND_PORT", "7210"))
	timeoutMS := parseInt(getEnv("REQUEST_TIMEOUT_MS", "15000"))
	tokenQuota := parseInt64(getEnv("TOKEN_QUOTA_PER_MONTH", "200000"))

	return Config{
		Env:                getEnv("NODE_ENV", "development"),
		Host:               getEnv("BACKEND_HOST", "0.0.0.0"),
		Port:               port,
		CORSOrigin:         getEnv("CORS_ORIGIN", "http://localhost:7200"),
		JWTSecret:          getEnv("JWT_SECRET", "change-me"),
		MongoURI:           getEnv("MONGODB_URI", "mongodb://localhost:27017"),
		MongoDatabase:      getEnv("MONGODB_DB_NAME", "realtime_crypto"),
		EncryptionKey:      getEnv("ENCRYPTION_KEY", "default-encryption-key-change-in-production"),
		DefaultTimeout:     time.Duration(timeoutMS) * time.Millisecond,
		AzureEndpoint:      getEnv("AZURE_OPENAI_ENDPOINT", ""),
		AzureAPIKey:        getEnv("AZURE_OPENAI_API_KEY", ""),
		AzureAPIVersion:    getEnv("AZURE_OPENAI_API_VERSION", "2024-02-15-preview"),
		AzureDeployment:    getEnv("AZURE_OPENAI_DEPLOYMENT_NAME", "gpt-4o"),
		StripeSecretKey:    getEnv("STRIPE_SECRET_KEY", ""),
		StripePublishable:  getEnv("STRIPE_PUBLISHABLE_KEY", ""),
		StripeWebhook:      getEnv("STRIPE_WEBHOOK_SECRET", ""),
		DefaultAIProvider:  getEnv("DEFAULT_AI_PROVIDER", "azure-openai"),
		TokenQuotaPerMonth: tokenQuota,
	}
}

func getEnv(key, fallback string) string {
	val := os.Getenv(key)
	if val == "" {
		return fallback
	}
	return val
}

func parseInt(val string) int {
	n, err := strconv.Atoi(val)
	if err != nil {
		log.Printf("⚠️  invalid int for %s: %v (using 0)", val, err)
		return 0
	}
	return n
}

func parseInt64(val string) int64 {
	n, err := strconv.ParseInt(val, 10, 64)
	if err != nil {
		log.Printf("⚠️  invalid int64 for %s: %v (using 0)", val, err)
		return 0
	}
	return n
}
