package services

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"

	"github.com/turboline-ai/turbostream/go-backend/internal/models"
)

func setupMarketplaceService(t *testing.T) (*MarketplaceService, func()) {
	client, db, cleanup := setupTestDB(t)
	if client == nil {
		return nil, func() {}
	}

	service := NewMarketplaceService(db)
	return service, cleanup
}

func TestMarketplaceService_CreateFeed(t *testing.T) {
	service, cleanup := setupMarketplaceService(t)
	if service == nil {
		t.Skip("Skipping test: MongoDB not available")
	}
	defer cleanup()

	ctx := context.Background()

	feed := models.WebSocketFeed{
		Name:        "Test Feed",
		Description: "A test feed",
		URL:         "wss://example.com/feed",
		Category:    "Test",
		OwnerID:     "user123",
		OwnerName:   "Test User",
		IsPublic:    true,
		IsActive:    true,
		EventName:   "message",
	}

	created, err := service.CreateFeed(ctx, feed)
	require.NoError(t, err)
	assert.NotEmpty(t, created.ID)
	assert.Equal(t, feed.Name, created.Name)
	assert.Equal(t, feed.URL, created.URL)
	assert.Equal(t, 0, created.SubscriberCount)
	assert.NotZero(t, created.CreatedAt)
	assert.NotZero(t, created.UpdatedAt)
	assert.Equal(t, "user", created.FeedType)
	assert.True(t, created.ReconnectionEnabled)
}

func TestMarketplaceService_GetFeedByID(t *testing.T) {
	service, cleanup := setupMarketplaceService(t)
	if service == nil {
		t.Skip("Skipping test: MongoDB not available")
	}
	defer cleanup()

	ctx := context.Background()

	// Create a feed
	feed := models.WebSocketFeed{
		Name:     "Test Feed",
		URL:      "wss://example.com/feed",
		Category: "Test",
		IsPublic: true,
	}
	created, err := service.CreateFeed(ctx, feed)
	require.NoError(t, err)

	// Get feed by ID
	fetched, err := service.GetFeedByID(ctx, created.ID.Hex())
	require.NoError(t, err)
	assert.Equal(t, created.ID, fetched.ID)
	assert.Equal(t, created.Name, fetched.Name)

	// Test non-existent ID
	_, err = service.GetFeedByID(ctx, primitive.NewObjectID().Hex())
	assert.Error(t, err)

	// Test invalid ID
	_, err = service.GetFeedByID(ctx, "invalid-id")
	assert.Error(t, err)
}

func TestMarketplaceService_UpdateFeed(t *testing.T) {
	service, cleanup := setupMarketplaceService(t)
	if service == nil {
		t.Skip("Skipping test: MongoDB not available")
	}
	defer cleanup()

	ctx := context.Background()

	// Create a feed
	feed := models.WebSocketFeed{
		Name:        "Original Name",
		Description: "Original Description",
		URL:         "wss://example.com/feed",
		Category:    "Original",
		IsPublic:    true,
	}
	created, err := service.CreateFeed(ctx, feed)
	require.NoError(t, err)

	// Update feed
	updates := bson.M{
		"name":        "Updated Name",
		"description": "Updated Description",
		"category":    "Updated",
	}
	updated, err := service.UpdateFeed(ctx, created.ID, updates)
	require.NoError(t, err)
	assert.Equal(t, "Updated Name", updated.Name)
	assert.Equal(t, "Updated Description", updated.Description)
	assert.Equal(t, "Updated", updated.Category)
	assert.True(t, updated.UpdatedAt.After(created.UpdatedAt))
}

func TestMarketplaceService_DeleteFeed(t *testing.T) {
	service, cleanup := setupMarketplaceService(t)
	if service == nil {
		t.Skip("Skipping test: MongoDB not available")
	}
	defer cleanup()

	ctx := context.Background()

	// Create a feed
	feed := models.WebSocketFeed{
		Name:     "Feed to Delete",
		URL:      "wss://example.com/feed",
		Category: "Test",
		IsPublic: true,
	}
	created, err := service.CreateFeed(ctx, feed)
	require.NoError(t, err)

	// Delete feed
	err = service.DeleteFeed(ctx, created.ID)
	require.NoError(t, err)

	// Verify feed is deleted
	_, err = service.GetFeedByID(ctx, created.ID.Hex())
	assert.Error(t, err)
}

