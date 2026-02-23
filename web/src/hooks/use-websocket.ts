// @group WebSocket : Global WS lifecycle hook — mount at app root

import { useEffect } from 'react'
import { wsClient } from '@/services/ws-client'
import { useWSStore } from '@/stores/ws-store'
import { useAuthStore } from '@/stores/auth-store'
import type { FeedDataEvent, LLMBroadcastEvent, LLMTokenEvent, LLMCompleteEvent, TokenUsageUpdateEvent } from '@/types/ws'

export function useWebSocket() {
  const { token, user, isAuthenticated } = useAuthStore()
  const { setStatus, addFeedMessage, addLLMMessage, appendLLMToken, completeLLMStream, setTokenUsage, setAutoAnalysis } = useWSStore()

  useEffect(() => {
    // Connect WS when authenticated
    const unsubStatus = wsClient.onStatusChange(setStatus)

    if (isAuthenticated && token && user) {
      wsClient.connect(token, user._id)
    }

    // @group WebSocket > MessageRouting : Route inbound messages to store
    const unsubFeedData = wsClient.on('feed-data', (payload) => {
      addFeedMessage((payload as FeedDataEvent).feedId, payload as FeedDataEvent)
    })

    const unsubLLMBroadcast = wsClient.on('llm-broadcast', (payload) => {
      addLLMMessage((payload as LLMBroadcastEvent).feedId, payload as LLMBroadcastEvent)
    })

    const unsubLLMIntelligence = wsClient.on('llm-intelligence', (payload) => {
      addLLMMessage((payload as LLMBroadcastEvent).feedId, payload as LLMBroadcastEvent)
    })

    const unsubLLMToken = wsClient.on('llm-token', (payload) => {
      const event = payload as LLMTokenEvent
      appendLLMToken(event.requestId, event.token)
    })

    const unsubLLMComplete = wsClient.on('llm-complete', (payload) => {
      const event = payload as LLMCompleteEvent
      completeLLMStream(event.requestId, event.answer)
    })

    const unsubTokenUsage = wsClient.on('token-usage-update', (payload) => {
      setTokenUsage(payload as TokenUsageUpdateEvent)
    })

    // @group WebSocket > AutoAnalysis : Sync auto-analysis state confirmed by backend
    const unsubAutoAnalysis = wsClient.on('auto-analysis-toggled', (payload) => {
      const event = payload as { feedId: string; enabled: boolean }
      setAutoAnalysis(event.feedId, event.enabled)
    })

    return () => {
      unsubStatus()
      unsubFeedData()
      unsubLLMBroadcast()
      unsubLLMIntelligence()
      unsubLLMToken()
      unsubLLMComplete()
      unsubTokenUsage()
      unsubAutoAnalysis()
    }
  }, [isAuthenticated, token, user?._id])

  return useWSStore((s) => s.status)
}
