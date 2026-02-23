// @group WebSocket : Real-time connection state and message buffers

import { create } from 'zustand'
import type { WSStatus, FeedDataEvent, LLMBroadcastEvent, TokenUsageUpdateEvent } from '@/types/ws'

const MAX_MESSAGES_PER_FEED = 100

interface LLMStreamState {
  tokens: string
  isComplete: boolean
}

interface WSState {
  status: WSStatus
  feedMessages: Record<string, FeedDataEvent[]>
  llmMessages: Record<string, LLMBroadcastEvent[]>
  llmStreams: Record<string, LLMStreamState>
  tokenUsage: TokenUsageUpdateEvent | null
  autoAnalysisFeeds: Record<string, boolean>

  setStatus: (status: WSStatus) => void
  addFeedMessage: (feedId: string, event: FeedDataEvent) => void
  addLLMMessage: (feedId: string, event: LLMBroadcastEvent) => void
  appendLLMToken: (requestId: string, token: string) => void
  completeLLMStream: (requestId: string, fullResponse: string) => void
  clearLLMStream: (requestId: string) => void
  setTokenUsage: (event: TokenUsageUpdateEvent) => void
  clearFeedMessages: (feedId: string) => void
  hydrateFromBuffer: (feedId: string, events: FeedDataEvent[]) => void
  setAutoAnalysis: (feedId: string, enabled: boolean) => void
}

export const useWSStore = create<WSState>()((set) => ({
  status: 'disconnected',
  feedMessages: {},
  llmMessages: {},
  llmStreams: {},
  tokenUsage: null,
  autoAnalysisFeeds: {},

  setStatus: (status) => set({ status }),

  addFeedMessage: (feedId, event) =>
    set((state) => {
      const existing = state.feedMessages[feedId] ?? []
      const updated = [...existing, event].slice(-MAX_MESSAGES_PER_FEED)
      return { feedMessages: { ...state.feedMessages, [feedId]: updated } }
    }),

  addLLMMessage: (feedId, event) =>
    set((state) => {
      const existing = state.llmMessages[feedId] ?? []
      const updated = [...existing, event].slice(-MAX_MESSAGES_PER_FEED)
      return { llmMessages: { ...state.llmMessages, [feedId]: updated } }
    }),

  appendLLMToken: (requestId, token) =>
    set((state) => {
      const existing = state.llmStreams[requestId] ?? { tokens: '', isComplete: false }
      return {
        llmStreams: {
          ...state.llmStreams,
          [requestId]: { tokens: existing.tokens + token, isComplete: false },
        },
      }
    }),

  completeLLMStream: (requestId, fullResponse) =>
    set((state) => ({
      llmStreams: {
        ...state.llmStreams,
        [requestId]: { tokens: fullResponse, isComplete: true },
      },
    })),

  clearLLMStream: (requestId) =>
    set((state) => {
      const { [requestId]: _, ...rest } = state.llmStreams
      return { llmStreams: rest }
    }),

  setTokenUsage: (event) => set({ tokenUsage: event }),

  clearFeedMessages: (feedId) =>
    set((state) => {
      const { [feedId]: _, ...rest } = state.feedMessages
      return { feedMessages: rest }
    }),

  // @group WebSocket > Buffer : Hydrate feed messages from backend buffer (dedup by timestamp)
  hydrateFromBuffer: (feedId, events) =>
    set((state) => {
      const existing = state.feedMessages[feedId] ?? []
      const existingTs = new Set(existing.map((e) => e.timestamp))
      const newEvents = events.filter((e) => !existingTs.has(e.timestamp))
      if (newEvents.length === 0) return state
      // Buffer comes newest-first; reverse to chronological, then prepend before live messages
      const merged = [...newEvents.reverse(), ...existing].slice(-MAX_MESSAGES_PER_FEED)
      return { feedMessages: { ...state.feedMessages, [feedId]: merged } }
    }),

  setAutoAnalysis: (feedId, enabled) =>
    set((state) => ({
      autoAnalysisFeeds: { ...state.autoAnalysisFeeds, [feedId]: enabled },
    })),
}))
