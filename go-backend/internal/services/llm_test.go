package services

import (
	"context"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/turboline-ai/turbostream/go-backend/internal/config"
)

func TestNewLLMService_MultipleProviders(t *testing.T) {
	tests := []struct {
		name              string
		cfg               config.Config
		expectedProviders []string
		expectEnabled     bool
	}{
		{
			name: "OpenAI only",
			cfg: config.Config{
				OpenAIAPIKey:      "test-key",
				OpenAIModel:       "gpt-4o",
				DefaultAIProvider: "openai",
				LLMContextLimit:   100,
			},
			expectedProviders: []string{"openai"},
			expectEnabled:     true,
		},
		{
			name: "Anthropic only",
			cfg: config.Config{
				AnthropicAPIKey:   "test-key",
				AnthropicModel:    "claude-3-5-sonnet-20241022",
				DefaultAIProvider: "anthropic",
				LLMContextLimit:   100,
			},
			expectedProviders: []string{"anthropic"},
			expectEnabled:     true,
		},
		{
			name: "Multiple providers",
			cfg: config.Config{
				OpenAIAPIKey:      "openai-key",
				OpenAIModel:       "gpt-4o",
				AnthropicAPIKey:   "anthropic-key",
				AnthropicModel:    "claude-3-5-sonnet-20241022",
				GoogleAPIKey:      "gemini-key",
				GoogleModel:       "gemini-pro",
				MistralAPIKey:     "mistral-key",
				MistralModel:      "mistral-large-latest",
				XAIAPIKey:         "xai-key",
				XAIModel:          "grok-beta",
				DefaultAIProvider: "anthropic",
				LLMContextLimit:   100,
			},
			expectedProviders: []string{"openai", "anthropic", "gemini", "mistral", "grok"},
			expectEnabled:     true,
		},
		{
			name: "No providers configured",
			cfg: config.Config{
				LLMContextLimit: 100,
			},
			expectedProviders: []string{},
			expectEnabled:     false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			svc, err := NewLLMService(tt.cfg)
			require.NoError(t, err)
			require.NotNil(t, svc)

			assert.Equal(t, tt.expectEnabled, svc.Enabled())

			providers := svc.GetAvailableProviders()
			assert.Len(t, providers, len(tt.expectedProviders))

			// Check all expected providers are present
			providerMap := make(map[string]bool)
			for _, p := range providers {
				providerMap[p] = true
			}
			for _, expected := range tt.expectedProviders {
				assert.True(t, providerMap[expected], "expected provider %s not found", expected)
			}
		})
	}
}

func TestLLMService_GetProvider(t *testing.T) {
	cfg := config.Config{
		OpenAIAPIKey:      "openai-key",
		OpenAIModel:       "gpt-4o",
		AnthropicAPIKey:   "anthropic-key",
		AnthropicModel:    "claude-3-5-sonnet-20241022",
		DefaultAIProvider: "anthropic",
		LLMContextLimit:   100,
	}

	svc, err := NewLLMService(cfg)
	require.NoError(t, err)

	tests := []struct {
		name         string
		providerName string
		expectError  bool
		expectedName string
	}{
		{
			name:         "Get specific provider - OpenAI",
			providerName: "openai",
			expectError:  false,
			expectedName: "openai",
		},
		{
			name:         "Get specific provider - Anthropic",
			providerName: "anthropic",
			expectError:  false,
			expectedName: "anthropic",
		},
		{
			name:         "Get default provider",
			providerName: "",
			expectError:  false,
			expectedName: "anthropic",
		},
		{
			name:         "Get non-existent provider",
			providerName: "non-existent",
			expectError:  true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			provider, err := svc.GetProvider(tt.providerName)
			if tt.expectError {
				assert.Error(t, err)
				assert.Nil(t, provider)
			} else {
				assert.NoError(t, err)
				require.NotNil(t, provider)
				assert.Equal(t, tt.expectedName, provider.Name())
			}
		})
	}
}

