package db

import (
	"context"

	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// Client wraps a Mongo client and database handle.
type Client struct {
	Raw  *mongo.Client
	Db   *mongo.Database
	uri  string
	name string
}

// New creates a Mongo client but does not connect.
func New(uri, dbName string) *Client {
	return &Client{
		uri:  uri,
		name: dbName,
	}
}

// Connect establishes the Mongo connection.
func (c *Client) Connect(ctx context.Context) error {
	opts := options.Client().ApplyURI(c.uri)
	client, err := mongo.Connect(ctx, opts)
	if err != nil {
		return err
	}

	c.Raw = client
	c.Db = client.Database(c.name)
	return nil
}

// Disconnect closes the Mongo connection.
func (c *Client) Disconnect(ctx context.Context) error {
	if c.Raw == nil {
		return nil
	}
	return c.Raw.Disconnect(ctx)
}
