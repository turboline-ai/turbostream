# Go Backend

This folder contains a high-performance Go rewrite of the original Node/Express backend. It provides RESTful APIs and real-time WebSocket capabilities compatible with the TurboStream frontend.

## Features implemented
- **Authentication**: JWT-based auth with register/login, password changes, 2FA (TOTP + backup codes), session management, and login-activity tracking.
- **Marketplace**: Full CRUD for feeds, search/browse capabilities, subscriptions, and data submission.
- **Real-time Updates**: Native WebSocket server (at `/ws`) for real-time feed data and events, replacing the legacy Socket.io implementation.
- **Settings**: Global category management and system settings.
- **Token Optimization**: Automatically converts JSON feed data to **TSLN (Time-Series Lean Notation)** format before sending to LLMs to minimize token usage and costs.
- **Health Check**: Endpoint at `/health` for monitoring.
- **Multi-provider LLM support**: "Bring Your Own Model" (BYOM) architecture supporting multiple AI providers with streaming response capabilities.

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
