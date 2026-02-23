// @group Types : WebSocket message and event payload types

export type WSStatus = 'disconnected' | 'connecting' | 'connected' | 'authenticated' | 'error'

// Outgoing message types
export type WSOutboundType =
  | 'authenticate'
  | 'ping'
  | 'register-user'
  | 'subscribe-feed'
  | 'subscribe-llm'
  | 'subscribe-all'
  | 'unsubscribe-feed'
  | 'llm-query'
  | 'llm-query-stream'
  | 'subscribe-topic'
  | 'toggle-auto-analysis'

// Incoming message types
export type WSInboundType =
  | 'authenticated'
  | 'auth_error'
  | 'pong'
  | 'registration-success'
  | 'subscription-success'
  | 'subscription-error'
  | 'feed-data'
  | 'llm-broadcast'
  | 'llm-response'
  | 'llm-token'
  | 'llm-complete'
  | 'llm-intelligence'
  | 'token-usage-update'
  | 'auto-analysis-toggled'
  | 'error'

export interface WSMessage<T = unknown> {
  type: WSOutboundType | WSInboundType
  payload: T
}

// Inbound event payloads
export interface FeedDataEvent {
  feedId: string
  feedName?: string
  eventName?: string
  data: unknown
  timestamp: string
  topic?: string
}

export interface LLMBroadcastEvent {
  feedId: string
  answer?: string      // llm-broadcast uses "answer"
  analysis?: string    // llm-intelligence uses "analysis"
  provider: string
  timestamp: string
  topic?: string       // llm-intelligence only
}

export interface LLMTokenEvent {
  requestId: string
  token: string
  feedId?: string
}

export interface LLMCompleteEvent {
  requestId: string
  answer: string       // Go sends "answer" (not "fullResponse")
  provider: string
  feedId?: string
  durationMs: number   // Go sends "durationMs" (not "tokensUsed")
}

export interface SubscriptionSuccessEvent {
  feedId: string
  message: string
}

export interface TokenUsageUpdateEvent {
  currentMonth: string
  tokensUsed: number
  limit: number
  lastResetDate: string
  overdraftAllowed: boolean
}

// Outbound payload shapes
export interface AuthenticatePayload {
  token: string
}

export interface RegisterUserPayload {
  userId: string
  userAgent: string
  timestamp: string
}

export interface SubscribeFeedPayload {
  feedId: string
  userId: string
}

export interface LLMQueryPayload {
  feedId: string
  question: string
  provider?: string
  requestId: string
}

export interface ToggleAutoAnalysisPayload {
  feedId: string
  enabled: boolean
}
