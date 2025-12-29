package services

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"strings"
	"sync"
	"time"

	"github.com/turboline-ai/turbostream/go-backend/internal/config"
)

// FeedContext represents accumulated feed data for LLM context
type FeedContext struct {
	FeedID    string                   `json:"feedId"`
	FeedName  string                   `json:"feedName"`
	Entries   []map[string]interface{} `json:"entries"`
	UpdatedAt time.Time                `json:"updatedAt"`
}

// LLMService provides LLM capabilities with multi-provider support (BYOM)
type LLMService struct {
	cfg         config.Config
	providers   map[string]LLMProvider
	defaultProv string

	// Feed context storage
	contextMu    sync.RWMutex
	feedContexts map[string]*FeedContext
	contextLimit int
}

// NewLLMService creates a new LLM service with multi-provider support
func NewLLMService(cfg config.Config) (*LLMService, error) {
	svc := &LLMService{
		cfg:          cfg,
		providers:    make(map[string]LLMProvider),
		defaultProv:  cfg.DefaultAIProvider,
		feedContexts: make(map[string]*FeedContext),
		contextLimit: cfg.LLMContextLimit,
	}

	// Register all configured providers

	// Azure OpenAI
	azure := NewAzureOpenAI(cfg)
	if azure.Enabled() {
		svc.providers["azure-openai"] = azure
		log.Printf("✓ Azure OpenAI enabled (endpoint: %s, deployment: %s)", cfg.AzureEndpoint, cfg.AzureDeployment)
	}

	// OpenAI
	if cfg.OpenAIAPIKey != "" {
		openai := NewOpenAIClient(cfg.OpenAIAPIKey, cfg.OpenAIModel)
		if openai.Enabled() {
			svc.providers["openai"] = openai
			log.Printf("✓ OpenAI enabled (model: %s)", cfg.OpenAIModel)
		}
	}

	// Anthropic (Claude)
	if cfg.AnthropicAPIKey != "" {
		anthropic := NewAnthropicClient(cfg.AnthropicAPIKey, cfg.AnthropicModel)
		if anthropic.Enabled() {
			svc.providers["anthropic"] = anthropic
			log.Printf("✓ Anthropic enabled (model: %s)", cfg.AnthropicModel)
		}
	}

	// Google Gemini
	if cfg.GoogleAPIKey != "" {
		gemini := NewGeminiClient(cfg.GoogleAPIKey, cfg.GoogleModel)
		if gemini.Enabled() {
			svc.providers["gemini"] = gemini
			log.Printf("✓ Gemini enabled (model: %s)", cfg.GoogleModel)
		}
	}

	// Mistral
	if cfg.MistralAPIKey != "" {
		mistral := NewMistralClient(cfg.MistralAPIKey, cfg.MistralModel)
		if mistral.Enabled() {
			svc.providers["mistral"] = mistral
			log.Printf("✓ Mistral enabled (model: %s)", cfg.MistralModel)
		}
	}

	// xAI (Grok)
	if cfg.XAIAPIKey != "" {
		grok := NewGrokClient(cfg.XAIAPIKey, cfg.XAIModel)
		if grok.Enabled() {
			svc.providers["grok"] = grok
			log.Printf("✓ Grok enabled (model: %s)", cfg.XAIModel)
		}
	}

	// Ollama
	if cfg.OllamaBaseURL != "" {
		ollama := NewOllamaClient(cfg.OllamaBaseURL, cfg.OllamaModel)
		if ollama.Enabled() {
			svc.providers["ollama"] = ollama
			log.Printf("✓ Ollama enabled (model: %s)", cfg.OllamaModel)
		}
	}

	if len(svc.providers) == 0 {
		log.Printf("⚠ No LLM providers configured - AI features will be disabled")
	} else {
		log.Printf("✓ %d LLM provider(s) available: %v", len(svc.providers), svc.GetAvailableProviders())
	}

	return svc, nil
}

// Enabled returns true if at least one provider is configured
func (s *LLMService) Enabled() bool {
	return len(s.providers) > 0
}

// GetProvider returns a provider by name, or the default/first available
func (s *LLMService) GetProvider(name string) (LLMProvider, error) {
	// If specific provider requested
	if name != "" {
		if p, ok := s.providers[name]; ok {
			return p, nil
		}
		return nil, fmt.Errorf("provider '%s' not configured", name)
	}

	// Try default provider
	if s.defaultProv != "" {
		if p, ok := s.providers[s.defaultProv]; ok {
			return p, nil
		}
	}

	// Fall back to any available provider (prefer order)
	preferOrder := []string{"azure-openai", "openai", "anthropic", "gemini", "mistral", "grok"}
	for _, pref := range preferOrder {
		if p, ok := s.providers[pref]; ok {
			return p, nil
		}
	}

	return nil, errors.New("no LLM providers available")
}

