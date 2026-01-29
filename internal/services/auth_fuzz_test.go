package services

import (
	"testing"

	"github.com/turboline-ai/turbostream/go-backend/internal/config"
)

func FuzzParseToken(f *testing.F) {
	// Seed corpus
	f.Add("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.Et9HFtf9R3GEMA0IICOfFMVXY7kkTX1wr4qCyhIf58U")
	f.Add("invalid-token")
	f.Add("")

	cfg := config.Config{
		JWTSecret: "test-secret",
	}
	// We don't need a DB connection for ParseToken
	service := &AuthService{
		cfg: cfg,
	}

	f.Fuzz(func(t *testing.T, tokenStr string) {
		// We just want to ensure this doesn't panic
		_, _ = service.ParseToken(tokenStr)
	})
}
