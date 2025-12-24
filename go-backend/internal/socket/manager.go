package socket

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"net/url"
	"sync"
	"time"

	gws "github.com/gorilla/websocket"
	"go.mongodb.org/mongo-driver/bson/primitive"
	coderws "nhooyr.io/websocket"
	"nhooyr.io/websocket/wsjson"

	"github.com/turboline-ai/turbostream/go-backend/internal/models"
	"github.com/turboline-ai/turbostream/go-backend/internal/services"
)

// WSMessage represents the JSON structure shared between client and server.
type WSMessage struct {
	Type    string          `json:"type"`
	Payload json.RawMessage `json:"payload,omitempty"`
}

// Client represents a connected WebSocket client with context and write synchronization
type Client struct {
	conn    *coderws.Conn
	ctx     context.Context
	cancel  context.CancelFunc
	writeMu sync.Mutex
	userID  string
}

// send writes a message to the client's WebSocket connection with thread safety
func (c *Client) send(msg WSMessage) {
	c.writeMu.Lock()
	defer c.writeMu.Unlock()
	ctx, cancel := context.WithTimeout(c.ctx, 10*time.Second)
	defer cancel()
	if err := wsjson.Write(ctx, c.conn, msg); err != nil {
		log.Printf("❌ websocket send error (type: %s): %v", msg.Type, err)
	} else {
		log.Printf("✅ sent message type: %s", msg.Type)
	}
}

// RoomManager manages room memberships and client subscriptions with thread safety
type RoomManager struct {
	mu          sync.RWMutex
	rooms       map[string]map[*Client]struct{}
	clientRooms map[*Client]map[string]struct{}
}

func NewRoomManager() *RoomManager {
	return &RoomManager{
		rooms:       make(map[string]map[*Client]struct{}),
		clientRooms: make(map[*Client]map[string]struct{}),
	}
}

func (rm *RoomManager) Join(room string, client *Client) {
	rm.mu.Lock()
	defer rm.mu.Unlock()
	if _, ok := rm.rooms[room]; !ok {
		rm.rooms[room] = make(map[*Client]struct{})
	}
	rm.rooms[room][client] = struct{}{}
	if _, ok := rm.clientRooms[client]; !ok {
		rm.clientRooms[client] = make(map[string]struct{})
	}
	rm.clientRooms[client][room] = struct{}{}
}

func (rm *RoomManager) Leave(room string, client *Client) {
	rm.mu.Lock()
	defer rm.mu.Unlock()
	if clients, ok := rm.rooms[room]; ok {
		delete(clients, client)
		if len(clients) == 0 {
			delete(rm.rooms, room)
		}
	}
	if rooms, ok := rm.clientRooms[client]; ok {
		delete(rooms, room)
		if len(rooms) == 0 {
			delete(rm.clientRooms, client)
		}
	}
}

func (rm *RoomManager) LeaveAll(client *Client) {
	rm.mu.Lock()
	defer rm.mu.Unlock()
	if rooms, ok := rm.clientRooms[client]; ok {
		for room := range rooms {
			if clients, exists := rm.rooms[room]; exists {
				delete(clients, client)
				if len(clients) == 0 {
					delete(rm.rooms, room)
				}
			}
		}
		delete(rm.clientRooms, client)
	}
}

func (rm *RoomManager) Broadcast(room string, msg WSMessage) {
	rm.mu.RLock()
	clientsMap := rm.rooms[room]
	var clients []*Client
	for client := range clientsMap {
		clients = append(clients, client)
	}
	rm.mu.RUnlock()

	if len(clients) > 0 {
		log.Printf("broadcasting to %d client(s) in room %s", len(clients), room)
	}

	for _, client := range clients {
		client.send(msg)
	}
}

type feedConnection struct {
	conn *gws.Conn
	stop chan struct{}
}

// Manager manages websocket connections and feed broadcasts.
type Manager struct {
	rooms          *RoomManager
	auth           *services.AuthService
	azure          *services.AzureOpenAI
	llm            *services.LLMService
	marketplace    *services.MarketplaceService
	feedConns      map[string]*feedConnection
	feedMu         sync.RWMutex
	subscribers    map[string]map[*Client]struct{}
	subscriberMu   sync.RWMutex
	allowedOrigins []string
}

