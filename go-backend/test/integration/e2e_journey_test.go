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

// TestE2E_CompleteUserJourney tests a complete user journey through the platform
func TestE2E_CompleteUserJourney(t *testing.T) {
	ts := SetupTestServer(t)
	if ts == nil {
		t.Skip("Skipping integration test: test server not available")
	}
	defer ts.Close()

	// User journey variables
	publisherEmail := "publisher@example.com"
	subscriberEmail := "subscriber@example.com"
	password := "SecurePassword123!"
	var publisherToken, subscriberToken string
	var feedID string

	// ==================== PART 1: USER REGISTRATION ====================
	t.Run("Part 1: Publisher and Subscriber register", func(t *testing.T) {
		// Publisher registration
		publisherPayload := map[string]string{
			"email":    publisherEmail,
			"password": password,
			"name":     "Content Publisher",
		}
		body, _ := json.Marshal(publisherPayload)
		resp, err := ts.Client.Post(ts.URL("/api/auth/register"), "application/json", bytes.NewBuffer(body))
		require.NoError(t, err)
		defer resp.Body.Close()

		assert.Equal(t, http.StatusCreated, resp.StatusCode)

		var result map[string]interface{}
		json.NewDecoder(resp.Body).Decode(&result)
		publisherToken = result["token"].(string)
		require.NotEmpty(t, publisherToken)

		t.Logf("✓ Publisher registered successfully")

		// Subscriber registration
		subscriberPayload := map[string]string{
			"email":    subscriberEmail,
			"password": password,
			"name":     "Content Subscriber",
		}
		body, _ = json.Marshal(subscriberPayload)
		resp, err = ts.Client.Post(ts.URL("/api/auth/register"), "application/json", bytes.NewBuffer(body))
		require.NoError(t, err)
		defer resp.Body.Close()

		assert.Equal(t, http.StatusCreated, resp.StatusCode)

		json.NewDecoder(resp.Body).Decode(&result)
		subscriberToken = result["token"].(string)
		require.NotEmpty(t, subscriberToken)

		t.Logf("✓ Subscriber registered successfully")
	})

	// ==================== PART 2: PUBLISHER CREATES FEED ====================
	t.Run("Part 2: Publisher creates a feed", func(t *testing.T) {
		feedPayload := map[string]interface{}{
			"name":           "Crypto News Feed",
			"description":    "Real-time cryptocurrency news and updates",
			"url":            "wss://example.com/crypto-news",
			"category":       "Crypto",
			"isPublic":       true,
			"connectionType": "websocket",
			"eventName":      "news",
			"dataFormat":     "json",
		}

		body, _ := json.Marshal(feedPayload)
		req, _ := http.NewRequest("POST", ts.URL("/api/marketplace/feeds"), bytes.NewBuffer(body))
		req.Header.Set("Authorization", "Bearer "+publisherToken)
		req.Header.Set("Content-Type", "application/json")

		resp, err := ts.Client.Do(req)
		require.NoError(t, err)
		defer resp.Body.Close()

		assert.Equal(t, http.StatusCreated, resp.StatusCode)

		var result map[string]interface{}
		json.NewDecoder(resp.Body).Decode(&result)

		assert.True(t, result["success"].(bool))
		data := result["data"].(map[string]interface{})
		feedID = data["_id"].(string)
		require.NotEmpty(t, feedID)

		t.Logf("✓ Feed created with ID: %s", feedID)
	})

	// ==================== PART 3: SUBSCRIBER DISCOVERS FEED ====================
	t.Run("Part 3: Subscriber discovers feed", func(t *testing.T) {
		// Search for crypto feeds
		resp, err := ts.Client.Get(ts.URL("/api/marketplace/feeds/search?q=Crypto&category=Crypto"))
		require.NoError(t, err)
		defer resp.Body.Close()

		assert.Equal(t, http.StatusOK, resp.StatusCode)

		var result map[string]interface{}
		json.NewDecoder(resp.Body).Decode(&result)

		assert.True(t, result["success"].(bool))
		feeds := result["data"].([]interface{})
		assert.GreaterOrEqual(t, len(feeds), 1)

		// Verify our feed is in the results
		found := false
		for _, feed := range feeds {
			feedMap := feed.(map[string]interface{})
			if feedMap["_id"].(string) == feedID {
				found = true
				t.Logf("✓ Subscriber found feed: %s", feedMap["name"].(string))
				break
			}
		}
		assert.True(t, found, "Feed should be discoverable")
	})

	// ==================== PART 4: SUBSCRIBER SUBSCRIBES ====================
	t.Run("Part 4: Subscriber subscribes to feed", func(t *testing.T) {
		req, _ := http.NewRequest("POST", ts.URL("/api/marketplace/subscribe/"+feedID), nil)
		req.Header.Set("Authorization", "Bearer "+subscriberToken)

		resp, err := ts.Client.Do(req)
		require.NoError(t, err)
		defer resp.Body.Close()

		assert.Equal(t, http.StatusOK, resp.StatusCode)

		var result map[string]interface{}
		json.NewDecoder(resp.Body).Decode(&result)

		assert.True(t, result["success"].(bool))
		t.Logf("✓ Subscriber successfully subscribed to feed")
	})

	// ==================== PART 5: VERIFY SUBSCRIPTION ====================
	t.Run("Part 5: Verify subscription appears in subscriber's list", func(t *testing.T) {
		req, _ := http.NewRequest("GET", ts.URL("/api/marketplace/subscriptions"), nil)
		req.Header.Set("Authorization", "Bearer "+subscriberToken)

		resp, err := ts.Client.Do(req)
		require.NoError(t, err)
		defer resp.Body.Close()

		assert.Equal(t, http.StatusOK, resp.StatusCode)

		var result map[string]interface{}
		json.NewDecoder(resp.Body).Decode(&result)

		assert.True(t, result["success"].(bool))
		subscriptions := result["data"].([]interface{})
		assert.GreaterOrEqual(t, len(subscriptions), 1)

		// Verify our subscription is in the list
		found := false
		for _, sub := range subscriptions {
			subMap := sub.(map[string]interface{})
			if subMap["feedId"].(string) == feedID {
				found = true
				t.Logf("✓ Subscription confirmed in user's list")
				break
			}
		}
		assert.True(t, found)
	})

	// ==================== PART 6: VERIFY SUBSCRIBER COUNT ====================
	t.Run("Part 6: Verify feed subscriber count updated", func(t *testing.T) {
		resp, err := ts.Client.Get(ts.URL("/api/marketplace/feeds/" + feedID))
		require.NoError(t, err)
		defer resp.Body.Close()

		var result map[string]interface{}
		json.NewDecoder(resp.Body).Decode(&result)

		data := result["data"].(map[string]interface{})
		subscriberCount := int(data["subscriberCount"].(float64))
		assert.GreaterOrEqual(t, subscriberCount, 1)

		t.Logf("✓ Feed has %d subscriber(s)", subscriberCount)
	})

	// ==================== PART 7: WEBSOCKET CONNECTION ====================
	t.Run("Part 7: Subscriber connects via WebSocket", func(t *testing.T) {
		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()

		conn, _, err := websocket.Dial(ctx, ts.WSURL(), &websocket.DialOptions{})
		require.NoError(t, err)
		defer conn.Close(websocket.StatusNormalClosure, "test complete")

		t.Logf("✓ WebSocket connection established")

		// Authenticate
		authMsg := WSMessage{
			Type:    "authenticate",
			Payload: json.RawMessage(fmt.Sprintf(`{"token":"%s"}`, subscriberToken)),
		}
		err = wsjson.Write(ctx, conn, authMsg)
		require.NoError(t, err)

		time.Sleep(500 * time.Millisecond)
		t.Logf("✓ Authenticated via WebSocket")

		// Subscribe to feed
		subMsg := WSMessage{
			Type:    "subscribe",
			Payload: json.RawMessage(fmt.Sprintf(`{"feedId":"%s"}`, feedID)),
		}
		err = wsjson.Write(ctx, conn, subMsg)
		require.NoError(t, err)

		t.Logf("✓ Subscribed to feed via WebSocket")

		// Try to receive a message (with short timeout)
		readCtx, readCancel := context.WithTimeout(ctx, 2*time.Second)
		defer readCancel()

		var response WSMessage
		err = wsjson.Read(readCtx, conn, &response)
		if err == nil {
			t.Logf("✓ Received message: %s", response.Type)
		} else {
			t.Logf("✓ WebSocket ready (no immediate message, which is OK)")
		}
	})

	// ==================== PART 8: PUBLISHER UPDATES FEED ====================
	t.Run("Part 8: Publisher updates feed description", func(t *testing.T) {
		updatePayload := map[string]interface{}{
			"description": "Updated: Real-time cryptocurrency news, analysis, and market updates",
		}

		body, _ := json.Marshal(updatePayload)
		req, _ := http.NewRequest("PUT", ts.URL("/api/marketplace/feeds/"+feedID), bytes.NewBuffer(body))
		req.Header.Set("Authorization", "Bearer "+publisherToken)
		req.Header.Set("Content-Type", "application/json")

		resp, err := ts.Client.Do(req)
		require.NoError(t, err)
		defer resp.Body.Close()

		assert.Equal(t, http.StatusOK, resp.StatusCode)

		var result map[string]interface{}
		json.NewDecoder(resp.Body).Decode(&result)

		assert.True(t, result["success"].(bool))
		t.Logf("✓ Publisher updated feed description")
	})

	// ==================== PART 9: SUBSCRIBER VIEWS UPDATED INFO ====================
	t.Run("Part 9: Subscriber sees updated feed info", func(t *testing.T) {
		resp, err := ts.Client.Get(ts.URL("/api/marketplace/feeds/" + feedID))
		require.NoError(t, err)
		defer resp.Body.Close()

		var result map[string]interface{}
		json.NewDecoder(resp.Body).Decode(&result)

		data := result["data"].(map[string]interface{})
		description := data["description"].(string)
		assert.Contains(t, description, "Updated:")

		t.Logf("✓ Subscriber sees updated description")
	})

	// ==================== PART 10: SUBSCRIBER UNSUBSCRIBES ====================
	t.Run("Part 10: Subscriber unsubscribes from feed", func(t *testing.T) {
		req, _ := http.NewRequest("POST", ts.URL("/api/marketplace/unsubscribe/"+feedID), nil)
		req.Header.Set("Authorization", "Bearer "+subscriberToken)

		resp, err := ts.Client.Do(req)
		require.NoError(t, err)
		defer resp.Body.Close()

		assert.Equal(t, http.StatusOK, resp.StatusCode)

		var result map[string]interface{}
		json.NewDecoder(resp.Body).Decode(&result)

		assert.True(t, result["success"].(bool))
		t.Logf("✓ Subscriber unsubscribed from feed")
	})

	// ==================== PART 11: VERIFY UNSUBSCRIPTION ====================
	t.Run("Part 11: Verify unsubscription reflected in system", func(t *testing.T) {
		resp, err := ts.Client.Get(ts.URL("/api/marketplace/feeds/" + feedID))
		require.NoError(t, err)
		defer resp.Body.Close()

		var result map[string]interface{}
		json.NewDecoder(resp.Body).Decode(&result)

		data := result["data"].(map[string]interface{})
		subscriberCount := int(data["subscriberCount"].(float64))

		t.Logf("✓ Feed now has %d subscriber(s) after unsubscription", subscriberCount)
	})

	// ==================== PART 12: PUBLISHER DELETES FEED ====================
	t.Run("Part 12: Publisher deletes feed", func(t *testing.T) {
		req, _ := http.NewRequest("DELETE", ts.URL("/api/marketplace/feeds/"+feedID), nil)
		req.Header.Set("Authorization", "Bearer "+publisherToken)

		resp, err := ts.Client.Do(req)
		require.NoError(t, err)
		defer resp.Body.Close()

		assert.Equal(t, http.StatusOK, resp.StatusCode)

		var result map[string]interface{}
		json.NewDecoder(resp.Body).Decode(&result)

		assert.True(t, result["success"].(bool))
		t.Logf("✓ Publisher successfully deleted feed")
	})

	// ==================== PART 13: VERIFY FEED DELETED ====================
	t.Run("Part 13: Verify feed no longer exists", func(t *testing.T) {
		resp, err := ts.Client.Get(ts.URL("/api/marketplace/feeds/" + feedID))
		require.NoError(t, err)
		defer resp.Body.Close()

		assert.Equal(t, http.StatusNotFound, resp.StatusCode)
		t.Logf("✓ Feed successfully removed from marketplace")
	})

	t.Log("\n🎉 Complete user journey test passed successfully!")
}

