// @group WebSocket > Client : Singleton WebSocket connection manager

import { WS_URL } from '@/config/env'
import type {
  WSInboundType,
  WSOutboundType,
  WSMessage,
  AuthenticatePayload,
  RegisterUserPayload,
  SubscribeFeedPayload,
  LLMQueryPayload,
  ToggleAutoAnalysisPayload,
} from '@/types/ws'

type MessageHandler = (payload: unknown) => void
type StatusHandler = (status: 'disconnected' | 'connecting' | 'connected' | 'authenticated' | 'error') => void

// @group WebSocket > Client > Reconnect : Backoff configuration
const RECONNECT_DELAYS = [1000, 2000, 4000, 8000, 16000]
const HEARTBEAT_INTERVAL = 25_000
const HEARTBEAT_TIMEOUT = 5_000

class WSClient {
  private ws: WebSocket | null = null
  private messageHandlers = new Map<string, Set<MessageHandler>>()
  private statusHandlers = new Set<StatusHandler>()
  private reconnectAttempt = 0
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private heartbeatTimer: ReturnType<typeof setTimeout> | null = null
  private heartbeatTimeoutTimer: ReturnType<typeof setTimeout> | null = null
  private currentToken = ''
  private currentUserId = ''
  private pendingSubscriptions = new Set<string>()
  private shouldReconnect = false

  // @group WebSocket > Client > Connection : Open and close
  connect(token: string, userId: string): void {
    this.currentToken = token
    this.currentUserId = userId
    this.shouldReconnect = true
    this.reconnectAttempt = 0
    this.registerAuthHandlers()
    this.openConnection()
  }

  disconnect(): void {
    this.shouldReconnect = false
    this.stopHeartbeat()
    this.clearReconnectTimer()
    this.pendingSubscriptions.clear()
    if (this.ws) {
      this.ws.close(1000, 'user logout')
      this.ws = null
    }
    this.emitStatus('disconnected')
  }

  private openConnection(): void {
    this.emitStatus('connecting')
    const ws = new WebSocket(`${WS_URL}/ws`)
    this.ws = ws

    ws.onopen = () => {
      this.emitStatus('connected')
      this.send('authenticate', { token: this.currentToken } satisfies AuthenticatePayload)
    }

    ws.onmessage = (event: MessageEvent<string>) => {
      try {
        const msg = JSON.parse(event.data) as WSMessage
        this.dispatch(msg.type as WSInboundType, msg.payload)
      } catch { /* ignore malformed */ }
    }

    ws.onclose = () => {
      this.stopHeartbeat()
      this.emitStatus('disconnected')
      if (this.shouldReconnect) {
        this.scheduleReconnect()
      }
    }

    ws.onerror = () => {
      this.emitStatus('error')
    }
  }

  // @group WebSocket > Client > Auth : Handle authentication flow — registered once at connect()
  private registerAuthHandlers(): void {
    // Clear any previous handlers for these internal events to prevent duplication on reconnect
    this.messageHandlers.delete('authenticated')
    this.messageHandlers.delete('registration-success')
    this.messageHandlers.delete('pong')

    this.on('authenticated', () => {
      this.reconnectAttempt = 0
      this.send('register-user', {
        userId: this.currentUserId,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
      } satisfies RegisterUserPayload)
    })

    this.on('registration-success', () => {
      this.emitStatus('authenticated')
      this.startHeartbeat()
      // Re-subscribe to any pending feeds after reconnect
      for (const feedId of this.pendingSubscriptions) {
        this.send('subscribe-all', { feedId, userId: this.currentUserId } satisfies SubscribeFeedPayload)
      }
    })

    this.on('pong', () => {
      if (this.heartbeatTimeoutTimer) {
        clearTimeout(this.heartbeatTimeoutTimer)
        this.heartbeatTimeoutTimer = null
      }
    })
  }

  // @group WebSocket > Client > Send : Outgoing message helpers
  send(type: WSOutboundType, payload: unknown): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, payload }))
    }
  }

  subscribeFeed(feedId: string): void {
    this.pendingSubscriptions.add(feedId)
    this.send('subscribe-all', { feedId, userId: this.currentUserId } satisfies SubscribeFeedPayload)
  }

  unsubscribeFeed(feedId: string): void {
    this.pendingSubscriptions.delete(feedId)
    this.send('unsubscribe-feed', { feedId, userId: this.currentUserId } satisfies SubscribeFeedPayload)
  }

  queryLLMStream(payload: LLMQueryPayload): void {
    this.send('llm-query-stream', payload)
  }

  toggleAutoAnalysis(feedId: string, enabled: boolean): void {
    this.send('toggle-auto-analysis', { feedId, enabled } satisfies ToggleAutoAnalysisPayload)
  }

  // @group WebSocket > Client > Events : Handler registration
  on(type: WSInboundType | WSOutboundType | string, handler: MessageHandler): () => void {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, new Set())
    }
    this.messageHandlers.get(type)!.add(handler)
    return () => this.off(type, handler)
  }

  off(type: string, handler: MessageHandler): void {
    this.messageHandlers.get(type)?.delete(handler)
  }

  onStatusChange(handler: StatusHandler): () => void {
    this.statusHandlers.add(handler)
    return () => this.statusHandlers.delete(handler)
  }

  // @group WebSocket > Client > Internal : Heartbeat and reconnect
  private startHeartbeat(): void {
    this.stopHeartbeat()
    this.heartbeatTimer = setInterval(() => {
      this.send('ping', {})
      this.heartbeatTimeoutTimer = setTimeout(() => {
        // No pong received — close and reconnect
        this.ws?.close()
      }, HEARTBEAT_TIMEOUT)
    }, HEARTBEAT_INTERVAL)
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) { clearInterval(this.heartbeatTimer); this.heartbeatTimer = null }
    if (this.heartbeatTimeoutTimer) { clearTimeout(this.heartbeatTimeoutTimer); this.heartbeatTimeoutTimer = null }
  }

  private scheduleReconnect(): void {
    this.clearReconnectTimer()
    const delay = RECONNECT_DELAYS[Math.min(this.reconnectAttempt, RECONNECT_DELAYS.length - 1)]
    this.reconnectAttempt++
    this.reconnectTimer = setTimeout(() => this.openConnection(), delay)
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) { clearTimeout(this.reconnectTimer); this.reconnectTimer = null }
  }

  private dispatch(type: WSInboundType, payload: unknown): void {
    this.messageHandlers.get(type)?.forEach((h) => h(payload))
  }

  private emitStatus(status: Parameters<StatusHandler>[0]): void {
    this.statusHandlers.forEach((h) => h(status))
  }
}

// Export singleton
export const wsClient = new WSClient()
