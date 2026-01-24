# TurboStream Dashboard Metrics Review

This document describes each metric currently displayed in the TurboStream TUI observability dashboard after the simplification cleanup.

---

## Dashboard Layout Overview

The dashboard consists of:
- **Left Sidebar**: Vertical feed list with connection status indicators
- **Summary Bar**: Quick glance at key metrics across the top
- **4 Panels**: Stream Health, LLM Context, Payload Stats, LLM/Tokens

---

## Latest Updates: LLM Context State

### Two-Layer Context Architecture

TurboStream now clearly distinguishes between two context layers:

**1. TUI Local Cache** (displayed in "LLM Context" panel)
- In-memory buffer of feed data stored in the terminal client
- Used for local display and immediate analysis
- Tracks: cache items, memory usage, age of oldest item
- Independent from backend storage

**2. Backend LLM Context** (displayed in "LLM/Tokens" panel)
- Feed entries stored on the backend server
- This is the actual data sent to AI models for analysis
- Managed by `FeedContext` struct with thread-safe operations
- Configurable limit via `LLM_CONTEXT_LIMIT` (default: 50 entries)
- Automatically optimized with TSLN format for token efficiency

### Key Context Management Features

**Backend Context Storage:**
```go
type FeedContext struct {
    FeedID    string                   // Feed identifier
    FeedName  string                   // Feed display name
    Entries   []map[string]interface{} // Feed data entries (newest first)
    UpdatedAt time.Time                // Last update timestamp
}
```

**Context Operations:**
- **AddFeedData()**: Accumulates streaming data, prepends new entries, auto-trims to limit
- **GetFeedContext()**: Thread-safe read access to current context
- **ClearFeedContext()**: Removes all context for a feed

**Token Optimization:**
- Feed data converted to TSLN (Time-Series Lean Notation) before sending to LLM
- Reduces token usage by 40-60% compared to raw JSON
- Automatic fallback to JSON if TSLN conversion fails

**Monitoring Context Health:**
- `EventsInContextCurrent`: Shows how many entries are in backend context
- `ContextUtilizationPercent`: Visual indicator of prompt tokens vs model limit
- `CacheItemsCurrent`: Shows TUI's local cache size

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

## 2. 💾 LLM Context Panel (TUI Local Cache)

These metrics track the **TUI's local in-memory cache** of recent feed entries. This is separate from the backend's LLM context.

### Understanding Context Layers

TurboStream has two context layers:

1. **TUI Local Cache** (this panel): In-memory buffer of feed data in the terminal client
   - Used for display and local analysis
   - Metrics: `CacheItemsCurrent`, `CacheApproxBytes`, `OldestItemAgeSeconds`

2. **Backend LLM Context** (see LLM/Tokens panel): Feed entries stored on backend and sent to LLM
   - Managed by backend's `FeedContext` (default limit: 50 entries)
   - Metrics: `EventsInContextCurrent`
   - Configurable via `LLM_CONTEXT_LIMIT` environment variable

### TUI Cache Metrics

| Metric | Field Name | Description |
|--------|------------|-------------|
| **Events in Context** | `CacheItemsCurrent` | Number of feed items in TUI's local cache |
| **Context Size** | `CacheApproxBytes` | Approximate memory used by cached items (bytes) |
| **Context Age** | `OldestItemAgeSeconds` | Age of oldest item in cache (how far back local context goes) |

### 📈 Cache Memory Sparkline

```
Trend: ▂▂▃▃▄▄▅▅▆▆▇▇▆▅▅▄▄▃▃▂▂▃▃▄▄
```

- **Type**: Sparkline (60-sample rolling window)
- **Data Source**: `CacheBytesHistory` → sampled from `CacheApproxBytes`
- **Color Coding**: Higher values = red (memory pressure), lower values = green
- **Purpose**: Track memory growth over time, spot memory leaks or context accumulation

### Packet Loss / Context Overflow Metrics

These metrics track message handling and context window management:

| Metric | Field Name | Description |
|--------|------------|-------------|
| **Dropped** | `MessagesDroppedTotal` | Messages not included in LLM context (parse errors, overflow) |
| **Evicted** | `ContextEvictionsTotal` | Older messages evicted when context fills up |
| **Drop Rate** | `DropRatePercent` | Percentage of messages dropped: (dropped / received) × 100 |

#### Color Thresholds

