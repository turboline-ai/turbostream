package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/manasmudbari/realtime-crypto-analyzer/go-tui/pkg/api"
	"nhooyr.io/websocket"
	"nhooyr.io/websocket/wsjson"
)

type wsEnvelope struct {
	Type    string          `json:"type"`
	Payload json.RawMessage `json:"payload,omitempty"`
}

// wsClient wraps the websocket connection and streams messages into the Bubble Tea loop.
type wsClient struct {
	conn     *websocket.Conn
	ctx      context.Context
	cancel   context.CancelFunc
	incoming chan tea.Msg
	userID   string
}

func dialWS(url, userID, userAgent string) (*wsClient, error) {
	ctx, cancel := context.WithCancel(context.Background())
	conn, _, err := websocket.Dial(ctx, url, &websocket.DialOptions{
		Subprotocols: []string{},
	})
	if err != nil {
		cancel()
		return nil, err
	}

	client := &wsClient{
		conn:     conn,
		ctx:      ctx,
		cancel:   cancel,
		incoming: make(chan tea.Msg, 32),
		userID:   userID,
	}

	// Register the user.
	regPayload := map[string]interface{}{
		"userId":    userID,
		"userAgent": userAgent,
		"timestamp": time.Now().UTC().Format(time.RFC3339),
	}
	if err := wsjson.Write(ctx, conn, map[string]interface{}{
		"type":    "register-user",
		"payload": regPayload,
	}); err != nil {
		conn.Close(websocket.StatusInternalError, "register failed")
		cancel()
		return nil, fmt.Errorf("register-user failed: %w", err)
	}

	go client.readLoop()
	return client, nil
}

func (c *wsClient) readLoop() {
	defer func() {
		close(c.incoming)
	}()

	for {
		var env wsEnvelope
		if err := wsjson.Read(c.ctx, c.conn, &env); err != nil {
			c.incoming <- wsStatusMsg{Status: "disconnected", Err: err}
			return
		}

		switch env.Type {
		case "registration-success":
			c.incoming <- wsStatusMsg{Status: "connected", Err: nil}
		case "feed-data":
			var payload struct {
				FeedID    string          `json:"feedId"`
				FeedName  string          `json:"feedName"`
				EventName string          `json:"eventName"`
				Data      json.RawMessage `json:"data"`
				Timestamp string          `json:"timestamp"`
			}
			if err := json.Unmarshal(env.Payload, &payload); err == nil {
				ts, _ := time.Parse(time.RFC3339, payload.Timestamp)
				c.incoming <- feedDataMsg{
					FeedID:    payload.FeedID,
					FeedName:  payload.FeedName,
					EventName: payload.EventName,
					Data:      string(payload.Data),
					Time:      ts,
				}
			}
		case "token-usage-update":
			var usage api.TokenUsage
			if err := json.Unmarshal(env.Payload, &usage); err == nil {
				c.incoming <- tokenUsageUpdateMsg{Usage: &usage}
			}
		case "subscription-success", "unsubscription-success":
			// No-op; REST already returns status.
		default:
			// unknown types are ignored but logged in status.
		}
	}
}

func (c *wsClient) ListenCmd() tea.Cmd {
	return func() tea.Msg {
		msg, ok := <-c.incoming
		if !ok {
			return wsStatusMsg{Status: "disconnected", Err: errors.New("ws closed")}
		}
		return msg
	}
}

func (c *wsClient) Subscribe(feedID string) error {
	return c.send(map[string]interface{}{
		"type": "subscribe-feed",
		"payload": map[string]string{
			"feedId": feedID,
			"userId": c.userID,
		},
	})
}

func (c *wsClient) Unsubscribe(feedID string) error {
	return c.send(map[string]interface{}{
		"type": "unsubscribe-feed",
		"payload": map[string]string{
			"feedId": feedID,
			"userId": c.userID,
		},
	})
}

func (c *wsClient) send(msg interface{}) error {
	ctx, cancel := context.WithTimeout(c.ctx, 5*time.Second)
	defer cancel()
	return wsjson.Write(ctx, c.conn, msg)
}

func (c *wsClient) Close() {
	c.cancel()
	_ = c.conn.Close(websocket.StatusNormalClosure, "bye")
}