func TestLLMService_GetProvider_Fallback(t *testing.T) {
	// Test fallback order when default is not set
	cfg := config.Config{
		MistralAPIKey:   "mistral-key",
		MistralModel:    "mistral-large-latest",
		GoogleAPIKey:    "gemini-key",
		GoogleModel:     "gemini-pro",
		LLMContextLimit: 100,
	}

	svc, err := NewLLMService(cfg)
	require.NoError(t, err)

	// Should fall back to first in preference order (gemini comes before mistral)
	provider, err := svc.GetProvider("")
	require.NoError(t, err)
	// Based on preferOrder in llm.go: azure-openai, openai, anthropic, gemini, mistral, grok
	// So it should pick gemini
	assert.Equal(t, "gemini", provider.Name())
}

func TestLLMService_FeedContext(t *testing.T) {
	cfg := config.Config{
		OpenAIAPIKey:    "test-key",
		LLMContextLimit: 3, // Small limit for testing
	}

	svc, err := NewLLMService(cfg)
	require.NoError(t, err)

	feedID := "test-feed-123"
	feedName := "Test Feed"

	// Initially no context
	ctx := svc.GetFeedContext(feedID)
	assert.Nil(t, ctx)

	// Add first entry
	svc.AddFeedData(feedID, feedName, map[string]interface{}{
		"value": 100,
		"type":  "metric",
	})

	ctx = svc.GetFeedContext(feedID)
	require.NotNil(t, ctx)
	assert.Equal(t, feedID, ctx.FeedID)
	assert.Equal(t, feedName, ctx.FeedName)
	assert.Len(t, ctx.Entries, 1)
	assert.Equal(t, 100, ctx.Entries[0]["value"])

	// Add more entries
	svc.AddFeedData(feedID, feedName, map[string]interface{}{"value": 200})
	svc.AddFeedData(feedID, feedName, map[string]interface{}{"value": 300})

	ctx = svc.GetFeedContext(feedID)
	assert.Len(t, ctx.Entries, 3)
	// Newest first
	assert.Equal(t, 300, ctx.Entries[0]["value"])
	assert.Equal(t, 200, ctx.Entries[1]["value"])
	assert.Equal(t, 100, ctx.Entries[2]["value"])

	// Add one more - should trigger limit
	svc.AddFeedData(feedID, feedName, map[string]interface{}{"value": 400})

	ctx = svc.GetFeedContext(feedID)
	assert.Len(t, ctx.Entries, 3) // Limited to 3
	assert.Equal(t, 400, ctx.Entries[0]["value"])
	assert.Equal(t, 300, ctx.Entries[1]["value"])
	assert.Equal(t, 200, ctx.Entries[2]["value"])
	// 100 should be evicted
}

func TestLLMService_FeedContext_DifferentDataTypes(t *testing.T) {
	cfg := config.Config{
		OpenAIAPIKey:    "test-key",
		LLMContextLimit: 10,
	}

	svc, err := NewLLMService(cfg)
	require.NoError(t, err)

	feedID := "test-feed"
	feedName := "Test"

	tests := []struct {
		name      string
		data      interface{}
		checkFunc func(*testing.T, map[string]interface{})
	}{
		{
			name: "Map data",
			data: map[string]interface{}{"key": "value", "num": 42},
			checkFunc: func(t *testing.T, entry map[string]interface{}) {
				assert.Equal(t, "value", entry["key"])
				assert.Equal(t, 42, entry["num"])
			},
		},
		{
			name: "String data",
			data: "simple string",
			checkFunc: func(t *testing.T, entry map[string]interface{}) {
				assert.Equal(t, "simple string", entry["raw"])
			},
		},
		{
			name: "Struct data",
			data: struct {
				Name  string
				Value int
			}{Name: "test", Value: 123},
			checkFunc: func(t *testing.T, entry map[string]interface{}) {
				assert.Equal(t, "test", entry["Name"])
				assert.Equal(t, float64(123), entry["Value"])
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			svc.AddFeedData(feedID, feedName, tt.data)
			ctx := svc.GetFeedContext(feedID)
			require.NotNil(t, ctx)
			require.Greater(t, len(ctx.Entries), 0)

			// Get the most recent entry
			entry := ctx.Entries[0]
			tt.checkFunc(t, entry)

			// All entries should have timestamp
			assert.NotEmpty(t, entry["_timestamp"])
		})
	}
}

