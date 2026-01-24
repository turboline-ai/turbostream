# TurboStream Terminal UI

A terminal client built with Bubble Tea and Lip Gloss that provides real-time feed monitoring and LLM streaming capabilities.

## Features

### Real-Time Data Streaming
- WebSocket connection to backend at `/ws`
- Token-by-token LLM response streaming
- Feed subscription management
- Automatic reconnection handling

### Observability Dashboard
Press `d` to access the comprehensive dashboard showing:

**Stream Health Panel:**
- Connection status and uptime
- Message throughput (rate, bytes/sec)
- Reconnection count
- Message rate sparkline chart

**LLM Context Panel:**
- Events in context (local cache)
- Memory usage tracking
- Context age (oldest item)
- Dropped/evicted message counts
- Cache memory sparkline chart

**Payload Stats Panel:**
- Last/average/max payload sizes
- Size distribution histogram

**LLM/Tokens Panel:**
- Input/output token counts (last request and session totals)
- Time to First Token (TTFT) metrics
- Generation time with sparkline
- Context utilization percentage
- Events in LLM context
- Error tracking

For detailed metric definitions, see [DASHBOARD_METRICS_REVIEW.md](../DASHBOARD_METRICS_REVIEW.md).

### Live Feed Monitoring
- Feed list with connection status indicators
- Real-time data display
- AI analysis streaming
- Context state visualization

## Prerequisites
- Go 1.24+
- Go backend running at `http://localhost:7210` (or configured URL)

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `TURBOSTREAM_BACKEND_URL` | Backend REST API URL | `http://localhost:7210` |
| `TURBOSTREAM_WEBSOCKET_URL` | WebSocket endpoint | `ws://localhost:7210/ws` |
| `TURBOSTREAM_TOKEN` | Pre-configured JWT token (optional) | None |
| `TURBOSTREAM_EMAIL` | Pre-fill login email (optional) | None |

## Quick Start

```bash
cd go-tui
go mod tidy   # Install dependencies
go run .
```

## Key Bindings

| Key | Action |
|-----|--------|
| `Enter` | Submit login form / Execute action |
| `d` | Toggle dashboard view |
| `q` | Quit application |
| `↑/↓` | Navigate feed list |
| `c` | Reconnect WebSocket |
| `Tab` | Cycle through form inputs |

## Dashboard Panels

The dashboard uses **sparkline charts** to visualize metric trends over 60-second windows:

- **Green sparklines**: Higher values are good (throughput, rate)
- **Red sparklines**: Higher values are bad (latency, memory usage)

Top summary bar shows: WebSocket status, msg/s, KB/s, context items, tokens, and generation time.

## License

This project is licensed under the **Mozilla Public License 2.0 (MPL-2.0)**. See the [LICENSE](../LICENSE) file in the repository root for details.

## Contributing

We welcome contributions from the community! Before contributing, please:

1. **Fork the repository** and create a feature branch from `main`.
2. **Follow Go conventions** – run `go fmt` and `go vet` before committing.
3. **Write clear commit messages** describing what changed and why.
4. **Test your changes** – ensure the TUI builds and runs correctly with the backend.
5. **Open a pull request** with a clear description of your changes.

### Code Style
- Use `gofmt` for formatting.
- Keep functions focused and well-documented.
- Follow existing patterns in the codebase for consistency.

### Reporting Issues
- Use GitHub Issues to report bugs or request features.
- Include steps to reproduce, expected behavior, and actual behavior.
- Provide Go version and OS information when reporting bugs.
