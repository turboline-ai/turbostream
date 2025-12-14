package services

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
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

// LLMService provides LLM capabilities using Azure OpenAI
type LLMService struct {
	cfg         config.Config
	azureOpenAI *AzureOpenAI

	// Feed context storage
	contextMu    sync.RWMutex
	feedContexts map[string]*FeedContext
	contextLimit int
}

// NewLLMService creates a new LLM service with Azure OpenAI
func NewLLMService(cfg config.Config) (*LLMService, error) {
	svc := &LLMService{
		cfg:          cfg,
		feedContexts: make(map[string]*FeedContext),
		contextLimit: cfg.LLMContextLimit,
	}

	// Initialize Azure OpenAI
	svc.azureOpenAI = NewAzureOpenAI(cfg)

	if svc.azureOpenAI.Enabled() {
		log.Printf("✓ Azure OpenAI initialized (endpoint: %s, deployment: %s)", cfg.AzureEndpoint, cfg.AzureDeployment)
	} else {
		log.Printf("⚠ Azure OpenAI not configured - AI features will be disabled")
	}

	return svc, nil
}

// Enabled returns true if Azure OpenAI is configured
func (s *LLMService) Enabled() bool {
	return s.azureOpenAI.Enabled()
}

// GetAvailableProviders returns a list of configured providers
func (s *LLMService) GetAvailableProviders() []string {
	if s.azureOpenAI.Enabled() {
		return []string{"azure-openai"}
	}
	return []string{}
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

	if !s.Enabled() {
		return nil, errors.New("Azure OpenAI not configured")
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

	// Build context string from feed data
	contextJSON, _ := json.MarshalIndent(feedCtx.Entries, "", "  ")

	// Build system prompt
	systemPrompt := req.SystemPrompt
	if systemPrompt == "" {
		systemPrompt = fmt.Sprintf(`You are an AI assistant analyzing real-time streaming data from feed "%s".
Answer questions based ONLY on the provided JSON data context. Be concise and accurate.
If the data doesn't contain information to answer the question, say so clearly.`, feedCtx.FeedName)
	}

	// Build user prompt with context
	userPrompt := fmt.Sprintf(`Here is the recent streaming data (newest first):

%s

Question: %s`, string(contextJSON), req.Question)

	// Call Azure OpenAI
	messages := []ChatMessage{
		{Role: "system", Content: systemPrompt},
		{Role: "user", Content: userPrompt},
	}

	answer, tokensUsed, err := s.azureOpenAI.Chat(ctx, messages)
	if err != nil {
		return nil, fmt.Errorf("azure openai error: %w", err)
	}

	return &QueryResponse{
		Answer:     answer,
		Provider:   "azure-openai",
		FeedID:     req.FeedID,
		TokensUsed: tokensUsed,
		Duration:   time.Since(start).Milliseconds(),
	}, nil
}

// StreamQuery streams the LLM response token by token (falls back to non-streaming for now)
func (s *LLMService) StreamQuery(ctx context.Context, req QueryRequest, tokenChan chan<- string) (*QueryResponse, error) {
	start := time.Now()
	defer close(tokenChan)

	if !s.Enabled() {
		return nil, errors.New("Azure OpenAI not configured")
	}

	// Get feed context
	feedCtx := s.GetFeedContext(req.FeedID)
	if feedCtx == nil || len(feedCtx.Entries) == 0 {
		msg := "No data available for this feed yet. Please wait for streaming data to arrive."
		tokenChan <- msg
		return &QueryResponse{
			Answer:   msg,
			Provider: "none",
			FeedID:   req.FeedID,
			Duration: time.Since(start).Milliseconds(),
		}, nil
	}

	// Build context
	contextJSON, _ := json.MarshalIndent(feedCtx.Entries, "", "  ")

	systemPrompt := req.SystemPrompt
	if systemPrompt == "" {
		systemPrompt = fmt.Sprintf(`You are an AI assistant analyzing real-time streaming data from feed "%s".
Answer questions based ONLY on the provided JSON data context. Be concise and accurate.`, feedCtx.FeedName)
	}

	userPrompt := fmt.Sprintf(`Here is the recent streaming data (newest first):

%s

Question: %s`, string(contextJSON), req.Question)

	// Call Azure OpenAI (non-streaming, then send complete response)
	messages := []ChatMessage{
		{Role: "system", Content: systemPrompt},
		{Role: "user", Content: userPrompt},
	}

	answer, tokensUsed, err := s.azureOpenAI.Chat(ctx, messages)
	if err != nil {
		return nil, fmt.Errorf("azure openai error: %w", err)
	}

	// Send the complete response as one token
	tokenChan <- answer

	return &QueryResponse{
		Answer:     answer,
		Provider:   "azure-openai",
		FeedID:     req.FeedID,
		TokensUsed: tokensUsed,
		Duration:   time.Since(start).Milliseconds(),
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
