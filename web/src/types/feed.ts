// @group Types : Feed and subscription types

export interface KeyValue {
  key: string
  value: string
}

export interface HTTPPollingConfig {
  method: string
  interval: number
  dataPath: string
  headers: KeyValue[]
}

export interface TopicPromptConfig {
  systemPrompt: string
  userPrompt: string
  question: string
}

export type ConnectionType = 'websocket' | 'socketio' | 'http-polling' | 'protobuf'

export interface WebSocketFeed {
  _id: string
  name: string
  description: string
  systemPrompt: string
  url: string
  category: string
  icon: string
  isActive: boolean
  isVerified: boolean
  isPublic: boolean
  feedType: 'user' | 'system'
  ownerId: string
  ownerName: string
  connectionType: ConnectionType
  queryParams: KeyValue[]
  headers: KeyValue[]
  connectionMessages: string[]
  eventName: string
  dataFormat: string
  reconnectionEnabled: boolean
  reconnectionDelay: number
  reconnectionAttempts: number
  subscriberCount: number
  httpConfig?: HTTPPollingConfig
  tags: string[]
  website: string
  documentation: string
  defaultAIPrompt: string
  aiAnalysisEnabled: boolean
  enableTopicRouting: boolean
  topicField: string
  topicPrompts: Record<string, TopicPromptConfig>
  bufferTtlMinutes?: number
  createdAt: string
  updatedAt: string
  lastActiveAt?: string
}

// @group Types : Persistent buffer message returned by GET /feeds/:id/buffer
export interface FeedMessage {
  _id: string
  feedId: string
  data: unknown
  eventName: string
  timestamp: string
  expiresAt: string
}

export interface SubscriptionSettings {
  notifications: boolean
  autoConnect: boolean
}

export interface UserSubscription {
  _id: string
  userId: string
  feedId: string
  subscribedAt: string
  isActive: boolean
  customPrompt: string
  settings?: SubscriptionSettings
  feed?: WebSocketFeed
}

export interface CreateFeedPayload {
  name: string
  description: string
  url: string
  category: string
  icon?: string
  isPublic: boolean
  connectionType: ConnectionType
  queryParams?: KeyValue[]
  headers?: KeyValue[]
  connectionMessages?: string[]
  eventName?: string
  dataFormat?: string
  reconnectionEnabled?: boolean
  reconnectionDelay?: number
  reconnectionAttempts?: number
  httpConfig?: HTTPPollingConfig
  tags?: string[]
  website?: string
  documentation?: string
  systemPrompt?: string
  defaultAIPrompt?: string
  aiAnalysisEnabled?: boolean
  enableTopicRouting?: boolean
  topicField?: string
  topicPrompts?: Record<string, TopicPromptConfig>
  bufferTtlMinutes?: number
}

export interface FeedCategory {
  key: string
  name: string
  description: string
  icon: string
}