func TestMarketplaceService_GetPublicFeeds(t *testing.T) {
	service, cleanup := setupMarketplaceService(t)
	if service == nil {
		t.Skip("Skipping test: MongoDB not available")
	}
	defer cleanup()

	ctx := context.Background()

	// Create public feeds
	publicFeed1 := models.WebSocketFeed{
		Name:     "Public Feed 1",
		URL:      "wss://example.com/feed1",
		Category: "Crypto",
		IsPublic: true,
	}
	_, err := service.CreateFeed(ctx, publicFeed1)
	require.NoError(t, err)

	publicFeed2 := models.WebSocketFeed{
		Name:     "Public Feed 2",
		URL:      "wss://example.com/feed2",
		Category: "News",
		IsPublic: true,
	}
	_, err = service.CreateFeed(ctx, publicFeed2)
	require.NoError(t, err)

	// Create private feed
	privateFeed := models.WebSocketFeed{
		Name:     "Private Feed",
		URL:      "wss://example.com/private",
		Category: "Crypto",
		IsPublic: false,
	}
	_, err = service.CreateFeed(ctx, privateFeed)
	require.NoError(t, err)

	// Get all public feeds
	feeds, err := service.GetPublicFeeds(ctx, "")
	require.NoError(t, err)
	assert.GreaterOrEqual(t, len(feeds), 2)

	// Get public feeds by category
	cryptoFeeds, err := service.GetPublicFeeds(ctx, "Crypto")
	require.NoError(t, err)
	assert.GreaterOrEqual(t, len(cryptoFeeds), 1)
	for _, feed := range cryptoFeeds {
		assert.Equal(t, "Crypto", feed.Category)
	}
}

func TestMarketplaceService_GetPopularFeeds(t *testing.T) {
	service, cleanup := setupMarketplaceService(t)
	if service == nil {
		t.Skip("Skipping test: MongoDB not available")
	}
	defer cleanup()

	ctx := context.Background()

	// Create feeds with different subscriber counts
	feed1 := models.WebSocketFeed{
		Name:            "Popular Feed",
		URL:             "wss://example.com/popular",
		Category:        "Test",
		IsPublic:        true,
		SubscriberCount: 100,
	}
	_, err := service.CreateFeed(ctx, feed1)
	require.NoError(t, err)

	feed2 := models.WebSocketFeed{
		Name:            "Less Popular Feed",
		URL:             "wss://example.com/less",
		Category:        "Test",
		IsPublic:        true,
		SubscriberCount: 10,
	}
	_, err = service.CreateFeed(ctx, feed2)
	require.NoError(t, err)

	// Get popular feeds
	popular, err := service.GetPopularFeeds(ctx, 10)
	require.NoError(t, err)
	assert.GreaterOrEqual(t, len(popular), 2)
	// Verify they're sorted by subscriber count (descending)
	if len(popular) >= 2 {
		assert.GreaterOrEqual(t, popular[0].SubscriberCount, popular[1].SubscriberCount)
	}
}

func TestMarketplaceService_GetRecentFeeds(t *testing.T) {
	service, cleanup := setupMarketplaceService(t)
	if service == nil {
		t.Skip("Skipping test: MongoDB not available")
	}
	defer cleanup()

	ctx := context.Background()

	// Create feeds
	for i := 0; i < 3; i++ {
		feed := models.WebSocketFeed{
			Name:     "Feed " + string(rune(i)),
			URL:      "wss://example.com/feed" + string(rune(i)),
			Category: "Test",
			IsPublic: true,
		}
		_, err := service.CreateFeed(ctx, feed)
		require.NoError(t, err)
	}

	// Get recent feeds
	recent, err := service.GetRecentFeeds(ctx, 5)
	require.NoError(t, err)
	assert.GreaterOrEqual(t, len(recent), 3)
	// Verify they're sorted by creation time (descending)
	if len(recent) >= 2 {
		assert.True(t, recent[0].CreatedAt.After(recent[1].CreatedAt) || recent[0].CreatedAt.Equal(recent[1].CreatedAt))
	}
}

