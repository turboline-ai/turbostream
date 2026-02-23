// @group WebSocket : Per-feed subscription, buffer hydration, and auto-analysis

import { useEffect, useCallback, useRef } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { wsClient } from '@/services/ws-client'
import { useWSStore } from '@/stores/ws-store'
import { useAuthStore } from '@/stores/auth-store'
import { marketplaceApi } from '@/services/marketplace-api'
import type { FeedDataEvent, LLMBroadcastEvent } from '@/types/ws'

// @group Constants > FeedStream : Stable empty arrays — avoids new reference on every render when no data exists
const EMPTY_FEED_MESSAGES: FeedDataEvent[] = []
const EMPTY_LLM_MESSAGES: LLMBroadcastEvent[] = []

export function useFeedStream(feedId: string | undefined) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const wsStatus = useWSStore((s) => s.status)

  // @group WebSocket > Selectors : useShallow prevents new reference when array contents unchanged
  const feedMessages = useWSStore(
    useShallow((s) => feedId ? (s.feedMessages[feedId] ?? EMPTY_FEED_MESSAGES) : EMPTY_FEED_MESSAGES)
  )
  const llmMessages = useWSStore(
    useShallow((s) => feedId ? (s.llmMessages[feedId] ?? EMPTY_LLM_MESSAGES) : EMPTY_LLM_MESSAGES)
  )

  const autoAnalysisEnabled = useWSStore((s) => feedId ? (s.autoAnalysisFeeds[feedId] ?? false) : false)
  const hydrateFromBuffer = useWSStore((s) => s.hydrateFromBuffer)
  const setAutoAnalysis = useWSStore((s) => s.setAutoAnalysis)

  // @group WebSocket > AutoAnalysis : Ref so cleanup closure always reads latest value
  const autoAnalysisRef = useRef(autoAnalysisEnabled)
  autoAnalysisRef.current = autoAnalysisEnabled

  // @group WebSocket > Buffer : Load recent buffer history when subscribing
  const loadBuffer = useCallback(async (id: string) => {
    try {
      const messages = await marketplaceApi.getFeedBuffer(id, { limit: 50 })
      if (messages.length === 0) return
      // Convert FeedMessage (buffer format) → FeedDataEvent (ws-store format)
      const events: FeedDataEvent[] = messages.map((m) => ({
        feedId: m.feedId,
        eventName: m.eventName,
        data: m.data,
        timestamp: m.timestamp,
      }))
      hydrateFromBuffer(id, events)
    } catch {
      // Buffer load is best-effort; silently ignore errors
    }
  }, [hydrateFromBuffer])

  // @group WebSocket > AutoAnalysis : Toggle auto-analysis on the backend and sync local state
  const toggleAutoAnalysis = useCallback((enabled: boolean) => {
    if (!feedId) return
    wsClient.toggleAutoAnalysis(feedId, enabled)
    setAutoAnalysis(feedId, enabled)
  }, [feedId, setAutoAnalysis])

  useEffect(() => {
    if (!feedId || !isAuthenticated || wsStatus !== 'authenticated') return

    wsClient.subscribeFeed(feedId)
    // Hydrate from buffer so user sees historical data immediately
    void loadBuffer(feedId)

    return () => {
      wsClient.unsubscribeFeed(feedId)
      // Disable auto-analysis when leaving the feed (read latest via ref)
      if (autoAnalysisRef.current) {
        wsClient.toggleAutoAnalysis(feedId, false)
      }
    }
  }, [feedId, isAuthenticated, wsStatus, loadBuffer])

  return { feedMessages, llmMessages, wsStatus, autoAnalysisEnabled, toggleAutoAnalysis }
}
