package main

import (
	"sort"
	"sync"
	"time"
)

// FeedMetrics contains all observability metrics for a single feed
type FeedMetrics struct {
	// Metadata
	FeedID      string
	Name        string
	LastUpdated time.Time

	// 1) Stream / WebSocket health
	MessagesReceivedTotal     uint64
	MessagesParsedTotal       uint64
	MessagesFailedTotal       uint64
	MessagesPerSecond1s       float64
	MessagesPerSecond10s      float64
	MessagesPerSecond60s      float64
	BytesReceivedTotal        uint64
	BytesPerSecond1s          float64
	BytesPerSecond10s         float64
	BytesPerSecond60s         float64
	SequenceGapsDetectedTotal uint64
	LateMessagesTotal         uint64
	LastMessageAgeSeconds     float64 // now - lastMessageTime
	WSConnected               bool
	ReconnectsTotal           uint64
	CurrentUptimeSeconds      float64
	LastDisconnectReason      string

	// 2) In-memory cache health
	CacheItemsCurrent       int
	CacheItemsMaxSeen       int
	CacheInsertsTotal       uint64
	CacheDeletesTotal       uint64
	CacheEvictionsTotal     uint64
	CacheEvictionsPerSecond float64
	OldestItemAgeSeconds    float64
	AverageItemAgeSeconds   float64
	CacheApproxBytes        uint64 // sum of len(rawJSON) for cached items
	CacheApproxBytesPerItem float64

	// 3) Payload size stats (recent window)
	PayloadSizeLastBytes int
	PayloadSizeMinBytes  int
	PayloadSizeMaxBytes  int
	PayloadSizeAvgBytes  float64
	PayloadSizeP50Bytes  int
	PayloadSizeP95Bytes  int
	PayloadSizeP99Bytes  int

	// Histogram buckets for payload sizes.
	// Buckets: <1KB, 1-4KB, 4-16KB, 16-64KB, >64KB
	PayloadHistogramCounts [5]uint64

	// 4) LLM / token usage per feed
	LLMRequestsTotal          uint64
	LLMRequestsPerSecond      float64
	PromptTokensAvg           float64
	PromptTokensP95           float64
	ResponseTokensAvg         float64
	TotalTokensAvg            float64
	ContextUtilizationPercent float64 // prompt_tokens / model_context_limit * 100
	LLMLatencyAvgMs           float64
	LLMLatencyP95Ms           float64
	LLMErrorsTotal            uint64
	EventsPerPromptAvg        float64
	EventsPerPromptMax        int

	// 5) Backpressure / queue health
	PendingEventsQueueLength       int
	PendingEventsQueueMaxSeen      int
	PendingEventsOldestAgeSeconds  float64
	EventsDroppedDueToBackpressure uint64
}

// DashboardMetrics holds metrics for all feeds
type DashboardMetrics struct {
	Feeds       []FeedMetrics
	SelectedIdx int // index of the currently selected feed
}

// MetricsCollector collects and computes metrics from feed data
type MetricsCollector struct {
	mu              sync.RWMutex
	feedMetrics     map[string]*FeedMetrics
	messageWindows  map[string]*slidingWindow
	byteWindows     map[string]*slidingWindow
	payloadSamples  map[string]*payloadSampler
	llmLatencies    map[string]*slidingWindow
	llmTokenSamples map[string]*tokenSampler
	startTimes      map[string]time.Time
	lastMsgTimes    map[string]time.Time
}

// slidingWindow tracks values over time for rate calculations
type slidingWindow struct {
	mu       sync.Mutex
	samples  []windowSample
	duration time.Duration
}

type windowSample struct {
	timestamp time.Time
	value     float64
}

func newSlidingWindow(duration time.Duration) *slidingWindow {
	return &slidingWindow{
		samples:  make([]windowSample, 0, 1000),
		duration: duration,
	}
}

func (w *slidingWindow) Add(value float64) {
	w.mu.Lock()
	defer w.mu.Unlock()
	now := time.Now()
	w.samples = append(w.samples, windowSample{timestamp: now, value: value})
	w.prune(now)
}

func (w *slidingWindow) prune(now time.Time) {
	cutoff := now.Add(-w.duration)
	idx := 0
	for i, s := range w.samples {
		if s.timestamp.After(cutoff) {
			idx = i
			break
		}
	}
	if idx > 0 {
		w.samples = w.samples[idx:]
	}
}

