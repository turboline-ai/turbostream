# TurboStream Dashboard Metrics Review

This document describes each metric currently displayed in the TurboStream TUI observability dashboard after the simplification cleanup.

---

## Dashboard Layout Overview

The dashboard consists of:
- **Left Sidebar**: Vertical feed list with connection status indicators
- **Summary Bar**: Quick glance at key metrics across the top
- **4 Panels**: Stream Health, LLM Context, Payload Stats, LLM/Tokens

---

## 1. Stream / WebSocket Health Panel

These metrics track the health and performance of the WebSocket connection to external data feeds.

| Metric | Field Name | Description |
|--------|------------|-------------|
| **Status** | `WSConnected` | Whether the WebSocket is currently connected (✓/✗) |
| **Messages Received** | `MessagesReceivedTotal` | Total count of messages received since connection |
| **Rate (10s)** | `MessagesPerSecond10s` | Message throughput over 10-second window |
| **Throughput KB/s** | `BytesPerSecond10s` | Data throughput in KB/s over 10-second window |
| **Total Bytes** | `BytesReceivedTotal` | Cumulative bytes received |
| **Last Message Age** | `LastMessageAgeSeconds` | Time since last message was received |
| **Reconnects** | `ReconnectsTotal` | Number of times the connection was re-established |
| **Uptime** | `CurrentUptimeSeconds` | Time since last successful connection |

### 📈 Message Rate Sparkline

```
Trend: ▁▂▃▄▅▆▇█▆▅▄▃▂▁▂▃▄▅▆▇█▆▅▄▃
```

- **Type**: Sparkline (60-sample rolling window)
- **Data Source**: `MsgRateHistory` → sampled from `MessagesPerSecond10s`
- **Color Coding**: Higher values = green (good throughput), lower values = yellow
- **Purpose**: Visualize message throughput trends over time to spot drops or spikes

---

## 2. LLM Context Panel (In-Memory Cache)

These metrics track the TUI's local cache of recent feed entries used for LLM context.

| Metric | Field Name | Description |
|--------|------------|-------------|
| **Items Current** | `CacheItemsCurrent` | Number of items currently in cache |
| **Memory** | `CacheApproxBytes` | Approximate memory used by cached items |
| **Oldest Item Age** | `OldestItemAgeSeconds` | Age of oldest item in cache (how far back context goes) |

### 📈 Cache Memory Sparkline

```
Trend: ▂▂▃▃▄▄▅▅▆▆▇▇▆▅▅▄▄▃▃▂▂▃▃▄▄
```

- **Type**: Sparkline (60-sample rolling window)
- **Data Source**: `CacheBytesHistory` → sampled from `CacheApproxBytes`
- **Color Coding**: Higher values = red (memory pressure), lower values = green
- **Purpose**: Track memory growth over time, spot memory leaks or context accumulation

---

## 3. Payload Size Panel

These metrics analyze the size distribution of incoming messages.

| Metric | Field Name | Description |
|--------|------------|-------------|
| **Last** | `PayloadSizeLastBytes` | Size of most recent message |
| **Avg** | `PayloadSizeAvgBytes` | Mean payload size |
| **Max** | `PayloadSizeMaxBytes` | Maximum message size seen |
| **Histogram** | Visual | Distribution bars: <1KB, 1-4KB, 4-16KB, 16-64KB, >64KB |

---

## 4. LLM / Tokens Panel

These metrics track AI/LLM usage and token consumption per feed.

| Metric | Field Name | Description |
|--------|------------|-------------|
| **Requests Total** | `LLMRequestsTotal` | Number of LLM queries made |
| **Input Tokens (Last)** | `InputTokensLast` | Input tokens in the most recent request |
| **Output Tokens (Last)** | `OutputTokensLast` | Output tokens in the most recent request |
| **Input Tokens (Total)** | `InputTokensTotal` | Cumulative input/prompt tokens used |
| **Output Tokens (Total)** | `OutputTokensTotal` | Cumulative output/response tokens used |
| **Total Tokens** | Computed | Sum of input + output tokens |
| **Events in Context** | `EventsInContextCurrent` | Number of feed events currently in LLM context |
| **Context Usage %** | `ContextUtilizationPercent` | Prompt tokens / model context limit × 100 |
| **TTFT (last)** | `TTFTMs` | Time to First Token - ms until first streaming token arrived |
| **TTFT (avg)** | `TTFTAvgMs` | Average Time to First Token across requests |
| **Gen Time (last)** | `GenerationTimeMs` | Total time to generate full response (last request) |
| **Gen Time (avg)** | `GenerationTimeAvgMs` | Average total generation time across requests |
| **Errors** | `LLMErrorsTotal` | Failed LLM requests |

### 📈 Generation Time Sparkline

```
  Trend: ▃▄▅▆▇█▆▅▄▃▂▁▂▃▄▅▆▇▆▅▄▃▂▁
```

- **Type**: Sparkline (60-sample rolling window)
- **Data Source**: `GenTimeHistory` → sampled from `GenerationTimeMs`
- **Color Coding**: Higher values = red (slow response), lower values = green (fast)
- **Purpose**: Visualize LLM response latency trends, spot performance degradation

### TTFT vs Generation Time Explained

