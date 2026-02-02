package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type APIKey struct {
	ID         primitive.ObjectID  `bson:"_id,omitempty" json:"_id"`
	UserID     primitive.ObjectID  `bson:"userId" json:"userId"`
	Name       string              `bson:"name" json:"name"`
	KeyHash    string              `bson:"keyHash" json:"-"`
	Prefix     string              `bson:"prefix" json:"prefix"`
	LastChars  string              `bson:"lastChars" json:"lastChars"`
	Scopes     []string            `bson:"scopes" json:"scopes"`
	IsActive   bool                `bson:"isActive" json:"isActive"`
	CreatedAt  time.Time           `bson:"createdAt" json:"createdAt"`
	LastUsedAt *time.Time          `bson:"lastUsedAt,omitempty" json:"lastUsedAt,omitempty"`
	ExpiresAt  *time.Time          `bson:"expiresAt,omitempty" json:"expiresAt,omitempty"`
}