func (w *slidingWindow) Rate(windowDuration time.Duration) float64 {
	w.mu.Lock()
	defer w.mu.Unlock()
	now := time.Now()
	w.prune(now)

	cutoff := now.Add(-windowDuration)
	var sum float64
	for _, s := range w.samples {
		if s.timestamp.After(cutoff) {
			sum += s.value
		}
	}
	return sum / windowDuration.Seconds()
}

func (w *slidingWindow) Sum(windowDuration time.Duration) float64 {
	w.mu.Lock()
	defer w.mu.Unlock()
	now := time.Now()
	w.prune(now)

	cutoff := now.Add(-windowDuration)
	var sum float64
	for _, s := range w.samples {
		if s.timestamp.After(cutoff) {
			sum += s.value
		}
	}
	return sum
}

func (w *slidingWindow) Values(windowDuration time.Duration) []float64 {
	w.mu.Lock()
	defer w.mu.Unlock()
	now := time.Now()
	w.prune(now)

	cutoff := now.Add(-windowDuration)
	var values []float64
	for _, s := range w.samples {
		if s.timestamp.After(cutoff) {
			values = append(values, s.value)
		}
	}
	return values
}

// payloadSampler tracks payload sizes for statistics
type payloadSampler struct {
	mu       sync.Mutex
	samples  []int
	maxSize  int
	duration time.Duration
	times    []time.Time
}

func newPayloadSampler(maxSamples int, duration time.Duration) *payloadSampler {
	return &payloadSampler{
		samples:  make([]int, 0, maxSamples),
		times:    make([]time.Time, 0, maxSamples),
		maxSize:  maxSamples,
		duration: duration,
	}
}

func (p *payloadSampler) Add(size int) {
	p.mu.Lock()
	defer p.mu.Unlock()
	now := time.Now()

	// Prune old samples
	cutoff := now.Add(-p.duration)
	idx := 0
	for i, t := range p.times {
		if t.After(cutoff) {
			idx = i
			break
		}
	}
	if idx > 0 {
		p.samples = p.samples[idx:]
		p.times = p.times[idx:]
	}

	p.samples = append(p.samples, size)
	p.times = append(p.times, now)

	// Keep under max size
	if len(p.samples) > p.maxSize {
		p.samples = p.samples[1:]
		p.times = p.times[1:]
	}
}

func (p *payloadSampler) Stats() (min, max int, avg float64, p50, p95, p99 int) {
	p.mu.Lock()
	defer p.mu.Unlock()

	if len(p.samples) == 0 {
		return 0, 0, 0, 0, 0, 0
	}

	sorted := make([]int, len(p.samples))
	copy(sorted, p.samples)
	sort.Ints(sorted)

	min = sorted[0]
	max = sorted[len(sorted)-1]

	var sum int
	for _, s := range sorted {
		sum += s
	}
	avg = float64(sum) / float64(len(sorted))

	p50 = sorted[len(sorted)*50/100]
	p95Idx := len(sorted) * 95 / 100
	if p95Idx >= len(sorted) {
		p95Idx = len(sorted) - 1
	}
	p95 = sorted[p95Idx]

	p99Idx := len(sorted) * 99 / 100
	if p99Idx >= len(sorted) {
		p99Idx = len(sorted) - 1
	}
	p99 = sorted[p99Idx]

	return
}

func (p *payloadSampler) Last() int {
	p.mu.Lock()
	defer p.mu.Unlock()
	if len(p.samples) == 0 {
		return 0
	}
	return p.samples[len(p.samples)-1]
}

// tokenSampler tracks LLM token usage
type tokenSampler struct {
	mu             sync.Mutex
	promptTokens   []int
	responseTokens []int
	latencies      []float64
	eventsPerQuery []int
	times          []time.Time
	maxSize        int
	duration       time.Duration
}

func newTokenSampler(maxSamples int, duration time.Duration) *tokenSampler {
	return &tokenSampler{
		promptTokens:   make([]int, 0, maxSamples),
		responseTokens: make([]int, 0, maxSamples),
		latencies:      make([]float64, 0, maxSamples),
		eventsPerQuery: make([]int, 0, maxSamples),
		times:          make([]time.Time, 0, maxSamples),
		maxSize:        maxSamples,
		duration:       duration,
	}
}