func NewManager(auth *services.AuthService, azure *services.AzureOpenAI, marketplace *services.MarketplaceService, allowedOrigins []string) *Manager {
	return &Manager{
		rooms:          NewRoomManager(),
		auth:           auth,
		azure:          azure,
		marketplace:    marketplace,
		feedConns:      make(map[string]*feedConnection),
		subscribers:    make(map[string]map[*Client]struct{}),
		allowedOrigins: allowedOrigins,
	}
}

// SetLLMService sets the LLM service for AI queries
func (m *Manager) SetLLMService(llm *services.LLMService) {
	m.llm = llm
}

// Handle upgrades the HTTP connection to a raw websocket connection.
func (m *Manager) Handle(w http.ResponseWriter, r *http.Request) {
	conn, err := coderws.Accept(w, r, &coderws.AcceptOptions{
		InsecureSkipVerify: len(m.allowedOrigins) == 0,
		OriginPatterns:     m.allowedOrigins,
	})
	if err != nil {
		log.Printf("websocket accept failed: %v", err)
		return
	}

	// Use a background context instead of request context
	// because the request context is cancelled when the HTTP handler returns
	ctx, cancel := context.WithCancel(context.Background())

	client := &Client{
		conn:   conn,
		ctx:    ctx,
		cancel: cancel,
	}
	go m.runClient(client)
}

func (m *Manager) runClient(client *Client) {
	defer func() {
		m.rooms.LeaveAll(client)
		if err := client.conn.Close(coderws.StatusNormalClosure, "disconnect"); err != nil {
			log.Printf("error closing client connection: %v", err)
		}
		client.cancel()
		log.Printf("client disconnected (userID: %s)", client.userID)
	}()

	log.Printf("new client connected")

	for {
		var msg WSMessage
		if err := wsjson.Read(client.ctx, client.conn, &msg); err != nil {
			// Don't log normal closure errors
			if errors.Is(err, context.Canceled) || coderws.CloseStatus(err) == coderws.StatusNormalClosure {
				log.Printf("client closed connection normally")
			} else {
				log.Printf("websocket read error: %v", err)
			}
			return
		}
		log.Printf("📩 received message type: %s", msg.Type)
		m.handleMessage(client, msg)
	}
}

