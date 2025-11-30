package services

import (
	"context"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type SettingsService struct {
	db *mongo.Database
}

func NewSettingsService(db *mongo.Database) *SettingsService {
	return &SettingsService{db: db}
}

type Category struct {
	Key   string `bson:"key" json:"key"`
	Label string `bson:"label" json:"label"`
	Scope string `bson:"scope" json:"scope"`
}

func (s *SettingsService) categories() *mongo.Collection {
	return s.db.Collection("settings_categories")
}

// EnsureDefaultCategories seeds the defaults if they don't exist.
func (s *SettingsService) EnsureDefaultCategories(ctx context.Context) error {
	defaults := []Category{
		{Key: "crypto", Label: "Crypto", Scope: "global"},
		{Key: "stocks", Label: "Stocks", Scope: "global"},
		{Key: "forex", Label: "Forex", Scope: "global"},
		{Key: "commodities", Label: "Commodities", Scope: "global"},
		{Key: "custom", Label: "Custom", Scope: "global"},
	}

	for _, c := range defaults {
		if _, err := s.categories().UpdateOne(ctx, bson.M{"key": c.Key}, bson.M{"$setOnInsert": c}, options.Update().SetUpsert(true)); err != nil {
			return err
		}
	}
	return nil
}

func (s *SettingsService) ListCategories(ctx context.Context) ([]Category, error) {
	cur, err := s.categories().Find(ctx, bson.M{})
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)
	var cats []Category
	if err := cur.All(ctx, &cats); err != nil {
		return nil, err
	}
	return cats, nil
}

func (s *SettingsService) GetCategory(ctx context.Context, key string) (*Category, error) {
	var cat Category
	if err := s.categories().FindOne(ctx, bson.M{"key": key}).Decode(&cat); err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, nil
		}
		return nil, err
	}
	return &cat, nil
}