func (t *tokenSampler) Add(promptTokens, responseTokens int, latencyMs float64, eventsInPrompt int) {
	t.mu.Lock()
	defer t.mu.Unlock()
	now := time.Now()

	// Prune old samples
	cutoff := now.Add(-t.duration)
	idx := 0
	for i, tm := range t.times {
		if tm.After(cutoff) {
			idx = i
			break
		}
	}
	if idx > 0 {
		t.promptTokens = t.promptTokens[idx:]
		t.responseTokens = t.responseTokens[idx:]
		t.latencies = t.latencies[idx:]
		t.eventsPerQuery = t.eventsPerQuery[idx:]
		t.times = t.times[idx:]
	}

	t.promptTokens = append(t.promptTokens, promptTokens)
	t.responseTokens = append(t.responseTokens, responseTokens)
	t.latencies = append(t.latencies, latencyMs)
	t.eventsPerQuery = append(t.eventsPerQuery, eventsInPrompt)
	t.times = append(t.times, now)
}

func (t *tokenSampler) Stats() (promptAvg, promptP95, responseAvg, latencyAvg, latencyP95 float64, eventsAvg float64, eventsMax int) {
	t.mu.Lock()
	defer t.mu.Unlock()

	if len(t.promptTokens) == 0 {
		return
	}

	// Prompt tokens
	var promptSum int
	for _, v := range t.promptTokens {
		promptSum += v
	}
	promptAvg = float64(promptSum) / float64(len(t.promptTokens))

	sortedPrompt := make([]int, len(t.promptTokens))
	copy(sortedPrompt, t.promptTokens)
	sort.Ints(sortedPrompt)
	p95Idx := len(sortedPrompt) * 95 / 100
	if p95Idx >= len(sortedPrompt) {
		p95Idx = len(sortedPrompt) - 1
	}
	promptP95 = float64(sortedPrompt[p95Idx])

	// Response tokens
	var respSum int
	for _, v := range t.responseTokens {
		respSum += v
	}
	responseAvg = float64(respSum) / float64(len(t.responseTokens))

	// Latencies
	var latSum float64
	for _, v := range t.latencies {
		latSum += v
	}
	latencyAvg = latSum / float64(len(t.latencies))

	sortedLat := make([]float64, len(t.latencies))
	copy(sortedLat, t.latencies)
	sort.Float64s(sortedLat)
	latP95Idx := len(sortedLat) * 95 / 100
	if latP95Idx >= len(sortedLat) {
		latP95Idx = len(sortedLat) - 1
	}
	latencyP95 = sortedLat[latP95Idx]

	// Events per prompt
	var eventsSum int
	for _, v := range t.eventsPerQuery {
		eventsSum += v
		if v > eventsMax {
			eventsMax = v
		}
	}
	eventsAvg = float64(eventsSum) / float64(len(t.eventsPerQuery))

	return
}

// NewMetricsCollector creates a new metrics collector
func NewMetricsCollector() *MetricsCollector {
	return &MetricsCollector{
		feedMetrics:     make(map[string]*FeedMetrics),
		messageWindows:  make(map[string]*slidingWindow),
		byteWindows:     make(map[string]*slidingWindow),
		payloadSamples:  make(map[string]*payloadSampler),
		llmLatencies:    make(map[string]*slidingWindow),
		llmTokenSamples: make(map[string]*tokenSampler),
		startTimes:      make(map[string]time.Time),
		lastMsgTimes:    make(map[string]time.Time),
	}
}

// InitFeed initializes metrics for a feed
func (mc *MetricsCollector) InitFeed(feedID, name string) {
	mc.mu.Lock()
	defer mc.mu.Unlock()

	if _, exists := mc.feedMetrics[feedID]; !exists {
		mc.feedMetrics[feedID] = &FeedMetrics{
			FeedID:              feedID,
			Name:                name,
			LastUpdated:         time.Now(),
			PayloadSizeMinBytes: int(^uint(0) >> 1), // Max int
		}
		mc.messageWindows[feedID] = newSlidingWindow(time.Minute)
		mc.byteWindows[feedID] = newSlidingWindow(time.Minute)
		mc.payloadSamples[feedID] = newPayloadSampler(1000, 5*time.Minute)
		mc.llmLatencies[feedID] = newSlidingWindow(5 * time.Minute)
		mc.llmTokenSamples[feedID] = newTokenSampler(100, 5*time.Minute)
		mc.startTimes[feedID] = time.Now()
	}
}

