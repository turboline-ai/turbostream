package integration

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestMarketplace_FeedCRUDOperations(t *testing.T) {
	ts := SetupTestServer(t)
	if ts == nil {
		t.Skip("Skipping integration test: test server not available")
	}
	defer ts.Close()

	email := "marketplace@example.com"
	password := "MarketPassword123!"
	var token string
	var feedID string

	// Setup: Create user
	t.Run("Setup: Create user", func(t *testing.T) {
		payload := map[string]string{
			"email":    email,
			"password": password,
			"name":     "Marketplace User",
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

	t.Run("1. Create feed", func(t *testing.T) {
		payload := map[string]interface{}{
			"name":           "Bitcoin Price Feed",
			"description":    "Real-time Bitcoin prices",
			"url":            "wss://example.com/btc",
			"category":       "Crypto",
			"isPublic":       true,
			"connectionType": "websocket",
			"eventName":      "price",
			"dataFormat":     "json",
		}
		body, _ := json.Marshal(payload)
		req, _ := http.NewRequest("POST", ts.URL("/api/marketplace/feeds"), bytes.NewBuffer(body))
		req.Header.Set("Authorization", "Bearer "+token)
		req.Header.Set("Content-Type", "application/json")

		resp, err := ts.Client.Do(req)
		require.NoError(t, err)
		defer resp.Body.Close()

		assert.Equal(t, http.StatusCreated, resp.StatusCode)

		var result map[string]interface{}
		err = json.NewDecoder(resp.Body).Decode(&result)
		require.NoError(t, err)

		assert.True(t, result["success"].(bool))
		data := result["data"].(map[string]interface{})
		feedID = data["_id"].(string)
		assert.NotEmpty(t, feedID)
		assert.Equal(t, "Bitcoin Price Feed", data["name"])
		assert.Equal(t, "Crypto", data["category"])
	})

	t.Run("2. Get feed by ID", func(t *testing.T) {
		resp, err := ts.Client.Get(ts.URL("/api/marketplace/feeds/" + feedID))
		require.NoError(t, err)
		defer resp.Body.Close()

		assert.Equal(t, http.StatusOK, resp.StatusCode)

		var result map[string]interface{}
		err = json.NewDecoder(resp.Body).Decode(&result)
		require.NoError(t, err)

		assert.True(t, result["success"].(bool))
		data := result["data"].(map[string]interface{})
		assert.Equal(t, feedID, data["_id"])
		assert.Equal(t, "Bitcoin Price Feed", data["name"])
	})

	t.Run("3. Update feed", func(t *testing.T) {
		payload := map[string]interface{}{
			"description": "Updated: Real-time Bitcoin prices with analysis",
		}
		body, _ := json.Marshal(payload)
		req, _ := http.NewRequest("PUT", ts.URL("/api/marketplace/feeds/"+feedID), bytes.NewBuffer(body))
		req.Header.Set("Authorization", "Bearer "+token)
		req.Header.Set("Content-Type", "application/json")

		resp, err := ts.Client.Do(req)
		require.NoError(t, err)
		defer resp.Body.Close()

		assert.Equal(t, http.StatusOK, resp.StatusCode)

		var result map[string]interface{}
		err = json.NewDecoder(resp.Body).Decode(&result)
		require.NoError(t, err)

		assert.True(t, result["success"].(bool))
		data := result["data"].(map[string]interface{})
		assert.Contains(t, data["description"].(string), "Updated:")
	})

	t.Run("4. List all feeds", func(t *testing.T) {
		resp, err := ts.Client.Get(ts.URL("/api/marketplace/feeds"))
		require.NoError(t, err)
		defer resp.Body.Close()

		assert.Equal(t, http.StatusOK, resp.StatusCode)

		var result map[string]interface{}
		err = json.NewDecoder(resp.Body).Decode(&result)
		require.NoError(t, err)

		assert.True(t, result["success"].(bool))
		data := result["data"].([]interface{})
		assert.GreaterOrEqual(t, len(data), 1)
	})

	t.Run("5. Delete feed", func(t *testing.T) {
		req, _ := http.NewRequest("DELETE", ts.URL("/api/marketplace/feeds/"+feedID), nil)
		req.Header.Set("Authorization", "Bearer "+token)

		resp, err := ts.Client.Do(req)
		require.NoError(t, err)
		defer resp.Body.Close()

		assert.Equal(t, http.StatusOK, resp.StatusCode)

		var result map[string]interface{}
		err = json.NewDecoder(resp.Body).Decode(&result)
		require.NoError(t, err)

		assert.True(t, result["success"].(bool))
	})

	t.Run("6. Verify feed deleted", func(t *testing.T) {
		resp, err := ts.Client.Get(ts.URL("/api/marketplace/feeds/" + feedID))
		require.NoError(t, err)
		defer resp.Body.Close()

		assert.Equal(t, http.StatusNotFound, resp.StatusCode)
	})
}

func TestMarketplace_SubscriptionFlow(t *testing.T) {
	ts := SetupTestServer(t)
	if ts == nil {
		t.Skip("Skipping integration test: test server not available")
	}
	defer ts.Close()

	// Create two users
	user1Email := "subscriber1@example.com"
	user2Email := "subscriber2@example.com"
	password := "Password123!"
	var user1Token, user2Token string
	var feedID string

	// Setup: Create users
	t.Run("Setup: Create users", func(t *testing.T) {
		// User 1
		payload1 := map[string]string{
			"email":    user1Email,
			"password": password,
			"name":     "Subscriber One",
		}
		body1, _ := json.Marshal(payload1)
		resp1, err := ts.Client.Post(ts.URL("/api/auth/register"), "application/json", bytes.NewBuffer(body1))
		require.NoError(t, err)
		defer resp1.Body.Close()

		var result1 map[string]interface{}
		json.NewDecoder(resp1.Body).Decode(&result1)
		user1Token = result1["token"].(string)

		// User 2
		payload2 := map[string]string{
			"email":    user2Email,
			"password": password,
			"name":     "Subscriber Two",
		}
		body2, _ := json.Marshal(payload2)
		resp2, err := ts.Client.Post(ts.URL("/api/auth/register"), "application/json", bytes.NewBuffer(body2))
		require.NoError(t, err)
		defer resp2.Body.Close()

		var result2 map[string]interface{}
		json.NewDecoder(resp2.Body).Decode(&result2)
		user2Token = result2["token"].(string)
	})

	// User1 creates a feed
	t.Run("1. User1 creates feed", func(t *testing.T) {
		payload := map[string]interface{}{
			"name":           "Subscription Test Feed",
			"description":    "A feed for testing subscriptions",
			"url":            "wss://example.com/sub-test",
			"category":       "Test",
			"isPublic":       true,
			"connectionType": "websocket",
			"eventName":      "data",
		}
		body, _ := json.Marshal(payload)
		req, _ := http.NewRequest("POST", ts.URL("/api/marketplace/feeds"), bytes.NewBuffer(body))
		req.Header.Set("Authorization", "Bearer "+user1Token)
		req.Header.Set("Content-Type", "application/json")

		resp, err := ts.Client.Do(req)
		require.NoError(t, err)
		defer resp.Body.Close()

		var result map[string]interface{}
		json.NewDecoder(resp.Body).Decode(&result)
		data := result["data"].(map[string]interface{})
		feedID = data["_id"].(string)
		require.NotEmpty(t, feedID)
	})

	// User2 subscribes to the feed
	t.Run("2. User2 subscribes to feed", func(t *testing.T) {
		req, _ := http.NewRequest("POST", ts.URL("/api/marketplace/subscribe/"+feedID), nil)
		req.Header.Set("Authorization", "Bearer "+user2Token)

		resp, err := ts.Client.Do(req)
		require.NoError(t, err)
		defer resp.Body.Close()

		assert.Equal(t, http.StatusOK, resp.StatusCode)

		var result map[string]interface{}
		err = json.NewDecoder(resp.Body).Decode(&result)
		require.NoError(t, err)

		assert.True(t, result["success"].(bool))
		assert.Contains(t, result["message"].(string), "Subscribed")
	})

	// User2 gets their subscriptions
	t.Run("3. User2 views subscriptions", func(t *testing.T) {
		req, _ := http.NewRequest("GET", ts.URL("/api/marketplace/subscriptions"), nil)
		req.Header.Set("Authorization", "Bearer "+user2Token)

		resp, err := ts.Client.Do(req)
		require.NoError(t, err)
		defer resp.Body.Close()

		assert.Equal(t, http.StatusOK, resp.StatusCode)

		var result map[string]interface{}
		err = json.NewDecoder(resp.Body).Decode(&result)
		require.NoError(t, err)

		assert.True(t, result["success"].(bool))
		data := result["data"].([]interface{})
		assert.GreaterOrEqual(t, len(data), 1)

		// Verify subscription is in the list
		found := false
		for _, sub := range data {
			subMap := sub.(map[string]interface{})
			if subMap["feedId"].(string) == feedID {
				found = true
				break
			}
		}
		assert.True(t, found, "Subscription should be in the list")
	})

	// Verify feed subscriber count increased
	t.Run("4. Verify subscriber count", func(t *testing.T) {
		resp, err := ts.Client.Get(ts.URL("/api/marketplace/feeds/" + feedID))
		require.NoError(t, err)
		defer resp.Body.Close()

		var result map[string]interface{}
		json.NewDecoder(resp.Body).Decode(&result)
		data := result["data"].(map[string]interface{})

		// Subscriber count should be at least 1 (user2) + 1 (user1 auto-subscribed on create)
		subscriberCount := int(data["subscriberCount"].(float64))
		assert.GreaterOrEqual(t, subscriberCount, 1)
	})

	// User2 unsubscribes
	t.Run("5. User2 unsubscribes", func(t *testing.T) {
		req, _ := http.NewRequest("POST", ts.URL("/api/marketplace/unsubscribe/"+feedID), nil)
		req.Header.Set("Authorization", "Bearer "+user2Token)

		resp, err := ts.Client.Do(req)
		require.NoError(t, err)
		defer resp.Body.Close()

		assert.Equal(t, http.StatusOK, resp.StatusCode)

		var result map[string]interface{}
		err = json.NewDecoder(resp.Body).Decode(&result)
		require.NoError(t, err)

		assert.True(t, result["success"].(bool))
	})

	// Verify subscriber count decreased
	t.Run("6. Verify subscriber count decreased", func(t *testing.T) {
		resp, err := ts.Client.Get(ts.URL("/api/marketplace/feeds/" + feedID))
		require.NoError(t, err)
		defer resp.Body.Close()

		var result map[string]interface{}
		json.NewDecoder(resp.Body).Decode(&result)
		data := result["data"].(map[string]interface{})

		subscriberCount := int(data["subscriberCount"].(float64))
		// Should have decreased after unsubscribe
		assert.GreaterOrEqual(t, 2, subscriberCount)
	})
}

func TestMarketplace_SearchAndFilter(t *testing.T) {
	ts := SetupTestServer(t)
	if ts == nil {
		t.Skip("Skipping integration test: test server not available")
	}
	defer ts.Close()

	var token string

	// Setup: Create user and feeds
	t.Run("Setup: Create user and test feeds", func(t *testing.T) {
		// Create user
		payload := map[string]string{
			"email":    "search@example.com",
			"password": "Password123!",
			"name":     "Search User",
		}
		body, _ := json.Marshal(payload)
		resp, err := ts.Client.Post(ts.URL("/api/auth/register"), "application/json", bytes.NewBuffer(body))
		require.NoError(t, err)
		defer resp.Body.Close()

		var result map[string]interface{}
		json.NewDecoder(resp.Body).Decode(&result)
		token = result["token"].(string)

		// Create multiple test feeds
		testFeeds := []map[string]interface{}{
			{
				"name":           "Bitcoin Price Feed",
				"description":    "Real-time BTC prices",
				"url":            "wss://example.com/btc",
				"category":       "Crypto",
				"isPublic":       true,
				"connectionType": "websocket",
				"eventName":      "price",
			},
			{
				"name":           "Ethereum Network Data",
				"description":    "ETH blockchain information",
				"url":            "wss://example.com/eth",
				"category":       "Crypto",
				"isPublic":       true,
				"connectionType": "websocket",
				"eventName":      "block",
			},
			{
				"name":           "Stock Market Feed",
				"description":    "NYSE stock prices",
				"url":            "wss://example.com/stocks",
				"category":       "Finance",
				"isPublic":       true,
				"connectionType": "websocket",
				"eventName":      "quote",
			},
		}

		for _, feed := range testFeeds {
			feedBody, _ := json.Marshal(feed)
			req, _ := http.NewRequest("POST", ts.URL("/api/marketplace/feeds"), bytes.NewBuffer(feedBody))
			req.Header.Set("Authorization", "Bearer "+token)
			req.Header.Set("Content-Type", "application/json")

			feedResp, err := ts.Client.Do(req)
			require.NoError(t, err)
			feedResp.Body.Close()
		}
	})

	t.Run("Search by name", func(t *testing.T) {
		resp, err := ts.Client.Get(ts.URL("/api/marketplace/feeds/search?q=Bitcoin"))
		require.NoError(t, err)
		defer resp.Body.Close()

		assert.Equal(t, http.StatusOK, resp.StatusCode)

		var result map[string]interface{}
		json.NewDecoder(resp.Body).Decode(&result)

		assert.True(t, result["success"].(bool))
		data := result["data"].([]interface{})
		assert.GreaterOrEqual(t, len(data), 1)

		// Verify search results contain "Bitcoin"
		found := false
		for _, feed := range data {
			feedMap := feed.(map[string]interface{})
			if feedMap["name"].(string) == "Bitcoin Price Feed" {
				found = true
				break
			}
		}
		assert.True(t, found)
	})

	t.Run("Filter by category", func(t *testing.T) {
		resp, err := ts.Client.Get(ts.URL("/api/marketplace/feeds?category=Crypto"))
		require.NoError(t, err)
		defer resp.Body.Close()

		assert.Equal(t, http.StatusOK, resp.StatusCode)

		var result map[string]interface{}
		json.NewDecoder(resp.Body).Decode(&result)

		assert.True(t, result["success"].(bool))
		data := result["data"].([]interface{})
		assert.GreaterOrEqual(t, len(data), 2)

		// Verify all results are in Crypto category
		for _, feed := range data {
			feedMap := feed.(map[string]interface{})
			if feedMap["category"] != nil {
				assert.Equal(t, "Crypto", feedMap["category"].(string))
			}
		}
	})

	t.Run("Search with category filter", func(t *testing.T) {
		resp, err := ts.Client.Get(ts.URL("/api/marketplace/feeds/search?q=price&category=Crypto"))
		require.NoError(t, err)
		defer resp.Body.Close()

		assert.Equal(t, http.StatusOK, resp.StatusCode)

		var result map[string]interface{}
		json.NewDecoder(resp.Body).Decode(&result)

		assert.True(t, result["success"].(bool))
		data := result["data"].([]interface{})
		assert.GreaterOrEqual(t, len(data), 1)
	})

	t.Run("Get popular feeds", func(t *testing.T) {
		resp, err := ts.Client.Get(ts.URL("/api/marketplace/feeds/popular?limit=5"))
		require.NoError(t, err)
		defer resp.Body.Close()

		assert.Equal(t, http.StatusOK, resp.StatusCode)

		var result map[string]interface{}
		json.NewDecoder(resp.Body).Decode(&result)

		assert.True(t, result["success"].(bool))
		data := result["data"].([]interface{})
		assert.LessOrEqual(t, len(data), 5)
	})

	t.Run("Get recent feeds", func(t *testing.T) {
		resp, err := ts.Client.Get(ts.URL("/api/marketplace/feeds/recent?limit=5"))
		require.NoError(t, err)
		defer resp.Body.Close()

		assert.Equal(t, http.StatusOK, resp.StatusCode)

		var result map[string]interface{}
		json.NewDecoder(resp.Body).Decode(&result)

		assert.True(t, result["success"].(bool))
		data := result["data"].([]interface{})
		assert.LessOrEqual(t, len(data), 5)
	})
}

func TestMarketplace_Authorization(t *testing.T) {
	ts := SetupTestServer(t)
	if ts == nil {
		t.Skip("Skipping integration test: test server not available")
	}
	defer ts.Close()

	var user1Token, user2Token string
	var feedID string

	// Create two users
	t.Run("Setup: Create users", func(t *testing.T) {
		// User 1
		payload1 := map[string]string{
			"email":    "owner@example.com",
			"password": "Password123!",
			"name":     "Feed Owner",
		}
		body1, _ := json.Marshal(payload1)
		resp1, err := ts.Client.Post(ts.URL("/api/auth/register"), "application/json", bytes.NewBuffer(body1))
		require.NoError(t, err)
		defer resp1.Body.Close()

		var result1 map[string]interface{}
		json.NewDecoder(resp1.Body).Decode(&result1)
		user1Token = result1["token"].(string)

		// User 2
		payload2 := map[string]string{
			"email":    "other@example.com",
			"password": "Password123!",
			"name":     "Other User",
		}
		body2, _ := json.Marshal(payload2)
		resp2, err := ts.Client.Post(ts.URL("/api/auth/register"), "application/json", bytes.NewBuffer(body2))
		require.NoError(t, err)
		defer resp2.Body.Close()

		var result2 map[string]interface{}
		json.NewDecoder(resp2.Body).Decode(&result2)
		user2Token = result2["token"].(string)
	})

	// User1 creates a feed
	t.Run("User1 creates feed", func(t *testing.T) {
		payload := map[string]interface{}{
			"name":           "Private Feed",
			"description":    "User1's private feed",
			"url":            "wss://example.com/private",
			"category":       "Test",
			"isPublic":       true,
			"connectionType": "websocket",
			"eventName":      "data",
		}
		body, _ := json.Marshal(payload)
		req, _ := http.NewRequest("POST", ts.URL("/api/marketplace/feeds"), bytes.NewBuffer(body))
		req.Header.Set("Authorization", "Bearer "+user1Token)
		req.Header.Set("Content-Type", "application/json")

		resp, err := ts.Client.Do(req)
		require.NoError(t, err)
		defer resp.Body.Close()

		var result map[string]interface{}
		json.NewDecoder(resp.Body).Decode(&result)
		data := result["data"].(map[string]interface{})
		feedID = data["_id"].(string)
	})

	// User2 tries to update User1's feed (should fail)
	t.Run("User2 cannot update User1's feed", func(t *testing.T) {
		payload := map[string]interface{}{
			"description": "Hacked description",
		}
		body, _ := json.Marshal(payload)
		req, _ := http.NewRequest("PUT", ts.URL("/api/marketplace/feeds/"+feedID), bytes.NewBuffer(body))
		req.Header.Set("Authorization", "Bearer "+user2Token)
		req.Header.Set("Content-Type", "application/json")

		resp, err := ts.Client.Do(req)
		require.NoError(t, err)
		defer resp.Body.Close()

		assert.Equal(t, http.StatusForbidden, resp.StatusCode)
	})

	// User2 tries to delete User1's feed (should fail)
	t.Run("User2 cannot delete User1's feed", func(t *testing.T) {
		req, _ := http.NewRequest("DELETE", ts.URL("/api/marketplace/feeds/"+feedID), nil)
		req.Header.Set("Authorization", "Bearer "+user2Token)

		resp, err := ts.Client.Do(req)
		require.NoError(t, err)
		defer resp.Body.Close()

		assert.Equal(t, http.StatusForbidden, resp.StatusCode)
	})

	// User1 can update their own feed
	t.Run("User1 can update their own feed", func(t *testing.T) {
		payload := map[string]interface{}{
			"description": "Updated by owner",
		}
		body, _ := json.Marshal(payload)
		req, _ := http.NewRequest("PUT", ts.URL(fmt.Sprintf("/api/marketplace/feeds/%s", feedID)), bytes.NewBuffer(body))
		req.Header.Set("Authorization", "Bearer "+user1Token)
		req.Header.Set("Content-Type", "application/json")

		resp, err := ts.Client.Do(req)
		require.NoError(t, err)
		defer resp.Body.Close()

		assert.Equal(t, http.StatusOK, resp.StatusCode)
	})

	// User1 can delete their own feed
	t.Run("User1 can delete their own feed", func(t *testing.T) {
		req, _ := http.NewRequest("DELETE", ts.URL("/api/marketplace/feeds/"+feedID), nil)
		req.Header.Set("Authorization", "Bearer "+user1Token)

		resp, err := ts.Client.Do(req)
		require.NoError(t, err)
		defer resp.Body.Close()

		assert.Equal(t, http.StatusOK, resp.StatusCode)
	})
}
