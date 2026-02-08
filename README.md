# TurboStream

[![License: MPL 2.0](https://img.shields.io/badge/License-MPL_2.0-brightgreen.svg)](https://opensource.org/licenses/MPL-2.0)

**Real-time data streaming backend with AI-powered analysis**

High-performance Go backend providing REST APIs and WebSocket streaming for monitoring high-velocity data streams with LLM analysis.

---

## Quick Start Video

> **Coming Soon:** Watch our quick start guide on YouTube

---

## Get Started in 3 Steps

### 1. Clone & Configure

```bash
git clone https://github.com/turboline-ai/turbostream.git
cd turbostream
cp .env.local.example .env.local
```

### 2. Set Up Your Environment

Edit `.env.local` with your credentials:

```bash
# Database (Required)
MONGODB_URI=your-mongodb-connection-string
MONGODB_DB_NAME=turbostream

# Security (Required)
JWT_SECRET=$(openssl rand -hex 64)
ENCRYPTION_KEY=$(openssl rand -hex 32)

# LLM Provider (Choose one)
DEFAULT_AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-your-key
```

**Need MongoDB?** Get a free cluster at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)

**Need an LLM API key?** See [LLM Providers](#llm-providers) below

### 3. Run the Server

```bash
go run ./cmd/server
```

Server starts at `http://localhost:7210`

---

## LLM Providers

TurboStream supports **Bring Your Own Model (BYOM)**. Configure any provider by setting environment variables:

| Provider | Get API Key | Env Vars |
|----------|-------------|----------|
| **Anthropic (Claude)** | [console.anthropic.com](https://console.anthropic.com/) | `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL` |
| **OpenAI** | [platform.openai.com](https://platform.openai.com/api-keys) | `OPENAI_API_KEY`, `OPENAI_MODEL` |
| **Azure OpenAI** | [portal.azure.com](https://portal.azure.com) | `AZURE_OPENAI_*` |
| **Google Gemini** | [aistudio.google.com](https://aistudio.google.com/apikey) | `GOOGLE_API_KEY`, `GOOGLE_MODEL` |
| **Mistral** | [console.mistral.ai](https://console.mistral.ai/) | `MISTRAL_API_KEY`, `MISTRAL_MODEL` |
| **xAI (Grok)** | [console.x.ai](https://console.x.ai/) | `XAI_API_KEY`, `XAI_MODEL` |
| **Ollama (Local)** | [ollama.com](https://ollama.com/) | `OLLAMA_BASE_URL`, `OLLAMA_MODEL` |

**Example** (Anthropic):
```bash
DEFAULT_AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-your-key-here
ANTHROPIC_MODEL=claude-3-5-sonnet-20241022
```

---

## Deploy to Production

### Railway (Recommended)

> **Coming Soon:** Watch our Railway deployment guide

1. **Push your code** to GitHub
2. **Connect to Railway**: [railway.app](https://railway.com?referralCode=imTbk0)
3. **Add environment variables** in Railway dashboard
4. **Deploy** - Railway auto-detects your `Dockerfile`

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template?template=https://github.com/turboline-ai/turbostream)

**Need help?** See our [deployment guide](https://turboline.ai/docs/deployment)

### Docker

```bash
# Build
docker build -t turbostream .

# Run
docker run -p 7210:7210 --env-file .env.local turbostream
```

---

## API Documentation

### Interactive API Documentation

**Try it now**: When your server is running, visit:

```
http://localhost:7210/docs
```

The API documentation (powered by [Scalar](https://scalar.com)) lets you:
- Explore all API endpoints interactively
- Test authentication, marketplace, LLM, and settings APIs
- View request/response schemas with examples
- Execute API calls directly from your browser

> **ℹ️ Note:** If you're using an ad-blocker (e.g., Brave Shields, uBlock Origin), you may need to disable it for `localhost:7210` to test API calls in the browser.

> **⚠️ WebSocket Limitation:** WebSocket streaming (`/ws`) cannot be fully tested in the browser documentation. For WebSocket testing, use CLI tools like `wscat` or Postman with WebSocket support.

### Quick Reference

**Authentication:**
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login and get JWT token
- `GET /api/auth/me` - Get current user (requires auth)

**LLM:**
- `POST /api/llm/query` - Query LLM with feed data
- `POST /api/llm/query/stream` - Stream LLM responses (SSE)
- `GET /api/llm/providers` - List available LLM providers

**Marketplace:**
- `GET /api/marketplace/feeds` - List all feeds
- `POST /api/marketplace/feeds` - Create new feed (requires auth)
- `POST /api/marketplace/subscribe/:feedId` - Subscribe to feed
- `GET /api/marketplace/subscriptions` - Get user subscriptions

**WebSocket:**
- `ws://localhost:7210/ws` - Real-time streaming

**Complete Documentation**: [turboline.ai/docs/api](https://turboline.ai/docs/api)

---

## Features

### Core Capabilities
- **JWT Authentication** - Secure user management with 2FA support
- **WebSocket Streaming** - Real-time data and LLM token streaming
- **Multi-Provider LLM** - Support for 7+ LLM providers (BYOM)
- **Feed Marketplace** - Discover and manage data feeds
- **Topic Routing** - Isolated LLM intelligence per topic (e.g., BTC-USD, ETH-USD)
- **Context Management** - Intelligent data accumulation for AI analysis
- **Token Optimization** - TSLN format reduces tokens by 40-60%

### Security
- JWT-based authentication
- 2FA with TOTP and backup codes
- Encrypted sensitive data
- Session management
- Login activity tracking

---

## Clients

### Terminal UI

A keyboard-driven terminal interface for TurboStream:

**Repository:** [github.com/turboline-ai/turbostream-tui](https://github.com/turboline-ai/turbostream-tui)

```bash
git clone https://github.com/turboline-ai/turbostream-tui.git
cd turbostream-tui
go run .
```

### Web Frontend (Commercial)

Modern web interface with responsive design and user management.

**Contact:** [turboline.ai](https://turboline.ai) for commercial licensing

---

## Development

### Project Structure

```
turbostream/
├── cmd/server/          # Main application entry point
├── internal/
│   ├── config/          # Configuration loading
│   ├── db/              # MongoDB client
│   ├── http/            # HTTP handlers and routing
│   ├── models/          # Data models
│   ├── services/        # Business logic (auth, LLM, etc.)
│   └── socket/          # WebSocket manager
├── Dockerfile
├── railway.toml
└── go.mod
```

### Running Tests

```bash
go test ./...              # Run all tests
go test -cover ./...       # With coverage
go test ./internal/services # Specific package
```

### Code Quality

```bash
go fmt ./...               # Format code
golangci-lint run          # Lint
gosec ./...                # Security scan
```

---

## Environment Variables Reference

### Required

```bash
MONGODB_URI=mongodb://...           # MongoDB connection string
MONGODB_DB_NAME=turbostream         # Database name
JWT_SECRET=...                      # Generate with: openssl rand -hex 64
ENCRYPTION_KEY=...                  # Generate with: openssl rand -hex 32
DEFAULT_AI_PROVIDER=anthropic       # Choose your LLM provider
ANTHROPIC_API_KEY=sk-ant-...        # Your provider's API key
```

### Optional

```bash
PORT=7210                           # Server port (Railway sets this)
CORS_ORIGIN=http://localhost:3000   # Frontend URL
LLM_MAX_TOKENS=1024                 # Max LLM response tokens
LLM_TEMPERATURE=0.7                 # LLM creativity (0.0-2.0)
LLM_CONTEXT_LIMIT=50                # Max feed entries in context
REQUEST_TIMEOUT_MS=15000            # Request timeout
TOKEN_QUOTA_PER_MONTH=1000000       # Token usage quota
```

**Full configuration guide:** [turboline.ai/docs/configuration](https://turboline.ai/docs/configuration)

---

## Resources

- **API Documentation**: [turboline.ai/docs/api](https://turboline.ai/docs/api)
- **Deployment Guide**: [turboline.ai/docs/deployment](https://turboline.ai/docs/deployment)
- **Configuration Guide**: [turboline.ai/docs/configuration](https://turboline.ai/docs/configuration)
- **Community Discussions**: [GitHub Discussions](https://github.com/turboline-ai/turbostream/discussions)
- **Report Issues**: [GitHub Issues](https://github.com/turboline-ai/turbostream/issues)
- **Video Tutorials**: [YouTube](https://youtube.com/@turboline-ai)

---

## License

Licensed under the **Mozilla Public License 2.0 (MPL-2.0)**.

See [LICENSE](LICENSE) for details.

---

## Contributing

We welcome contributions! Please:

1. Fork the repository
2. Create a feature branch from `main`
3. Make your changes with clear commit messages
4. Test thoroughly
5. Submit a pull request

**Contribution guide:** [turboline.ai/docs/contributing](https://turboline.ai/docs/contributing)

---

**Made with ❤️ by [Turboline AI](https://turboline.ai)**

Copyright 2024-2026 Turboline AI. All rights reserved.