// RecordMessage records a received message for a feed
func (mc *MetricsCollector) RecordMessage(feedID string, payloadSize int, parsed bool) {
	mc.mu.Lock()
	fm, exists := mc.feedMetrics[feedID]
	if !exists {
		mc.mu.Unlock()
		return
	}

	fm.MessagesReceivedTotal++
	if parsed {
		fm.MessagesParsedTotal++
	} else {
		fm.MessagesFailedTotal++
	}
	fm.BytesReceivedTotal += uint64(payloadSize)
	fm.PayloadSizeLastBytes = payloadSize
	fm.LastUpdated = time.Now()
	mc.lastMsgTimes[feedID] = time.Now()

	// Update histogram
	switch {
	case payloadSize < 1024:
		fm.PayloadHistogramCounts[0]++
	case payloadSize < 4096:
		fm.PayloadHistogramCounts[1]++
	case payloadSize < 16384:
		fm.PayloadHistogramCounts[2]++
	case payloadSize < 65536:
		fm.PayloadHistogramCounts[3]++
	default:
		fm.PayloadHistogramCounts[4]++
	}

	msgWindow := mc.messageWindows[feedID]
	byteWindow := mc.byteWindows[feedID]
	sampler := mc.payloadSamples[feedID]
	mc.mu.Unlock()

	// Update windows (thread-safe internally)
	msgWindow.Add(1)
	byteWindow.Add(float64(payloadSize))
	sampler.Add(payloadSize)
}

// RecordWSStatus records WebSocket connection status
func (mc *MetricsCollector) RecordWSStatus(feedID string, connected bool, disconnectReason string) {
	mc.mu.Lock()
	defer mc.mu.Unlock()

	fm, exists := mc.feedMetrics[feedID]
	if !exists {
		return
	}

	wasConnected := fm.WSConnected
	fm.WSConnected = connected

	if !connected && wasConnected {
		fm.ReconnectsTotal++
		fm.LastDisconnectReason = disconnectReason
		mc.startTimes[feedID] = time.Now() // Reset uptime
	} else if connected && !wasConnected {
		mc.startTimes[feedID] = time.Now()
	}
}

// RecordCacheStats records cache statistics
func (mc *MetricsCollector) RecordCacheStats(feedID string, itemCount int, approxBytes uint64, oldestAge, avgAge float64, evictions uint64) {
	mc.mu.Lock()
	defer mc.mu.Unlock()

	fm, exists := mc.feedMetrics[feedID]
	if !exists {
		return
	}

	fm.CacheItemsCurrent = itemCount
	if itemCount > fm.CacheItemsMaxSeen {
		fm.CacheItemsMaxSeen = itemCount
	}
	fm.CacheApproxBytes = approxBytes
	if itemCount > 0 {
		fm.CacheApproxBytesPerItem = float64(approxBytes) / float64(itemCount)
	}
	fm.OldestItemAgeSeconds = oldestAge
	fm.AverageItemAgeSeconds = avgAge
	fm.CacheEvictionsTotal = evictions
}

// RecordLLMRequest records an LLM request
func (mc *MetricsCollector) RecordLLMRequest(feedID string, promptTokens, responseTokens int, latencyMs float64, eventsInPrompt int, isError bool) {
	mc.mu.Lock()
	fm, exists := mc.feedMetrics[feedID]
	if !exists {
		mc.mu.Unlock()
		return
	}

	fm.LLMRequestsTotal++
	if isError {
		fm.LLMErrorsTotal++
	}

	sampler := mc.llmTokenSamples[feedID]
	mc.mu.Unlock()

	sampler.Add(promptTokens, responseTokens, latencyMs, eventsInPrompt)
}

// RecordBackpressure records backpressure metrics
func (mc *MetricsCollector) RecordBackpressure(feedID string, queueLen int, oldestAge float64, dropped uint64) {
	mc.mu.Lock()
	defer mc.mu.Unlock()

	fm, exists := mc.feedMetrics[feedID]
	if !exists {
		return
	}

	fm.PendingEventsQueueLength = queueLen
	if queueLen > fm.PendingEventsQueueMaxSeen {
		fm.PendingEventsQueueMaxSeen = queueLen
	}
	fm.PendingEventsOldestAgeSeconds = oldestAge
	fm.EventsDroppedDueToBackpressure = dropped
}