func TestLLMService_ClearFeedContext(t *testing.T) {
	cfg := config.Config{
		OpenAIAPIKey:    "test-key",
		LLMContextLimit: 100,
	}

	svc, err := NewLLMService(cfg)
	require.NoError(t, err)

	feedID := "test-feed"
	svc.AddFeedData(feedID, "Test", map[string]interface{}{"value": 1})

	ctx := svc.GetFeedContext(feedID)
	assert.NotNil(t, ctx)

	svc.ClearFeedContext(feedID)

	ctx = svc.GetFeedContext(feedID)
	assert.Nil(t, ctx)
}

func TestLLMService_Query_NoProvider(t *testing.T) {
	cfg := config.Config{
		LLMContextLimit: 100,
	}

	svc, err := NewLLMService(cfg)
	require.NoError(t, err)

	req := QueryRequest{
		FeedID:   "test-feed",
		Question: "What is the data?",
	}

	_, err = svc.Query(context.Background(), req)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "no LLM providers available")
}

func TestLLMService_Query_NoData(t *testing.T) {
	cfg := config.Config{
		OpenAIAPIKey:    "test-key",
		LLMContextLimit: 100,
	}

	svc, err := NewLLMService(cfg)
	require.NoError(t, err)

	req := QueryRequest{
		FeedID:   "non-existent-feed",
		Question: "What is the data?",
	}

	resp, err := svc.Query(context.Background(), req)
	require.NoError(t, err)
	assert.Contains(t, resp.Answer, "No data available")
	assert.Equal(t, "none", resp.Provider)
}

func TestLLMService_MultipleFeedContexts(t *testing.T) {
	cfg := config.Config{
		OpenAIAPIKey:    "test-key",
		LLMContextLimit: 5,
	}

	svc, err := NewLLMService(cfg)
	require.NoError(t, err)

	// Add data to multiple feeds
	feed1 := "feed-1"
	feed2 := "feed-2"

	svc.AddFeedData(feed1, "Feed 1", map[string]interface{}{"value": 100})
	svc.AddFeedData(feed2, "Feed 2", map[string]interface{}{"value": 200})
	svc.AddFeedData(feed1, "Feed 1", map[string]interface{}{"value": 101})

	ctx1 := svc.GetFeedContext(feed1)
	ctx2 := svc.GetFeedContext(feed2)

	require.NotNil(t, ctx1)
	require.NotNil(t, ctx2)

	assert.Len(t, ctx1.Entries, 2)
	assert.Len(t, ctx2.Entries, 1)

	assert.Equal(t, 101, ctx1.Entries[0]["value"])
	assert.Equal(t, 200, ctx2.Entries[0]["value"])
}

func TestLLMService_ContextTimestamps(t *testing.T) {
	cfg := config.Config{
		OpenAIAPIKey:    "test-key",
		LLMContextLimit: 10,
	}

	svc, err := NewLLMService(cfg)
	require.NoError(t, err)

	feedID := "test-feed"
	before := time.Now()

	svc.AddFeedData(feedID, "Test", map[string]interface{}{"value": 1})

	after := time.Now()

	ctx := svc.GetFeedContext(feedID)
	require.NotNil(t, ctx)

	// Check UpdatedAt timestamp
	assert.True(t, ctx.UpdatedAt.After(before) || ctx.UpdatedAt.Equal(before))
	assert.True(t, ctx.UpdatedAt.Before(after) || ctx.UpdatedAt.Equal(after))

	// Check entry timestamp
	require.Greater(t, len(ctx.Entries), 0)
	assert.NotEmpty(t, ctx.Entries[0]["_timestamp"])
}

