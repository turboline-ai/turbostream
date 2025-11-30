# 🚀 Realtime Crypto AI Agent

> This copy (`frontend-go`) is pre-configured to talk to the Go backend at `http://localhost:7210` (websocket + REST). Update `.env.local` here only if you run the Go server on a different host/port.

An AI-powered real-time cryptocurrency analysis dashboard with a full backend server, MongoDB storage, Azure OpenAI streaming, and WebSocket communication. Built with Next.js 14, Express, and Socket.IO.

![Dashboard Preview](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript)
![Azure OpenAI](https://img.shields.io/badge/Azure_OpenAI-AI_Agent-0078D4?style=for-the-badge&logo=microsoft-azure)
![MongoDB](https://img.shields.io/badge/MongoDB-Database-47A248?style=for-the-badge&logo=mongodb)
![Socket.IO](https://img.shields.io/badge/Socket.IO-WebSocket-010101?style=for-the-badge&logo=socket.io)

## ✨ Features

- 📊 **Real-time Data Streaming** - Live cryptocurrency prices via WebSocket
- 🤖 **AI-Powered Analysis** - Intelligent market insights using Azure OpenAI with streaming
- 🗄️ **MongoDB Storage** - Persistent storage for AI queries and analysis results
- 🔌 **WebSocket Communication** - Real-time bidirectional communication
- 📈 **Interactive Charts** - Beautiful visualizations with Recharts
- 🎨 **Modern UI** - Sleek dark theme with Tailwind CSS
- ⚡ **Fast & Responsive** - Built on Next.js 14 with App Router
- 🔄 **Auto-refresh** - Automated AI analysis at configurable intervals
- 📱 **Responsive Design** - Works on desktop, tablet, and mobile

## 🏗️ Architecture

This project consists of three main components:

```
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│   Frontend      │◄───────►│  Backend Server │◄───────►│ Dummy WebSocket │
│   (Next.js)     │         │  (Express +     │         │   Server        │
│                 │         │   Socket.IO)    │         │                 │
│  Port: 3000     │         │  Port: 3002     │         │  Port: 3001     │
└─────────────────┘         └─────────────────┘         └─────────────────┘
                                    │
                                    ├──────► Azure OpenAI
                                    │        (Streaming API)
                                    │
                                    └──────► MongoDB
                                             (Data Storage)
```

### Components

1. **Frontend (Next.js)** - User interface with real-time data visualization
2. **Backend Server** - Express server with Socket.IO for WebSocket communication
   - Connects to Azure OpenAI for AI analysis
   - Stores data in MongoDB
   - Forwards crypto updates from dummy server to frontend
3. **Dummy WebSocket Server** - Mock crypto data generator (for development)
4. **MongoDB** - Database for storing AI queries and analysis results
5. **Azure OpenAI** - AI model for cryptocurrency analysis and insights

## 📋 Prerequisites

- **Node.js 18+** and npm
- **MongoDB** - Running locally or MongoDB Atlas account
- **Azure OpenAI** account with:
  - API key
  - Endpoint URL
  - Deployed model (GPT-4 or GPT-3.5-turbo recommended)
- Git

## 🚀 Quick Start

### 1. Install MongoDB

**Option A: Local MongoDB**
- Download from [MongoDB Community Server](https://www.mongodb.com/try/download/community)
- Install and start MongoDB service
- Default connection: `mongodb://localhost:27017`

**Option B: MongoDB Atlas (Cloud)**
- Sign up at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
- Create a free cluster
- Get your connection string

### 2. Clone and Install

```bash
# Clone the repository
git clone <repository-url>
cd realtime-crypto

# Install frontend dependencies
npm install

# Install backend-server dependencies
cd backend-server
npm install
cd ..
```

### 3. Configure Environment Variables

Create a `.env.local` file in the root directory:

```env
# Azure OpenAI Credentials
AZURE_OPENAI_API_KEY=your_api_key_here
AZURE_OPENAI_ENDPOINT=https://your-endpoint.cognitiveservices.azure.com/
AZURE_OPENAI_API_VERSION=2024-02-15-preview
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4o

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB_NAME=realtime_crypto

# Backend Server Configuration
BACKEND_PORT=3002
BACKEND_HOST=localhost

# WebSocket Server URLs
NEXT_PUBLIC_WEBSOCKET_URL=http://localhost:3001
NEXT_PUBLIC_BACKEND_URL=http://localhost:7210
WEBSOCKET_SERVER_URL=http://localhost:3001

# CORS Configuration
CORS_ORIGIN=http://localhost:3000
```

### 4. Start All Services

**Option A: Start All at Once (Recommended)**
```powershell
.\start-all.ps1
```

This will start all three services in separate windows:
- Dummy WebSocket Server (Port 3001)
- Backend Server (Port 3002)
- Frontend (Port 3000)

**Option B: Start Individually**

```bash
# Terminal 1: Start backend server
cd backend-server
npm run dev

# Terminal 2: Start frontend
npm run dev
```

### 5. Open the Application

Open your browser and navigate to:
```
http://localhost:3000
```

## 🔧 Backend Server API

### REST Endpoints

- `GET /health` - Health check for all services
- `GET /api/queries?limit=50` - Get stored AI queries
- `GET /api/analysis?type=anomaly&limit=50` - Get stored AI analysis

### WebSocket Events

**Client → Server:**
- `analyze-crypto` - Request AI analysis
  ```javascript
  socket.emit('analyze-crypto', {
    query: 'Analyze Bitcoin',
    cryptoData: [{ symbol: 'BTC', price: 50000, change: 2.5 }]
  });
  ```
- `detect-anomaly` - Request anomaly detection
  ```javascript
  socket.emit('detect-anomaly', {
    cryptoData: [{ symbol: 'BTC', price: 50000, change: 2.5 }]
  });
  ```

**Server → Client:**
- `crypto-update` - Real-time crypto price updates
- `ai-stream` - Streaming AI response tokens
- `ai-complete` - Analysis completed
- `ai-error` - Analysis error
- `anomaly-stream` - Streaming anomaly detection tokens
- `anomaly-complete` - Anomaly detection completed
- `anomaly-error` - Anomaly detection error

## 📂 Project Structure

```
realtime-crypto/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API routes (legacy, not used with WebSocket)
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── globals.css
│   ├── components/            # React components
│   │   ├── AIAnalysis.tsx    # AI analysis panel (WebSocket-based)
│   │   ├── CryptoChart.tsx   # Price chart
│   │   └── CryptoTable.tsx   # Data table
│   ├── hooks/
│   │   └── useWebSocket.ts   # WebSocket hook with AI functions
│   └── types/
│       └── crypto.ts         # TypeScript types
├── backend-server/            # Backend Express server
│   ├── src/
│   │   ├── config/           # Configuration
│   │   ├── services/
│   │   │   ├── mongodb.service.ts      # MongoDB operations
│   │   │   └── azureOpenAI.service.ts  # Azure OpenAI integration
│   │   ├── types/
│   │   │   └── models.ts     # Data models
│   │   └── server.ts         # Main server file
│   ├── package.json
│   ├── tsconfig.json
│   └── README.md
├── .env.local                # Environment variables
└── README.md                 # This file
```

## 🛠️ Development

### Running in Development Mode

All servers run with hot-reload enabled:

```bash
# Frontend
npm run dev

# Backend Server
cd backend-server
npm run dev
```

### Building for Production

```bash
# Build frontend
npm run build

# Build backend
cd backend-server
npm run build

# Start production servers
npm start                    # Frontend
cd backend-server
npm start                    # Backend
```

## 🗄️ MongoDB Data Models

### AI Queries Collection
```javascript
{
  query: string,
  response: string,
  cryptoData: [{
    symbol: string,
    price: number,
    change: number,
    timestamp: Date
  }],
  timestamp: Date,
  duration: number,
  model: string
}
```

### AI Analysis Collection
```javascript
{
  type: 'anomaly' | 'general' | 'trend',
  analysis: string,
  cryptoData: [{
    symbol: string,
    price: number,
    change: number,
    timestamp: Date
  }],
  timestamp: Date,
  model: string
}
```

## 🔍 Troubleshooting

### MongoDB Connection Issues
- Ensure MongoDB is running: `mongod --version`
- Check connection string in `.env.local`
- For Atlas: Whitelist your IP address

### Backend Server Not Starting
- Check if port 3002 is available
- Verify Azure OpenAI credentials in `.env.local`
- Check console for error messages

### WebSocket Connection Failed
- Ensure all three servers are running
- Check browser console for connection errors
- Verify CORS_ORIGIN matches your frontend URL

### AI Analysis Not Working
- Verify Azure OpenAI credentials
- Check backend server logs
- Ensure MongoDB connection is successful

## 🤖 AI Frameworks

This project uses **Azure OpenAI** with custom streaming. Alternative frameworks:

- **LangChain.js** - Comprehensive AI framework with tool integration
- **Vercel AI SDK** - Streaming AI responses with React hooks
- **Semantic Kernel** - Microsoft's orchestration framework
- **AutoGen** - Multi-agent conversation framework

See `AI_FRAMEWORKS_GUIDE.md` for migration guides.

## 📝 License

This project is for educational purposes.

## 🙏 Acknowledgments

- Azure OpenAI for AI capabilities
- Next.js team for the amazing framework
- Socket.IO for real-time communication
- MongoDB for data persistence

---

**Built with ❤️ using Next.js, Azure OpenAI, MongoDB, and Socket.IO**
