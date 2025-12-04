# TurboStream Terminal UI (Bubble Tea)

A Bubble Tea + Lip Gloss terminal client that speaks to the Go backend (REST + WebSocket) for real-time feed streaming with comprehensive observability dashboards.

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
- `d` Dashboard, `q` quit.
- `↑/↓` navigate feeds.
- `c` reconnect websocket if needed.
- `Tab` cycles inputs on the login form.

The top bar shows websocket status and token usage when available.

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