// TestAnalysisMemory_AddResult tests adding analysis results
func TestAnalysisMemory_AddResult(t *testing.T) {
	mem := &AnalysisMemory{
		FeedID:  "test-feed",
		Results: make([]AnalysisResult, 0, 3),
		Limit:   3,
	}

	// Add first result
	mem.AddResult("What's the price?", "The price is $100", "openai")
	assert.Len(t, mem.Results, 1)
	assert.Equal(t, "What's the price?", mem.Results[0].Question)
	assert.Equal(t, "The price is $100", mem.Results[0].Answer)
	assert.Equal(t, "openai", mem.Results[0].Provider)
	assert.False(t, mem.Results[0].Timestamp.IsZero())

	// Add second result
	mem.AddResult("What's the trend?", "Upward trend", "anthropic")
	assert.Len(t, mem.Results, 2)
	// Newest should be first
	assert.Equal(t, "What's the trend?", mem.Results[0].Question)
	assert.Equal(t, "What's the price?", mem.Results[1].Question)

	// Add third result
	mem.AddResult("Any changes?", "Price stable", "gemini")
	assert.Len(t, mem.Results, 3)
	assert.Equal(t, "Any changes?", mem.Results[0].Question)
	assert.Equal(t, "What's the trend?", mem.Results[1].Question)
	assert.Equal(t, "What's the price?", mem.Results[2].Question)
}

// TestAnalysisMemory_Eviction tests FIFO eviction when limit exceeded
func TestAnalysisMemory_Eviction(t *testing.T) {
	mem := &AnalysisMemory{
		FeedID:  "test-feed",
		Results: make([]AnalysisResult, 0, 3),
		Limit:   3,
	}

	// Add 3 results
	mem.AddResult("Q1", "A1", "provider1")
	mem.AddResult("Q2", "A2", "provider2")
	mem.AddResult("Q3", "A3", "provider3")
	assert.Len(t, mem.Results, 3)

	// Add 4th result - should evict oldest (Q1)
	mem.AddResult("Q4", "A4", "provider4")
	assert.Len(t, mem.Results, 3)

	// Verify order (newest first)
	assert.Equal(t, "Q4", mem.Results[0].Question)
	assert.Equal(t, "Q3", mem.Results[1].Question)
	assert.Equal(t, "Q2", mem.Results[2].Question)

	// Q1 should be evicted
	for _, result := range mem.Results {
		assert.NotEqual(t, "Q1", result.Question)
	}
}

// TestLLMService_AnalysisMemory tests the analysis memory integration
func TestLLMService_AnalysisMemory(t *testing.T) {
	cfg := config.Config{
		OpenAIAPIKey:    "test-key",
		OpenAIModel:     "gpt-4o",
		LLMContextLimit: 50,
	}

	svc, err := NewLLMService(cfg)
	require.NoError(t, err)

	feedID := "test-feed-123"

	// Initially no analysis memory
	results := svc.GetAnalysisMemory(feedID)
	assert.Nil(t, results)

	// Add first analysis result
	svc.addAnalysisResult(feedID, "What's the price?", "Price is $100", "openai")

	results = svc.GetAnalysisMemory(feedID)
	require.NotNil(t, results)
	assert.Len(t, results, 1)
	assert.Equal(t, "What's the price?", results[0].Question)
	assert.Equal(t, "Price is $100", results[0].Answer)

	// Add second analysis result
	svc.addAnalysisResult(feedID, "What's the trend?", "Upward", "anthropic")

	results = svc.GetAnalysisMemory(feedID)
	assert.Len(t, results, 2)
	// Newest first
	assert.Equal(t, "What's the trend?", results[0].Question)
	assert.Equal(t, "What's the price?", results[1].Question)

	// Add third analysis result
	svc.addAnalysisResult(feedID, "Any changes?", "Stable", "gemini")

	results = svc.GetAnalysisMemory(feedID)
	assert.Len(t, results, 3)
	assert.Equal(t, "Any changes?", results[0].Question)
	assert.Equal(t, "What's the trend?", results[1].Question)
	assert.Equal(t, "What's the price?", results[2].Question)

	// Add fourth - should evict oldest
	svc.addAnalysisResult(feedID, "Current status?", "All good", "openai")

	results = svc.GetAnalysisMemory(feedID)
	assert.Len(t, results, 3)
	assert.Equal(t, "Current status?", results[0].Question)
	assert.Equal(t, "Any changes?", results[1].Question)
	assert.Equal(t, "What's the trend?", results[2].Question)

	// First result "What's the price?" should be evicted
	for _, result := range results {
		assert.NotEqual(t, "What's the price?", result.Question)
	}
}

