package socket

import (
	"encoding/json"
	"testing"
)

func BenchmarkWSMessageUnmarshal(b *testing.B) {
	data := []byte(`{"type":"feed-data","payload":{"feedId":"123","data":{"price":50000}}}`)
	for i := 0; i < b.N; i++ {
		var msg WSMessage
		if err := json.Unmarshal(data, &msg); err != nil {
			b.Fatal(err)
		}
	}
}

func BenchmarkWSMessageMarshal(b *testing.B) {
	payload := map[string]interface{}{
		"feedId": "123",
		"data": map[string]interface{}{
			"price": 50000,
		},
	}
	msg := makeMessage("feed-data", payload)
	for i := 0; i < b.N; i++ {
		_, err := json.Marshal(msg)
		if err != nil {
			b.Fatal(err)
		}
	}
}
