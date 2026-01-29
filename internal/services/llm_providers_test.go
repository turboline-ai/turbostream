package services

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
)

// Test OpenAI Provider
func TestOpenAIClient_New(t *testing.T) {
	tests := []struct {
		name          string
		apiKey        string
		model         string
		expectedModel string
	}{
		{
			name:          "With custom model",
			apiKey:        "test-key",
			model:         "gpt-4",
			expectedModel: "gpt-4",
		},
		{
			name:          "With default model",
			apiKey:        "test-key",
			model:         "",
			expectedModel: "gpt-4o",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			client := NewOpenAIClient(tt.apiKey, tt.model)
			assert.NotNil(t, client)
			assert.Equal(t, tt.expectedModel, client.model)
			assert.Equal(t, tt.apiKey, client.apiKey)
			assert.Equal(t, "https://api.openai.com/v1", client.baseURL)
		})
	}
}

func TestOpenAIClient_Name(t *testing.T) {
	client := NewOpenAIClient("test-key", "")
	assert.Equal(t, "openai", client.Name())
}

func TestOpenAIClient_Enabled(t *testing.T) {
	tests := []struct {
		name     string
		apiKey   string
		expected bool
	}{
		{
			name:     "Enabled with API key",
			apiKey:   "test-key",
			expected: true,
		},
		{
			name:     "Disabled without API key",
			apiKey:   "",
			expected: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			client := NewOpenAIClient(tt.apiKey, "")
			assert.Equal(t, tt.expected, client.Enabled())
		})
	}
}

func TestOpenAIClient_Chat_NotEnabled(t *testing.T) {
	client := NewOpenAIClient("", "")
	assert.False(t, client.Enabled())

	_, _, err := client.Chat(context.Background(), []ChatMessage{
		{Role: "user", Content: "test"},
	})
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "not configured")
}

func TestOpenAIClient_StreamChat_NotEnabled(t *testing.T) {
	client := NewOpenAIClient("", "")
	assert.False(t, client.Enabled())

	tokens := make(chan string, 10)
	_, err := client.StreamChat(context.Background(), []ChatMessage{
		{Role: "user", Content: "test"},
	}, tokens)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "not configured")
}

// Test Anthropic Provider
func TestAnthropicClient_New(t *testing.T) {
	tests := []struct {
		name          string
		apiKey        string
		model         string
		expectedModel string
	}{
		{
			name:          "With custom model",
			apiKey:        "test-key",
			model:         "claude-3-opus-20240229",
			expectedModel: "claude-3-opus-20240229",
		},
		{
			name:          "With default model",
			apiKey:        "test-key",
			model:         "",
			expectedModel: "claude-3-5-sonnet-20241022",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			client := NewAnthropicClient(tt.apiKey, tt.model)
			assert.NotNil(t, client)
			assert.Equal(t, tt.expectedModel, client.model)
			assert.Equal(t, tt.apiKey, client.apiKey)
		})
	}
}

func TestAnthropicClient_Name(t *testing.T) {
	client := NewAnthropicClient("test-key", "")
	assert.Equal(t, "anthropic", client.Name())
}

func TestAnthropicClient_Enabled(t *testing.T) {
	tests := []struct {
		name     string
		apiKey   string
		expected bool
	}{
		{
			name:     "Enabled with API key",
			apiKey:   "test-key",
			expected: true,
		},
		{
			name:     "Disabled without API key",
			apiKey:   "",
			expected: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			client := NewAnthropicClient(tt.apiKey, "")
			assert.Equal(t, tt.expected, client.Enabled())
		})
	}
}

func TestAnthropicClient_ConvertMessages(t *testing.T) {
	client := NewAnthropicClient("test-key", "")

	tests := []struct {
		name            string
		messages        []ChatMessage
		expectedSystem  string
		expectedMsgLen  int
		expectedMsgRole string
	}{
		{
			name: "With system message",
			messages: []ChatMessage{
				{Role: "system", Content: "You are a helpful assistant"},
				{Role: "user", Content: "Hello"},
			},
			expectedSystem:  "You are a helpful assistant",
			expectedMsgLen:  1,
			expectedMsgRole: "user",
		},
		{
			name: "Without system message",
			messages: []ChatMessage{
				{Role: "user", Content: "Hello"},
				{Role: "assistant", Content: "Hi there"},
			},
			expectedSystem:  "",
			expectedMsgLen:  2,
			expectedMsgRole: "user",
		},
		{
			name: "Multiple messages with system",
			messages: []ChatMessage{
				{Role: "system", Content: "System prompt"},
				{Role: "user", Content: "Question 1"},
				{Role: "assistant", Content: "Answer 1"},
				{Role: "user", Content: "Question 2"},
			},
			expectedSystem:  "System prompt",
			expectedMsgLen:  3,
			expectedMsgRole: "user",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			system, msgs := client.convertMessages(tt.messages)
			assert.Equal(t, tt.expectedSystem, system)
			assert.Len(t, msgs, tt.expectedMsgLen)
			if tt.expectedMsgLen > 0 {
				assert.Equal(t, tt.expectedMsgRole, msgs[0]["role"])
			}
		})
	}
}

