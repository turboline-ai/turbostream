# Go Backend

This folder contains a high-performance Go rewrite of the original Node/Express backend. It provides RESTful APIs and real-time WebSocket capabilities compatible with the TurboStream frontend.

## Features Implemented

### Authentication & Security
- JWT-based authentication with register/login endpoints
- Password changes and session management
- 2FA support (TOTP + backup codes)
- Login activity tracking
- API key authentication for WebSocket connections

### WebSocket Streaming (`/ws`)
Real-time data streaming and LLM output delivery using native WebSocket protocol (`nhooyr.io/websocket`).

**Connection Flow:**
1. Client upgrades HTTP connection to WebSocket at `/ws`
2. Client sends `authenticate` message with JWT token
3. Server validates token and responds with `authenticated` message
4. Client subscribes to feeds using `subscribe-llm`, `subscribe-feed`, or `subscribe-all`
5. Server streams data and LLM tokens in real-time

**Message Types:**
- **Authentication:** `authenticate`, `authenticated`, `auth_error`
- **Subscriptions:** `subscribe-feed` (raw data), `subscribe-llm` (AI only), `subscribe-all` (both)
- **LLM Streaming:** `llm-query-stream` (request), `llm-token` (streaming tokens), `llm-complete` (final response)
- **Broadcasting:** `feed-data` (to data subscribers), `llm-broadcast` (to LLM subscribers)
- **Keep-alive:** `ping`, `pong`

**Key Features:**
- Token-by-token streaming for real-time LLM responses
- Room-based broadcasting (data rooms and LLM rooms per feed)
- Thread-safe client management with `sync.Mutex`
- Graceful connection handling and cleanup
- Context cancellation for proper shutdown

### LLM Context Management
Intelligent feed data accumulation for AI analysis.

**Context Storage:**
- Thread-safe feed context map (`sync.RWMutex`)
- Configurable limit via `LLM_CONTEXT_LIMIT` (default: 50 entries)
- Newest-first ordering (prepend new data, trim old)
- Automatic timestamp injection (`_timestamp` field)

**Context Operations:**
- `AddFeedData()`: Accumulates streaming data into context
- `GetFeedContext()`: Returns current context for a feed
- `ClearFeedContext()`: Removes all context for a feed

**Token Optimization:**
- Converts JSON to [TSLN (Time-Series Lean Notation)](https://github.com/turboline-ai/tsln-golang) format
- Reduces token usage by 40-60% vs raw JSON
- Fallback to JSON if TSLN conversion fails

### Multi-Provider LLM Support (BYOM)
"Bring Your Own Model" architecture with streaming capabilities.

**Supported Providers:**
- Azure OpenAI
- OpenAI
- Anthropic (Claude)
- Google Gemini
- Mistral
- xAI (Grok)
- Ollama (local models)

**Capabilities:**
- Streaming and non-streaming queries
- Provider-specific configuration
- Automatic provider selection via `DEFAULT_AI_PROVIDER`
- Token usage tracking per user

### Marketplace API
REST endpoints for feed discovery and management.

**Public Endpoints:**
- Feed browsing, search, and filtering
- Popular and recent feeds
- Feed details and metadata

**Protected Endpoints (JWT Required):**
- Feed CRUD operations
- Subscription management
- Custom AI prompt configuration
- Feed connectivity testing
- Data submission for broadcasting

### Other Features
- **Health Check:** `/health` endpoint for monitoring
- **Settings:** Global category management
- **CORS:** Configurable allowed origins
- **MongoDB Integration:** Feed and user data persistence

## Getting started
1. Copy `.env.local.example` to `.env.local` and fill in values (Mongo, JWT, encryption key, CORS origin, etc.).
2. Configure at least one LLM provider (see [LLM Configuration](#llm-configuration-byom) below).
3. Install Go (1.24+) and run:
   ```bash
   cd go-backend
   GOCACHE=$(pwd)/.cache/go-build go run ./cmd/server
   ```
   The `GOCACHE` override keeps build artifacts inside the workspace.
4. Point the frontend to the Go backend by setting `NEXT_PUBLIC_BACKEND_URL` to the host/port above.

---

## LLM Configuration (BYOM)

TurboStream supports **Bring Your Own Model (BYOM)** - configure any of the supported LLM providers by setting environment variables. You only need to configure **one** provider, but you can configure multiple and switch between them.

### Supported Providers

| Provider | Environment Variables | Get API Key |
|----------|----------------------|-------------|
| **Azure OpenAI** | `AZURE_OPENAI_*` | [Azure Portal](https://portal.azure.com) |
| **OpenAI** | `OPENAI_*` | [platform.openai.com](https://platform.openai.com/api-keys) |
| **Anthropic (Claude)** | `ANTHROPIC_*` | [console.anthropic.com](https://console.anthropic.com/) |
| **Google Gemini** | `GOOGLE_*` | [aistudio.google.com](https://aistudio.google.com/apikey) |
| **Mistral** | `MISTRAL_*` | [console.mistral.ai](https://console.mistral.ai/api-keys/) |
| **xAI (Grok)** | `XAI_*` | [console.x.ai](https://console.x.ai/) |
| **Ollama** | `OLLAMA_*` | [ollama.com](https://ollama.com/) (Local) |

### Quick Start (Choose One)

Add one of these blocks to your `.env.local` file:

#### Option 1: OpenAI
```bash
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o                    # Optional, defaults to gpt-4o
DEFAULT_AI_PROVIDER=openai             # Optional, sets as default
```

#### Option 2: Anthropic
```bash
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-3-5-sonnet-20241022
DEFAULT_AI_PROVIDER=anthropic
```

#### Option 3: Ollama (Local)
```bash
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2
DEFAULT_AI_PROVIDER=ollama
```
