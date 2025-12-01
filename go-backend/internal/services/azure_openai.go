package services

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/manasmudbari/realtime-crypto-analyzer/go-backend/internal/config"
)

// AzureOpenAI provides a lightweight chat completion client for Azure OpenAI.
// This mirrors the Node backend usage at a minimal level (no streaming yet).
type AzureOpenAI struct {
	httpClient *http.Client
	endpoint   string
	apiKey     string
	apiVersion string
	deployment string
}

type ChatMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type chatRequest struct {
	Messages    []ChatMessage `json:"messages"`
	MaxTokens   int           `json:"max_tokens,omitempty"`
	Temperature float64       `json:"temperature,omitempty"`
	Stream      bool          `json:"stream,omitempty"`
}

type chatResponse struct {
	Choices []struct {
		Message struct {
			Content string `json:"content"`
		} `json:"message"`
	} `json:"choices"`
}

func NewAzureOpenAI(cfg config.Config) *AzureOpenAI {
	return &AzureOpenAI{
		httpClient: &http.Client{Timeout: 30 * time.Second},
		endpoint:   cfg.AzureEndpoint,
		apiKey:     cfg.AzureAPIKey,
		apiVersion: cfg.AzureAPIVersion,
		deployment: cfg.AzureDeployment,
	}
}

func (s *AzureOpenAI) Enabled() bool {
	return s != nil && s.endpoint != "" && s.apiKey != "" && s.deployment != ""
}

// Chat sends a non-streaming chat completion request and returns the first response message.
func (s *AzureOpenAI) Chat(ctx context.Context, messages []ChatMessage) (string, error) {
	if !s.Enabled() {
		return "", errors.New("azure openai not configured")
	}

	// Remove trailing slash from endpoint if present
	endpoint := strings.TrimSuffix(s.endpoint, "/")
	url := fmt.Sprintf("%s/openai/deployments/%s/chat/completions?api-version=%s", endpoint, s.deployment, s.apiVersion)

	log.Printf("Azure OpenAI request URL: %s", url)

	reqBody := chatRequest{
		Messages:    messages,
		MaxTokens:   512,
		Temperature: 0.5,
	}
	bodyBytes, _ := json.Marshal(reqBody)

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(bodyBytes))
	if err != nil {
		return "", err
	}
	req.Header.Set("api-key", s.apiKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		// Read response body for more details
		body, _ := io.ReadAll(resp.Body)
		log.Printf("Azure OpenAI error response: %s", string(body))
		return "", fmt.Errorf("azure openai request failed: %s - %s", resp.Status, string(body))
	}

	var parsed chatResponse
	if err := json.NewDecoder(resp.Body).Decode(&parsed); err != nil {
		return "", err
	}
	if len(parsed.Choices) == 0 || parsed.Choices[0].Message.Content == "" {
		return "", errors.New("azure openai returned no content")
	}
	return parsed.Choices[0].Message.Content, nil
}
