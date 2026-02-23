package services

// @group DatabaseOperations > FeedBuffer : Persistent feed message buffer backed by MongoDB with TTL

import (
	"context"
	"log"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"

	"github.com/turboline-ai/turbostream/internal/models"
)

const (
	DefaultBufferTTL     = 30 * time.Minute
	bufferCollectionName = "feed_messages"
)

// FeedBufferService persists incoming feed messages in MongoDB with a configurable TTL.
// MongoDB's TTL index on the ExpiresAt field handles automatic cleanup.
type FeedBufferService struct {
	col        *mongo.Collection
	defaultTTL time.Duration
}

// NewFeedBufferService creates the service and ensures required indexes exist.
func NewFeedBufferService(db *mongo.Database) *FeedBufferService {
	col := db.Collection(bufferCollectionName)
	svc := &FeedBufferService{
		col:        col,
		defaultTTL: DefaultBufferTTL,
	}
	// Best-effort index creation — non-fatal on failure
	if err := svc.ensureIndexes(context.Background()); err != nil {
		log.Printf("⚠️ FeedBufferService: failed to create indexes: %v", err)
	}
	return svc
}

// ensureIndexes creates the TTL index on expiresAt and a compound query index.
func (s *FeedBufferService) ensureIndexes(ctx context.Context) error {
	// TTL index: MongoDB automatically deletes documents when ExpiresAt is reached.
	ttlIndex := mongo.IndexModel{
		Keys:    bson.D{{Key: "expiresAt", Value: 1}},
		Options: options.Index().SetExpireAfterSeconds(0),
	}
	// Compound index for efficient per-feed time-range queries.
	queryIndex := mongo.IndexModel{
		Keys: bson.D{
			{Key: "feedId", Value: 1},
			{Key: "timestamp", Value: -1},
		},
	}
	_, err := s.col.Indexes().CreateMany(ctx, []mongo.IndexModel{ttlIndex, queryIndex})
	return err
}

// Store persists a single feed message with the given TTL duration.
// If ttl is 0, the service default (30 min) is used.
func (s *FeedBufferService) Store(ctx context.Context, feedID string, data interface{}, eventName string, ttl time.Duration) error {
	if ttl <= 0 {
		ttl = s.defaultTTL
	}
	now := time.Now().UTC()
	msg := models.FeedMessage{
		ID:        primitive.NewObjectID(),
		FeedID:    feedID,
		Data:      data,
		EventName: eventName,
		Timestamp: now,
		ExpiresAt: now.Add(ttl),
	}
	_, err := s.col.InsertOne(ctx, msg)
	return err
}

// GetRecent returns messages for a feed since the given timestamp, newest first, up to limit.
// limit=0 defaults to 200.
func (s *FeedBufferService) GetRecent(ctx context.Context, feedID string, since time.Time, limit int) ([]models.FeedMessage, error) {
	if limit <= 0 {
		limit = 200
	}
	filter := bson.M{
		"feedId":    feedID,
		"timestamp": bson.M{"$gte": since},
	}
	opts := options.Find().
		SetSort(bson.D{{Key: "timestamp", Value: -1}}).
		SetLimit(int64(limit))
	cursor, err := s.col.Find(ctx, filter, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)
	var msgs []models.FeedMessage
	if err := cursor.All(ctx, &msgs); err != nil {
		return nil, err
	}
	return msgs, nil
}

// GetRecentN returns the N most recent messages for a feed, newest first.
func (s *FeedBufferService) GetRecentN(ctx context.Context, feedID string, n int) ([]models.FeedMessage, error) {
	if n <= 0 {
		n = 200
	}
	filter := bson.M{"feedId": feedID}
	opts := options.Find().
		SetSort(bson.D{{Key: "timestamp", Value: -1}}).
		SetLimit(int64(n))
	cursor, err := s.col.Find(ctx, filter, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)
	var msgs []models.FeedMessage
	if err := cursor.All(ctx, &msgs); err != nil {
		return nil, err
	}
	return msgs, nil
}

// Clear deletes all buffered messages for a feed.
func (s *FeedBufferService) Clear(ctx context.Context, feedID string) error {
	_, err := s.col.DeleteMany(ctx, bson.M{"feedId": feedID})
	return err
}
