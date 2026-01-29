package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type TokenUsage struct {
	CurrentMonth     string    `bson:"currentMonth" json:"currentMonth"`
	TokensUsed       int64     `bson:"tokensUsed" json:"tokensUsed"`
	Limit            int64     `bson:"limit" json:"limit"`
	LastResetDate    time.Time `bson:"lastResetDate" json:"lastResetDate"`
	OverdraftAllowed bool      `bson:"overdraftAllowed" json:"overdraftAllowed"`
}

type UserPreferences struct {
	Theme                    string `bson:"theme" json:"theme"`
	Language                 string `bson:"language" json:"language"`
	EmailNotifications       bool   `bson:"emailNotifications" json:"emailNotifications"`
	PushNotifications        bool   `bson:"pushNotifications" json:"pushNotifications"`
	FeedUpdateNotifications  bool   `bson:"feedUpdateNotifications" json:"feedUpdateNotifications"`
	MarketplaceNotifications bool   `bson:"marketplaceNotifications" json:"marketplaceNotifications"`
	AutoConnect              bool   `bson:"autoConnect" json:"autoConnect"`
	CompactView              bool   `bson:"compactView" json:"compactView"`
}

type BackupCode struct {
	Code   string    `bson:"code" json:"code"`
	Used   bool      `bson:"used" json:"used"`
	UsedAt time.Time `bson:"usedAt,omitempty" json:"usedAt,omitempty"`
}

type User struct {
	ID              primitive.ObjectID `bson:"_id,omitempty" json:"_id"`
	Email           string             `bson:"email" json:"email"`
	Password        string             `bson:"password" json:"-"`
	Name            string             `bson:"name" json:"name"`
	CreatedAt       time.Time          `bson:"createdAt" json:"createdAt"`
	LastLogin       *time.Time         `bson:"lastLogin,omitempty" json:"lastLogin,omitempty"`
	TokenUsage      *TokenUsage        `bson:"tokenUsage,omitempty" json:"tokenUsage,omitempty"`
	Preferences     *UserPreferences   `bson:"preferences,omitempty" json:"preferences,omitempty"`
	TwoFactor       bool               `bson:"twoFactorEnabled,omitempty" json:"twoFactorEnabled"`
	TwoFactorSecret string             `bson:"twoFactorSecret,omitempty" json:"-"`
	BackupCodes     []BackupCode       `bson:"backupCodes,omitempty" json:"backupCodes,omitempty"`
}

type UserSession struct {
	ID           primitive.ObjectID `bson:"_id,omitempty" json:"_id"`
	UserID       primitive.ObjectID `bson:"userId" json:"userId"`
	UserAgent    string             `bson:"userAgent" json:"userAgent"`
	UserAgentRaw string             `bson:"userAgentRaw,omitempty" json:"userAgentRaw,omitempty"`
	IPAddress    string             `bson:"ipAddress" json:"ipAddress"`
	CreatedAt    time.Time          `bson:"createdAt" json:"createdAt"`
	LastActive   time.Time          `bson:"lastActiveAt" json:"lastActiveAt"`
	IsActive     bool               `bson:"isActive" json:"isActive"`
	DeviceName   string             `bson:"deviceName,omitempty" json:"deviceName,omitempty"`
	DeviceType   string             `bson:"deviceType,omitempty" json:"deviceType,omitempty"`
}

type LoginActivity struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"_id"`
	UserID    primitive.ObjectID `bson:"userId" json:"userId"`
	IPAddress string             `bson:"ipAddress" json:"ipAddress"`
	UserAgent string             `bson:"userAgent" json:"userAgent"`
	Success   bool               `bson:"success" json:"success"`
	Timestamp time.Time          `bson:"timestamp" json:"timestamp"`
}
