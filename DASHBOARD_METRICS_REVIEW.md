# TurboStream Dashboard Metrics Review

This document describes each metric displayed in the TurboStream TUI observability dashboard. Use this to decide which metrics to keep, modify, or remove.

---

## Dashboard Layout Overview

The dashboard consists of:
- **Left Sidebar**: Vertical feed list with connection status indicators
- **Summary Bar**: Quick glance at key metrics across the top
- **5 Panels**: Stream Health, Cache Health, Payload Stats, LLM Usage, Backpressure

---

## 1. Stream / WebSocket Health Panel

These metrics track the health and performance of the WebSocket connection to external data feeds.

| Metric | Field Name | Description | Use Case | Keep/Review |
|--------|------------|-------------|----------|-------------|
| **Status** | `WSConnected` | Whether the WebSocket is currently connected (✓/✗) | Essential - immediately shows if feed is alive | ⬜ |
| **Messages Received** | `MessagesReceivedTotal` | Total count of messages received since connection | Useful for debugging and volume understanding | ⬜ |
| **Messages Parsed** | `MessagesParsedTotal` | Messages successfully parsed as valid JSON | Helps identify malformed data from feeds | ⬜ |
| **Messages Failed** | `MessagesFailedTotal` | Messages that failed to parse | Important for data quality monitoring | ⬜ |
| **Rate 1s/10s/60s** | `MessagesPerSecond1s/10s/60s` | Message throughput at different time windows | Critical for understanding feed velocity | ⬜ |
| **Throughput KB/s** | `BytesPerSecond1s/10s/60s` | Data throughput in KB/s at different windows | Important for bandwidth monitoring | ⬜ |
| **Total Bytes** | `BytesReceivedTotal` | Cumulative bytes received | Good for session-level data volume tracking | ⬜ |
| **Sequence Gaps** | `SequenceGapsDetectedTotal` | Number of detected gaps in message sequence | Useful if feeds have sequence numbers (currently placeholder) | ⬜ |
| **Last Message Age** | `LastMessageAgeSeconds` | Time since last message was received | Critical - shows if feed has gone silent | ⬜ |
| **Reconnects** | `ReconnectsTotal` | Number of times the connection was re-established | Important for connection stability monitoring | ⬜ |
| **Uptime** | `CurrentUptimeSeconds` | Time since last successful connection | Useful for stability tracking | ⬜ |
| **Last Disconnect Reason** | `LastDisconnectReason` | Error message from last disconnect | Helpful for debugging connection issues | ⬜ |
| **Late Messages** | `LateMessagesTotal` | Messages arriving out of order | Currently placeholder - needs sequence tracking | ⬜ |

### Notes:
- `SequenceGapsDetectedTotal` and `LateMessagesTotal` are placeholders - they would require feeds to have sequence numbers
- The 1s/10s/60s rate windows are very useful for spotting traffic patterns

---

## 2. In-Memory Cache Health Panel

These metrics track the TUI's local cache of recent feed entries (used for LLM context).

| Metric | Field Name | Description | Use Case | Keep/Review |
|--------|------------|-------------|----------|-------------|
| **Items Current** | `CacheItemsCurrent` | Number of items currently in cache | Shows how much context is available for LLM | ⬜ |
| **Items Max Seen** | `CacheItemsMaxSeen` | Peak item count observed | Helps understand cache saturation | ⬜ |
| **Memory** | `CacheApproxBytes` | Approximate memory used by cached items | Important for resource monitoring | ⬜ |
| **Avg Item Size** | `CacheApproxBytesPerItem` | Average bytes per cached item | Useful for capacity planning | ⬜ |
| **Oldest Item Age** | `OldestItemAgeSeconds` | Age of oldest item in cache | Shows how far back context goes | ⬜ |
| **Average Age** | `AverageItemAgeSeconds` | Mean age of all cached items | General freshness indicator | ⬜ |
| **Inserts** | `CacheInsertsTotal` | Total items added to cache | Activity tracking | ⬜ |
| **Deletes** | `CacheDeletesTotal` | Total items removed from cache | Currently placeholder | ⬜ |
| **Evictions** | `CacheEvictionsTotal` | Items evicted due to size limits | Important - shows if cache is under pressure | ⬜ |
| **Evictions/sec** | `CacheEvictionsPerSecond` | Rate of evictions | Shows ongoing pressure | ⬜ |

### Notes:
- Cache metrics are computed from the `feedEntries` map in main.go
- `CacheDeletesTotal` isn't currently tracked (items just age out)
- May want to add LRU eviction tracking if we implement cache limits

---

## 3. Payload Size Panel

These metrics analyze the size distribution of incoming messages.

| Metric | Field Name | Description | Use Case | Keep/Review |
|--------|------------|-------------|----------|-------------|
| **Last** | `PayloadSizeLastBytes` | Size of most recent message | Quick reference | ⬜ |
| **Avg** | `PayloadSizeAvgBytes` | Mean payload size | Baseline understanding | ⬜ |
| **P50/P95/P99** | `PayloadSizeP50/P95/P99Bytes` | Percentile distribution | Important for understanding outliers | ⬜ |
| **Min/Max** | `PayloadSizeMin/MaxBytes` | Range of sizes seen | Boundary understanding | ⬜ |
| **Histogram** | `PayloadHistogramCounts[5]` | Distribution buckets: <1KB, 1-4KB, 4-16KB, 16-64KB, >64KB | Visual distribution of message sizes | ⬜ |