func TestAnthropicClient_Chat_NotEnabled(t *testing.T) {
	client := NewAnthropicClient("", "")
	assert.False(t, client.Enabled())

	_, _, err := client.Chat(context.Background(), []ChatMessage{
		{Role: "user", Content: "test"},
	})
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "not configured")
}

func TestAnthropicClient_StreamChat_NotEnabled(t *testing.T) {
	client := NewAnthropicClient("", "")
	assert.False(t, client.Enabled())

	tokens := make(chan string, 10)
	_, err := client.StreamChat(context.Background(), []ChatMessage{
		{Role: "user", Content: "test"},
	}, tokens)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "not configured")
}

// Test Gemini Provider
func TestGeminiClient_New(t *testing.T) {
	tests := []struct {
		name          string
		apiKey        string
		model         string
		expectedModel string
	}{
		{
			name:          "With custom model",
			apiKey:        "test-key",
			model:         "gemini-1.5-pro",
			expectedModel: "gemini-1.5-pro",
		},
		{
			name:          "With default model",
			apiKey:        "test-key",
			model:         "",
			expectedModel: "gemini-1.5-flash",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			client := NewGeminiClient(tt.apiKey, tt.model)
			assert.NotNil(t, client)
			assert.Equal(t, tt.expectedModel, client.model)
			assert.Equal(t, tt.apiKey, client.apiKey)
		})
	}
}

func TestGeminiClient_Name(t *testing.T) {
	client := NewGeminiClient("test-key", "")
	assert.Equal(t, "gemini", client.Name())
}

func TestGeminiClient_Enabled(t *testing.T) {
	tests := []struct {
		name     string
		apiKey   string
		expected bool
	}{
		{
			name:     "Enabled with API key",
			apiKey:   "test-key",
			expected: true,
		},
		{
			name:     "Disabled without API key",
			apiKey:   "",
			expected: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			client := NewGeminiClient(tt.apiKey, "")
			assert.Equal(t, tt.expected, client.Enabled())
		})
	}
}

// Test Mistral Provider
func TestMistralClient_New(t *testing.T) {
	tests := []struct {
		name          string
		apiKey        string
		model         string
		expectedModel string
	}{
		{
			name:          "With custom model",
			apiKey:        "test-key",
			model:         "mistral-medium",
			expectedModel: "mistral-medium",
		},
		{
			name:          "With default model",
			apiKey:        "test-key",
			model:         "",
			expectedModel: "mistral-large-latest",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			client := NewMistralClient(tt.apiKey, tt.model)
			assert.NotNil(t, client)
			assert.Equal(t, tt.expectedModel, client.model)
			assert.Equal(t, tt.apiKey, client.apiKey)
		})
	}
}

func TestMistralClient_Name(t *testing.T) {
	client := NewMistralClient("test-key", "")
	assert.Equal(t, "mistral", client.Name())
}

func TestMistralClient_Enabled(t *testing.T) {
	tests := []struct {
		name     string
		apiKey   string
		expected bool
	}{
		{
			name:     "Enabled with API key",
			apiKey:   "test-key",
			expected: true,
		},
		{
			name:     "Disabled without API key",
			apiKey:   "",
			expected: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			client := NewMistralClient(tt.apiKey, "")
			assert.Equal(t, tt.expected, client.Enabled())
		})
	}
}

// Test Grok Provider
func TestGrokClient_New(t *testing.T) {
	tests := []struct {
		name          string
		apiKey        string
		model         string
		expectedModel string
	}{
		{
			name:          "With custom model",
			apiKey:        "test-key",
			model:         "grok-1",
			expectedModel: "grok-1",
		},
		{
			name:          "With default model",
			apiKey:        "test-key",
			model:         "",
			expectedModel: "grok-beta",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			client := NewGrokClient(tt.apiKey, tt.model)
			assert.NotNil(t, client)
			assert.Equal(t, tt.expectedModel, client.model)
			assert.Equal(t, tt.apiKey, client.apiKey)
		})
	}
}

func TestGrokClient_Name(t *testing.T) {
	client := NewGrokClient("test-key", "")
	assert.Equal(t, "grok", client.Name())
}

func TestGrokClient_Enabled(t *testing.T) {
	tests := []struct {
		name     string
		apiKey   string
		expected bool
	}{
		{
			name:     "Enabled with API key",
			apiKey:   "test-key",
			expected: true,
		},
		{
			name:     "Disabled without API key",
			apiKey:   "",
			expected: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			client := NewGrokClient(tt.apiKey, "")
			assert.Equal(t, tt.expected, client.Enabled())
		})
	}
}

// Test LLMProvider interface compliance
func TestLLMProvider_InterfaceCompliance(t *testing.T) {
	// These tests ensure all provider types implement LLMProvider interface
	var _ LLMProvider = (*OpenAIClient)(nil)
	var _ LLMProvider = (*AnthropicClient)(nil)
	var _ LLMProvider = (*GeminiClient)(nil)
	var _ LLMProvider = (*MistralClient)(nil)
	var _ LLMProvider = (*GrokClient)(nil)
	var _ LLMProvider = (*AzureOpenAI)(nil)
}