// GetAvailableProviders returns a list of configured provider names
func (s *LLMService) GetAvailableProviders() []string {
	names := make([]string, 0, len(s.providers))
	for name := range s.providers {
		names = append(names, name)
	}
	return names
}

// AddFeedData adds streaming feed data to the context
func (s *LLMService) AddFeedData(feedID, feedName string, data interface{}) {
	s.contextMu.Lock()
	defer s.contextMu.Unlock()

	ctx, exists := s.feedContexts[feedID]
	if !exists {
		ctx = &FeedContext{
			FeedID:   feedID,
			FeedName: feedName,
			Entries:  make([]map[string]interface{}, 0, s.contextLimit),
		}
		s.feedContexts[feedID] = ctx
	}

	// Convert data to map
	var entry map[string]interface{}
	switch v := data.(type) {
	case map[string]interface{}:
		entry = v
	case string:
		entry = map[string]interface{}{"raw": v}
	default:
		// Try JSON marshal/unmarshal
		bytes, err := json.Marshal(data)
		if err != nil {
			entry = map[string]interface{}{"raw": fmt.Sprintf("%v", data)}
		} else {
			if err := json.Unmarshal(bytes, &entry); err != nil {
				entry = map[string]interface{}{"raw": string(bytes)}
			}
		}
	}

	// Add timestamp
	entry["_timestamp"] = time.Now().UTC().Format(time.RFC3339)

	// Prepend to entries (newest first)
	ctx.Entries = append([]map[string]interface{}{entry}, ctx.Entries...)

	// Trim to limit
	if len(ctx.Entries) > s.contextLimit {
		ctx.Entries = ctx.Entries[:s.contextLimit]
	}

	ctx.UpdatedAt = time.Now()
}

// GetFeedContext returns the current context for a feed
func (s *LLMService) GetFeedContext(feedID string) *FeedContext {
	s.contextMu.RLock()
	defer s.contextMu.RUnlock()
	return s.feedContexts[feedID]
}

// ClearFeedContext removes context for a feed
func (s *LLMService) ClearFeedContext(feedID string) {
	s.contextMu.Lock()
	defer s.contextMu.Unlock()
	delete(s.feedContexts, feedID)
}

// QueryRequest represents a question about feed data
type QueryRequest struct {
	FeedID       string `json:"feedId"`
	Question     string `json:"question"`
	Provider     string `json:"provider,omitempty"` // Optional: specify provider (ignored, always uses Azure)
	SystemPrompt string `json:"systemPrompt,omitempty"`
}

// QueryResponse represents the LLM response
type QueryResponse struct {
	Answer     string `json:"answer"`
	Provider   string `json:"provider"`
	FeedID     string `json:"feedId"`
	TokensUsed int    `json:"tokensUsed,omitempty"`
	Duration   int64  `json:"durationMs"`
	Error      string `json:"error,omitempty"`
}

// Query answers a question based on feed context
func (s *LLMService) Query(ctx context.Context, req QueryRequest) (*QueryResponse, error) {
	start := time.Now()

	// Get the appropriate provider
	provider, err := s.GetProvider(req.Provider)
	if err != nil {
		return nil, err
	}

	// Get feed context
	feedCtx := s.GetFeedContext(req.FeedID)
	if feedCtx == nil || len(feedCtx.Entries) == 0 {
		return &QueryResponse{
			Answer:   "No data available for this feed yet. Please wait for streaming data to arrive.",
			Provider: "none",
			FeedID:   req.FeedID,
			Duration: time.Since(start).Milliseconds(),
		}, nil
	}

	// OPTIMIZATION: Convert JSON entries to CSV-like format to save tokens
	var contextData string
	if len(feedCtx.Entries) > 0 {
		// 1. Collect all unique keys from the first entry (assuming consistent schema)
		// For robustness, we could check all, but first is usually sufficient for streams
		var keys []string
		for k := range feedCtx.Entries[0] {
			keys = append(keys, k)
		}

		// 2. Build Header
		var sb strings.Builder
		sb.WriteString(strings.Join(keys, ", "))
		sb.WriteString("\n")

		// 3. Build Rows
		for _, entry := range feedCtx.Entries {
			var values []string
			for _, k := range keys {
				val := entry[k]
				// Simple formatting for values
				values = append(values, fmt.Sprintf("%v", val))
			}
			sb.WriteString(strings.Join(values, ", "))
			sb.WriteString("\n")
		}
		contextData = sb.String()
	}

	// Build system prompt
	systemPrompt := req.SystemPrompt
	if systemPrompt == "" {
		systemPrompt = fmt.Sprintf(`You are an AI assistant analyzing real-time streaming data from feed "%s".
Answer questions based ONLY on the provided tabular data context. Be concise and accurate.
If the data doesn't contain information to answer the question, say so clearly.`, feedCtx.FeedName)
	}

	// Build user prompt with context
	userPrompt := fmt.Sprintf(`Here is the recent streaming data (newest first):

%s

Question: %s`, contextData, req.Question)

	// Call the provider
	messages := []ChatMessage{
		{Role: "system", Content: systemPrompt},
		{Role: "user", Content: userPrompt},
	}

	answer, tokensUsed, err := provider.Chat(ctx, messages)
	if err != nil {
		return nil, fmt.Errorf("%s error: %w", provider.Name(), err)
	}

	return &QueryResponse{
		Answer:     answer,
		Provider:   provider.Name(),
		FeedID:     req.FeedID,
		TokensUsed: tokensUsed,
		Duration:   time.Since(start).Milliseconds(),
	}, nil
}

