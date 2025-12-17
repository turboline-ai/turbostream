# Go Backend (experimental)

This folder contains a Go rewrite of the Node/Express backend so the existing Next.js frontends can keep using the same REST and Socket.io endpoints.

## Features implemented
- JWT-based auth with register/login, password changes, 2FA (TOTP + backup codes), session and login-activity listings.
- Marketplace CRUD: browse/search feeds, create/update/delete your feeds, subscribe/unsubscribe, submit feed data, update AI prompt metadata.
- Socket.io server (via `go-socket.io`) with the same event names used by the frontend (`register-user`, `subscribe-feed`, `feed-data`, AI placeholders).
- Settings endpoints for global categories.
- Health endpoint at `/health`.
- **Multi-provider LLM support** with BYOM (Bring Your Own Model) capability.

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

### Quick Start (Choose One)

Add one of these blocks to your `.env.local` file:

#### Option 1: OpenAI
```bash
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o                    # Optional, defaults to gpt-4o
DEFAULT_AI_PROVIDER=openai             # Optional, sets as default
```

#### Option 2: Anthropic (Claude)
```bash
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-3-5-sonnet-20241022   # Optional
DEFAULT_AI_PROVIDER=anthropic
```

#### Option 3: Google Gemini
```bash
GOOGLE_API_KEY=AI...
GOOGLE_MODEL=gemini-1.5-flash          # Optional, defaults to gemini-1.5-flash
DEFAULT_AI_PROVIDER=gemini
```

#### Option 4: Mistral
```bash
MISTRAL_API_KEY=...
MISTRAL_MODEL=mistral-large-latest     # Optional
DEFAULT_AI_PROVIDER=mistral
```

#### Option 5: xAI (Grok)
```bash
XAI_API_KEY=xai-...
XAI_MODEL=grok-beta                    # Optional
DEFAULT_AI_PROVIDER=grok
```

#### Option 6: Azure OpenAI
```bash
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
AZURE_OPENAI_API_KEY=...
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4o    # Your deployment name
AZURE_OPENAI_API_VERSION=2024-02-15-preview   # Optional
DEFAULT_AI_PROVIDER=azure-openai
```

### All Environment Variables

```bash
# ============================================
# LLM Provider Configuration (BYOM)
# Configure at least ONE provider
# ============================================

# Default provider (optional - falls back to first available)
# Options: azure-openai, openai, anthropic, gemini, mistral, grok
DEFAULT_AI_PROVIDER=openai

# --- Azure OpenAI ---
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
AZURE_OPENAI_API_KEY=your-api-key
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4o
AZURE_OPENAI_API_VERSION=2024-02-15-preview

# --- OpenAI ---
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o

# --- Anthropic (Claude) ---
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-3-5-sonnet-20241022

# --- Google Gemini ---
GOOGLE_API_KEY=AI...
GOOGLE_MODEL=gemini-1.5-flash

# --- Mistral ---
MISTRAL_API_KEY=...
MISTRAL_MODEL=mistral-large-latest

# --- xAI (Grok) ---
XAI_API_KEY=xai-...
XAI_MODEL=grok-beta

# ============================================
# LLM Settings (applies to all providers)
# ============================================
LLM_MAX_TOKENS=1024
LLM_TEMPERATURE=0.7
LLM_CONTEXT_LIMIT=50      # Max feed entries in context
```

### Model Recommendations

| Use Case | Provider | Model | Notes |
|----------|----------|-------|-------|
| **Best Quality** | Anthropic | `claude-3-5-sonnet-20241022` | Best reasoning |
| **Best Value** | OpenAI | `gpt-4o-mini` | Great quality/cost ratio |
| **Fastest** | Google | `gemini-1.5-flash` | Low latency |
| **Enterprise** | Azure OpenAI | `gpt-4o` | Data residency, compliance |
| **Open Weights** | Mistral | `mistral-large-latest` | European AI |

### Verifying Configuration

When the server starts, you'll see which providers are enabled:

```
✓ OpenAI enabled (model: gpt-4o)
✓ Anthropic enabled (model: claude-3-5-sonnet-20241022)
✓ 2 LLM provider(s) available: [openai anthropic]
```

If no providers are configured:
```
⚠ No LLM providers configured - AI features will be disabled
```

---

## Notes and gaps
- AI endpoints now support multiple providers; set `DEFAULT_AI_PROVIDER` or pass `provider` in request.
- Redis-dependent behaviours from the Node service (e.g., advanced websocket persistence) are not yet ported.
- Stripe/token-purchase routes are not included; continue using the Node service for those until implemented.

## Project layout
- `cmd/server` – entrypoint.
- `internal/config` – env loading.
- `internal/services` – business logic (auth, marketplace, settings, LLM providers).
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