### Notes:
- Histogram uses 5 fixed buckets - may want to make dynamic
- P95/P99 are important for identifying problematic large payloads
- The visual bar chart makes patterns easy to spot

---

## 4. LLM / Token Usage Panel

These metrics track AI/LLM usage per feed.

| Metric | Field Name | Description | Use Case | Keep/Review |
|--------|------------|-------------|----------|-------------|
| **Requests Total** | `LLMRequestsTotal` | Number of LLM queries made | Usage tracking | ⬜ |
| **Requests/sec** | `LLMRequestsPerSecond` | Rate of LLM queries | Cost monitoring | ⬜ |
| **Prompt Tokens Avg** | `PromptTokensAvg` | Average tokens in prompts | Context size monitoring | ⬜ |
| **Prompt Tokens P95** | `PromptTokensP95` | 95th percentile prompt size | Identify large context queries | ⬜ |
| **Response Tokens Avg** | `ResponseTokensAvg` | Average tokens in responses | Cost estimation | ⬜ |
| **Total Tokens Avg** | `TotalTokensAvg` | Average total tokens per request | Overall cost metric | ⬜ |
| **Context Utilization %** | `ContextUtilizationPercent` | Prompt tokens / model context limit | Critical - shows if hitting limits | ⬜ |
| **Latency Avg** | `LLMLatencyAvgMs` | Average response time | Performance monitoring | ⬜ |
| **Latency P95** | `LLMLatencyP95Ms` | 95th percentile latency | Worst-case performance | ⬜ |
| **Errors** | `LLMErrorsTotal` | Failed LLM requests | Reliability tracking | ⬜ |
| **Events/Prompt Avg** | `EventsPerPromptAvg` | Average feed events per LLM query | Context density | ⬜ |
| **Events/Prompt Max** | `EventsPerPromptMax` | Maximum events in single prompt | Peak context usage | ⬜ |

### Notes:
- Context utilization assumes 128K token limit (GPT-4o) - could be configurable
- Token counts are estimates (prompt chars / 4) - real counts come from backend
- Visual context bar turns yellow >50%, red >80%

---

## 5. Backpressure / Queue Health Panel

These metrics track if the system is falling behind processing events.

| Metric | Field Name | Description | Use Case | Keep/Review |
|--------|------------|-------------|----------|-------------|
| **Queue Length** | `PendingEventsQueueLength` | Events waiting to be processed | Shows if falling behind | ⬜ |
| **Queue Max Seen** | `PendingEventsQueueMaxSeen` | Peak queue length | Historical pressure | ⬜ |
| **Oldest Event Age** | `PendingEventsOldestAgeSeconds` | Age of oldest queued event | Latency indicator | ⬜ |
| **Events Dropped** | `EventsDroppedDueToBackpressure` | Events discarded due to overload | Critical - data loss indicator | ⬜ |

### Notes:
- Currently these metrics are mostly placeholders - the TUI processes events synchronously
- Would become relevant if we add async processing or buffering
- Warning appears if queue >0 and oldest >10 seconds

---

## Summary Bar Metrics

The top summary bar shows a condensed view with these key metrics:

| Display | Source | Description |
|---------|--------|-------------|
| WS Status | `WSConnected` | ● Connected / ● Disconnected |
| msg/s | `MessagesPerSecond1s/10s/60s` | Three-window rate |
| KB/s | `BytesPerSecond1s/10s/60s` | Three-window throughput |
| cache | `CacheItemsCurrent`, `CacheApproxBytes` | Item count and memory |
| ctx | `ContextUtilizationPercent` | Context window usage % |
| lat | `LLMLatencyAvgMs` | Average LLM latency |

---

## Recommendations for Review

### Likely Candidates for Removal (Placeholder/Not Implemented):
- `SequenceGapsDetectedTotal` - Requires sequence numbers from feeds
- `LateMessagesTotal` - Requires sequence tracking
- `CacheDeletesTotal` - Not currently tracked
- Backpressure panel metrics - TUI processes synchronously

### Potentially Redundant:
- Both `MessagesParsedTotal` and `MessagesFailedTotal` - could just show failed count
- Both `CacheItemsMaxSeen` and `CacheItemsCurrent` - max may not be needed
- All three rate windows (1s/10s/60s) - could reduce to 2

### Most Critical to Keep:
- `WSConnected` - Connection status
- `MessagesPerSecond*` - At least one rate window
- `LastMessageAgeSeconds` - Staleness detection
- `CacheItemsCurrent` and `CacheApproxBytes` - Resource usage
- `ContextUtilizationPercent` - LLM context monitoring
- `LLMLatencyAvgMs` - Performance
- `LLMErrorsTotal` - Reliability

---

## How to Mark Your Decisions

Use the checkboxes in each table:
- ✅ Keep as-is
- 🔄 Modify/Update
- ❌ Remove
- ⬜ Undecided

After review, we can update `metrics.go` and `dashboard.go` accordingly.
