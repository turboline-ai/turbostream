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

// GrokClient implements LLMProvider for xAI's Grok API
// xAI uses an OpenAI-compatible API format
type GrokClient struct {
	httpClient *http.Client
	apiKey     string
	model      string
}

// NewGrokClient creates a new Grok client
func NewGrokClient(apiKey, model string) *GrokClient {
	if model == "" {
		model = "grok-beta"
	}
	return &GrokClient{
		httpClient: &http.Client{Timeout: 120 * time.Second},
		apiKey:     apiKey,
		model:      model,
	}
}

// Name returns the provider identifier
func (c *GrokClient) Name() string { return "grok" }

// Enabled returns true if Grok is configured
func (c *GrokClient) Enabled() bool {
	return c.apiKey != ""
}

// Chat sends a non-streaming chat completion request
func (c *GrokClient) Chat(ctx context.Context, messages []ChatMessage) (string, int, error) {
	if !c.Enabled() {
		return "", 0, errors.New("grok not configured")
	}

	// xAI uses OpenAI-compatible format
	reqBody := map[string]interface{}{
		"model":       c.model,
		"messages":    messages,
		"max_tokens":  1024,
		"temperature": 0.7,
	}
	bodyBytes, _ := json.Marshal(reqBody)

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, "https://api.x.ai/v1/chat/completions", bytes.NewReader(bodyBytes))
	if err != nil {
		return "", 0, err
	}
	req.Header.Set("Authorization", "Bearer "+c.apiKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return "", 0, err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		body, _ := io.ReadAll(resp.Body)
		return "", 0, fmt.Errorf("grok error %d: %s", resp.StatusCode, string(body))
	}

	var result struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
		Usage struct {
			TotalTokens int `json:"total_tokens"`
		} `json:"usage"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", 0, err
	}
	if len(result.Choices) == 0 {
		return "", 0, errors.New("grok returned no choices")
	}
	return result.Choices[0].Message.Content, result.Usage.TotalTokens, nil
}

// StreamChat sends a streaming chat completion request
func (c *GrokClient) StreamChat(ctx context.Context, messages []ChatMessage, tokens chan<- string) (int, error) {
	defer close(tokens)

	if !c.Enabled() {
		return 0, errors.New("grok not configured")
	}

	reqBody := map[string]interface{}{
		"model":       c.model,
		"messages":    messages,
		"max_tokens":  1024,
		"temperature": 0.7,
		"stream":      true,
	}
	bodyBytes, _ := json.Marshal(reqBody)

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, "https://api.x.ai/v1/chat/completions", bytes.NewReader(bodyBytes))
	if err != nil {
		return 0, err
	}
	req.Header.Set("Authorization", "Bearer "+c.apiKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return 0, err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		body, _ := io.ReadAll(resp.Body)
		return 0, fmt.Errorf("grok error %d: %s", resp.StatusCode, string(body))
	}

	scanner := bufio.NewScanner(resp.Body)
	var totalContent strings.Builder

	for scanner.Scan() {
		line := scanner.Text()
		if !strings.HasPrefix(line, "data: ") {
			continue
		}
		data := strings.TrimPrefix(line, "data: ")
		if data == "[DONE]" {
			break
		}

		var chunk struct {
			Choices []struct {
				Delta struct {
					Content string `json:"content"`
				} `json:"delta"`
			} `json:"choices"`
		}
		if err := json.Unmarshal([]byte(data), &chunk); err != nil {
			continue
		}
		if len(chunk.Choices) > 0 && chunk.Choices[0].Delta.Content != "" {
			content := chunk.Choices[0].Delta.Content
			totalContent.WriteString(content)
			tokens <- content
		}
	}

	// Estimate tokens (actual count not available in streaming)
	estimatedTokens := len(totalContent.String()) / 4
	return estimatedTokens, scanner.Err()
}

// Ensure GrokClient implements LLMProvider
var _ LLMProvider = (*GrokClient)(nil)
