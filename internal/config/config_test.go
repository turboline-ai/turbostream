package config

import (
	"os"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestLoad(t *testing.T) {
	t.Run("loads with default values when no env vars set", func(t *testing.T) {
		clearEnv(t)

		cfg := Load()

		assert.Equal(t, "development", cfg.Env)
		assert.Equal(t, "0.0.0.0", cfg.Host)
		assert.Equal(t, 7210, cfg.Port)
		assert.Equal(t, "http://localhost:7200", cfg.CORSOrigin)
		assert.Equal(t, "change-me", cfg.JWTSecret)
		assert.Equal(t, "mongodb://localhost:27017", cfg.MongoURI)
		assert.Equal(t, "realtime_crypto", cfg.MongoDatabase)
		assert.Equal(t, "default-encryption-key-change-in-production", cfg.EncryptionKey)
		assert.Equal(t, 15*time.Second, cfg.DefaultTimeout)
		assert.Equal(t, "azure-openai", cfg.DefaultAIProvider)
		assert.Equal(t, int64(1000000), cfg.TokenQuotaPerMonth)
	})

	t.Run("loads LLM default values", func(t *testing.T) {
		clearEnv(t)

		cfg := Load()

		assert.Equal(t, "gpt-4o", cfg.OpenAIModel)
		assert.Equal(t, "claude-3-5-sonnet-20241022", cfg.AnthropicModel)
		assert.Equal(t, "gemini-1.5-flash", cfg.GoogleModel)
		assert.Equal(t, "mistral-large-latest", cfg.MistralModel)
		assert.Equal(t, "grok-beta", cfg.XAIModel)
		assert.Equal(t, "http://localhost:11434", cfg.OllamaBaseURL)
		assert.Equal(t, "llama3.2", cfg.OllamaModel)
		assert.Equal(t, 1024, cfg.LLMMaxTokens)
		assert.Equal(t, 0.7, cfg.LLMTemperature)
		assert.Equal(t, 50, cfg.LLMContextLimit)
	})

	t.Run("respects environment variables", func(t *testing.T) {
		clearEnv(t)
		t.Setenv("NODE_ENV", "production")
		t.Setenv("BACKEND_HOST", "localhost")
		t.Setenv("BACKEND_PORT", "8080")
		t.Setenv("CORS_ORIGIN", "https://example.com")
		t.Setenv("JWT_SECRET", "secure-secret")
		t.Setenv("MONGODB_URI", "mongodb://mongo:27017")
		t.Setenv("MONGODB_DB_NAME", "test_db")
		t.Setenv("ENCRYPTION_KEY", "secure-encryption-key")
		t.Setenv("REQUEST_TIMEOUT_MS", "30000")
		t.Setenv("TOKEN_QUOTA_PER_MONTH", "5000000")

		cfg := Load()

		assert.Equal(t, "production", cfg.Env)
		assert.Equal(t, "localhost", cfg.Host)
		assert.Equal(t, 8080, cfg.Port)
		assert.Equal(t, "https://example.com", cfg.CORSOrigin)
		assert.Equal(t, "secure-secret", cfg.JWTSecret)
		assert.Equal(t, "mongodb://mongo:27017", cfg.MongoURI)
		assert.Equal(t, "test_db", cfg.MongoDatabase)
		assert.Equal(t, "secure-encryption-key", cfg.EncryptionKey)
		assert.Equal(t, 30*time.Second, cfg.DefaultTimeout)
		assert.Equal(t, int64(5000000), cfg.TokenQuotaPerMonth)
	})

	t.Run("PORT takes precedence over BACKEND_PORT", func(t *testing.T) {
		clearEnv(t)
		t.Setenv("PORT", "3000")
		t.Setenv("BACKEND_PORT", "8080")

		cfg := Load()

		assert.Equal(t, 3000, cfg.Port)
	})

	t.Run("uses BACKEND_PORT when PORT is not set", func(t *testing.T) {
		clearEnv(t)
		t.Setenv("BACKEND_PORT", "9000")

		cfg := Load()

		assert.Equal(t, 9000, cfg.Port)
	})

	t.Run("loads Azure OpenAI configuration", func(t *testing.T) {
		clearEnv(t)
		t.Setenv("AZURE_OPENAI_ENDPOINT", "https://example.openai.azure.com")
		t.Setenv("AZURE_OPENAI_API_KEY", "azure-key-123")
		t.Setenv("AZURE_OPENAI_API_VERSION", "2024-03-01")
		t.Setenv("AZURE_OPENAI_DEPLOYMENT_NAME", "gpt-4-turbo")

		cfg := Load()

		assert.Equal(t, "https://example.openai.azure.com", cfg.AzureEndpoint)
		assert.Equal(t, "azure-key-123", cfg.AzureAPIKey)
		assert.Equal(t, "2024-03-01", cfg.AzureAPIVersion)
		assert.Equal(t, "gpt-4-turbo", cfg.AzureDeployment)
	})

	t.Run("loads Stripe configuration", func(t *testing.T) {
		clearEnv(t)
		t.Setenv("STRIPE_SECRET_KEY", "sk_test_123")
		t.Setenv("STRIPE_PUBLISHABLE_KEY", "pk_test_123")
		t.Setenv("STRIPE_WEBHOOK_SECRET", "whsec_123")

		cfg := Load()

		assert.Equal(t, "sk_test_123", cfg.StripeSecretKey)
		assert.Equal(t, "pk_test_123", cfg.StripePublishable)
		assert.Equal(t, "whsec_123", cfg.StripeWebhook)
	})

	t.Run("loads all LLM provider API keys", func(t *testing.T) {
		clearEnv(t)
		t.Setenv("OPENAI_API_KEY", "openai-key")
		t.Setenv("ANTHROPIC_API_KEY", "anthropic-key")
		t.Setenv("GOOGLE_API_KEY", "google-key")
		t.Setenv("MISTRAL_API_KEY", "mistral-key")
		t.Setenv("XAI_API_KEY", "xai-key")

		cfg := Load()

		assert.Equal(t, "openai-key", cfg.OpenAIAPIKey)
		assert.Equal(t, "anthropic-key", cfg.AnthropicAPIKey)
		assert.Equal(t, "google-key", cfg.GoogleAPIKey)
		assert.Equal(t, "mistral-key", cfg.MistralAPIKey)
		assert.Equal(t, "xai-key", cfg.XAIAPIKey)
	})

	t.Run("loads custom LLM models", func(t *testing.T) {
		clearEnv(t)
		t.Setenv("OPENAI_MODEL", "gpt-4-turbo")
		t.Setenv("ANTHROPIC_MODEL", "claude-3-opus-20240229")
		t.Setenv("GOOGLE_MODEL", "gemini-pro")
		t.Setenv("MISTRAL_MODEL", "mistral-medium")
		t.Setenv("XAI_MODEL", "grok-1")
		t.Setenv("OLLAMA_MODEL", "llama2")
		t.Setenv("OLLAMA_BASE_URL", "http://ollama:11434")

		cfg := Load()

		assert.Equal(t, "gpt-4-turbo", cfg.OpenAIModel)
		assert.Equal(t, "claude-3-opus-20240229", cfg.AnthropicModel)
		assert.Equal(t, "gemini-pro", cfg.GoogleModel)
		assert.Equal(t, "mistral-medium", cfg.MistralModel)
		assert.Equal(t, "grok-1", cfg.XAIModel)
		assert.Equal(t, "llama2", cfg.OllamaModel)
		assert.Equal(t, "http://ollama:11434", cfg.OllamaBaseURL)
	})

	t.Run("loads custom LLM settings", func(t *testing.T) {
		clearEnv(t)
		t.Setenv("LLM_MAX_TOKENS", "2048")
		t.Setenv("LLM_TEMPERATURE", "0.9")
		t.Setenv("LLM_CONTEXT_LIMIT", "100")

		cfg := Load()

		assert.Equal(t, 2048, cfg.LLMMaxTokens)
		assert.Equal(t, 0.9, cfg.LLMTemperature)
		assert.Equal(t, 100, cfg.LLMContextLimit)
	})
}

func TestGetEnv(t *testing.T) {
	t.Run("returns environment variable when set", func(t *testing.T) {
		t.Setenv("TEST_VAR", "test_value")

		result := getEnv("TEST_VAR", "fallback")

		assert.Equal(t, "test_value", result)
	})

	t.Run("returns fallback when environment variable is not set", func(t *testing.T) {
		os.Unsetenv("TEST_VAR")

		result := getEnv("TEST_VAR", "fallback")

		assert.Equal(t, "fallback", result)
	})

	t.Run("returns fallback when environment variable is empty", func(t *testing.T) {
		t.Setenv("TEST_VAR", "")

		result := getEnv("TEST_VAR", "fallback")

		assert.Equal(t, "fallback", result)
	})
}

func TestParseInt(t *testing.T) {
	t.Run("parses valid integer", func(t *testing.T) {
		result := parseInt("42")

		assert.Equal(t, 42, result)
	})

	t.Run("parses negative integer", func(t *testing.T) {
		result := parseInt("-100")

		assert.Equal(t, -100, result)
	})

	t.Run("returns 0 for invalid integer", func(t *testing.T) {
		result := parseInt("not-a-number")

		assert.Equal(t, 0, result)
	})

	t.Run("returns 0 for empty string", func(t *testing.T) {
		result := parseInt("")

		assert.Equal(t, 0, result)
	})

	t.Run("returns 0 for float string", func(t *testing.T) {
		result := parseInt("3.14")

		assert.Equal(t, 0, result)
	})
}

func TestParseInt64(t *testing.T) {
	t.Run("parses valid int64", func(t *testing.T) {
		result := parseInt64("9223372036854775807")

		assert.Equal(t, int64(9223372036854775807), result)
	})

	t.Run("parses negative int64", func(t *testing.T) {
		result := parseInt64("-9223372036854775808")

		assert.Equal(t, int64(-9223372036854775808), result)
	})

	t.Run("returns 0 for invalid int64", func(t *testing.T) {
		result := parseInt64("not-a-number")

		assert.Equal(t, int64(0), result)
	})

	t.Run("returns 0 for empty string", func(t *testing.T) {
		result := parseInt64("")

		assert.Equal(t, int64(0), result)
	})
}

func TestParseFloat(t *testing.T) {
	t.Run("parses valid float", func(t *testing.T) {
		result := parseFloat("3.14159")

		assert.Equal(t, 3.14159, result)
	})

	t.Run("parses integer as float", func(t *testing.T) {
		result := parseFloat("42")

		assert.Equal(t, 42.0, result)
	})

	t.Run("parses negative float", func(t *testing.T) {
		result := parseFloat("-2.5")

		assert.Equal(t, -2.5, result)
	})

	t.Run("parses scientific notation", func(t *testing.T) {
		result := parseFloat("1.5e2")

		assert.Equal(t, 150.0, result)
	})

	t.Run("returns 0 for invalid float", func(t *testing.T) {
		result := parseFloat("not-a-number")

		assert.Equal(t, 0.0, result)
	})

	t.Run("returns 0 for empty string", func(t *testing.T) {
		result := parseFloat("")

		assert.Equal(t, 0.0, result)
	})
}

func TestConfigStruct(t *testing.T) {
	t.Run("can create Config struct directly", func(t *testing.T) {
		cfg := Config{
			Env:            "test",
			Host:           "localhost",
			Port:           8080,
			CORSOrigin:     "http://localhost:3000",
			JWTSecret:      "secret",
			MongoURI:       "mongodb://localhost:27017",
			MongoDatabase:  "test",
			DefaultTimeout: 10 * time.Second,
		}

		assert.Equal(t, "test", cfg.Env)
		assert.Equal(t, "localhost", cfg.Host)
		assert.Equal(t, 8080, cfg.Port)
		assert.Equal(t, 10*time.Second, cfg.DefaultTimeout)
	})

	t.Run("has all expected fields", func(t *testing.T) {
		cfg := Config{}

		// Server fields
		_ = cfg.Env
		_ = cfg.Host
		_ = cfg.Port
		_ = cfg.CORSOrigin
		_ = cfg.JWTSecret
		_ = cfg.MongoURI
		_ = cfg.MongoDatabase
		_ = cfg.EncryptionKey
		_ = cfg.DefaultTimeout

		// Azure fields
		_ = cfg.AzureEndpoint
		_ = cfg.AzureAPIKey
		_ = cfg.AzureAPIVersion
		_ = cfg.AzureDeployment

		// Stripe fields
		_ = cfg.StripeSecretKey
		_ = cfg.StripePublishable
		_ = cfg.StripeWebhook

		// AI configuration
		_ = cfg.DefaultAIProvider
		_ = cfg.TokenQuotaPerMonth

		// LLM providers
		_ = cfg.OpenAIAPIKey
		_ = cfg.OpenAIModel
		_ = cfg.AnthropicAPIKey
		_ = cfg.AnthropicModel
		_ = cfg.GoogleAPIKey
		_ = cfg.GoogleModel
		_ = cfg.MistralAPIKey
		_ = cfg.MistralModel
		_ = cfg.XAIAPIKey
		_ = cfg.XAIModel
		_ = cfg.OllamaBaseURL
		_ = cfg.OllamaModel

		// LLM settings
		_ = cfg.LLMMaxTokens
		_ = cfg.LLMTemperature
		_ = cfg.LLMContextLimit
	})
}

func TestLoadFromEnvFile(t *testing.T) {
	t.Run("attempts to load .env.local file", func(t *testing.T) {
		clearEnv(t)

		cfg := Load()

		require.NotNil(t, cfg)
	})
}

func TestJWTSecretWarning(t *testing.T) {
	t.Run("uses default JWT_SECRET when not set", func(t *testing.T) {
		clearEnv(t)

		cfg := Load()

		assert.Equal(t, "change-me", cfg.JWTSecret)
	})

	t.Run("uses custom JWT_SECRET when set", func(t *testing.T) {
		clearEnv(t)
		t.Setenv("JWT_SECRET", "my-secure-secret")

		cfg := Load()

		assert.Equal(t, "my-secure-secret", cfg.JWTSecret)
	})
}

func clearEnv(t *testing.T) {
	t.Helper()

	envVars := []string{
		"NODE_ENV", "BACKEND_HOST", "PORT", "BACKEND_PORT", "CORS_ORIGIN",
		"JWT_SECRET", "MONGODB_URI", "MONGODB_DB_NAME", "ENCRYPTION_KEY",
		"REQUEST_TIMEOUT_MS", "DEFAULT_AI_PROVIDER", "TOKEN_QUOTA_PER_MONTH",
		"AZURE_OPENAI_ENDPOINT", "AZURE_OPENAI_API_KEY", "AZURE_OPENAI_API_VERSION",
		"AZURE_OPENAI_DEPLOYMENT_NAME", "STRIPE_SECRET_KEY", "STRIPE_PUBLISHABLE_KEY",
		"STRIPE_WEBHOOK_SECRET", "OPENAI_API_KEY", "OPENAI_MODEL",
		"ANTHROPIC_API_KEY", "ANTHROPIC_MODEL", "GOOGLE_API_KEY", "GOOGLE_MODEL",
		"MISTRAL_API_KEY", "MISTRAL_MODEL", "XAI_API_KEY", "XAI_MODEL",
		"OLLAMA_BASE_URL", "OLLAMA_MODEL", "LLM_MAX_TOKENS", "LLM_TEMPERATURE",
		"LLM_CONTEXT_LIMIT",
	}

	for _, key := range envVars {
		os.Unsetenv(key)
	}
}
