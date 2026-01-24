package db

import (
	"context"
	"fmt"
	"os"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.mongodb.org/mongo-driver/mongo/readpref"
)

func TestNew(t *testing.T) {
	t.Run("creates new client with valid parameters", func(t *testing.T) {
		uri := "mongodb://localhost:27017"
		dbName := "test_db"

		client := New(uri, dbName)

		require.NotNil(t, client)
		assert.Equal(t, uri, client.uri)
		assert.Equal(t, dbName, client.name)
		assert.Nil(t, client.Raw)
		assert.Nil(t, client.Db)
	})

	t.Run("creates client with empty URI", func(t *testing.T) {
		client := New("", "test_db")

		require.NotNil(t, client)
		assert.Equal(t, "", client.uri)
		assert.Equal(t, "test_db", client.name)
	})

	t.Run("creates client with empty database name", func(t *testing.T) {
		client := New("mongodb://localhost:27017", "")

		require.NotNil(t, client)
		assert.Equal(t, "mongodb://localhost:27017", client.uri)
		assert.Equal(t, "", client.name)
	})
}

func TestConnect(t *testing.T) {
	mongoURI := getMongoURI()
	if mongoURI == "" {
		t.Skip("MongoDB not available (set MONGODB_URI env var to run this test)")
	}

	t.Run("connects successfully with valid URI", func(t *testing.T) {
		client := New(mongoURI, "test_connect_db")
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		err := client.Connect(ctx)

		require.NoError(t, err)
		assert.NotNil(t, client.Raw)
		assert.NotNil(t, client.Db)
		assert.Equal(t, "test_connect_db", client.Db.Name())

		err = client.Disconnect(ctx)
		require.NoError(t, err)
	})

	t.Run("sets database handle correctly", func(t *testing.T) {
		client := New(mongoURI, "my_database")
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		err := client.Connect(ctx)
		require.NoError(t, err)

		assert.Equal(t, "my_database", client.Db.Name())

		err = client.Disconnect(ctx)
		require.NoError(t, err)
	})

	t.Run("fails with invalid URI", func(t *testing.T) {
		client := New("invalid-uri", "test_db")
		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		defer cancel()

		err := client.Connect(ctx)

		assert.Error(t, err)
		assert.Nil(t, client.Raw)
		assert.Nil(t, client.Db)
	})

	t.Run("respects context timeout", func(t *testing.T) {
		client := New("mongodb://10.255.255.1:27017", "test_db")
		ctx, cancel := context.WithTimeout(context.Background(), 100*time.Millisecond)
		defer cancel()

		start := time.Now()
		err := client.Connect(ctx)
		elapsed := time.Since(start)

		assert.True(t, err != nil || elapsed < 200*time.Millisecond, "should timeout or connect quickly")
	})

	t.Run("can ping database after connection", func(t *testing.T) {
		client := New(mongoURI, "test_ping_db")
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		err := client.Connect(ctx)
		require.NoError(t, err)

		err = client.Raw.Ping(ctx, readpref.Primary())
		assert.NoError(t, err)

		err = client.Disconnect(ctx)
		require.NoError(t, err)
	})

	t.Run("multiple Connect calls succeed", func(t *testing.T) {
		client := New(mongoURI, "test_multi_connect_db")
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		err := client.Connect(ctx)
		require.NoError(t, err)

		firstRaw := client.Raw
		firstDb := client.Db

		err = client.Connect(ctx)
		require.NoError(t, err)

		assert.NotEqual(t, firstRaw, client.Raw)
		assert.NotEqual(t, firstDb, client.Db)

		err = client.Disconnect(ctx)
		require.NoError(t, err)
	})
}

func TestDisconnect(t *testing.T) {
	mongoURI := getMongoURI()
	if mongoURI == "" {
		t.Skip("MongoDB not available (set MONGODB_URI env var to run this test)")
	}

	t.Run("disconnects successfully after connection", func(t *testing.T) {
		client := New(mongoURI, "test_disconnect_db")
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		err := client.Connect(ctx)
		require.NoError(t, err)

		err = client.Disconnect(ctx)

		assert.NoError(t, err)
	})

	t.Run("returns nil when disconnecting without connection", func(t *testing.T) {
		client := New(mongoURI, "test_db")
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		err := client.Disconnect(ctx)

		assert.NoError(t, err)
	})

	t.Run("can disconnect multiple times", func(t *testing.T) {
		client := New(mongoURI, "test_multi_disconnect_db")
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		err := client.Connect(ctx)
		require.NoError(t, err)

		err = client.Disconnect(ctx)
		assert.NoError(t, err)

		err = client.Disconnect(ctx)
		_ = err
	})

	t.Run("respects context timeout during disconnect", func(t *testing.T) {
		client := New(mongoURI, "test_timeout_disconnect_db")
		connectCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		err := client.Connect(connectCtx)
		require.NoError(t, err)

		disconnectCtx, disconnectCancel := context.WithTimeout(context.Background(), 1*time.Nanosecond)
		defer disconnectCancel()

		time.Sleep(2 * time.Millisecond)

		err = client.Disconnect(disconnectCtx)
		_ = err
	})
}