func (m *Manager) handleMessage(client *Client, msg WSMessage) {
	switch msg.Type {
	case "authenticate":
		var payload struct {
			Token string `json:"token"`
		}
		if err := json.Unmarshal(msg.Payload, &payload); err != nil || payload.Token == "" {
			client.send(makeMessage("auth_error", map[string]string{"error": "invalid payload"}))
			return
		}
		// Verify token using auth service
		claims, err := m.auth.ParseToken(payload.Token)
		if err != nil {
			client.send(makeMessage("auth_error", map[string]string{"error": "invalid token"}))
			return
		}
		if userID, ok := claims["userId"].(string); ok {
			client.userID = userID
			client.send(makeMessage("authenticated", map[string]string{"userId": userID}))
		} else {
			client.send(makeMessage("auth_error", map[string]string{"error": "invalid token claims"}))
		}

	case "ping":
		client.send(makeMessage("pong", nil))

	case "register-user":
		var payload struct {
			UserID    string `json:"userId"`
			UserAgent string `json:"userAgent"`
			Timestamp string `json:"timestamp"`
		}
		if err := json.Unmarshal(msg.Payload, &payload); err != nil || payload.UserID == "" {
			client.send(makeMessage("registration-error", map[string]string{"error": "invalid payload"}))
			return
		}
		client.userID = payload.UserID
		client.send(makeMessage("registration-success", map[string]interface{}{
			"userId":  payload.UserID,
			"message": "connected",
		}))

	case "subscribe-feed":
		var payload struct {
			UserID string `json:"userId"`
			FeedID string `json:"feedId"`
		}
		if err := json.Unmarshal(msg.Payload, &payload); err != nil || payload.FeedID == "" {
			client.send(makeMessage("subscription-error", map[string]string{"error": "invalid payload"}))
			return
		}
		room := feedRoom(payload.FeedID)
		m.rooms.Join(room, client)
		m.trackSubscriber(payload.FeedID, client)
		log.Printf("✓ client subscribed to feed %s (room: %s)", payload.FeedID, room)
		client.send(makeMessage("subscription-success", map[string]string{"feedId": payload.FeedID}))
		go m.ensureFeedConnection(payload.FeedID)

	case "unsubscribe-feed":
		var payload struct {
			UserID string `json:"userId"`
			FeedID string `json:"feedId"`
		}
		if err := json.Unmarshal(msg.Payload, &payload); err != nil || payload.FeedID == "" {
			client.send(makeMessage("unsubscription-error", map[string]string{"error": "invalid payload"}))
			return
		}
		room := feedRoom(payload.FeedID)
		m.rooms.Leave(room, client)
		m.untrackSubscriber(payload.FeedID, client)
		client.send(makeMessage("unsubscription-success", map[string]string{"feedId": payload.FeedID}))

	case "analyze-crypto":
		var payload map[string]interface{}
		if err := json.Unmarshal(msg.Payload, &payload); err != nil {
			client.send(makeMessage("ai-error", map[string]string{"error": "invalid payload"}))
			return
		}
		resp, _ := m.simpleAnalyze(payload)
		client.send(makeMessage("ai-stream", map[string]string{"token": resp}))
		client.send(makeMessage("ai-complete", map[string]interface{}{"response": resp, "duration": 50}))

	case "analyze-universal-feed":
		var payload struct {
			FeedID       string `json:"feedId"`
			CustomPrompt string `json:"customPrompt"`
			AnalysisID   string `json:"analysisId"`
		}
		if err := json.Unmarshal(msg.Payload, &payload); err != nil {
			client.send(makeMessage("universal-ai-error", map[string]string{"error": "invalid payload"}))
			return
		}
		resp, _ := m.simpleAnalyze(map[string]interface{}{
			"feedId":       payload.FeedID,
			"customPrompt": payload.CustomPrompt,
		})
		client.send(makeMessage("universal-ai-complete", map[string]interface{}{
			"response":   resp,
			"duration":   50,
			"analysisId": payload.AnalysisID,
		}))

	case "llm-query":
		// LangChain-based LLM query using feed context
		var payload struct {
			FeedID       string `json:"feedId"`
			Question     string `json:"question"`
			Provider     string `json:"provider"`
			SystemPrompt string `json:"systemPrompt"`
			RequestID    string `json:"requestId"`
		}
		if err := json.Unmarshal(msg.Payload, &payload); err != nil {
			client.send(makeMessage("llm-error", map[string]string{"error": "invalid payload"}))
			return
		}
		go m.handleLLMQuery(client, payload.FeedID, payload.Question, payload.Provider, payload.SystemPrompt, payload.RequestID)

	case "llm-query-stream":
		// Streaming LLM query
		var payload struct {
			FeedID       string `json:"feedId"`
			Question     string `json:"question"`
			Provider     string `json:"provider"`
			SystemPrompt string `json:"systemPrompt"`
			RequestID    string `json:"requestId"`
		}
		if err := json.Unmarshal(msg.Payload, &payload); err != nil {
			client.send(makeMessage("llm-error", map[string]string{"error": "invalid payload"}))
			return
		}
		go m.handleLLMStreamQuery(client, payload.FeedID, payload.Question, payload.Provider, payload.SystemPrompt, payload.RequestID)

	default:
		client.send(makeMessage("error", map[string]string{"message": "unknown event"}))
	}
}

func (m *Manager) trackSubscriber(feedID string, client *Client) {
	m.subscriberMu.Lock()
	defer m.subscriberMu.Unlock()
	if _, ok := m.subscribers[feedID]; !ok {
		m.subscribers[feedID] = make(map[*Client]struct{})
	}
	m.subscribers[feedID][client] = struct{}{}
}

func (m *Manager) untrackSubscriber(feedID string, client *Client) {
	m.subscriberMu.Lock()
	defer m.subscriberMu.Unlock()
	if subs, ok := m.subscribers[feedID]; ok {
		delete(subs, client)
		if len(subs) == 0 {
			delete(m.subscribers, feedID)
		}
	}
}

