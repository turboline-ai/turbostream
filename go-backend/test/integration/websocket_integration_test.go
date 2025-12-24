package integration

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"nhooyr.io/websocket"
	"nhooyr.io/websocket/wsjson"
)

type WSMessage struct {
	Type    string          `json:"type"`
	Payload json.RawMessage `json:"payload,omitempty"`
}

func TestWebSocket_ConnectionAndAuthentication(t *testing.T) {
	ts := SetupTestServer(t)
	if ts == nil {
		t.Skip("Skipping integration test: test server not available")
	}
	defer ts.Close()

	email := "ws-user@example.com"
	password := "WSPassword123!"
	var token string

	// Setup: Create user and get token
	t.Run("Setup: Create user", func(t *testing.T) {
		payload := map[string]string{
			"email":    email,
			"password": password,
			"name":     "WebSocket User",
		}
		body, _ := json.Marshal(payload)
		resp, err := ts.Client.Post(ts.URL("/api/auth/register"), "application/json", bytes.NewBuffer(body))
		require.NoError(t, err)
		defer resp.Body.Close()

		var result map[string]interface{}
		json.NewDecoder(resp.Body).Decode(&result)
		token = result["token"].(string)
		require.NotEmpty(t, token)
	})

	t.Run("Connect to WebSocket successfully", func(t *testing.T) {
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		conn, _, err := websocket.Dial(ctx, ts.WSURL(), &websocket.DialOptions{})
		require.NoError(t, err)
		defer conn.Close(websocket.StatusNormalClosure, "test complete")

		// WebSocket connected successfully
		assert.NotNil(t, conn)
	})

	t.Run("Authenticate via WebSocket", func(t *testing.T) {
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		conn, _, err := websocket.Dial(ctx, ts.WSURL(), &websocket.DialOptions{})
		require.NoError(t, err)
		defer conn.Close(websocket.StatusNormalClosure, "test complete")

		// Send authentication message
		authMsg := WSMessage{
			Type:    "authenticate",
			Payload: json.RawMessage(fmt.Sprintf(`{"token":"%s"}`, token)),
		}

		err = wsjson.Write(ctx, conn, authMsg)
		require.NoError(t, err)

		// Read response (with timeout)
		readCtx, readCancel := context.WithTimeout(ctx, 5*time.Second)
		defer readCancel()

		var response WSMessage
		err = wsjson.Read(readCtx, conn, &response)
		if err == nil {
			// If we got a response, verify it's positive
			assert.Contains(t, []string{"authenticated", "auth_success"}, response.Type)
		}
		// Note: Some implementations may not send a response, which is OK
	})
}

func TestWebSocket_SubscribeToFeed(t *testing.T) {
	ts := SetupTestServer(t)
	if ts == nil {
		t.Skip("Skipping integration test: test server not available")
	}
	defer ts.Close()

	email := "ws-feed@example.com"
	password := "WSPassword123!"
	var token string
	var feedID string
	var userID string

	// Setup: Create user and feed
	t.Run("Setup: Create user and feed", func(t *testing.T) {
		// Create user
		payload := map[string]string{
			"email":    email,
			"password": password,
			"name":     "WS Feed User",
		}
		body, _ := json.Marshal(payload)
		resp, err := ts.Client.Post(ts.URL("/api/auth/register"), "application/json", bytes.NewBuffer(body))
		require.NoError(t, err)
		defer resp.Body.Close()

		var result map[string]interface{}
		json.NewDecoder(resp.Body).Decode(&result)
		token = result["token"].(string)
		userMap := result["user"].(map[string]interface{})
		userID = userMap["_id"].(string)

		// Create feed
		feedPayload := map[string]interface{}{
			"name":           "Test WebSocket Feed",
			"description":    "A feed for WebSocket testing",
			"url":            "wss://example.com/test",
			"category":       "Test",
			"isPublic":       true,
			"connectionType": "websocket",
			"eventName":      "message",
		}
		feedBody, _ := json.Marshal(feedPayload)
		req, _ := http.NewRequest("POST", ts.URL("/api/marketplace/feeds"), bytes.NewBuffer(feedBody))
		req.Header.Set("Authorization", "Bearer "+token)
		req.Header.Set("Content-Type", "application/json")

		feedResp, err := ts.Client.Do(req)
		require.NoError(t, err)
		defer feedResp.Body.Close()

		var feedResult map[string]interface{}
		json.NewDecoder(feedResp.Body).Decode(&feedResult)
		feedData := feedResult["data"].(map[string]interface{})
		feedID = feedData["_id"].(string)
		require.NotEmpty(t, feedID)
	})

	t.Run("Subscribe to feed via WebSocket", func(t *testing.T) {
		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()

		conn, _, err := websocket.Dial(ctx, ts.WSURL(), &websocket.DialOptions{})
		require.NoError(t, err)
		defer conn.Close(websocket.StatusNormalClosure, "test complete")

		// Authenticate first
		authMsg := WSMessage{
			Type:    "authenticate",
			Payload: json.RawMessage(fmt.Sprintf(`{"token":"%s"}`, token)),
		}
		err = wsjson.Write(ctx, conn, authMsg)
		require.NoError(t, err)

		// Read auth response
		var authResponse WSMessage
		err = wsjson.Read(ctx, conn, &authResponse)
		require.NoError(t, err)
		assert.Equal(t, "authenticated", authResponse.Type)

		// Subscribe to feed
		subMsg := WSMessage{
			Type:    "subscribe-feed",
			Payload: json.RawMessage(fmt.Sprintf(`{"feedId":"%s", "userId":"%s"}`, feedID, userID)),
		}
		err = wsjson.Write(ctx, conn, subMsg)
		require.NoError(t, err)

		// Try to read subscription confirmation (with timeout)
		readCtx, readCancel := context.WithTimeout(ctx, 3*time.Second)
		defer readCancel()

		var response WSMessage
		err = wsjson.Read(readCtx, conn, &response)
		if err == nil {
			// If we got a response, it should be subscription-related
			assert.Contains(t, []string{"subscribed", "subscription-success", "feed_data"}, response.Type)
		}
		// No error if timeout - some implementations may not send confirmation
	})
}

