package handlers

import (
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"net/url"

	"github.com/turboline-ai/turbostream/go-backend/internal/models"
	"github.com/turboline-ai/turbostream/go-backend/internal/services"
	"github.com/turboline-ai/turbostream/go-backend/internal/socket"
)

type MarketplaceHandler struct {
	Service *services.MarketplaceService
	Sockets *socket.Manager
}

func NewMarketplaceHandler(svc *services.MarketplaceService, sockets *socket.Manager) *MarketplaceHandler {
	return &MarketplaceHandler{Service: svc, Sockets: sockets}
}

func (h *MarketplaceHandler) RegisterRoutes(public, protected *gin.RouterGroup) {
	public.GET("/feeds", h.listFeeds)
	public.GET("/feeds/popular", h.popularFeeds)
	public.GET("/feeds/recent", h.recentFeeds)
	public.GET("/feeds/search", h.searchFeeds)
	public.GET("/feeds/:id", h.getFeed)

	protected.POST("/feeds", h.createFeed)
	protected.PUT("/feeds/:id", h.updateFeed)
	protected.DELETE("/feeds/:id", h.deleteFeed)
	protected.GET("/my-feeds", h.myFeeds)
	protected.POST("/subscribe/:feedId", h.subscribe)
	protected.POST("/unsubscribe/:feedId", h.unsubscribe)
	protected.GET("/subscriptions", h.subscriptions)
	protected.PUT("/subscriptions/:feedId/settings", h.updateSubscription)
	protected.POST("/feeds/:feedId/data", h.submitFeedData)
	// Use the same wildcard name (:id) as the base feed route to avoid Gin conflicts.
	protected.PUT("/feeds/:id/ai-prompt", h.updatePrompt)
	protected.POST("/test-feed", h.testFeed)
}

func (h *MarketplaceHandler) listFeeds(c *gin.Context) {
	category := c.Query("category")
	ctx, cancel := contextWithTimeout(c)
	defer cancel()
	feeds, err := h.Service.GetPublicFeeds(ctx, category)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": feeds, "count": len(feeds)})
}

func (h *MarketplaceHandler) popularFeeds(c *gin.Context) {
	limit := parseLimit(c.Query("limit"), 10)
	ctx, cancel := contextWithTimeout(c)
	defer cancel()
	feeds, err := h.Service.GetPopularFeeds(ctx, int64(limit))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": feeds})
}

func (h *MarketplaceHandler) recentFeeds(c *gin.Context) {
	limit := parseLimit(c.Query("limit"), 10)
	ctx, cancel := contextWithTimeout(c)
	defer cancel()
	feeds, err := h.Service.GetRecentFeeds(ctx, int64(limit))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": feeds})
}

func (h *MarketplaceHandler) searchFeeds(c *gin.Context) {
	q := c.Query("q")
	category := c.Query("category")
	ctx, cancel := contextWithTimeout(c)
	defer cancel()
	feeds, err := h.Service.SearchFeeds(ctx, q, category)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": feeds, "count": len(feeds)})
}

