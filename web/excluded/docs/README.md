# TurboStream Web App

React + TypeScript + Vite frontend for the TurboStream real-time streaming platform.

## Prerequisites

- Node.js 22+
- TurboStream Go backend running on port 7210

## Quick Start

```bash
cd web
npm install
cp .env.local.example .env.local
npm run dev
```

Open [http://localhost:7200](http://localhost:7200)

## Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start dev server on port 7200 with proxy to backend |
| `npm run build` | Build for production to `dist/` |
| `npm run preview` | Preview production build |
| `npm test` | Run unit + integration tests |
| `npm run test:e2e` | Run Playwright E2E tests |
| `npm run lint` | TypeScript type check |

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `VITE_API_URL` | `http://localhost:7210` | Backend API base URL |
| `VITE_WS_URL` | `ws://localhost:7210` | Backend WebSocket URL |

## Project Structure

See `ARCHITECTURE.md` for detailed structure.

## Tech Stack

- **React 19** + **TypeScript 5.7**
- **Vite 6** (build + dev proxy)
- **shadcn/ui** + **Tailwind CSS** (components + styling)
- **React Router v6** (routing)
- **TanStack Query v5** (server state)
- **Zustand v5** (client state)
- **Axios** (HTTP)
- **React Hook Form** + **Zod** (forms)
- **Vitest** + **Playwright** (testing)