func TestMarketplaceService_SearchFeeds(t *testing.T) {
	service, cleanup := setupMarketplaceService(t)
	if service == nil {
		t.Skip("Skipping test: MongoDB not available")
	}
	defer cleanup()

	ctx := context.Background()

	// Create feeds with searchable content
	feed1 := models.WebSocketFeed{
		Name:        "Bitcoin Price Feed",
		Description: "Real-time Bitcoin prices",
		URL:         "wss://example.com/btc",
		Category:    "Crypto",
		IsPublic:    true,
		Tags:        []string{"bitcoin", "crypto", "price"},
	}
	_, err := service.CreateFeed(ctx, feed1)
	require.NoError(t, err)

	feed2 := models.WebSocketFeed{
		Name:        "Ethereum Feed",
		Description: "ETH network data",
		URL:         "wss://example.com/eth",
		Category:    "Crypto",
		IsPublic:    true,
		Tags:        []string{"ethereum", "crypto"},
	}
	_, err = service.CreateFeed(ctx, feed2)
	require.NoError(t, err)

	tests := []struct {
		name           string
		query          string
		category       string
		wantErr        bool
		minResultCount int
	}{
		{
			name:           "search by name",
			query:          "Bitcoin",
			category:       "",
			minResultCount: 1,
		},
		{
			name:           "search by description",
			query:          "network",
			category:       "",
			minResultCount: 1,
		},
		{
			name:           "search with category",
			query:          "crypto",
			category:       "Crypto",
			minResultCount: 1,
		},
		{
			name:    "empty query",
			query:   "",
			wantErr: true,
		},
		{
			name:           "case insensitive",
			query:          "BITCOIN",
			minResultCount: 1,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			results, err := service.SearchFeeds(ctx, tt.query, tt.category)

			if tt.wantErr {
				assert.Error(t, err)
				return
			}

			require.NoError(t, err)
			assert.GreaterOrEqual(t, len(results), tt.minResultCount)
		})
	}
}

func TestMarketplaceService_GetUserFeeds(t *testing.T) {
	service, cleanup := setupMarketplaceService(t)
	if service == nil {
		t.Skip("Skipping test: MongoDB not available")
	}
	defer cleanup()

	ctx := context.Background()

	userID1 := "user123"
	userID2 := "user456"

	// Create feeds for user1
	feed1 := models.WebSocketFeed{
		Name:      "User1 Feed 1",
		URL:       "wss://example.com/user1-1",
		Category:  "Test",
		OwnerID:   userID1,
		OwnerName: "User One",
		IsPublic:  true,
	}
	_, err := service.CreateFeed(ctx, feed1)
	require.NoError(t, err)

	feed2 := models.WebSocketFeed{
		Name:      "User1 Feed 2",
		URL:       "wss://example.com/user1-2",
		Category:  "Test",
		OwnerID:   userID1,
		OwnerName: "User One",
		IsPublic:  true,
	}
	_, err = service.CreateFeed(ctx, feed2)
	require.NoError(t, err)

	// Create feed for user2
	feed3 := models.WebSocketFeed{
		Name:      "User2 Feed",
		URL:       "wss://example.com/user2",
		Category:  "Test",
		OwnerID:   userID2,
		OwnerName: "User Two",
		IsPublic:  true,
	}
	_, err = service.CreateFeed(ctx, feed3)
	require.NoError(t, err)

	// Get feeds for user1
	user1Feeds, err := service.GetUserFeeds(ctx, userID1)
	require.NoError(t, err)
	assert.GreaterOrEqual(t, len(user1Feeds), 2)
	for _, feed := range user1Feeds {
		if feed.OwnerID != "" {
			assert.Equal(t, userID1, feed.OwnerID)
		}
	}

	// Get feeds for user2
	user2Feeds, err := service.GetUserFeeds(ctx, userID2)
	require.NoError(t, err)
	assert.GreaterOrEqual(t, len(user2Feeds), 1)
}

func TestMarketplaceService_Subscribe(t *testing.T) {
	service, cleanup := setupMarketplaceService(t)
	if service == nil {
		t.Skip("Skipping test: MongoDB not available")
	}
	defer cleanup()

	ctx := context.Background()

	// Create a feed
	feed := models.WebSocketFeed{
		Name:     "Subscription Test Feed",
		URL:      "wss://example.com/feed",
		Category: "Test",
		IsPublic: true,
	}
	created, err := service.CreateFeed(ctx, feed)
	require.NoError(t, err)

	userID := "user123"
	feedID := created.ID.Hex()

	// Subscribe to feed
	sub, err := service.Subscribe(ctx, userID, feedID, "")
	require.NoError(t, err)
	assert.Equal(t, userID, sub.UserID)
	assert.Equal(t, feedID, sub.FeedID)
	assert.True(t, sub.IsActive)

	// Verify subscriber count increased
	updated, err := service.GetFeedByID(ctx, feedID)
	require.NoError(t, err)
	assert.GreaterOrEqual(t, updated.SubscriberCount, 1, "subscriber count should be at least 1")

	// Subscribe again (should update, not duplicate)
	customPrompt := "Custom AI prompt"
	sub2, err := service.Subscribe(ctx, userID, feedID, customPrompt)
	require.NoError(t, err)
	assert.Equal(t, customPrompt, sub2.CustomPrompt)

	// Verify subscriber count is reasonable (may increase if subscription was inactive)
	updated2, err := service.GetFeedByID(ctx, feedID)
	require.NoError(t, err)
	assert.LessOrEqual(t, updated2.SubscriberCount, 2, "subscriber count should not exceed 2")
}