func feedRoom(feedID string) string {
	return "feed:" + feedID
}

func makeMessage(eventType string, payload interface{}) WSMessage {
	if payload == nil {
		return WSMessage{Type: eventType}
	}
	data, err := json.Marshal(payload)
	if err != nil {
		log.Printf("failed to marshal websocket payload: %v", err)
		return WSMessage{Type: eventType}
	}
	return WSMessage{Type: eventType, Payload: data}
}

// BroadcastFeedData sends feed updates to all listening clients.
func (m *Manager) BroadcastFeedData(feed models.WebSocketFeed, data interface{}, eventName string) {
	payload := map[string]interface{}{
		"feedId":    feed.ID.Hex(),
		"feedName":  feed.Name,
		"eventName": eventName,
		"data":      data,
		"timestamp": time.Now().UTC(),
	}

	// Add to LLM context for AI queries
	if m.llm != nil {
		m.llm.AddFeedData(feed.ID.Hex(), feed.Name, data)
	}

	room := feedRoom(feed.ID.Hex())
	log.Printf("📡 broadcasting to room %s (feed: %s)", room, feed.Name)
	m.rooms.Broadcast(room, makeMessage("feed-data", payload))
}

// ConnectFeed opens a websocket connection to the external feed (basic websocket only) and broadcasts messages to subscribers.
func (m *Manager) ConnectFeed(feed models.WebSocketFeed) error {
	if feed.ConnectionType != "" && feed.ConnectionType != "websocket" && feed.ConnectionType != "socketio" {
		log.Printf("skipping feed %s: unsupported connection type %s", feed.ID.Hex(), feed.ConnectionType)
		return nil
	}

	m.feedMu.Lock()
	if fc, exists := m.feedConns[feed.ID.Hex()]; exists {
		m.feedMu.Unlock()
		log.Printf("feed %s already connected", feed.ID.Hex())
		// Close existing connection if it's stale
		select {
		case <-fc.stop:
			// Already stopped, clean up
		default:
			// Still running, don't create duplicate
			return nil
		}
	} else {
		m.feedMu.Unlock()
	}

	log.Printf("connecting to feed %s: %s", feed.ID.Hex(), feed.URL)

	u, err := url.Parse(feed.URL)
	if err != nil {
		log.Printf("failed to parse feed URL %s: %v", feed.URL, err)
		return err
	}

	q := u.Query()
	for _, kv := range feed.QueryParams {
		if kv.Key != "" {
			q.Set(kv.Key, kv.Value)
		}
	}
	u.RawQuery = q.Encode()

	headers := http.Header{}
	for _, kv := range feed.Headers {
		if kv.Key != "" {
			headers.Add(kv.Key, kv.Value)
		}
	}

	dialer := gws.Dialer{
		HandshakeTimeout: 10 * time.Second,
	}
	conn, resp, err := dialer.Dial(u.String(), headers)
	if err != nil {
		if resp != nil {
			log.Printf("failed to dial feed %s (status %d): %v", feed.ID.Hex(), resp.StatusCode, err)
		} else {
			log.Printf("failed to dial feed %s: %v", feed.ID.Hex(), err)
		}
		return err
	}
	log.Printf("✓ connected to feed %s", feed.ID.Hex())

	stop := make(chan struct{})
	m.feedMu.Lock()
	m.feedConns[feed.ID.Hex()] = &feedConnection{conn: conn, stop: stop}
	m.feedMu.Unlock()

	if feed.ConnectionMessage != "" {
		log.Printf("sending connection message to feed %s", feed.ID.Hex())
		if err := conn.WriteMessage(gws.TextMessage, []byte(feed.ConnectionMessage)); err != nil {
			log.Printf("failed to send connection message to feed %s: %v", feed.ID.Hex(), err)
		}
	}
	for _, msg := range feed.ConnectionMessages {
		if msg == "" {
			continue
		}
		log.Printf("sending connection message to feed %s: %s", feed.ID.Hex(), msg)
		if err := conn.WriteMessage(gws.TextMessage, []byte(msg)); err != nil {
			log.Printf("failed to send connection message to feed %s: %v", feed.ID.Hex(), err)
		}
	}

	go m.readLoop(feed, conn, stop)
	return nil
}

