package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type WebSocketFeed struct {
	ID                      primitive.ObjectID `bson:"_id,omitempty" json:"_id"`
	Name                    string             `bson:"name" json:"name"`
	Description             string             `bson:"description" json:"description"`
	SystemPrompt            string             `bson:"systemPrompt,omitempty" json:"systemPrompt,omitempty"`
	URL                     string             `bson:"url" json:"url"`
	Category                string             `bson:"category" json:"category"`
	Icon                    string             `bson:"icon,omitempty" json:"icon,omitempty"`
	IsActive                bool               `bson:"isActive" json:"isActive"`
	IsVerified              bool               `bson:"isVerified" json:"isVerified"`
	IsPublic                bool               `bson:"isPublic" json:"isPublic"`
	FeedType                string             `bson:"feedType" json:"feedType"`
	OwnerID                 string             `bson:"ownerId" json:"ownerId"`
	OwnerName               string             `bson:"ownerName" json:"ownerName"`
	ConnectionType          string             `bson:"connectionType,omitempty" json:"connectionType,omitempty"`
	QueryParams             []KeyValue         `bson:"queryParams,omitempty" json:"queryParams,omitempty"`
	Headers                 []KeyValue         `bson:"headers,omitempty" json:"headers,omitempty"`
	ConnectionMessages      []string           `bson:"connectionMessages,omitempty" json:"connectionMessages,omitempty"`
	ConnectionMessage       string             `bson:"connectionMessage,omitempty" json:"connectionMessage,omitempty"`
	ConnectionMessageFormat string             `bson:"connectionMessageFormat,omitempty" json:"connectionMessageFormat,omitempty"`
	EventName               string             `bson:"eventName,omitempty" json:"eventName,omitempty"`
	DataFormat              string             `bson:"dataFormat,omitempty" json:"dataFormat,omitempty"`
	ProtobufType            string             `bson:"protobufType,omitempty" json:"protobufType,omitempty"`
	ReconnectionEnabled     bool               `bson:"reconnectionEnabled" json:"reconnectionEnabled"`
	ReconnectionDelay       int                `bson:"reconnectionDelay,omitempty" json:"reconnectionDelay,omitempty"`
	ReconnectionAttempts    int                `bson:"reconnectionAttempts,omitempty" json:"reconnectionAttempts,omitempty"`
	SubscriberCount         int                `bson:"subscriberCount" json:"subscriberCount"`
	HTTPConfig              *HTTPPollingConfig `bson:"httpConfig,omitempty" json:"httpConfig,omitempty"`
	Tags                    []string           `bson:"tags" json:"tags"`
	Website                 string             `bson:"website,omitempty" json:"website,omitempty"`
	Documentation           string             `bson:"documentation,omitempty" json:"documentation,omitempty"`
	DefaultAIPrompt         string             `bson:"defaultAIPrompt,omitempty" json:"defaultAIPrompt,omitempty"`
	AIAnalysisEnabled       bool               `bson:"aiAnalysisEnabled,omitempty" json:"aiAnalysisEnabled,omitempty"`
	CreatedAt               time.Time          `bson:"createdAt" json:"createdAt"`
	UpdatedAt               time.Time          `bson:"updatedAt" json:"updatedAt"`
	LastActiveAt            *time.Time         `bson:"lastActiveAt,omitempty" json:"lastActiveAt,omitempty"`
}

type HTTPPollingConfig struct {
	Method          string            `bson:"method" json:"method"`
	PollingInterval int               `bson:"pollingInterval" json:"pollingInterval"`
	Timeout         int               `bson:"timeout" json:"timeout"`
	RequestHeaders  map[string]string `bson:"requestHeaders,omitempty" json:"requestHeaders,omitempty"`
	RequestBody     string            `bson:"requestBody,omitempty" json:"requestBody,omitempty"`
	ResponseFormat  string            `bson:"responseFormat" json:"responseFormat"`
	DataPath        string            `bson:"dataPath,omitempty" json:"dataPath,omitempty"`
}

type UserSubscription struct {
	ID           primitive.ObjectID    `bson:"_id,omitempty" json:"_id"`
	UserID       string                `bson:"userId" json:"userId"`
	FeedID       string                `bson:"feedId" json:"feedId"`
	Subscribed   time.Time             `bson:"subscribedAt" json:"subscribedAt"`
	IsActive     bool                  `bson:"isActive" json:"isActive"`
	CustomPrompt string                `bson:"customPrompt,omitempty" json:"customPrompt,omitempty"`
	Settings     *SubscriptionSettings `bson:"settings,omitempty" json:"settings,omitempty"`
}

type SubscriptionSettings struct {
	Notifications bool `bson:"notifications" json:"notifications"`
	AutoConnect   bool `bson:"autoConnect" json:"autoConnect"`
}