func (h *MarketplaceHandler) getFeed(c *gin.Context) {
	id := c.Param("id")
	ctx, cancel := contextWithTimeout(c)
	defer cancel()
	feed, err := h.Service.GetFeedByID(ctx, id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "message": "Feed not found"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": feed})
}

func (h *MarketplaceHandler) createFeed(c *gin.Context) {
	userID := c.MustGet("userId").(primitive.ObjectID)
	username := c.GetString("username")
	var body createFeedPayload
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "invalid payload"})
		return
	}

	feed := models.WebSocketFeed{
		Name:                    body.Name,
		Description:             body.Description,
		SystemPrompt:            body.SystemPrompt,
		URL:                     body.URL,
		Category:                body.Category,
		Icon:                    body.Icon,
		IsActive:                true,
		IsVerified:              false,
		IsPublic:                body.IsPublic,
		FeedType:                "user",
		OwnerID:                 userID.Hex(),
		OwnerName:               username,
		ConnectionType:          body.ConnectionType,
		QueryParams:             sliceKeyValues(body.QueryParams),
		Headers:                 sliceKeyValues(body.Headers),
		ConnectionMessages:      filterMessages(body.ConnectionMessages),
		ConnectionMessage:       body.ConnectionMessage,
		ConnectionMessageFormat: body.ConnectionMessageFormat,
		EventName:               body.EventName,
		DataFormat:              body.DataFormat,
		ReconnectionEnabled:     true,
		ReconnectionDelay:       body.ReconnectionDelay,
		ReconnectionAttempts:    body.ReconnectionAttempts,
		HTTPConfig:              nil,
		Tags:                    body.Tags,
		Website:                 body.Website,
		Documentation:           body.Documentation,
		DefaultAIPrompt:         body.DefaultAIPrompt,
		AIAnalysisEnabled:       body.AIAnalysisEnabled,
	}

	if body.ConnectionType == "http-polling" && body.HTTPConfig != nil {
		feed.HTTPConfig = &models.HTTPPollingConfig{
			Method:          body.HTTPConfig.Method,
			PollingInterval: body.HTTPConfig.PollingInterval,
			Timeout:         body.HTTPConfig.Timeout,
			RequestHeaders:  mapFromPairs(body.HTTPConfig.RequestHeaders),
			RequestBody:     body.HTTPConfig.RequestBody,
			ResponseFormat:  body.HTTPConfig.ResponseFormat,
			DataPath:        body.HTTPConfig.DataPath,
		}
	}

	ctx, cancel := contextWithTimeout(c)
	defer cancel()
	created, err := h.Service.CreateFeed(ctx, feed)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": err.Error()})
		return
	}

	// Auto-subscribe creator to their own feed for convenience.
	_, _ = h.Service.Subscribe(ctx, userID.Hex(), created.ID.Hex(), "")

	c.JSON(http.StatusCreated, gin.H{"success": true, "data": created})
}

func (h *MarketplaceHandler) updateFeed(c *gin.Context) {
	userID := c.MustGet("userId").(primitive.ObjectID)
	idStr := c.Param("id")
	oid, err := primitive.ObjectIDFromHex(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "invalid id"})
		return
	}
	var body map[string]interface{}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "invalid payload"})
		return
	}
	ctx, cancel := contextWithTimeout(c)
	defer cancel()
	feed, err := h.Service.GetFeedByID(ctx, idStr)
	if err != nil || feed.OwnerID != userID.Hex() {
		c.JSON(http.StatusForbidden, gin.H{"success": false, "message": "not authorized"})
		return
	}
	delete(body, "_id")
	delete(body, "ownerId")
	delete(body, "ownerName")
	delete(body, "subscriberCount")
	updated, err := h.Service.UpdateFeed(ctx, oid, bson.M(body))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": updated})
}

func (h *MarketplaceHandler) deleteFeed(c *gin.Context) {
	userID := c.MustGet("userId").(primitive.ObjectID)
	idStr := c.Param("id")
	oid, err := primitive.ObjectIDFromHex(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "invalid id"})
		return
	}
	ctx, cancel := contextWithTimeout(c)
	defer cancel()
	feed, err := h.Service.GetFeedByID(ctx, idStr)
	if err != nil || feed.OwnerID != userID.Hex() {
		c.JSON(http.StatusForbidden, gin.H{"success": false, "message": "not authorized"})
		return
	}
	if err := h.Service.DeleteFeed(ctx, oid); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Feed deleted"})
}

func (h *MarketplaceHandler) myFeeds(c *gin.Context) {
	userID := c.MustGet("userId").(primitive.ObjectID)
	ctx, cancel := contextWithTimeout(c)
	defer cancel()
	feeds, err := h.Service.GetUserFeeds(ctx, userID.Hex())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": feeds, "count": len(feeds)})
}

func (h *MarketplaceHandler) subscribe(c *gin.Context) {
	userID := c.MustGet("userId").(primitive.ObjectID)
	feedID := c.Param("feedId")
	ctx, cancel := contextWithTimeout(c)
	defer cancel()
	sub, err := h.Service.Subscribe(ctx, userID.Hex(), feedID, "")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}
	// Connect to the feed for streaming if not already connected.
	if feed, err := h.Service.GetFeedByID(ctx, feedID); err == nil && feed != nil {
		_ = h.Sockets.ConnectFeed(*feed)
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Subscribed", "subscription": sub})
}

