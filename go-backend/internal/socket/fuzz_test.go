package socket

import (
	"encoding/json"
	"testing"
)

func FuzzWSMessageParsing(f *testing.F) {
	// Seed corpus
	f.Add([]byte(`{"type":"ping"}`))
	f.Add([]byte(`{"type":"authenticate","payload":{"token":"abc"}}`))
	f.Add([]byte(`invalid-json`))

	f.Fuzz(func(t *testing.T, data []byte) {
		var msg WSMessage
		// Just check if Unmarshal panics
		_ = json.Unmarshal(data, &msg)

		if msg.Type != "" {
			// If we have a type, try to unmarshal payload if it exists
			if len(msg.Payload) > 0 {
				var payload map[string]interface{}
				_ = json.Unmarshal(msg.Payload, &payload)
			}
		}
	})
}