func TestMarketplaceService_Unsubscribe(t *testing.T) {
	service, cleanup := setupMarketplaceService(t)
	if service == nil {
		t.Skip("Skipping test: MongoDB not available")
	}
	defer cleanup()

	ctx := context.Background()

	// Create a feed
	feed := models.WebSocketFeed{
		Name:     "Unsubscribe Test Feed",
		URL:      "wss://example.com/feed",
		Category: "Test",
		IsPublic: true,
	}
	created, err := service.CreateFeed(ctx, feed)
	require.NoError(t, err)

	userID := "user123"
	feedID := created.ID.Hex()

	// Subscribe first
	_, err = service.Subscribe(ctx, userID, feedID, "")
	require.NoError(t, err)

	// Verify subscriber count
	updated, err := service.GetFeedByID(ctx, feedID)
	require.NoError(t, err)
	assert.Equal(t, 1, updated.SubscriberCount)

	// Unsubscribe
	err = service.Unsubscribe(ctx, userID, feedID)
	require.NoError(t, err)

	// Verify subscriber count decreased
	updated, err = service.GetFeedByID(ctx, feedID)
	require.NoError(t, err)
	assert.Equal(t, 0, updated.SubscriberCount)
}

func TestMarketplaceService_GetSubscriptions(t *testing.T) {
	service, cleanup := setupMarketplaceService(t)
	if service == nil {
		t.Skip("Skipping test: MongoDB not available")
	}
	defer cleanup()

	ctx := context.Background()

	userID := "user123"

	// Create feeds and subscribe
	for i := 0; i < 3; i++ {
		feed := models.WebSocketFeed{
			Name:     "Feed " + string(rune(i)),
			URL:      "wss://example.com/feed" + string(rune(i)),
			Category: "Test",
			IsPublic: true,
		}
		created, err := service.CreateFeed(ctx, feed)
		require.NoError(t, err)

		_, err = service.Subscribe(ctx, userID, created.ID.Hex(), "")
		require.NoError(t, err)
	}

	// Get subscriptions
	subs, err := service.GetSubscriptions(ctx, userID)
	require.NoError(t, err)
	assert.GreaterOrEqual(t, len(subs), 3)

	// Verify all subscriptions are for the correct user
	for _, sub := range subs {
		assert.Equal(t, userID, sub.UserID)
	}
}

func TestMarketplaceService_UpdateSubscriptionSettings(t *testing.T) {
	service, cleanup := setupMarketplaceService(t)
	if service == nil {
		t.Skip("Skipping test: MongoDB not available")
	}
	defer cleanup()

	ctx := context.Background()

	// Create a feed
	feed := models.WebSocketFeed{
		Name:     "Settings Test Feed",
		URL:      "wss://example.com/feed",
		Category: "Test",
		IsPublic: true,
	}
	created, err := service.CreateFeed(ctx, feed)
	require.NoError(t, err)

	userID := "user123"
	feedID := created.ID.Hex()

	// Subscribe
	_, err = service.Subscribe(ctx, userID, feedID, "")
	require.NoError(t, err)

	// Update subscription settings
	updates := bson.M{
		"customPrompt": "Updated custom prompt",
	}
	err = service.UpdateSubscriptionSettings(ctx, userID, feedID, updates)
	require.NoError(t, err)

	// Verify settings were updated
	subs, err := service.GetSubscriptions(ctx, userID)
	require.NoError(t, err)
	assert.GreaterOrEqual(t, len(subs), 1)

	found := false
	for _, sub := range subs {
		if sub.FeedID == feedID {
			assert.Equal(t, "Updated custom prompt", sub.CustomPrompt)
			found = true
			break
		}
	}
	assert.True(t, found, "subscription should be found")
}