func (h *MarketplaceHandler) unsubscribe(c *gin.Context) {
	userID := c.MustGet("userId").(primitive.ObjectID)
	feedID := c.Param("feedId")
	ctx, cancel := contextWithTimeout(c)
	defer cancel()
	if err := h.Service.Unsubscribe(ctx, userID.Hex(), feedID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Unsubscribed"})
}

func (h *MarketplaceHandler) subscriptions(c *gin.Context) {
	userID := c.MustGet("userId").(primitive.ObjectID)
	ctx, cancel := contextWithTimeout(c)
	defer cancel()
	subs, err := h.Service.GetSubscriptions(ctx, userID.Hex())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": subs, "count": len(subs)})
}

func (h *MarketplaceHandler) updateSubscription(c *gin.Context) {
	userID := c.MustGet("userId").(primitive.ObjectID)
	feedID := c.Param("feedId")
	var body map[string]interface{}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "invalid payload"})
		return
	}
	ctx, cancel := contextWithTimeout(c)
	defer cancel()
	if err := h.Service.UpdateSubscriptionSettings(ctx, userID.Hex(), feedID, bson.M(body)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Subscription updated"})
}

func (h *MarketplaceHandler) submitFeedData(c *gin.Context) {
	userID := c.MustGet("userId").(primitive.ObjectID)
	feedID := c.Param("feedId")
	var body struct {
		Data      interface{} `json:"data"`
		EventName string      `json:"eventName"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "invalid payload"})
		return
	}
	ctx, cancel := contextWithTimeout(c)
	defer cancel()
	feed, err := h.Service.GetFeedByID(ctx, feedID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "message": "feed not found"})
		return
	}
	if feed.OwnerID != userID.Hex() {
		c.JSON(http.StatusForbidden, gin.H{"success": false, "message": "not authorized"})
		return
	}
	// Broadcast to connected subscribers via socket.io
	h.Sockets.BroadcastFeedData(*feed, body.Data, body.EventName)
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Data submitted",
		"data": gin.H{
			"feedId":              feed.ID.Hex(),
			"feedName":            feed.Name,
			"eventName":           body.EventName,
			"timestamp":           time.Now().UTC(),
			"subscribersNotified": true,
		},
	})
}

func (h *MarketplaceHandler) updatePrompt(c *gin.Context) {
	userID := c.MustGet("userId").(primitive.ObjectID)
	feedID := c.Param("id")
	var body struct {
		DefaultAIPrompt string `json:"defaultAIPrompt"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "invalid payload"})
		return
	}
	ctx, cancel := contextWithTimeout(c)
	defer cancel()
	feed, err := h.Service.GetFeedByID(ctx, feedID)
	if err != nil || feed.OwnerID != userID.Hex() {
		c.JSON(http.StatusForbidden, gin.H{"success": false, "message": "not authorized"})
		return
	}
	updated, err := h.Service.UpdateFeed(ctx, feed.ID, bson.M{"defaultAIPrompt": body.DefaultAIPrompt})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": updated})
}

func parseLimit(raw string, fallback int) int {
	if raw == "" {
		return fallback
	}
	if v, err := strconv.Atoi(raw); err == nil && v > 0 {
		return v
	}
	return fallback
}

// helper to convert []{key,value} to map
func sliceKeyValues(items []map[string]string) []models.KeyValue {
	out := []models.KeyValue{}
	for _, kv := range items {
		if k, ok := kv["key"]; ok && k != "" {
			out = append(out, models.KeyValue{Key: k, Value: kv["value"]})
		}
	}
	return out
}

func mapFromPairs(items []map[string]string) map[string]string {
	out := map[string]string{}
	for _, kv := range items {
		if k, ok := kv["key"]; ok && k != "" {
			out[k] = kv["value"]
		}
	}
	return out
}

