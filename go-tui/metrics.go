package main

import (
	"sort"
	"sync"
	"time"
)

// FeedMetrics contains observability metrics for a single feed
type FeedMetrics struct {
	// Metadata
	FeedID      string
	Name        string
	LastUpdated time.Time

	// 1) Stream / WebSocket health
	MessagesReceivedTotal uint64
	MessagesPerSecond10s  float64
	BytesReceivedTotal    uint64
	BytesPerSecond10s     float64
	LastMessageAgeSeconds float64 // now - lastMessageTime
	WSConnected           bool
	ReconnectsTotal       uint64
	CurrentUptimeSeconds  float64

	// 2) In-memory cache health (context for LLM)
	CacheItemsCurrent    int
	CacheApproxBytes     uint64  // sum of len(rawJSON) for cached items
	OldestItemAgeSeconds float64 // how far back the context goes

	// 2.5) Packet loss / context overflow metrics
	MessagesDroppedTotal  uint64  // messages not included in LLM context (parse errors, overflow)
	ContextEvictionsTotal uint64  // older messages evicted when context fills up
	DropRatePercent       float64 // (dropped / received) * 100

	// 3) Payload size stats (recent window)
	PayloadSizeLastBytes int
	PayloadSizeAvgBytes  float64
	PayloadSizeMaxBytes  int

	// 4) LLM / token usage per feed
	LLMRequestsTotal          uint64
	InputTokensTotal          uint64  // Total input/prompt tokens used
	OutputTokensTotal         uint64  // Total output/response tokens used
	InputTokensLast           int     // Input tokens in last request
	OutputTokensLast          int     // Output tokens in last request
	ContextUtilizationPercent float64 // prompt_tokens / model_context_limit * 100
	LLMErrorsTotal            uint64
	EventsInContextCurrent    int     // Number of feed events currently in LLM context
	TTFTMs                    float64 // Time to First Token (ms) - last request
	TTFTAvgMs                 float64 // Time to First Token (ms) - average
	GenerationTimeMs          float64 // Total generation time (ms) - last request
	GenerationTimeAvgMs       float64 // Total generation time (ms) - average

	// History for sparkline charts (last N samples)
	MsgRateHistory     []float64 // Messages per second history
	CacheBytesHistory  []float64 // Cache bytes history (in MB)
	GenTimeHistory     []float64 // Generation time history (ms)
	PayloadSizeHistory []float64 // Payload size history (bytes)
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

	// History samplers for sparkline charts
	msgRateHistory    map[string]*historySampler
	cacheBytesHistory map[string]*historySampler
	genTimeHistory    map[string]*historySampler
	payloadHistory    map[string]*historySampler
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
	mu                sync.Mutex
	promptTokens      []int
	responseTokens    []int
	ttfts             []float64 // Time to First Token samples
	genTimes          []float64 // Total generation time samples
	eventsPerQuery    []int
	times             []time.Time
	maxSize           int
	duration          time.Duration
	totalInputTokens  uint64  // Running total of input tokens
	totalOutputTokens uint64  // Running total of output tokens
	lastInputTokens   int     // Last request input tokens
	lastOutputTokens  int     // Last request output tokens
	lastTTFT          float64 // Last request TTFT
	lastGenTime       float64 // Last request generation time
}

func newTokenSampler(maxSamples int, duration time.Duration) *tokenSampler {
	return &tokenSampler{
		promptTokens:   make([]int, 0, maxSamples),
		responseTokens: make([]int, 0, maxSamples),
		ttfts:          make([]float64, 0, maxSamples),
		genTimes:       make([]float64, 0, maxSamples),
		eventsPerQuery: make([]int, 0, maxSamples),
		times:          make([]time.Time, 0, maxSamples),
		maxSize:        maxSamples,
		duration:       duration,
	}
}

func (t *tokenSampler) Add(promptTokens, responseTokens int, ttftMs, genTimeMs float64, eventsInPrompt int) {
	t.mu.Lock()
	defer t.mu.Unlock()
	now := time.Now()

	// Track totals and last values (prevent integer overflow by validating non-negative)
	if promptTokens > 0 {
		t.totalInputTokens += uint64(promptTokens)
	}
	if responseTokens > 0 {
		t.totalOutputTokens += uint64(responseTokens)
	}
	t.lastInputTokens = promptTokens
	t.lastOutputTokens = responseTokens
	t.lastTTFT = ttftMs
	t.lastGenTime = genTimeMs

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
		t.ttfts = t.ttfts[idx:]
		t.genTimes = t.genTimes[idx:]
		t.eventsPerQuery = t.eventsPerQuery[idx:]
		t.times = t.times[idx:]
	}

	t.promptTokens = append(t.promptTokens, promptTokens)
	t.responseTokens = append(t.responseTokens, responseTokens)
	t.ttfts = append(t.ttfts, ttftMs)
	t.genTimes = append(t.genTimes, genTimeMs)
	t.eventsPerQuery = append(t.eventsPerQuery, eventsInPrompt)
	t.times = append(t.times, now)
}