// StreamQuery streams the LLM response token by token
func (s *LLMService) StreamQuery(ctx context.Context, req QueryRequest, tokenChan chan<- string) (*QueryResponse, error) {
	start := time.Now()

	// Get the appropriate provider
	provider, err := s.GetProvider(req.Provider)
	if err != nil {
		close(tokenChan)
		return nil, err
	}

	// Get feed context
	feedCtx := s.GetFeedContext(req.FeedID)
	if feedCtx == nil || len(feedCtx.Entries) == 0 {
		msg := "No data available for this feed yet. Please wait for streaming data to arrive."
		tokenChan <- msg
		close(tokenChan)
		return &QueryResponse{
			Answer:   msg,
			Provider: "none",
			FeedID:   req.FeedID,
			Duration: time.Since(start).Milliseconds(),
		}, nil
	}

	// OPTIMIZATION: Convert JSON entries to CSV-like format to save tokens
	var contextData string
	if len(feedCtx.Entries) > 0 {
		var keys []string
		for k := range feedCtx.Entries[0] {
			keys = append(keys, k)
		}
		var sb strings.Builder
		sb.WriteString(strings.Join(keys, ", "))
		sb.WriteString("\n")
		for _, entry := range feedCtx.Entries {
			var values []string
			for _, k := range keys {
				val := entry[k]
				values = append(values, fmt.Sprintf("%v", val))
			}
			sb.WriteString(strings.Join(values, ", "))
			sb.WriteString("\n")
		}
		contextData = sb.String()
	}

	systemPrompt := req.SystemPrompt
	if systemPrompt == "" {
		systemPrompt = fmt.Sprintf(`You are an AI assistant analyzing real-time streaming data from feed "%s".
Answer questions based ONLY on the provided tabular data context. Be concise and accurate.`, feedCtx.FeedName)
	}

	userPrompt := fmt.Sprintf(`Here is the recent streaming data (newest first):

%s

Question: %s`, contextData, req.Question)

	// Build messages
	messages := []ChatMessage{
		{Role: "system", Content: systemPrompt},
		{Role: "user", Content: userPrompt},
	}

	// Collect streamed tokens for the full answer
	var fullAnswer strings.Builder
	internalChan := make(chan string, 100)

	// Start streaming from provider
	go func() {
		_, _ = provider.StreamChat(ctx, messages, internalChan)
	}()

	// Forward tokens and collect full answer
	for token := range internalChan {
		fullAnswer.WriteString(token)
		tokenChan <- token
	}
	close(tokenChan)

	return &QueryResponse{
		Answer:   fullAnswer.String(),
		Provider: provider.Name(),
		FeedID:   req.FeedID,
		Duration: time.Since(start).Milliseconds(),
	}, nil
}

// AnalyzeFeed provides a general analysis of feed data
func (s *LLMService) AnalyzeFeed(ctx context.Context, feedID string, customPrompt string) (*QueryResponse, error) {
	question := "Provide a brief summary and analysis of this data. Highlight any notable patterns, trends, or anomalies."
	if customPrompt != "" {
		question = customPrompt
	}

	return s.Query(ctx, QueryRequest{
		FeedID:   feedID,
		Question: question,
	})
}