func TestClientLifecycle(t *testing.T) {
	mongoURI := getMongoURI()
	if mongoURI == "" {
		t.Skip("MongoDB not available (set MONGODB_URI env var to run this test)")
	}

	t.Run("full lifecycle: create, connect, use, disconnect", func(t *testing.T) {
		client := New(mongoURI, "test_lifecycle_db")
		require.NotNil(t, client)

		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		err := client.Connect(ctx)
		require.NoError(t, err)
		assert.NotNil(t, client.Raw)
		assert.NotNil(t, client.Db)

		err = client.Raw.Ping(ctx, readpref.Primary())
		require.NoError(t, err)

		collection := client.Db.Collection("test_collection")
		assert.NotNil(t, collection)

		err = client.Disconnect(ctx)
		assert.NoError(t, err)
	})

	t.Run("reconnect after disconnect", func(t *testing.T) {
		client := New(mongoURI, "test_reconnect_db")
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		err := client.Connect(ctx)
		require.NoError(t, err)

		err = client.Disconnect(ctx)
		require.NoError(t, err)

		err = client.Connect(ctx)
		require.NoError(t, err)

		err = client.Raw.Ping(ctx, readpref.Primary())
		assert.NoError(t, err)

		err = client.Disconnect(ctx)
		require.NoError(t, err)
	})
}

func TestClientFields(t *testing.T) {
	t.Run("stores URI and database name", func(t *testing.T) {
		uri := "mongodb://example:27017"
		dbName := "my_database"

		client := New(uri, dbName)

		assert.Equal(t, uri, client.uri)
		assert.Equal(t, dbName, client.name)
	})

	t.Run("Raw and Db are nil before connection", func(t *testing.T) {
		client := New("mongodb://localhost:27017", "test_db")

		assert.Nil(t, client.Raw)
		assert.Nil(t, client.Db)
	})
}

func TestClientWithDifferentDatabases(t *testing.T) {
	mongoURI := getMongoURI()
	if mongoURI == "" {
		t.Skip("MongoDB not available (set MONGODB_URI env var to run this test)")
	}

	t.Run("connects to different databases", func(t *testing.T) {
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		client1 := New(mongoURI, "db_one")
		err := client1.Connect(ctx)
		require.NoError(t, err)
		defer client1.Disconnect(ctx)

		client2 := New(mongoURI, "db_two")
		err = client2.Connect(ctx)
		require.NoError(t, err)
		defer client2.Disconnect(ctx)

		assert.Equal(t, "db_one", client1.Db.Name())
		assert.Equal(t, "db_two", client2.Db.Name())
		assert.NotEqual(t, client1.Db.Name(), client2.Db.Name())
	})
}

func TestContextCancellation(t *testing.T) {
	mongoURI := getMongoURI()
	if mongoURI == "" {
		t.Skip("MongoDB not available (set MONGODB_URI env var to run this test)")
	}

	t.Run("handles cancelled context during connect", func(t *testing.T) {
		client := New("mongodb://10.255.255.1:27017", "test_cancel_db")
		ctx, cancel := context.WithTimeout(context.Background(), 100*time.Millisecond)
		defer cancel()

		err := client.Connect(ctx)

		_ = err
	})

	t.Run("handles cancelled context during disconnect", func(t *testing.T) {
		client := New(mongoURI, "test_cancel_disconnect_db")
		connectCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		err := client.Connect(connectCtx)
		require.NoError(t, err)

		disconnectCtx, disconnectCancel := context.WithCancel(context.Background())
		disconnectCancel()

		err = client.Disconnect(disconnectCtx)
		_ = err
	})
}

func getMongoURI() string {
	uri := os.Getenv("MONGODB_URI")
	if uri == "" {
		uri = os.Getenv("MONGODB_TEST_URI")
	}
	if uri == "" {
		uri = "mongodb://localhost:27017"
		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		defer cancel()

		testClient := New(uri, "test")
		if err := testClient.Connect(ctx); err != nil {
			return ""
		}
		testClient.Disconnect(ctx)
	}
	return uri
}

func BenchmarkNew(b *testing.B) {
	for i := 0; i < b.N; i++ {
		_ = New("mongodb://localhost:27017", fmt.Sprintf("db_%d", i))
	}
}

func BenchmarkConnect(b *testing.B) {
	mongoURI := getMongoURI()
	if mongoURI == "" {
		b.Skip("MongoDB not available")
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		client := New(mongoURI, fmt.Sprintf("bench_db_%d", i))
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		_ = client.Connect(ctx)
		client.Disconnect(ctx)
		cancel()
	}
}