// GetMetrics returns computed metrics for all feeds
func (mc *MetricsCollector) GetMetrics() DashboardMetrics {
	mc.mu.RLock()
	defer mc.mu.RUnlock()

	now := time.Now()
	var feeds []FeedMetrics

	for feedID, fm := range mc.feedMetrics {
		// Copy the metrics
		metrics := *fm

		// Compute rates
		if msgWindow, ok := mc.messageWindows[feedID]; ok {
			metrics.MessagesPerSecond1s = msgWindow.Rate(time.Second)
			metrics.MessagesPerSecond10s = msgWindow.Rate(10 * time.Second)
			metrics.MessagesPerSecond60s = msgWindow.Rate(time.Minute)
		}

		if byteWindow, ok := mc.byteWindows[feedID]; ok {
			metrics.BytesPerSecond1s = byteWindow.Rate(time.Second)
			metrics.BytesPerSecond10s = byteWindow.Rate(10 * time.Second)
			metrics.BytesPerSecond60s = byteWindow.Rate(time.Minute)
		}

		// Compute payload stats
		if sampler, ok := mc.payloadSamples[feedID]; ok {
			min, max, avg, p50, p95, p99 := sampler.Stats()
			metrics.PayloadSizeMinBytes = min
			metrics.PayloadSizeMaxBytes = max
			metrics.PayloadSizeAvgBytes = avg
			metrics.PayloadSizeP50Bytes = p50
			metrics.PayloadSizeP95Bytes = p95
			metrics.PayloadSizeP99Bytes = p99
		}

		// Compute LLM stats
		if sampler, ok := mc.llmTokenSamples[feedID]; ok {
			promptAvg, promptP95, responseAvg, latAvg, latP95, eventsAvg, eventsMax := sampler.Stats()
			metrics.PromptTokensAvg = promptAvg
			metrics.PromptTokensP95 = promptP95
			metrics.ResponseTokensAvg = responseAvg
			metrics.TotalTokensAvg = promptAvg + responseAvg
			metrics.LLMLatencyAvgMs = latAvg
			metrics.LLMLatencyP95Ms = latP95
			metrics.EventsPerPromptAvg = eventsAvg
			metrics.EventsPerPromptMax = eventsMax

			// Context utilization (assume 128K context window for GPT-4o)
			const modelContextLimit = 128000
			if promptAvg > 0 {
				metrics.ContextUtilizationPercent = (promptAvg / modelContextLimit) * 100
			}
		}

		// Compute uptime and last message age
		if startTime, ok := mc.startTimes[feedID]; ok {
			metrics.CurrentUptimeSeconds = now.Sub(startTime).Seconds()
		}
		if lastMsg, ok := mc.lastMsgTimes[feedID]; ok {
			metrics.LastMessageAgeSeconds = now.Sub(lastMsg).Seconds()
		}

		feeds = append(feeds, metrics)
	}

	// Sort by name for consistent ordering
	sort.Slice(feeds, func(i, j int) bool {
		return feeds[i].Name < feeds[j].Name
	})

	return DashboardMetrics{
		Feeds:       feeds,
		SelectedIdx: 0,
	}
}

// GetFeedMetrics returns metrics for a specific feed
func (mc *MetricsCollector) GetFeedMetrics(feedID string) *FeedMetrics {
	mc.mu.RLock()
	defer mc.mu.RUnlock()

	if fm, exists := mc.feedMetrics[feedID]; exists {
		metrics := *fm

		// Compute real-time rates
		now := time.Now()
		if msgWindow, ok := mc.messageWindows[feedID]; ok {
			metrics.MessagesPerSecond1s = msgWindow.Rate(time.Second)
			metrics.MessagesPerSecond10s = msgWindow.Rate(10 * time.Second)
			metrics.MessagesPerSecond60s = msgWindow.Rate(time.Minute)
		}

		if byteWindow, ok := mc.byteWindows[feedID]; ok {
			metrics.BytesPerSecond1s = byteWindow.Rate(time.Second)
			metrics.BytesPerSecond10s = byteWindow.Rate(10 * time.Second)
			metrics.BytesPerSecond60s = byteWindow.Rate(time.Minute)
		}

		if sampler, ok := mc.payloadSamples[feedID]; ok {
			min, max, avg, p50, p95, p99 := sampler.Stats()
			metrics.PayloadSizeMinBytes = min
			metrics.PayloadSizeMaxBytes = max
			metrics.PayloadSizeAvgBytes = avg
			metrics.PayloadSizeP50Bytes = p50
			metrics.PayloadSizeP95Bytes = p95
			metrics.PayloadSizeP99Bytes = p99
		}

		if startTime, ok := mc.startTimes[feedID]; ok {
			metrics.CurrentUptimeSeconds = now.Sub(startTime).Seconds()
		}
		if lastMsg, ok := mc.lastMsgTimes[feedID]; ok {
			metrics.LastMessageAgeSeconds = now.Sub(lastMsg).Seconds()
		}

		return &metrics
	}
	return nil
}
