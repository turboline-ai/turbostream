# TurboStream

![Banner](https://turbocdn.blob.core.windows.net/blog-images/terminal-ui.png)

**Real-time data stream monitoring with AI-powered analysis**

TurboStream is an open-source terminal UI for monitoring high-velocity WebSocket streams and selectively analyzing them with LLMs in real time.

*Note: Commercial version of this tool includes a modern web-based interface.*

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Components](#components)
- [Quick Start](#quick-start)
- [Requirements](#requirements)
- [Configuration](#configuration)
- [Documentation](#documentation)
- [License](#license)
- [Contributing](#contributing)
- [Security](#security)
- [Support](#support)

---

## Overview

TurboStream enables developers and data engineers to:

- **Subscribe to real-time data feeds** from various sources via WebSocket connections
- **Apply AI-powered analysis** to streaming data with configurable prompts
- **Monitor feed health and performance** through comprehensive observability dashboards
- **Manage feeds through a marketplace** where users can publish and discover data sources

The platform is designed for high throughput, low latency, and extensibility.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           TurboStream Platform                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   ┌─────────────┐    ┌─────────────────────────┐                        │
│   │   go-tui    │    │    External Clients     │                        │
│   │  (Terminal) │    │     (REST / WS API)     │                        │
│   └──────┬──────┘    └───────────┬─────────────┘                        │
│          │                       │                                      │
│          └───────────────────────┘                                      │
│                             │                                           │
│                    ┌────────┴────────┐                                  │
│                    │   go-backend    │                                  │
│                    │    REST + WS    │                                  │
│                    └────────┬────────┘                                  │
│                             │                                           │
│                    ┌────────┴────────┐                                  │
│                    │                 │                                  │
│              ┌─────┴─────┐     ┌─────┴─────┐                            │
│              │  MongoDB  │     │  OpenAI   │                            │
│              │  (Data)   │     │   (AI)    │                            │
│              └───────────┘     └───────────┘                            │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Components

### go-backend

The core API server providing REST endpoints and WebSocket connections for real-time data streaming.

**Features:**
- JWT-based authentication with 2FA support
- Marketplace REST API for feed discovery and management (for developer integration)
- Native WebSocket server for real-time feed streaming
- AI integration with **TSLN (Time-Series Lean Notation)** optimization for efficient token usage

**Documentation:** [go-backend/README.md](go-backend/README.md)

### go-tui

A terminal-based user interface built with Bubble Tea and Lip Gloss for command-line users who prefer keyboard-driven workflows.

**Features:**
- Real-time feed streaming in the terminal
- Comprehensive observability dashboard with sparkline charts
- Live metrics and performance monitoring
- Keyboard-driven navigation

**Documentation:** [go-tui/README.md](go-tui/README.md)

### Web Frontend (Commercial)

A modern web-based interface is available in the commercial version of TurboStream.

**Features:**
- Responsive web interface
- Feed visualization and management
- User profile and settings
- AI analysis integration

Contact [Turboline AI](https://turboline.ai) for commercial licensing inquiries.

---

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/turboline-ai/turbostream.git
cd turbostream
```

### 2. Start the Backend

```bash
cd go-backend
cp .env.local.example .env.local
# Edit .env.local with your configuration
go run ./cmd/server
```

### 3. Start the Terminal UI

```bash
cd go-tui
go run .
```

---

## Requirements

| Component    | Requirement           |
|--------------|-----------------------|
| Go           | 1.24 or higher        |
| MongoDB      | 6.0 or higher         |

---

## Configuration

### Backend Environment Variables

| Variable                | Description                          | Default              |
|-------------------------|--------------------------------------|----------------------|
| `PORT`                  | HTTP server port                     | `7210`               |
| `MONGODB_URI`           | MongoDB connection string            | Required             |
| `JWT_SECRET`            | Secret for JWT signing               | Required             |
| `ENCRYPTION_KEY`        | Key for encrypting sensitive data    | Required             |
| `CORS_ORIGIN`           | Allowed CORS origins                 | `*`                  |
| `AZURE_OPENAI_ENDPOINT` | OpenAI API endpoint                  | Optional             |
| `AZURE_OPENAI_API_KEY`  | OpenAI API key                       | Optional             |

### TUI Environment Variables

| Variable                  | Description                    | Default                       |
|---------------------------|--------------------------------|-------------------------------|
| `TURBOSTREAM_BACKEND_URL` | Backend REST API URL           | `http://localhost:7210`       |
| `TURBOSTREAM_WEBSOCKET_URL` | Backend WebSocket URL        | `ws://localhost:7210/ws`      |
| `TURBOSTREAM_TOKEN`       | Pre-configured JWT token       | None                          |
| `TURBOSTREAM_EMAIL`       | Pre-fill login email           | None                          |

---

## Documentation

| Document                                                    | Description                                    |
|-------------------------------------------------------------|------------------------------------------------|
| [go-backend/README.md](go-backend/README.md)                | Backend setup and API reference                |
| [go-tui/README.md](go-tui/README.md)                        | Terminal UI usage and key bindings             |
| [DASHBOARD_METRICS_REVIEW.md](DASHBOARD_METRICS_REVIEW.md)  | TUI dashboard metrics and chart documentation  |

---

## License

TurboStream is licensed under the **Mozilla Public License 2.0 (MPL-2.0)**.

This means:
- You can use, modify, and distribute this software freely
- Modifications to MPL-licensed files must be released under MPL-2.0
- You can combine this software with proprietary code in larger works
- Patent rights are granted from contributors to users

See the [LICENSE](LICENSE) file for the complete license text.

---

## Contributing

We welcome contributions from the community. To contribute:

### Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally
3. **Create a feature branch** from `main`
4. **Make your changes** following our code style guidelines
5. **Test your changes** thoroughly
6. **Submit a pull request** with a clear description

### Code Style

**Go Code:**
- Run `go fmt` and `go vet` before committing
- Follow standard Go conventions and idioms
- Document exported functions and types
- Keep functions focused and testable

**TypeScript/JavaScript:**
- Use ESLint and Prettier for formatting
- Follow existing patterns in the codebase
- Write meaningful variable and function names

### Pull Request Guidelines

- Provide a clear description of the changes
- Reference any related issues
- Include relevant tests if applicable
- Ensure CI checks pass before requesting review

### Reporting Issues

When reporting bugs, please include:
- Steps to reproduce the issue
- Expected behavior vs actual behavior
- Go/Node.js version and operating system
- Relevant logs or error messages

### Feature Requests

- Check existing issues first to avoid duplicates
- Clearly describe the use case and proposed solution
- Be open to discussion and feedback

---

## Security

If you discover a security vulnerability, please report it responsibly:

1. **Do not** open a public GitHub issue
2. Email security concerns to the maintainers directly
3. Provide detailed information about the vulnerability
4. Allow reasonable time for a fix before public disclosure

---

## Support

- **Issues:** [GitHub Issues](https://github.com/turboline-ai/turbostream/issues)
- **Discussions:** [GitHub Discussions](https://github.com/turboline-ai/turbostream/discussions)

---

Copyright 2024-2025 Turboline AI. All rights reserved.