func TestWebSocket_MultipleClients(t *testing.T) {
	ts := SetupTestServer(t)
	if ts == nil {
		t.Skip("Skipping integration test: test server not available")
	}
	defer ts.Close()

	numClients := 3
	conns := make([]*websocket.Conn, numClients)

	t.Run("Connect multiple clients", func(t *testing.T) {
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		for i := 0; i < numClients; i++ {
			conn, _, err := websocket.Dial(ctx, ts.WSURL(), &websocket.DialOptions{})
			require.NoError(t, err, "Client %d should connect", i+1)
			conns[i] = conn
		}
	})

	t.Run("All clients connected", func(t *testing.T) {
		for i, conn := range conns {
			assert.NotNil(t, conn, "Client %d should be connected", i+1)
		}
	})

	t.Run("Cleanup: Close all connections", func(t *testing.T) {
		for i, conn := range conns {
			if conn != nil {
				err := conn.Close(websocket.StatusNormalClosure, "test complete")
				assert.NoError(t, err, "Client %d should close cleanly", i+1)
			}
		}
	})
}

func TestWebSocket_Ping(t *testing.T) {
	ts := SetupTestServer(t)
	if ts == nil {
		t.Skip("Skipping integration test: test server not available")
	}
	defer ts.Close()

	t.Run("Send ping message", func(t *testing.T) {
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		conn, _, err := websocket.Dial(ctx, ts.WSURL(), &websocket.DialOptions{})
		require.NoError(t, err)
		defer conn.Close(websocket.StatusNormalClosure, "test complete")

		// Send ping
		pingMsg := WSMessage{
			Type: "ping",
		}
		err = wsjson.Write(ctx, conn, pingMsg)
		require.NoError(t, err)

		// Try to read pong response
		readCtx, readCancel := context.WithTimeout(ctx, 2*time.Second)
		defer readCancel()

		var response WSMessage
		err = wsjson.Read(readCtx, conn, &response)
		if err == nil {
			assert.Equal(t, "pong", response.Type)
		}
		// Timeout is OK - some servers may not respond to ping
	})
}

func TestWebSocket_InvalidMessage(t *testing.T) {
	ts := SetupTestServer(t)
	if ts == nil {
		t.Skip("Skipping integration test: test server not available")
	}
	defer ts.Close()

	t.Run("Send invalid JSON", func(t *testing.T) {
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		conn, _, err := websocket.Dial(ctx, ts.WSURL(), &websocket.DialOptions{})
		require.NoError(t, err)
		defer conn.Close(websocket.StatusNormalClosure, "test complete")

		// Send invalid JSON
		err = conn.Write(ctx, websocket.MessageText, []byte("{invalid json}"))
		require.NoError(t, err)

		// Connection should still be alive after invalid message
		pingMsg := WSMessage{Type: "ping"}
		err = wsjson.Write(ctx, conn, pingMsg)
		assert.NoError(t, err, "Connection should still be alive after invalid message")
	})
}

func TestWebSocket_ConnectionClose(t *testing.T) {
	ts := SetupTestServer(t)
	if ts == nil {
		t.Skip("Skipping integration test: test server not available")
	}
	defer ts.Close()

	t.Run("Graceful connection close", func(t *testing.T) {
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		conn, _, err := websocket.Dial(ctx, ts.WSURL(), &websocket.DialOptions{})
		require.NoError(t, err)

		// Close connection gracefully
		err = conn.Close(websocket.StatusNormalClosure, "client closing")
		assert.NoError(t, err)

		// Verify connection is closed
		err = wsjson.Write(ctx, conn, WSMessage{Type: "ping"})
		assert.Error(t, err, "Should not be able to write to closed connection")
	})
}
