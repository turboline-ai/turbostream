# Go Backend (experimental)

This folder contains a Go rewrite of the Node/Express backend so the existing Next.js frontends can keep using the same REST and Socket.io endpoints.

## Features implemented
- JWT-based auth with register/login, password changes, 2FA (TOTP + backup codes), session and login-activity listings.
- Marketplace CRUD: browse/search feeds, create/update/delete your feeds, subscribe/unsubscribe, submit feed data, update AI prompt metadata.
- Socket.io server (via `go-socket.io`) with the same event names used by the frontend (`register-user`, `subscribe-feed`, `feed-data`, AI placeholders).
- Settings endpoints for global categories.
- Health endpoint at `/health`.

## Getting started
1. Copy `.env.local.example` to `.env.local` and fill in values (Mongo, JWT, encryption key, CORS origin, etc.).
2. Install Go (1.24+) and run:
   ```bash
   cd go-backend
   GOCACHE=$(pwd)/.cache/go-build go run ./cmd/server
   ```
   The `GOCACHE` override keeps build artifacts inside the workspace.
3. Point the frontend to the Go backend by setting `NEXT_PUBLIC_BACKEND_URL` to the host/port above.

## Notes and gaps
- AI endpoints stream placeholder text right now; wire in your preferred provider inside `internal/socket/manager.go` and a new service if you want real analysis.
- Redis-dependent behaviours from the Node service (e.g., advanced websocket persistence) are not yet ported.
- Stripe/token-purchase routes are not included; continue using the Node service for those until implemented.

## Project layout
- `cmd/server` – entrypoint.
- `internal/config` – env loading.
- `internal/services` – business logic (auth, marketplace, settings).
- `internal/http` – router, middleware, handlers.
- `internal/socket` – Socket.io server wiring.

## License

This project is licensed under the **Mozilla Public License 2.0 (MPL-2.0)**. See the [LICENSE](../LICENSE) file in the repository root for details.

## Contributing

We welcome contributions from the community! Before contributing, please:

1. **Fork the repository** and create a feature branch from `main`.
2. **Follow Go conventions** – run `go fmt` and `go vet` before committing.
3. **Write clear commit messages** describing what changed and why.
4. **Test your changes** – ensure the backend compiles and endpoints work correctly.
5. **Open a pull request** with a clear description of your changes.

### Code Style
- Use `gofmt` for formatting.
- Keep functions focused and well-documented.
- Follow existing patterns in the codebase for consistency.
- Place new services in `internal/services` and handlers in `internal/http/handlers`.

### Reporting Issues
- Use GitHub Issues to report bugs or request features.
- Include steps to reproduce, expected behavior, and actual behavior.
- Provide Go version, OS, and relevant environment details when reporting bugs.