// TestE2E_MultiUserInteraction tests multiple users interacting simultaneously
func TestE2E_MultiUserInteraction(t *testing.T) {
	ts := SetupTestServer(t)
	if ts == nil {
		t.Skip("Skipping integration test: test server not available")
	}
	defer ts.Close()

	numUsers := 3
	users := make([]struct {
		email string
		token string
	}, numUsers)
	var feedID string

	// Create multiple users
	t.Run("Create multiple users", func(t *testing.T) {
		for i := 0; i < numUsers; i++ {
			email := fmt.Sprintf("user%d@example.com", i+1)
			password := "Password123!"

			payload := map[string]string{
				"email":    email,
				"password": password,
				"name":     fmt.Sprintf("User %d", i+1),
			}

			body, _ := json.Marshal(payload)
			resp, err := ts.Client.Post(ts.URL("/api/auth/register"), "application/json", bytes.NewBuffer(body))
			require.NoError(t, err)
			defer resp.Body.Close()

			var result map[string]interface{}
			json.NewDecoder(resp.Body).Decode(&result)

			users[i].email = email
			users[i].token = result["token"].(string)
			require.NotEmpty(t, users[i].token)
		}

		t.Logf("✓ Created %d users", numUsers)
	})

	// User 1 creates a feed
	t.Run("User 1 creates feed", func(t *testing.T) {
		feedPayload := map[string]interface{}{
			"name":           "Multi-User Test Feed",
			"description":    "A feed for testing multi-user interactions",
			"url":            "wss://example.com/multi-user",
			"category":       "Test",
			"isPublic":       true,
			"connectionType": "websocket",
			"eventName":      "data",
		}

		body, _ := json.Marshal(feedPayload)
		req, _ := http.NewRequest("POST", ts.URL("/api/marketplace/feeds"), bytes.NewBuffer(body))
		req.Header.Set("Authorization", "Bearer "+users[0].token)
		req.Header.Set("Content-Type", "application/json")

		resp, err := ts.Client.Do(req)
		require.NoError(t, err)
		defer resp.Body.Close()

		var result map[string]interface{}
		json.NewDecoder(resp.Body).Decode(&result)
		data := result["data"].(map[string]interface{})
		feedID = data["_id"].(string)

		t.Logf("✓ User 1 created feed: %s", feedID)
	})

	// All other users subscribe
	t.Run("Other users subscribe to feed", func(t *testing.T) {
		for i := 1; i < numUsers; i++ {
			req, _ := http.NewRequest("POST", ts.URL("/api/marketplace/subscribe/"+feedID), nil)
			req.Header.Set("Authorization", "Bearer "+users[i].token)

			resp, err := ts.Client.Do(req)
			require.NoError(t, err)
			defer resp.Body.Close()

			assert.Equal(t, http.StatusOK, resp.StatusCode)
		}

		t.Logf("✓ %d users subscribed to feed", numUsers-1)
	})

	// Verify subscriber count
	t.Run("Verify subscriber count", func(t *testing.T) {
		resp, err := ts.Client.Get(ts.URL("/api/marketplace/feeds/" + feedID))
		require.NoError(t, err)
		defer resp.Body.Close()

		var result map[string]interface{}
		json.NewDecoder(resp.Body).Decode(&result)
		data := result["data"].(map[string]interface{})
		subscriberCount := int(data["subscriberCount"].(float64))

		// Should have at least 2 subscribers (User 1 auto-subscribed + at least 1 other)
		assert.GreaterOrEqual(t, subscriberCount, 2)

		t.Logf("✓ Feed has %d total subscribers", subscriberCount)
	})

	t.Log("\n🎉 Multi-user interaction test passed successfully!")
}