// TestLLMService_AnalysisMemory_MultipleFeeds tests isolation between feeds
func TestLLMService_AnalysisMemory_MultipleFeeds(t *testing.T) {
	cfg := config.Config{
		OpenAIAPIKey:    "test-key",
		LLMContextLimit: 50,
	}

	svc, err := NewLLMService(cfg)
	require.NoError(t, err)

	feed1 := "feed-1"
	feed2 := "feed-2"

	// Add analysis to feed1
	svc.addAnalysisResult(feed1, "Q1 for feed1", "A1", "openai")
	svc.addAnalysisResult(feed1, "Q2 for feed1", "A2", "openai")

	// Add analysis to feed2
	svc.addAnalysisResult(feed2, "Q1 for feed2", "A1", "anthropic")

	// Verify feed1 has 2 results
	results1 := svc.GetAnalysisMemory(feed1)
	assert.Len(t, results1, 2)
	assert.Equal(t, "Q2 for feed1", results1[0].Question)
	assert.Equal(t, "Q1 for feed1", results1[1].Question)

	// Verify feed2 has 1 result
	results2 := svc.GetAnalysisMemory(feed2)
	assert.Len(t, results2, 1)
	assert.Equal(t, "Q1 for feed2", results2[0].Question)

	// Results should be isolated
	for _, result := range results1 {
		assert.NotContains(t, result.Question, "feed2")
	}
	for _, result := range results2 {
		assert.NotContains(t, result.Question, "feed1")
	}
}

// TestLLMService_ClearFeedContext_ClearsAnalysisMemory tests that clearing context also clears analysis memory
func TestLLMService_ClearFeedContext_ClearsAnalysisMemory(t *testing.T) {
	cfg := config.Config{
		OpenAIAPIKey:    "test-key",
		LLMContextLimit: 50,
	}

	svc, err := NewLLMService(cfg)
	require.NoError(t, err)

	feedID := "test-feed"

	// Add feed context
	svc.AddFeedData(feedID, "Test Feed", map[string]interface{}{"value": 100})

	// Add analysis memory
	svc.addAnalysisResult(feedID, "Test question", "Test answer", "openai")

	// Verify both exist
	assert.NotNil(t, svc.GetFeedContext(feedID))
	assert.NotNil(t, svc.GetAnalysisMemory(feedID))

	// Clear context
	svc.ClearFeedContext(feedID)

	// Both should be cleared
	assert.Nil(t, svc.GetFeedContext(feedID))
	assert.Nil(t, svc.GetAnalysisMemory(feedID))
}

// TestAnalysisMemory_TimestampOrdering tests that timestamps are properly ordered
func TestAnalysisMemory_TimestampOrdering(t *testing.T) {
	mem := &AnalysisMemory{
		FeedID:  "test-feed",
		Results: make([]AnalysisResult, 0, 3),
		Limit:   3,
	}

	// Add results with slight delays
	mem.AddResult("First", "Answer 1", "provider1")
	time.Sleep(10 * time.Millisecond)

	mem.AddResult("Second", "Answer 2", "provider2")
	time.Sleep(10 * time.Millisecond)

	mem.AddResult("Third", "Answer 3", "provider3")

	// Verify timestamps are in descending order (newest first)
	assert.True(t, mem.Results[0].Timestamp.After(mem.Results[1].Timestamp))
	assert.True(t, mem.Results[1].Timestamp.After(mem.Results[2].Timestamp))

	// Verify questions are in newest-first order
	assert.Equal(t, "Third", mem.Results[0].Question)
	assert.Equal(t, "Second", mem.Results[1].Question)
	assert.Equal(t, "First", mem.Results[2].Question)
}
