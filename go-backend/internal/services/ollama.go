package services

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

// OllamaClient implements LLMProvider for Ollama (local LLM)
type OllamaClient struct {
	httpClient *http.Client
	baseURL    string
	model      string
}

// NewOllamaClient creates a new Ollama client
func NewOllamaClient(baseURL, model string) *OllamaClient {
	if baseURL == "" {
		baseURL = "http://localhost:11434"
	}
	if model == "" {
		model = "llama3.2"
	}
	return &OllamaClient{
		httpClient: &http.Client{Timeout: 120 * time.Second},
		baseURL:    strings.TrimRight(baseURL, "/"),
		model:      model,
	}
}

// Name returns the provider identifier
func (c *OllamaClient) Name() string { return "ollama" }

// Enabled returns true if Ollama is configured (always true if instantiated, but we check URL)
func (c *OllamaClient) Enabled() bool {
	return c.baseURL != ""
}

// Chat sends a non-streaming chat completion request
func (c *OllamaClient) Chat(ctx context.Context, messages []ChatMessage) (string, int, error) {
	if !c.Enabled() {
		return "", 0, errors.New("ollama not configured")
	}

	reqBody := map[string]interface{}{
		"model":    c.model,
		"messages": messages,
		"stream":   false,
	}

	jsonBody, err := json.Marshal(reqBody)
	if err != nil {
		return "", 0, fmt.Errorf("failed to marshal request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, "POST", c.baseURL+"/api/chat", bytes.NewBuffer(jsonBody))
	if err != nil {
		return "", 0, fmt.Errorf("failed to create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return "", 0, fmt.Errorf("ollama request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return "", 0, fmt.Errorf("ollama error (status %d): %s", resp.StatusCode, string(body))
	}

	var result struct {
		Message struct {
			Content string `json:"content"`
		} `json:"message"`
		EvalCount int `json:"eval_count"` // Token count
	}

	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", 0, fmt.Errorf("failed to decode response: %w", err)
	}

	return result.Message.Content, result.EvalCount, nil
}

// StreamChat sends a streaming chat completion request
func (c *OllamaClient) StreamChat(ctx context.Context, messages []ChatMessage, tokens chan<- string) (int, error) {
	defer close(tokens)

	if !c.Enabled() {
		return 0, errors.New("ollama not configured")
	}

	reqBody := map[string]interface{}{
		"model":    c.model,
		"messages": messages,
		"stream":   true,
	}

	jsonBody, err := json.Marshal(reqBody)
	if err != nil {
		return 0, fmt.Errorf("failed to marshal request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, "POST", c.baseURL+"/api/chat", bytes.NewBuffer(jsonBody))
	if err != nil {
		return 0, fmt.Errorf("failed to create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return 0, fmt.Errorf("ollama request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return 0, fmt.Errorf("ollama error (status %d): %s", resp.StatusCode, string(body))
	}

	scanner := bufio.NewScanner(resp.Body)
	totalTokens := 0

	for scanner.Scan() {
		line := scanner.Text()
		if line == "" {
			continue
		}

		var chunk struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
			Done      bool `json:"done"`
			EvalCount int  `json:"eval_count"`
		}

		if err := json.Unmarshal([]byte(line), &chunk); err != nil {
			// Log error but continue? Or stop?
			// For now, we'll just continue reading
			continue
		}

		if chunk.Message.Content != "" {
			tokens <- chunk.Message.Content
		}

		if chunk.Done {
			totalTokens = chunk.EvalCount
		}
	}

	if err := scanner.Err(); err != nil {
		return totalTokens, fmt.Errorf("stream reading error: %w", err)
	}

	return totalTokens, nil
}
