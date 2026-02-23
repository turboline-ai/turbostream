// @group Types : API key types and scopes

export type APIKeyScope =
  | 'websocket:subscribe'
  | 'websocket:llm'
  | 'websocket:topic'
  | 'websocket:*'

export interface APIKey {
  id: string
  userId: string
  name: string
  prefix: string
  lastChars: string
  scopes: APIKeyScope[]
  isActive: boolean
  createdAt: string
  lastUsedAt?: string
  expiresAt?: string
}

export interface CreateAPIKeyPayload {
  name: string
  scopes: APIKeyScope[]
}

export interface CreateAPIKeyResponse {
  key: APIKey
  rawKey: string
}
