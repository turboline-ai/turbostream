// @group Types : LLM query and provider types

export interface LLMProvider {
  name: string
  displayName: string
  available: boolean
  isDefault: boolean
}

export interface LLMQueryRequest {
  feedId: string
  question: string
  provider?: string
  maxTokens?: number
}

export interface LLMQueryResponse {
  success: boolean
  response: string
  provider: string
  tokensUsed: number
  feedId: string
}

export interface LLMAnalyzeRequest {
  feedId: string
  provider?: string
}

export interface LLMContextResponse {
  feedId: string
  entries: unknown[]
  count: number
  limit: number
}