func (t *tokenSampler) Stats() (inputTotal, outputTotal uint64, inputLast, outputLast int, ttftLast, ttftAvg, genTimeLast, genTimeAvg float64, eventsMax int) {
	t.mu.Lock()
	defer t.mu.Unlock()

	inputTotal = t.totalInputTokens
	outputTotal = t.totalOutputTokens
	inputLast = t.lastInputTokens
	outputLast = t.lastOutputTokens
	ttftLast = t.lastTTFT
	genTimeLast = t.lastGenTime

	if len(t.ttfts) == 0 {
		return
	}

	// TTFT average
	var ttftSum float64
	for _, v := range t.ttfts {
		ttftSum += v
	}
	ttftAvg = ttftSum / float64(len(t.ttfts))

	// Generation time average
	if len(t.genTimes) > 0 {
		var genSum float64
		for _, v := range t.genTimes {
			genSum += v
		}
		genTimeAvg = genSum / float64(len(t.genTimes))
	}

	// Events per prompt max
	for _, v := range t.eventsPerQuery {
		if v > eventsMax {
			eventsMax = v
		}
	}

	return
}

// historySampler keeps a fixed-size ring buffer of recent values for sparklines
type historySampler struct {
	mu      sync.Mutex
	samples []float64
	maxSize int
}

func newHistorySampler(maxSamples int) *historySampler {
	return &historySampler{
		samples: make([]float64, 0, maxSamples),
		maxSize: maxSamples,
	}
}

func (h *historySampler) Add(value float64) {
	h.mu.Lock()
	defer h.mu.Unlock()

	h.samples = append(h.samples, value)
	if len(h.samples) > h.maxSize {
		h.samples = h.samples[1:]
	}
}

func (h *historySampler) Values() []float64 {
	h.mu.Lock()
	defer h.mu.Unlock()

	result := make([]float64, len(h.samples))
	copy(result, h.samples)
	return result
}

// NewMetricsCollector creates a new metrics collector
func NewMetricsCollector() *MetricsCollector {
	return &MetricsCollector{
		feedMetrics:       make(map[string]*FeedMetrics),
		messageWindows:    make(map[string]*slidingWindow),
		byteWindows:       make(map[string]*slidingWindow),
		payloadSamples:    make(map[string]*payloadSampler),
		llmLatencies:      make(map[string]*slidingWindow),
		llmTokenSamples:   make(map[string]*tokenSampler),
		startTimes:        make(map[string]time.Time),
		lastMsgTimes:      make(map[string]time.Time),
		msgRateHistory:    make(map[string]*historySampler),
		cacheBytesHistory: make(map[string]*historySampler),
		genTimeHistory:    make(map[string]*historySampler),
		payloadHistory:    make(map[string]*historySampler),
	}
}

// InitFeed initializes metrics for a feed
func (mc *MetricsCollector) InitFeed(feedID, name string) {
	mc.mu.Lock()
	defer mc.mu.Unlock()

	if _, exists := mc.feedMetrics[feedID]; !exists {
		mc.feedMetrics[feedID] = &FeedMetrics{
			FeedID:      feedID,
			Name:        name,
			LastUpdated: time.Now(),
		}
		mc.messageWindows[feedID] = newSlidingWindow(time.Minute)
		mc.byteWindows[feedID] = newSlidingWindow(time.Minute)
		mc.payloadSamples[feedID] = newPayloadSampler(1000, 5*time.Minute)
		mc.llmLatencies[feedID] = newSlidingWindow(5 * time.Minute)
		mc.llmTokenSamples[feedID] = newTokenSampler(100, 5*time.Minute)
		mc.startTimes[feedID] = time.Now()

		// History samplers for sparklines (keep last 30 samples)
		mc.msgRateHistory[feedID] = newHistorySampler(30)
		mc.cacheBytesHistory[feedID] = newHistorySampler(30)
		mc.genTimeHistory[feedID] = newHistorySampler(30)
		mc.payloadHistory[feedID] = newHistorySampler(30)
	}
}

// RecordMessage records a received message for a feed
func (mc *MetricsCollector) RecordMessage(feedID string, payloadSize int) {
	mc.mu.Lock()
	fm, exists := mc.feedMetrics[feedID]
	if !exists {
		mc.mu.Unlock()
		return
	}

	fm.MessagesReceivedTotal++
	// Prevent integer overflow: only add positive sizes
	if payloadSize > 0 {
		fm.BytesReceivedTotal += uint64(payloadSize)
	}
	fm.PayloadSizeLastBytes = payloadSize
	if payloadSize > fm.PayloadSizeMaxBytes {
		fm.PayloadSizeMaxBytes = payloadSize
	}
	fm.LastUpdated = time.Now()
	mc.lastMsgTimes[feedID] = time.Now()

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
func (mc *MetricsCollector) RecordWSStatus(feedID string, connected bool) {
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
		mc.startTimes[feedID] = time.Now() // Reset uptime
	} else if connected && !wasConnected {
		mc.startTimes[feedID] = time.Now()
	}
}

