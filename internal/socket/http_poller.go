package socket

// @group BusinessLogic > HTTPPoller : Periodic HTTP polling worker for REST/JSON feed sources

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/turboline-ai/turbostream/internal/models"
)

const defaultPollingIntervalMs = 5000

// HTTPPoller polls an HTTP endpoint on a configurable interval and broadcasts
// the response via the same BroadcastFeedData path as WebSocket feeds.
type HTTPPoller struct {
	feed      models.WebSocketFeed
	broadcast func(feed models.WebSocketFeed, data interface{}, eventName string)
	stop      chan struct{}
	client    *http.Client
}

// NewHTTPPoller creates a new poller for the given feed.
func NewHTTPPoller(feed models.WebSocketFeed, broadcast func(models.WebSocketFeed, interface{}, string)) *HTTPPoller {
	timeoutMs := 10000
	if feed.HTTPConfig != nil && feed.HTTPConfig.Timeout > 0 {
		timeoutMs = feed.HTTPConfig.Timeout
	}
	return &HTTPPoller{
		feed:      feed,
		broadcast: broadcast,
		stop:      make(chan struct{}),
		client: &http.Client{
			Timeout: time.Duration(timeoutMs) * time.Millisecond,
		},
	}
}

// Start launches the polling goroutine. Non-blocking.
func (p *HTTPPoller) Start() {
	go p.run()
}

// Stop signals the polling goroutine to exit.
func (p *HTTPPoller) Stop() {
	select {
	case <-p.stop:
		// already closed
	default:
		close(p.stop)
	}
}

// run is the polling loop: fetch → extract → broadcast, on each tick.
func (p *HTTPPoller) run() {
	intervalMs := defaultPollingIntervalMs
	if p.feed.HTTPConfig != nil && p.feed.HTTPConfig.PollingInterval > 0 {
		intervalMs = p.feed.HTTPConfig.PollingInterval
	}
	ticker := time.NewTicker(time.Duration(intervalMs) * time.Millisecond)
	defer ticker.Stop()

	log.Printf("🌐 HTTP poller started for feed %s (interval: %dms, url: %s)", p.feed.ID.Hex(), intervalMs, p.feed.URL)

	// Poll immediately on start
	p.poll()

	for {
		select {
		case <-p.stop:
			log.Printf("🌐 HTTP poller stopped for feed %s", p.feed.ID.Hex())
			return
		case <-ticker.C:
			p.poll()
		}
	}
}

// poll performs a single HTTP request and broadcasts the result.
func (p *HTTPPoller) poll() {
	data, err := p.fetch()
	if err != nil {
		log.Printf("⚠️ HTTP poller fetch error for feed %s: %v", p.feed.ID.Hex(), err)
		return
	}
	p.broadcast(p.feed, data, p.feed.EventName)
}

// fetch executes the HTTP request and returns extracted data.
func (p *HTTPPoller) fetch() (interface{}, error) {
	method := "GET"
	cfg := p.feed.HTTPConfig
	if cfg != nil && cfg.Method != "" {
		method = strings.ToUpper(cfg.Method)
	}

	// Build URL with feed-level QueryParams
	rawURL := p.feed.URL
	u, err := url.Parse(rawURL)
	if err != nil {
		return nil, fmt.Errorf("invalid URL: %w", err)
	}
	q := u.Query()
	for _, kv := range p.feed.QueryParams {
		if kv.Key != "" {
			q.Set(kv.Key, kv.Value)
		}
	}
	u.RawQuery = q.Encode()

	// Build request body
	var bodyReader io.Reader
	if cfg != nil && cfg.RequestBody != "" {
		bodyReader = strings.NewReader(cfg.RequestBody)
	}

	req, err := http.NewRequest(method, u.String(), bodyReader)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	// Apply feed-level headers
	for _, kv := range p.feed.Headers {
		if kv.Key != "" {
			req.Header.Set(kv.Key, kv.Value)
		}
	}
	// Apply HTTPConfig request headers (override feed-level)
	if cfg != nil {
		for k, v := range cfg.RequestHeaders {
			req.Header.Set(k, v)
		}
	}
	// Default content-type for non-GET requests
	if method != "GET" && req.Header.Get("Content-Type") == "" {
		req.Header.Set("Content-Type", "application/json")
	}

	resp, err := p.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("HTTP request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("HTTP %d response", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	// Parse response
	var parsed interface{}
	if err := json.Unmarshal(body, &parsed); err != nil {
		// Not JSON — return as string
		parsed = string(body)
	}

	// Apply DataPath extraction if configured
	if cfg != nil && cfg.DataPath != "" {
		if extracted, err := extractDataPath(parsed, cfg.DataPath); err == nil {
			parsed = extracted
		} else {
			log.Printf("⚠️ HTTP poller DataPath extraction failed for feed %s: %v", p.feed.ID.Hex(), err)
		}
	}

	return parsed, nil
}

// extractDataPath navigates a simple dot-separated JSON path (e.g. "data.items").
// Supports array indexing via "field[0]" notation.
func extractDataPath(data interface{}, path string) (interface{}, error) {
	if path == "" {
		return data, nil
	}
	segments := strings.Split(path, ".")
	current := data
	for _, seg := range segments {
		// Handle array index notation: "field[0]" or "field[-1]"
		idxStart := strings.Index(seg, "[")
		fieldName := seg
		idxStr := ""
		if idxStart != -1 {
			fieldName = seg[:idxStart]
			idxStr = strings.Trim(seg[idxStart:], "[]")
		}

		if fieldName != "" {
			m, ok := current.(map[string]interface{})
			if !ok {
				return nil, fmt.Errorf("expected object at %q", fieldName)
			}
			val, exists := m[fieldName]
			if !exists {
				return nil, fmt.Errorf("key %q not found", fieldName)
			}
			current = val
		}

		if idxStr != "" {
			arr, ok := current.([]interface{})
			if !ok {
				return nil, fmt.Errorf("expected array at %q", seg)
			}
			idx := 0
			if _, err := fmt.Sscanf(idxStr, "%d", &idx); err != nil {
				return nil, fmt.Errorf("invalid array index %q", idxStr)
			}
			if idx < 0 {
				idx = len(arr) + idx
			}
			if idx < 0 || idx >= len(arr) {
				return nil, fmt.Errorf("array index %d out of bounds (len %d)", idx, len(arr))
			}
			current = arr[idx]
		}
	}
	return current, nil
}
