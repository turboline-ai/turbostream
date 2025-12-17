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

// AnthropicClient implements LLMProvider for Anthropic's Claude API
type AnthropicClient struct {
	httpClient *http.Client
	apiKey     string
	model      string
}

// NewAnthropicClient creates a new Anthropic client
func NewAnthropicClient(apiKey, model string) *AnthropicClient {
	if model == "" {
		model = "claude-3-5-sonnet-20241022"
	}
	return &AnthropicClient{
		httpClient: &http.Client{Timeout: 120 * time.Second},
		apiKey:     apiKey,
		model:      model,
	}
}

// Name returns the provider identifier
func (c *AnthropicClient) Name() string { return "anthropic" }

// Enabled returns true if Anthropic is configured
func (c *AnthropicClient) Enabled() bool {
	return c.apiKey != ""
}

// convertMessages converts OpenAI-style messages to Anthropic format
// Anthropic uses a separate system parameter instead of a system message
func (c *AnthropicClient) convertMessages(messages []ChatMessage) (string, []map[string]string) {
	var system string
	var converted []map[string]string

	for _, msg := range messages {
		if msg.Role == "system" {
			system = msg.Content
		} else {
			converted = append(converted, map[string]string{
				"role":    msg.Role,
				"content": msg.Content,
			})
		}
	}
	return system, converted
}

// Chat sends a non-streaming chat completion request
func (c *AnthropicClient) Chat(ctx context.Context, messages []ChatMessage) (string, int, error) {
	if !c.Enabled() {
		return "", 0, errors.New("anthropic not configured")
	}

	system, msgs := c.convertMessages(messages)

	reqBody := map[string]interface{}{
		"model":      c.model,
		"max_tokens": 1024,
		"messages":   msgs,
	}
	if system != "" {
		reqBody["system"] = system
	}
	bodyBytes, _ := json.Marshal(reqBody)

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, "https://api.anthropic.com/v1/messages", bytes.NewReader(bodyBytes))
	if err != nil {
		return "", 0, err
	}
	req.Header.Set("x-api-key", c.apiKey)
	req.Header.Set("anthropic-version", "2023-06-01")
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return "", 0, err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		body, _ := io.ReadAll(resp.Body)
		return "", 0, fmt.Errorf("anthropic error %d: %s", resp.StatusCode, string(body))
	}

	var result struct {
		Content []struct {
			Text string `json:"text"`
		} `json:"content"`
		Usage struct {
			InputTokens  int `json:"input_tokens"`
			OutputTokens int `json:"output_tokens"`
		} `json:"usage"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", 0, err
	}
	if len(result.Content) == 0 {
		return "", 0, errors.New("anthropic returned no content")
	}
	totalTokens := result.Usage.InputTokens + result.Usage.OutputTokens
	return result.Content[0].Text, totalTokens, nil
}

// StreamChat sends a streaming chat completion request
func (c *AnthropicClient) StreamChat(ctx context.Context, messages []ChatMessage, tokens chan<- string) (int, error) {
	defer close(tokens)

	if !c.Enabled() {
		return 0, errors.New("anthropic not configured")
	}

	system, msgs := c.convertMessages(messages)

	reqBody := map[string]interface{}{
		"model":      c.model,
		"max_tokens": 1024,
		"messages":   msgs,
		"stream":     true,
	}
	if system != "" {
		reqBody["system"] = system
	}
	bodyBytes, _ := json.Marshal(reqBody)

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, "https://api.anthropic.com/v1/messages", bytes.NewReader(bodyBytes))
	if err != nil {
		return 0, err
	}
	req.Header.Set("x-api-key", c.apiKey)
	req.Header.Set("anthropic-version", "2023-06-01")
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return 0, err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		body, _ := io.ReadAll(resp.Body)
		return 0, fmt.Errorf("anthropic error %d: %s", resp.StatusCode, string(body))
	}

	scanner := bufio.NewScanner(resp.Body)
	var totalTokens int

	for scanner.Scan() {
		line := scanner.Text()
		if !strings.HasPrefix(line, "data: ") {
			continue
		}
		data := strings.TrimPrefix(line, "data: ")

		var event struct {
			Type  string `json:"type"`
			Delta struct {
				Text string `json:"text"`
			} `json:"delta"`
			Usage struct {
				OutputTokens int `json:"output_tokens"`
			} `json:"usage"`
		}
		if err := json.Unmarshal([]byte(data), &event); err != nil {
			continue
		}

		switch event.Type {
		case "content_block_delta":
			if event.Delta.Text != "" {
				tokens <- event.Delta.Text
			}
		case "message_delta":
			totalTokens = event.Usage.OutputTokens
		}
	}

	return totalTokens, scanner.Err()
}

// Ensure AnthropicClient implements LLMProvider
var _ LLMProvider = (*AnthropicClient)(nil)