func filterMessages(messages []string) []string {
	out := make([]string, 0, len(messages))
	for _, msg := range messages {
		if trimmed := strings.TrimSpace(msg); trimmed != "" {
			out = append(out, trimmed)
		}
	}
	return out
}

// ---- Feed connection testing (websocket-only minimal support) ----

type testFeedPayload struct {
	ConnectionType          string              `json:"connectionType"`
	URL                     string              `json:"url"`
	EventName               string              `json:"eventName"`
	QueryParams             []map[string]string `json:"queryParams"`
	Headers                 []map[string]string `json:"headers"`
	ConnectionMessage       string              `json:"connectionMessage"`
	ConnectionMessageFormat string              `json:"connectionMessageFormat"`
}

// createFeedPayload matches the frontend register form.
type createFeedPayload struct {
	Name                    string              `json:"name"`
	Description             string              `json:"description"`
	SystemPrompt            string              `json:"systemPrompt"`
	URL                     string              `json:"url"`
	Category                string              `json:"category"`
	Icon                    string              `json:"icon"`
	IsPublic                bool                `json:"isPublic"`
	ConnectionType          string              `json:"connectionType"`
	QueryParams             []map[string]string `json:"queryParams"`
	Headers                 []map[string]string `json:"headers"`
	ConnectionMessage       string              `json:"connectionMessage"`
	ConnectionMessages      []string            `json:"connectionMessages"`
	ConnectionMessageFormat string              `json:"connectionMessageFormat"`
	EventName               string              `json:"eventName"`
	DataFormat              string              `json:"dataFormat"`
	ReconnectionDelay       int                 `json:"reconnectionDelay"`
	ReconnectionAttempts    int                 `json:"reconnectionAttempts"`
	HTTPConfig              *struct {
		Method          string              `json:"method"`
		PollingInterval int                 `json:"pollingInterval"`
		Timeout         int                 `json:"timeout"`
		RequestHeaders  []map[string]string `json:"requestHeaders"`
		RequestBody     string              `json:"requestBody"`
		ResponseFormat  string              `json:"responseFormat"`
		DataPath        string              `json:"dataPath"`
	} `json:"httpConfig"`
	Tags              []string `json:"tags"`
	Website           string   `json:"website"`
	Documentation     string   `json:"documentation"`
	DefaultAIPrompt   string   `json:"defaultAIPrompt"`
	AIAnalysisEnabled bool     `json:"aiAnalysisEnabled"`
}

func (h *MarketplaceHandler) testFeed(c *gin.Context) {
	var payload testFeedPayload
	if err := c.ShouldBindJSON(&payload); err != nil || payload.URL == "" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "invalid payload"})
		return
	}

	switch payload.ConnectionType {
	case "websocket", "socketio", "", "protobuf":
		// Attempt a basic websocket dial to validate connectivity.
		success, err := dialWebSocket(payload)
		if err != nil {
			c.JSON(http.StatusOK, gin.H{"success": false, "message": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"success": true, "data": map[string]interface{}{"success": success}})
	default:
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "connection type not supported in Go test endpoint"})
	}
}

func dialWebSocket(p testFeedPayload) (bool, error) {
	dialer := websocket.Dialer{}
	u, err := url.Parse(p.URL)
	if err != nil {
		return false, err
	}

	// apply query params
	q := u.Query()
	for _, kv := range p.QueryParams {
		key := kv["key"]
		val := kv["value"]
		if key != "" {
			q.Set(key, val)
		}
	}
	u.RawQuery = q.Encode()

	// apply headers
	h := http.Header{}
	for _, kv := range p.Headers {
		key := kv["key"]
		val := kv["value"]
		if key != "" {
			h.Add(key, val)
		}
	}

	conn, _, err := dialer.Dial(u.String(), h)
	if err != nil {
		return false, err
	}
	defer conn.Close()

	// send connection message if provided
	if p.ConnectionMessage != "" {
		msgType := websocket.TextMessage
		if p.ConnectionMessageFormat == "json" {
			msgType = websocket.TextMessage
		}
		if err := conn.WriteMessage(msgType, []byte(p.ConnectionMessage)); err != nil {
			return false, err
		}
	}
	return true, nil
}
