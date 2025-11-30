# TurboStream Terminal UI (Bubble Tea)

A Bubble Tea + Lip Gloss terminal client that speaks to the Go backend (REST + WebSocket) and mirrors the core TurboStream flows: login, marketplace browsing, feed details, subscriptions, and live feed streaming.

## Prerequisites
- Go 1.24+
- Go backend running (defaults: `http://localhost:7210`, websocket at `ws://localhost:7210/ws`)

## Env vars
- `TURBOSTREAM_BACKEND_URL` (default `http://localhost:7210`)
- `TURBOSTREAM_WEBSOCKET_URL` (default `ws://localhost:7210/ws`)
- `TURBOSTREAM_TOKEN` (optional, reuse an existing JWT)
- `TURBOSTREAM_EMAIL` (optional, pre-fill login form)

## Run
```bash
cd go-tui
go mod tidy   # fetch deps (bubbletea, lipgloss, nhooyr websocket)
go run .
```

## Key bindings
- `Enter` on login form to authenticate.
- `d` Dashboard, `m` Marketplace, `q` quit.
- `↑/↓` select feed in marketplace; `Enter` to open feed detail.
- `s` subscribe/unsubscribe to the selected feed.
- `c` reconnect websocket if needed.
- `Tab` cycles inputs on the login form.

The top bar shows websocket status and token usage when available. Feed detail view streams live `feed-data` events from the Go backend socket.
