package socket

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestRoomManager_JoinAndLeave(t *testing.T) {
	rm := NewRoomManager()

	// Create mock clients
	client1 := &Client{
		ctx:    context.Background(),
		userID: "user1",
	}
	client2 := &Client{
		ctx:    context.Background(),
		userID: "user2",
	}

	// Test joining a room
	rm.Join("room1", client1)

	rm.mu.RLock()
	assert.Contains(t, rm.rooms, "room1")
	assert.Contains(t, rm.rooms["room1"], client1)
	assert.Contains(t, rm.clientRooms, client1)
	assert.Contains(t, rm.clientRooms[client1], "room1")
	rm.mu.RUnlock()

	// Test joining multiple rooms
	rm.Join("room1", client2)
	rm.Join("room2", client1)

	rm.mu.RLock()
	assert.Equal(t, 2, len(rm.rooms["room1"]))
	assert.Contains(t, rm.rooms["room2"], client1)
	assert.Equal(t, 2, len(rm.clientRooms[client1]))
	rm.mu.RUnlock()

	// Test leaving a room
	rm.Leave("room1", client1)

	rm.mu.RLock()
	assert.NotContains(t, rm.rooms["room1"], client1)
	assert.Contains(t, rm.rooms["room1"], client2)
	assert.NotContains(t, rm.clientRooms[client1], "room1")
	assert.Contains(t, rm.clientRooms[client1], "room2")
	rm.mu.RUnlock()

	// Test leaving all rooms
	rm.LeaveAll(client1)

	rm.mu.RLock()
	assert.NotContains(t, rm.clientRooms, client1)
	assert.NotContains(t, rm.rooms["room2"], client1)
	rm.mu.RUnlock()
}

func TestRoomManager_LeaveAll(t *testing.T) {
	rm := NewRoomManager()

	client := &Client{
		ctx:    context.Background(),
		userID: "user1",
	}

	// Join multiple rooms
	rm.Join("room1", client)
	rm.Join("room2", client)
	rm.Join("room3", client)

	rm.mu.RLock()
	assert.Equal(t, 3, len(rm.clientRooms[client]))
	assert.Equal(t, 3, len(rm.rooms))
	rm.mu.RUnlock()

	// Leave all rooms
	rm.LeaveAll(client)

	rm.mu.RLock()
	assert.NotContains(t, rm.clientRooms, client)
	assert.Equal(t, 0, len(rm.rooms), "all rooms should be cleaned up when last client leaves")
	rm.mu.RUnlock()
}

func TestRoomManager_EmptyRoomCleanup(t *testing.T) {
	rm := NewRoomManager()

	client1 := &Client{
		ctx:    context.Background(),
		userID: "user1",
	}
	client2 := &Client{
		ctx:    context.Background(),
		userID: "user2",
	}

	// Both clients join room1
	rm.Join("room1", client1)
	rm.Join("room1", client2)

	rm.mu.RLock()
	assert.Equal(t, 2, len(rm.rooms["room1"]))
	rm.mu.RUnlock()

	// First client leaves
	rm.Leave("room1", client1)

	rm.mu.RLock()
	assert.Contains(t, rm.rooms, "room1", "room should still exist with one client")
	assert.Equal(t, 1, len(rm.rooms["room1"]))
	rm.mu.RUnlock()

	// Last client leaves
	rm.Leave("room1", client2)

	rm.mu.RLock()
	assert.NotContains(t, rm.rooms, "room1", "empty room should be cleaned up")
	rm.mu.RUnlock()
}

func TestRoomManager_MultipleRooms(t *testing.T) {
	rm := NewRoomManager()

	client := &Client{
		ctx:    context.Background(),
		userID: "user1",
	}

	// Join multiple rooms
	rooms := []string{"room1", "room2", "room3", "room4"}
	for _, room := range rooms {
		rm.Join(room, client)
	}

	rm.mu.RLock()
	assert.Equal(t, len(rooms), len(rm.clientRooms[client]))
	assert.Equal(t, len(rooms), len(rm.rooms))
	rm.mu.RUnlock()

	// Leave specific rooms
	rm.Leave("room2", client)
	rm.Leave("room4", client)

	rm.mu.RLock()
	assert.Equal(t, 2, len(rm.clientRooms[client]))
	assert.Contains(t, rm.clientRooms[client], "room1")
	assert.Contains(t, rm.clientRooms[client], "room3")
	assert.NotContains(t, rm.clientRooms[client], "room2")
	assert.NotContains(t, rm.clientRooms[client], "room4")
	assert.Equal(t, 2, len(rm.rooms))
	rm.mu.RUnlock()
}

func TestRoomManager_Broadcast(t *testing.T) {
	rm := NewRoomManager()

	// Note: Broadcasting requires actual websocket connections which is hard to test
	// This test just verifies no panics occur with broadcast to empty room
	msg := WSMessage{
		Type:    "test",
		Payload: []byte(`{"data":"test"}`),
	}

	// Broadcast to non-existent room should not panic
	rm.Broadcast("nonexistent", msg)

	// Broadcast to empty room should not panic
	rm.mu.Lock()
	rm.rooms["empty"] = make(map[*Client]struct{})
	rm.mu.Unlock()

	rm.Broadcast("empty", msg)

	// Verify room still exists
	rm.mu.RLock()
	assert.Contains(t, rm.rooms, "empty")
	rm.mu.RUnlock()
}

func TestRoomManager_ConcurrentAccess(t *testing.T) {
	rm := NewRoomManager()

	// Test concurrent operations don't cause race conditions
	done := make(chan bool)

	// Spawn multiple goroutines doing concurrent operations
	for i := 0; i < 10; i++ {
		go func(id int) {
			client := &Client{
				ctx:    context.Background(),
				userID: "user" + string(rune(id)),
			}

			rm.Join("room1", client)
			rm.Join("room2", client)
			rm.Leave("room1", client)
			rm.LeaveAll(client)

			done <- true
		}(i)
	}

	// Wait for all goroutines to complete
	for i := 0; i < 10; i++ {
		<-done
	}

	// Verify state is consistent
	rm.mu.RLock()
	assert.Equal(t, 0, len(rm.rooms), "all rooms should be cleaned up")
	assert.Equal(t, 0, len(rm.clientRooms), "all client rooms should be cleaned up")
	rm.mu.RUnlock()
}

func TestWSMessage_Structure(t *testing.T) {
	tests := []struct {
		name    string
		message WSMessage
	}{
		{
			name: "subscribe message",
			message: WSMessage{
				Type:    "subscribe",
				Payload: []byte(`{"feedId":"123"}`),
			},
		},
		{
			name: "message without payload",
			message: WSMessage{
				Type: "ping",
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			assert.NotEmpty(t, tt.message.Type)
		})
	}
}

func TestClient_Initialization(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	client := &Client{
		ctx:    ctx,
		cancel: cancel,
		userID: "test-user",
	}

	assert.NotNil(t, client.ctx)
	assert.NotNil(t, client.cancel)
	assert.Equal(t, "test-user", client.userID)
}

func TestManager_Initialization(t *testing.T) {
	// Test creating manager without dependencies (allowed for socket only)
	manager := &Manager{
		rooms:       NewRoomManager(),
		feedConns:   make(map[string]*feedConnection),
		subscribers: make(map[string]map[*Client]struct{}),
	}

	assert.NotNil(t, manager.rooms)
	assert.NotNil(t, manager.feedConns)
	assert.NotNil(t, manager.subscribers)
	assert.Equal(t, 0, len(manager.feedConns))
	assert.Equal(t, 0, len(manager.subscribers))
}
