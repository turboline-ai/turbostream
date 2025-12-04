package services

import (
	"context"
	"errors"
	"strings"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"

	"github.com/turboline-ai/turbostream/go-backend/internal/models"
)

type MarketplaceService struct {
	db *mongo.Database
}

func NewMarketplaceService(db *mongo.Database) *MarketplaceService {
	return &MarketplaceService{db: db}
}

func (s *MarketplaceService) feeds() *mongo.Collection {
	return s.db.Collection("websocket_feeds")
}

func (s *MarketplaceService) subscriptions() *mongo.Collection {
	return s.db.Collection("user_subscriptions")
}

func (s *MarketplaceService) CreateFeed(ctx context.Context, feed models.WebSocketFeed) (*models.WebSocketFeed, error) {
	now := time.Now()
	feed.CreatedAt = now
	feed.UpdatedAt = now
	feed.SubscriberCount = 0
	if feed.FeedType == "" {
		feed.FeedType = "user"
	}
	if feed.ReconnectionEnabled == false {
		feed.ReconnectionEnabled = true
	}
	res, err := s.feeds().InsertOne(ctx, feed)
	if err != nil {
		return nil, err
	}
	feed.ID = res.InsertedID.(primitive.ObjectID)
	return &feed, nil
}

func (s *MarketplaceService) UpdateFeed(ctx context.Context, id primitive.ObjectID, updates bson.M) (*models.WebSocketFeed, error) {
	updates["updatedAt"] = time.Now()
	_, err := s.feeds().UpdateByID(ctx, id, bson.M{"$set": updates})
	if err != nil {
		return nil, err
	}
	return s.GetFeedByID(ctx, id.Hex())
}

func (s *MarketplaceService) DeleteFeed(ctx context.Context, id primitive.ObjectID) error {
	_, err := s.feeds().DeleteOne(ctx, bson.M{"_id": id})
	return err
}

func (s *MarketplaceService) GetFeedByID(ctx context.Context, id string) (*models.WebSocketFeed, error) {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil, err
	}
	var feed models.WebSocketFeed
	if err := s.feeds().FindOne(ctx, bson.M{"_id": oid}).Decode(&feed); err != nil {
		return nil, err
	}
	return &feed, nil
}

func (s *MarketplaceService) GetPublicFeeds(ctx context.Context, category string) ([]models.WebSocketFeed, error) {
	// Align with existing data that may not have isPublic set; include public feeds and those without the flag.
	filter := bson.M{
		"$or": []bson.M{
			{"isPublic": true},
			{"isPublic": bson.M{"$exists": false}},
		},
	}
	if category != "" {
		filter["category"] = category
	}
	cur, err := s.feeds().Find(ctx, filter)
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)
	var feeds []models.WebSocketFeed
	if err := cur.All(ctx, &feeds); err != nil {
		return nil, err
	}
	return feeds, nil
}

func (s *MarketplaceService) GetPopularFeeds(ctx context.Context, limit int64) ([]models.WebSocketFeed, error) {
	opts := options.Find().SetSort(bson.M{"subscriberCount": -1}).SetLimit(limit)
	cur, err := s.feeds().Find(ctx, bson.M{"isPublic": true}, opts)
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)
	var feeds []models.WebSocketFeed
	if err := cur.All(ctx, &feeds); err != nil {
		return nil, err
	}
	return feeds, nil
}

func (s *MarketplaceService) GetRecentFeeds(ctx context.Context, limit int64) ([]models.WebSocketFeed, error) {
	opts := options.Find().SetSort(bson.M{"createdAt": -1}).SetLimit(limit)
	cur, err := s.feeds().Find(ctx, bson.M{}, opts)
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)
	var feeds []models.WebSocketFeed
	if err := cur.All(ctx, &feeds); err != nil {
		return nil, err
	}
	return feeds, nil
}

func (s *MarketplaceService) SearchFeeds(ctx context.Context, q, category string) ([]models.WebSocketFeed, error) {
	q = strings.TrimSpace(q)
	if q == "" {
		return nil, errors.New("query required")
	}
	filter := bson.M{
		"$or": []bson.M{
			{"name": bson.M{"$regex": q, "$options": "i"}},
			{"description": bson.M{"$regex": q, "$options": "i"}},
			{"tags": bson.M{"$regex": q, "$options": "i"}},
		},
	}
	if category != "" {
		filter["category"] = category
	}
	cur, err := s.feeds().Find(ctx, filter)
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)
	var feeds []models.WebSocketFeed
	if err := cur.All(ctx, &feeds); err != nil {
		return nil, err
	}
	return feeds, nil
}

func (s *MarketplaceService) GetUserFeeds(ctx context.Context, userID string) ([]models.WebSocketFeed, error) {
	filter := bson.M{
		"$or": []bson.M{
			{"ownerId": userID},
			{"ownerId": bson.M{"$exists": false}}, // fallback for legacy data without owner
		},
	}
	cur, err := s.feeds().Find(ctx, filter)
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)
	var feeds []models.WebSocketFeed
	if err := cur.All(ctx, &feeds); err != nil {
		return nil, err
	}
	return feeds, nil
}

func (s *MarketplaceService) Subscribe(ctx context.Context, userID, feedID string, customPrompt string) (*models.UserSubscription, error) {
	now := time.Now()
	sub := models.UserSubscription{
		UserID:       userID,
		FeedID:       feedID,
		Subscribed:   now,
		IsActive:     true,
		CustomPrompt: customPrompt,
	}
	_, err := s.subscriptions().InsertOne(ctx, sub)
	if mongo.IsDuplicateKeyError(err) {
		_, err = s.subscriptions().UpdateOne(ctx, bson.M{"userId": userID, "feedId": feedID}, bson.M{"$set": bson.M{"isActive": true, "customPrompt": customPrompt}})
		if err != nil {
			return nil, err
		}
		return &sub, nil
	}
	if err != nil {
		return nil, err
	}
	_ = s.incrementSubscriber(ctx, feedID, 1)
	return &sub, nil
}

func (s *MarketplaceService) Unsubscribe(ctx context.Context, userID, feedID string) error {
	res, err := s.subscriptions().UpdateOne(ctx, bson.M{"userId": userID, "feedId": feedID}, bson.M{"$set": bson.M{"isActive": false}})
	if err == nil && res.ModifiedCount > 0 {
		_ = s.incrementSubscriber(ctx, feedID, -1)
	}
	return err
}

func (s *MarketplaceService) GetSubscriptions(ctx context.Context, userID string) ([]models.UserSubscription, error) {
	cur, err := s.subscriptions().Find(ctx, bson.M{"userId": userID})
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)
	var subs []models.UserSubscription
	if err := cur.All(ctx, &subs); err != nil {
		return nil, err
	}
	return subs, nil
}

func (s *MarketplaceService) UpdateSubscriptionSettings(ctx context.Context, userID, feedID string, updates bson.M) error {
	_, err := s.subscriptions().UpdateOne(ctx, bson.M{"userId": userID, "feedId": feedID}, bson.M{"$set": updates})
	return err
}

func (s *MarketplaceService) incrementSubscriber(ctx context.Context, feedID string, delta int) error {
	oid, err := primitive.ObjectIDFromHex(feedID)
	if err != nil {
		return err
	}
	_, err = s.feeds().UpdateByID(ctx, oid, bson.M{"$inc": bson.M{"subscriberCount": delta}})
	return err
}