// RecordCacheStats records cache statistics
func (mc *MetricsCollector) RecordCacheStats(feedID string, itemCount int, approxBytes uint64, oldestAge float64) {
	mc.mu.Lock()
	defer mc.mu.Unlock()

	fm, exists := mc.feedMetrics[feedID]
	if !exists {
		return
	}

	fm.CacheItemsCurrent = itemCount
	fm.CacheApproxBytes = approxBytes
	fm.OldestItemAgeSeconds = oldestAge
}

// RecordPacketLoss records when a message is dropped (not included in LLM context)
func (mc *MetricsCollector) RecordPacketLoss(feedID string, reason string) {
	mc.mu.Lock()
	defer mc.mu.Unlock()

	fm, exists := mc.feedMetrics[feedID]
	if !exists {
		return
	}

	fm.MessagesDroppedTotal++
	// Update drop rate
	if fm.MessagesReceivedTotal > 0 {
		fm.DropRatePercent = float64(fm.MessagesDroppedTotal) / float64(fm.MessagesReceivedTotal) * 100
	}
}

// RecordContextEviction records when older messages are evicted from context
func (mc *MetricsCollector) RecordContextEviction(feedID string, count int) {
	mc.mu.Lock()
	defer mc.mu.Unlock()

	fm, exists := mc.feedMetrics[feedID]
	if !exists {
		return
	}

	// Prevent integer overflow: only add if count is non-negative
	if count > 0 {
		fm.ContextEvictionsTotal += uint64(count)
	}
}

// RecordLLMRequest records an LLM request with token counts and timing
func (mc *MetricsCollector) RecordLLMRequest(feedID string, inputTokens, outputTokens int, ttftMs, genTimeMs float64, eventsInContext int, isError bool) {
	mc.mu.Lock()
	fm, exists := mc.feedMetrics[feedID]
	if !exists {
		mc.mu.Unlock()
		return
	}

	fm.LLMRequestsTotal++
	fm.EventsInContextCurrent = eventsInContext
	if isError {
		fm.LLMErrorsTotal++
	}

	sampler := mc.llmTokenSamples[feedID]
	mc.mu.Unlock()

	sampler.Add(inputTokens, outputTokens, ttftMs, genTimeMs, eventsInContext)
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

		// Compute rates (10s window)
		if msgWindow, ok := mc.messageWindows[feedID]; ok {
			metrics.MessagesPerSecond10s = msgWindow.Rate(10 * time.Second)
		}

		if byteWindow, ok := mc.byteWindows[feedID]; ok {
			metrics.BytesPerSecond10s = byteWindow.Rate(10 * time.Second)
		}

		// Compute payload stats
		if sampler, ok := mc.payloadSamples[feedID]; ok {
			_, _, avg, _, _, _ := sampler.Stats()
			metrics.PayloadSizeAvgBytes = avg
		}

		// Compute LLM stats
		if sampler, ok := mc.llmTokenSamples[feedID]; ok {
			inputTotal, outputTotal, inputLast, outputLast, ttftLast, ttftAvg, genTimeLast, genTimeAvg, eventsMax := sampler.Stats()
			metrics.InputTokensTotal = inputTotal
			metrics.OutputTokensTotal = outputTotal
			metrics.InputTokensLast = inputLast
			metrics.OutputTokensLast = outputLast
			metrics.TTFTMs = ttftLast
			metrics.TTFTAvgMs = ttftAvg
			metrics.GenerationTimeMs = genTimeLast
			metrics.GenerationTimeAvgMs = genTimeAvg

			// Context utilization (assume 128K context window for GPT-4o)
			const modelContextLimit = 128000
			if inputLast > 0 {
				metrics.ContextUtilizationPercent = (float64(inputLast) / modelContextLimit) * 100
			}
			_ = eventsMax // Not used in simplified metrics
		}

		// Compute uptime and last message age
		if startTime, ok := mc.startTimes[feedID]; ok {
			metrics.CurrentUptimeSeconds = now.Sub(startTime).Seconds()
		}
		if lastMsg, ok := mc.lastMsgTimes[feedID]; ok {
			metrics.LastMessageAgeSeconds = now.Sub(lastMsg).Seconds()
		}

		// Sample history for sparklines (called on each dashboard refresh ~1s)
		if sampler, ok := mc.msgRateHistory[feedID]; ok {
			sampler.Add(metrics.MessagesPerSecond10s)
			metrics.MsgRateHistory = sampler.Values()
		}
		if sampler, ok := mc.cacheBytesHistory[feedID]; ok {
			sampler.Add(float64(metrics.CacheApproxBytes))
			metrics.CacheBytesHistory = sampler.Values()
		}
		if sampler, ok := mc.genTimeHistory[feedID]; ok {
			sampler.Add(metrics.GenerationTimeMs)
			metrics.GenTimeHistory = sampler.Values()
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
			metrics.MessagesPerSecond10s = msgWindow.Rate(10 * time.Second)
		}

		if byteWindow, ok := mc.byteWindows[feedID]; ok {
			metrics.BytesPerSecond10s = byteWindow.Rate(10 * time.Second)
		}

		if sampler, ok := mc.payloadSamples[feedID]; ok {
			_, _, avg, _, _, _ := sampler.Stats()
			metrics.PayloadSizeAvgBytes = avg
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
