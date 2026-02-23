package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// @group DatabaseOperations > FeedBuffer : Persistent feed message buffer with TTL

// FeedMessage stores a single incoming feed data event, with a MongoDB TTL index
// on ExpiresAt for automatic purge after the owner-configured retention period.
type FeedMessage struct {
	ID        primitive.ObjectID `bson:"_id,omitempty"  json:"_id"`
	FeedID    string             `bson:"feedId"         json:"feedId"`
	Data      interface{}        `bson:"data"           json:"data"`
	EventName string             `bson:"eventName"      json:"eventName"`
	Timestamp time.Time          `bson:"timestamp"      json:"timestamp"`
	ExpiresAt time.Time          `bson:"expiresAt"      json:"expiresAt"` // TTL index field
}
