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

// MistralClient implements LLMProvider for Mistral's API
// Mistral uses an OpenAI-compatible API format
type MistralClient struct {
	httpClient *http.Client
	apiKey     string
	model      string
}

// NewMistralClient creates a new Mistral client
func NewMistralClient(apiKey, model string) *MistralClient {
	if model == "" {
		model = "mistral-large-latest"
	}
	return &MistralClient{
		httpClient: &http.Client{Timeout: 120 * time.Second},
		apiKey:     apiKey,
		model:      model,
	}
}

// Name returns the provider identifier
func (c *MistralClient) Name() string { return "mistral" }

// Enabled returns true if Mistral is configured
func (c *MistralClient) Enabled() bool {
	return c.apiKey != ""
}

// Chat sends a non-streaming chat completion request
func (c *MistralClient) Chat(ctx context.Context, messages []ChatMessage) (string, int, error) {
	if !c.Enabled() {
		return "", 0, errors.New("mistral not configured")
	}

	// Mistral uses OpenAI-compatible format
	reqBody := map[string]interface{}{
		"model":       c.model,
		"messages":    messages,
		"max_tokens":  1024,
		"temperature": 0.7,
	}
	bodyBytes, _ := json.Marshal(reqBody)

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, "https://api.mistral.ai/v1/chat/completions", bytes.NewReader(bodyBytes))
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
		return "", 0, fmt.Errorf("mistral error %d: %s", resp.StatusCode, string(body))
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
		return "", 0, errors.New("mistral returned no choices")
	}
	return result.Choices[0].Message.Content, result.Usage.TotalTokens, nil
}

// StreamChat sends a streaming chat completion request
func (c *MistralClient) StreamChat(ctx context.Context, messages []ChatMessage, tokens chan<- string) (int, error) {
	defer close(tokens)

	if !c.Enabled() {
		return 0, errors.New("mistral not configured")
	}

	reqBody := map[string]interface{}{
		"model":       c.model,
		"messages":    messages,
		"max_tokens":  1024,
		"temperature": 0.7,
		"stream":      true,
	}
	bodyBytes, _ := json.Marshal(reqBody)

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, "https://api.mistral.ai/v1/chat/completions", bytes.NewReader(bodyBytes))
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
		return 0, fmt.Errorf("mistral error %d: %s", resp.StatusCode, string(body))
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

// Ensure MistralClient implements LLMProvider
var _ LLMProvider = (*MistralClient)(nil)