func (m *Manager) ensureFeedConnection(feedID string) {
	if m.marketplace == nil {
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	feed, err := m.marketplace.GetFeedByID(ctx, feedID)
	if err != nil || feed == nil {
		return
	}
	if err := m.ConnectFeed(*feed); err != nil {
		log.Printf("failed to connect feed %s: %v", feedID, err)
	}
}

// reconnectFeed attempts to reconnect to a feed after a delay
func (m *Manager) reconnectFeed(feed models.WebSocketFeed) {
	// Wait before reconnecting
	time.Sleep(5 * time.Second)

	log.Printf("attempting to reconnect feed %s", feed.ID.Hex())

	if err := m.ConnectFeed(feed); err != nil {
		log.Printf("failed to reconnect feed %s: %v", feed.ID.Hex(), err)
	} else {
		log.Printf("successfully reconnected feed %s", feed.ID.Hex())
	}
}

func (m *Manager) readLoop(feed models.WebSocketFeed, conn *gws.Conn, stop chan struct{}) {
	defer func() {
		m.feedMu.Lock()
		delete(m.feedConns, feed.ID.Hex())
		m.feedMu.Unlock()
		if err := conn.Close(); err != nil {
			log.Printf("error closing feed %s connection: %v", feed.ID.Hex(), err)
		}
		log.Printf("feed %s connection closed", feed.ID.Hex())
	}()

	// Set up ping/pong to keep connection alive
	if err := conn.SetReadDeadline(time.Now().Add(60 * time.Second)); err != nil {
		log.Printf("error setting initial read deadline for feed %s: %v", feed.ID.Hex(), err)
		return
	}
	conn.SetPongHandler(func(string) error {
		if err := conn.SetReadDeadline(time.Now().Add(60 * time.Second)); err != nil {
			log.Printf("error setting read deadline in pong handler for feed %s: %v", feed.ID.Hex(), err)
		}
		return nil
	})

	// Start ping ticker
	pingTicker := time.NewTicker(30 * time.Second)
	defer pingTicker.Stop()

	// Channel for reading messages
	msgChan := make(chan []byte, 10)
	errChan := make(chan error, 1)

	// Start goroutine to read messages
	go func() {
		for {
			_, msg, err := conn.ReadMessage()
			if err != nil {
				errChan <- err
				return
			}
			msgChan <- msg
		}
	}()

	for {
		select {
		case <-stop:
			log.Printf("feed %s stopping by request", feed.ID.Hex())
			return

		case <-pingTicker.C:
			if err := conn.WriteMessage(gws.PingMessage, []byte{}); err != nil {
				log.Printf("feed %s ping failed: %v", feed.ID.Hex(), err)
				return
			}

		case msg := <-msgChan:
			// Reset read deadline on successful message
			if err := conn.SetReadDeadline(time.Now().Add(60 * time.Second)); err != nil {
				log.Printf("error resetting read deadline for feed %s: %v", feed.ID.Hex(), err)
				return
			}

			// Try to parse as JSON for better display
			var jsonData interface{}
			if err := json.Unmarshal(msg, &jsonData); err == nil {
				m.BroadcastFeedData(feed, jsonData, feed.EventName)
			} else {
				// If not JSON, send as string
				m.BroadcastFeedData(feed, string(msg), feed.EventName)
			}

		case err := <-errChan:
			log.Printf("feed %s read error: %v", feed.ID.Hex(), err)
			// Check if we should attempt reconnection
			if feed.ReconnectionEnabled {
				go m.reconnectFeed(feed)
			}
			return
		}
	}
}

// simpleAnalyze either calls Azure OpenAI if configured or falls back to a canned response.
func (m *Manager) simpleAnalyze(payload map[string]interface{}) (string, int) {
	def := "Analysis is not yet connected to an AI provider in the Go backend. This is a placeholder response."
	if m.azure == nil || !m.azure.Enabled() {
		return def, 0
	}
	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer cancel()

	messages := []services.ChatMessage{
		{Role: "system", Content: "You are an AI assistant providing concise analysis for realtime data feeds."},
		{Role: "user", Content: fmt.Sprintf("Analyze this payload: %v", payload)},
	}
	resp, tokens, err := m.azure.Chat(ctx, messages)
	if err != nil {
		log.Printf("azure openai chat failed: %v", err)
		return def, 0
	}
	return resp, tokens
}

func (m *Manager) sendTokenUsageUpdate(client *Client) {
	if m.auth == nil || client.userID == "" {
		return
	}

	userID, err := primitive.ObjectIDFromHex(client.userID)
	if err != nil {
		return
	}

	user, err := m.auth.GetUser(context.Background(), userID)
	if err != nil {
		return
	}

	if user.TokenUsage != nil {
		client.send(makeMessage("token-usage-update", user.TokenUsage))
	}
}

// handleLLMQuery handles non-streaming LLM queries via WebSocket
func (m *Manager) handleLLMQuery(client *Client, feedID, question, provider, systemPrompt, requestID string) {
	if m.llm == nil || !m.llm.Enabled() {
		client.send(makeMessage("llm-error", map[string]interface{}{
			"error":     "LLM service not configured",
			"requestId": requestID,
		}))
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	resp, err := m.llm.Query(ctx, services.QueryRequest{
		FeedID:       feedID,
		Question:     question,
		Provider:     provider,
		SystemPrompt: systemPrompt,
	})

	if err != nil {
		client.send(makeMessage("llm-error", map[string]interface{}{
			"error":     err.Error(),
			"requestId": requestID,
		}))
		return
	}

	// Update token usage
	if m.auth != nil && client.userID != "" {
		userID, err := primitive.ObjectIDFromHex(client.userID)
		if err == nil {
			if err := m.auth.UpdateTokenUsage(ctx, userID, resp.TokensUsed); err != nil {
				log.Printf("failed to update token usage for user %s: %v", client.userID, err)
			} else {
				m.sendTokenUsageUpdate(client)
			}
		}
	}

	client.send(makeMessage("llm-response", map[string]interface{}{
		"answer":     resp.Answer,
		"provider":   resp.Provider,
		"feedId":     resp.FeedID,
		"durationMs": resp.Duration,
		"requestId":  requestID,
	}))
}

// handleLLMStreamQuery handles streaming LLM queries via WebSocket
func (m *Manager) handleLLMStreamQuery(client *Client, feedID, question, provider, systemPrompt, requestID string) {
	if m.llm == nil || !m.llm.Enabled() {
		client.send(makeMessage("llm-error", map[string]interface{}{
			"error":     "LLM service not configured",
			"requestId": requestID,
		}))
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	tokenChan := make(chan string, 100)

	// Start streaming
	go func() {
		resp, err := m.llm.StreamQuery(ctx, services.QueryRequest{
			FeedID:       feedID,
			Question:     question,
			Provider:     provider,
			SystemPrompt: systemPrompt,
		}, tokenChan)

		if err != nil {
			client.send(makeMessage("llm-error", map[string]interface{}{
				"error":     err.Error(),
				"requestId": requestID,
			}))
			return
		}

		// Update token usage
		if m.auth != nil && client.userID != "" {
			userID, err := primitive.ObjectIDFromHex(client.userID)
			if err == nil {
				if err := m.auth.UpdateTokenUsage(ctx, userID, resp.TokensUsed); err != nil {
					log.Printf("failed to update token usage for user %s: %v", client.userID, err)
				} else {
					m.sendTokenUsageUpdate(client)
				}
			}
		}

		// Send completion message
		client.send(makeMessage("llm-complete", map[string]interface{}{
			"answer":     resp.Answer,
			"provider":   resp.Provider,
			"feedId":     resp.FeedID,
			"durationMs": resp.Duration,
			"requestId":  requestID,
		}))
	}()

	// Stream tokens to client
	for token := range tokenChan {
		client.send(makeMessage("llm-token", map[string]interface{}{
			"token":     token,
			"requestId": requestID,
		}))
	}
}
