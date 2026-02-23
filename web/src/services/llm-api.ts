// @group APIEndpoints > LLM : All /api/llm/* endpoint calls

import { apiClient } from './api-client'
import type { ApiResponse } from '@/types/api'
import type { LLMProvider, LLMQueryRequest, LLMQueryResponse, LLMAnalyzeRequest, LLMContextResponse } from '@/types/llm'
import { API_URL } from '@/config/env'

// @group Constants > LLM : Human-readable display names for backend provider identifiers
const PROVIDER_DISPLAY_NAMES: Record<string, string> = {
  'azure-openai': 'Azure OpenAI',
  'openai': 'OpenAI',
  'anthropic': 'Anthropic Claude',
  'gemini': 'Google Gemini',
  'mistral': 'Mistral',
  'grok': 'xAI Grok',
  'ollama': 'Ollama (Local)',
}

export const llmApi = {
  // @group APIEndpoints > LLM > Providers : Get available LLM providers
  // Backend returns { enabled: bool, providers: string[] } — NOT ApiResponse<LLMProvider[]>.
  // We map the string array to LLMProvider objects with display names.
  getProviders: async (): Promise<LLMProvider[]> => {
    const { data } = await apiClient.get<{ enabled: boolean; providers: string[] }>('/api/llm/providers')
    if (!data.enabled || !data.providers?.length) return []
    return data.providers.map((name) => ({
      name,
      displayName: PROVIDER_DISPLAY_NAMES[name] ?? name,
      available: true,
      isDefault: false,
    }))
  },

  getContext: async (feedId: string) => {
    const { data } = await apiClient.get<ApiResponse<LLMContextResponse>>(`/api/llm/context/${feedId}`)
    return data.data!
  },

  clearContext: async (feedId: string) => {
    const { data } = await apiClient.delete<ApiResponse>(`/api/llm/context/${feedId}`)
    return data
  },

  query: async (payload: LLMQueryRequest) => {
    const { data } = await apiClient.post<LLMQueryResponse>('/api/llm/query', payload)
    return data
  },

  analyze: async (payload: LLMAnalyzeRequest) => {
    const { data } = await apiClient.post<LLMQueryResponse>('/api/llm/analyze', payload)
    return data
  },

  // @group APIEndpoints > LLM > Streaming : SSE streaming query
  streamQuery: (
    payload: LLMQueryRequest,
    onToken: (token: string) => void,
    onDone: (fullResponse: string) => void,
    onError: (err: string) => void
  ): (() => void) => {
    const raw = localStorage.getItem('turbostream-auth')
    let token = ''
    if (raw) {
      try {
        const state = JSON.parse(raw) as { state?: { token?: string } }
        token = state?.state?.token ?? ''
      } catch { /* ignore */ }
    }

    const url = `${API_URL}/api/llm/query/stream`
    let fullResponse = ''

    // SSE via fetch POST (EventSource only supports GET)
    const controller = new AbortController()
    fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    }).then(async (response) => {
      if (!response.ok) {
        onError(`HTTP ${response.status}`)
        return
      }
      const reader = response.body?.getReader()
      if (!reader) { onError('No response body'); return }
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const eventData = line.slice(6).trim()
            if (eventData === '[DONE]') {
              onDone(fullResponse)
              return
            }
            try {
              const parsed = JSON.parse(eventData) as { type?: string; token?: string; fullResponse?: string }
              if (parsed.type === 'token' && parsed.token) {
                fullResponse += parsed.token
                onToken(parsed.token)
              } else if (parsed.type === 'done') {
                onDone(parsed.fullResponse ?? fullResponse)
                return
              }
            } catch { /* skip malformed */ }
          }
        }
      }
      onDone(fullResponse)
    }).catch((err: unknown) => {
      if (err instanceof Error && err.name !== 'AbortError') {
        onError(err.message)
      }
    })

    return () => controller.abort()
  },
}