```
                            LLM Request Timeline
    ┌─────────────────────────────────────────────────────────────────┐
    │                                                                 │
    │  Request      First Token        Tokens Streaming...    Done    │
    │  Sent         Received           ││││││││││││││││││││           │
    │    │              │               │                │            │
    │    ▼              ▼               ▼                ▼            │
    │    ┌──────────────┬───────────────────────────────┐             │
    │    │              │                               │             │
    │    │◄────TTFT────►│◄────Token Streaming──────────►│             │
    │    │              │                               │             │
    │    │◄─────────────Generation Time────────────────►│             │
    │    │                                              │             │
    │    └──────────────┴───────────────────────────────┘             │
    │                                                                 │
    └─────────────────────────────────────────────────────────────────┘

    TTFT (Time to First Token):
    • Measures latency before user sees any response
    • Affected by: network latency, model load time, prompt processing
    • Lower is better for perceived responsiveness

    Generation Time (Total):
    • Measures complete request duration from start to finish
    • Includes: TTFT + all token generation + streaming overhead
    • Affected by: output length, model speed, network conditions
```

---

## Summary Bar Metrics

The top summary bar shows a condensed view with these key metrics:

| Display | Source | Description |
|---------|--------|-------------|
| WS Status | `WSConnected` | ● Connected / ● Disconnected |
| msg/s | `MessagesPerSecond10s` | 10-second message rate |
| tokens | `InputTokensTotal`, `OutputTokensTotal` | Total tokens: in/out |
| gen | `GenerationTimeAvgMs` | Average generation time |

---

## Complete FeedMetrics Struct Reference

```go
type FeedMetrics struct {
    // Metadata
    FeedID      string
    Name        string
    LastUpdated time.Time

    // Stream / WebSocket health
    MessagesReceivedTotal uint64
    MessagesPerSecond10s  float64
    BytesReceivedTotal    uint64
    BytesPerSecond10s     float64
    LastMessageAgeSeconds float64
    WSConnected           bool
    ReconnectsTotal       uint64
    CurrentUptimeSeconds  float64

    // In-memory cache health (LLM context)
    CacheItemsCurrent    int
    CacheApproxBytes     uint64
    OldestItemAgeSeconds float64

    // Payload size stats
    PayloadSizeLastBytes int
    PayloadSizeAvgBytes  float64
    PayloadSizeMaxBytes  int

    // LLM / token usage
    LLMRequestsTotal          uint64
    InputTokensTotal          uint64
    OutputTokensTotal         uint64
    InputTokensLast           int
    OutputTokensLast          int
    ContextUtilizationPercent float64
    LLMErrorsTotal            uint64
    EventsInContextCurrent    int
    TTFTMs                    float64  // Time to First Token (last request)
    TTFTAvgMs                 float64  // Time to First Token (average)
    GenerationTimeMs          float64  // Total generation time (last request)
    GenerationTimeAvgMs       float64  // Total generation time (average)

    // Sparkline history data (60-sample rolling windows)
    MsgRateHistory    []float64  // Message rate history for sparkline
    CacheBytesHistory []float64  // Cache memory history for sparkline
    GenTimeHistory    []float64  // Generation time history for sparkline
}
```

---

## Sparkline Chart Technical Reference

The dashboard uses Unicode sparkline charts to visualize metric trends over time.

### Character Set

```
▁ ▂ ▃ ▄ ▅ ▆ ▇ █
0 1 2 3 4 5 6 7  (normalized levels)
```

### Implementation Details

| Property | Value |
|----------|-------|
| **Buffer Size** | 60 samples per feed |
| **Sample Rate** | ~1 sample per dashboard refresh (~1s) |
| **Display Width** | Dynamic (35-40 chars based on panel width) |
| **Scaling** | Auto-scales between min/max values in buffer |

### Color Logic

```go
// For throughput metrics (higher = better)
invertColor: false
- Level 6-7: Green  (#00FF7F) - High throughput, good
- Level 4-5: Cyan   (#5DE6E8) - Normal throughput
- Level 0-3: Yellow (#F1C40F) - Low throughput, attention

// For latency/memory metrics (lower = better)  
invertColor: true
- Level 6-7: Red    (#FF5555) - High latency/memory, bad
- Level 4-5: Yellow (#F1C40F) - Elevated, warning
- Level 0-3: Green  (#00FF7F) - Low latency/memory, good
```

### History Sampler Ring Buffer

```go
type historySampler struct {
    size   int        // Buffer capacity (60)
    values []float64  // Ring buffer storage
    index  int        // Next write position
}

// Returns values oldest-to-newest for sparkline rendering
func (h *historySampler) Values() []float64
```

---

## Metrics Removed in Simplification

The following metrics were removed as placeholders or redundant:

- `MessagesParsedTotal`, `MessagesFailedTotal` (parse tracking not needed)
- `MessagesPerSecond1s`, `MessagesPerSecond60s` (consolidated to 10s only)
- `BytesPerSecond1s`, `BytesPerSecond60s` (consolidated to 10s only)
- `SequenceGapsDetectedTotal`, `LateMessagesTotal` (required sequence numbers)
- `LastDisconnectReason` (string tracking removed)
- `CacheItemsMaxSeen`, `CacheInsertsTotal`, `CacheDeletesTotal` (not needed)
- `CacheEvictionsTotal`, `CacheEvictionsPerSecond` (no eviction logic)
- `AverageItemAgeSeconds`, `CacheApproxBytesPerItem` (redundant)
- `PayloadSizeMinBytes`, `PayloadSizeP50/P95/P99Bytes` (simplified to last/avg/max)
- `LLMRequestsPerSecond` (total count sufficient)
- `PromptTokensAvg`, `PromptTokensP95`, `ResponseTokensAvg`, `TotalTokensAvg` (replaced with explicit input/output tracking)
- `LLMLatencyAvgMs`, `LLMLatencyP95Ms` (replaced with TTFT and Generation Time)
- `EventsPerPromptAvg`, `EventsPerPromptMax` (simplified to current count)
- All backpressure metrics (TUI processes synchronously)