| Metric | Good (Green) | Warning (Yellow) | Bad (Red) |
|--------|--------------|------------------|-----------|
| Dropped | 0 | > 0 | - |
| Evicted | < 10 | 10-50 | > 50 |
| Drop Rate | < 1% | 1-5% | > 5% |

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
| **Total Requests** | `LLMRequestsTotal` | Number of LLM queries made |

### Last Request Section

| Metric | Field Name | Description |
|--------|------------|-------------|
| **Input Tokens** | `InputTokensLast` | Input tokens in the most recent request |
| **Output Tokens** | `OutputTokensLast` | Output tokens in the most recent request |

### Session Totals Section

| Metric | Field Name | Description |
|--------|------------|-------------|
| **Input Tokens** | `InputTokensTotal` | Cumulative input/prompt tokens used |
| **Output Tokens** | `OutputTokensTotal` | Cumulative output/response tokens used |
| **Total Tokens** | Computed | Sum of input + output tokens |

### Backend LLM Context Section

These metrics show the **backend's LLM context state**, which is what actually gets sent to the AI model.

| Metric | Field Name | Description |
|--------|------------|-------------|
| **Events in Context** | `EventsInContextCurrent` | Number of feed entries currently in backend's LLM context (sent to AI) |
| **Context Usage %** | `ContextUtilizationPercent` | Prompt tokens / model context limit × 100 (with visual bar) |

**Backend Context Management:**
- **Storage:** Thread-safe map with `sync.RWMutex` for concurrent access
- **Limit:** Configurable via `LLM_CONTEXT_LIMIT` (default: 50 entries per feed)
- **Ordering:** Newest-first (new entries prepended, old ones trimmed)
- **Optimization:** Converted to [TSLN format](https://github.com/turboline-ai/tsln-golang) to reduce token usage by 40-60%
- **Operations:**
  - `AddFeedData()`: Accumulates streaming data, auto-trims to limit
  - `GetFeedContext()`: Returns current context for a feed
  - `ClearFeedContext()`: Removes all context for a feed

### Timing Section

| Metric | Field Name | Description |
|--------|------------|-------------|
| **TTFT (last)** | `TTFTMs` | Time to First Token - ms until first streaming token arrived |
| **TTFT (avg)** | `TTFTAvgMs` | Average Time to First Token across requests |
| **Gen Time (last)** | `GenerationTimeMs` | Total time to generate full response (last request) |
| **Gen Time (avg)** | `GenerationTimeAvgMs` | Average total generation time across requests |
| **Errors** | `LLMErrorsTotal` | Failed LLM requests |

#### Timing Color Thresholds

| Metric | Good (Green) | Warning (Yellow) | Bad (Red) |
|--------|--------------|------------------|-----------|
| TTFT | < 1000ms | 1000-3000ms | > 3000ms |
| Gen Time | < 5000ms | 5000-10000ms | > 10000ms |

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
| KB/s | `BytesPerSecond10s` | Data throughput in KB/s |
| ctx | `CacheItemsCurrent` | Number of items in context |
| in/out | `InputTokensLast`, `OutputTokensLast` | Tokens in last request: input/output |
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

    // Packet loss / context overflow metrics
    MessagesDroppedTotal  uint64   // messages not included in LLM context
    ContextEvictionsTotal uint64   // older messages evicted when context fills up
    DropRatePercent       float64  // (dropped / received) * 100

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
    MsgRateHistory     []float64  // Message rate history for sparkline
    CacheBytesHistory  []float64  // Cache memory history for sparkline
    GenTimeHistory     []float64  // Generation time history for sparkline
    PayloadSizeHistory []float64  // Payload size history for sparkline
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
- `CacheEvictionsPerSecond` (eviction total sufficient)
- `AverageItemAgeSeconds`, `CacheApproxBytesPerItem` (redundant)
- `PayloadSizeMinBytes`, `PayloadSizeP50/P95/P99Bytes` (simplified to last/avg/max)
- `LLMRequestsPerSecond` (total count sufficient)
- `PromptTokensAvg`, `PromptTokensP95`, `ResponseTokensAvg`, `TotalTokensAvg` (replaced with explicit input/output tracking)
- `LLMLatencyAvgMs`, `LLMLatencyP95Ms` (replaced with TTFT and Generation Time)
- `EventsPerPromptAvg`, `EventsPerPromptMax` (simplified to current count)
- All backpressure metrics (TUI processes synchronously)
