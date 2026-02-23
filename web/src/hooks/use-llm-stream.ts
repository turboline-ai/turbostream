// @group WebSocket : SSE streaming hook for LLM HTTP queries

import { useState, useRef, useCallback } from 'react'
import { llmApi } from '@/services/llm-api'
import type { LLMQueryRequest } from '@/types/llm'

interface UseLLMStreamResult {
  tokens: string
  isStreaming: boolean
  isComplete: boolean
  error: string | null
  startStream: (payload: LLMQueryRequest) => void
  stopStream: () => void
  reset: () => void
}

export function useLLMStream(): UseLLMStreamResult {
  const [tokens, setTokens] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const stopRef = useRef<(() => void) | null>(null)

  const startStream = useCallback((payload: LLMQueryRequest) => {
    setTokens('')
    setIsStreaming(true)
    setIsComplete(false)
    setError(null)

    const stop = llmApi.streamQuery(
      payload,
      (token) => setTokens((prev) => prev + token),
      (_fullResponse) => {
        setIsStreaming(false)
        setIsComplete(true)
      },
      (err) => {
        setError(err)
        setIsStreaming(false)
      }
    )
    stopRef.current = stop
  }, [])

  const stopStream = useCallback(() => {
    stopRef.current?.()
    setIsStreaming(false)
  }, [])

  const reset = useCallback(() => {
    stopRef.current?.()
    setTokens('')
    setIsStreaming(false)
    setIsComplete(false)
    setError(null)
  }, [])

  return { tokens, isStreaming, isComplete, error, startStream, stopStream, reset }
}
