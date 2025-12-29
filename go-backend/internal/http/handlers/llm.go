package handlers

import (
	"io"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/turboline-ai/turbostream/go-backend/internal/services"
	"github.com/turboline-ai/turbostream/go-backend/internal/socket"
)

// LLMHandler handles LLM-related HTTP requests
type LLMHandler struct {
	llm     *services.LLMService
	sockets *socket.Manager
}

// NewLLMHandler creates a new LLM handler
func NewLLMHandler(llm *services.LLMService, sockets *socket.Manager) *LLMHandler {
	return &LLMHandler{llm: llm, sockets: sockets}
}

// GetProviders returns available LLM providers
// GET /api/llm/providers
func (h *LLMHandler) GetProviders(c *gin.Context) {
	providers := h.llm.GetAvailableProviders()
	c.JSON(http.StatusOK, gin.H{
		"enabled":   h.llm.Enabled(),
		"providers": providers,
	})
}

// GetFeedContext returns the current context for a feed
// GET /api/llm/context/:feedId
func (h *LLMHandler) GetFeedContext(c *gin.Context) {
	feedID := c.Param("feedId")
	if feedID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "feedId is required"})
		return
	}

	ctx := h.llm.GetFeedContext(feedID)
	if ctx == nil {
		c.JSON(http.StatusOK, gin.H{
			"feedId":     feedID,
			"entries":    []interface{}{},
			"entryCount": 0,
			"hasContext": false,
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"feedId":     ctx.FeedID,
		"feedName":   ctx.FeedName,
		"entries":    ctx.Entries,
		"entryCount": len(ctx.Entries),
		"hasContext": true,
		"updatedAt":  ctx.UpdatedAt,
	})
}

// ClearFeedContext clears the context for a feed
// DELETE /api/llm/context/:feedId
func (h *LLMHandler) ClearFeedContext(c *gin.Context) {
	feedID := c.Param("feedId")
	if feedID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "feedId is required"})
		return
	}

	h.llm.ClearFeedContext(feedID)
	c.JSON(http.StatusOK, gin.H{
		"message": "context cleared",
		"feedId":  feedID,
	})
}

// QueryRequest represents the request body for querying
type QueryRequest struct {
	FeedID       string `json:"feedId" binding:"required"`
	Question     string `json:"question" binding:"required"`
	Provider     string `json:"provider,omitempty"`
	SystemPrompt string `json:"systemPrompt,omitempty"`
}

// Query answers a question about feed data
// POST /api/llm/query
func (h *LLMHandler) Query(c *gin.Context) {
	if !h.llm.Enabled() {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"error": "No LLM providers configured. Please set API keys in environment variables.",
		})
		return
	}

	var req QueryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	resp, err := h.llm.Query(c.Request.Context(), services.QueryRequest{
		FeedID:       req.FeedID,
		Question:     req.Question,
		Provider:     req.Provider,
		SystemPrompt: req.SystemPrompt,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Broadcast the result to LLM subscribers
	if h.sockets != nil {
		h.sockets.BroadcastLLMOutput(req.FeedID, resp.Answer, resp.Provider)
	}

	c.JSON(http.StatusOK, resp)
}

// StreamQuery streams the LLM response using Server-Sent Events
// POST /api/llm/query/stream
func (h *LLMHandler) StreamQuery(c *gin.Context) {
	if !h.llm.Enabled() {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"error": "No LLM providers configured",
		})
		return
	}

	var req QueryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Set SSE headers
	c.Header("Content-Type", "text/event-stream")
	c.Header("Cache-Control", "no-cache")
	c.Header("Connection", "keep-alive")
	c.Header("Transfer-Encoding", "chunked")

	tokenChan := make(chan string, 100)

	// Start streaming in background
	go func() {
		_, _ = h.llm.StreamQuery(c.Request.Context(), services.QueryRequest{
			FeedID:       req.FeedID,
			Question:     req.Question,
			Provider:     req.Provider,
			SystemPrompt: req.SystemPrompt,
		}, tokenChan)
	}()

	// Stream tokens to client
	c.Stream(func(w io.Writer) bool {
		if token, ok := <-tokenChan; ok {
			c.SSEvent("token", token)
			return true
		}
		c.SSEvent("done", "")
		return false
	})
}

// AnalyzeRequest represents the request body for analysis
type AnalyzeRequest struct {
	FeedID       string `json:"feedId" binding:"required"`
	CustomPrompt string `json:"customPrompt,omitempty"`
}

// Analyze provides analysis of feed data
// POST /api/llm/analyze
func (h *LLMHandler) Analyze(c *gin.Context) {
	if !h.llm.Enabled() {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"error": "No LLM providers configured",
		})
		return
	}

	var req AnalyzeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	resp, err := h.llm.AnalyzeFeed(c.Request.Context(), req.FeedID, req.CustomPrompt)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, resp)
}
