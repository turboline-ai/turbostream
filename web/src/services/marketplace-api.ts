// @group APIEndpoints > Marketplace : All /api/marketplace/* endpoint calls

import { apiClient } from './api-client'
import type { ApiResponse } from '@/types/api'
import type { WebSocketFeed, UserSubscription, CreateFeedPayload, FeedMessage } from '@/types/feed'

export const marketplaceApi = {
  // @group APIEndpoints > Marketplace > Public : Public feed browsing
  listFeeds: async (params?: { category?: string; page?: number; pageSize?: number }) => {
    const { data } = await apiClient.get<ApiResponse<WebSocketFeed[]>>('/api/marketplace/feeds', { params })
    return data.data ?? []
  },

  getPopularFeeds: async () => {
    const { data } = await apiClient.get<ApiResponse<WebSocketFeed[]>>('/api/marketplace/feeds/popular')
    return data.data ?? []
  },

  getRecentFeeds: async () => {
    const { data } = await apiClient.get<ApiResponse<WebSocketFeed[]>>('/api/marketplace/feeds/recent')
    return data.data ?? []
  },

  searchFeeds: async (query: string) => {
    const { data } = await apiClient.get<ApiResponse<WebSocketFeed[]>>('/api/marketplace/feeds/search', {
      params: { q: query },
    })
    return data.data ?? []
  },

  getFeed: async (feedId: string) => {
    const { data } = await apiClient.get<ApiResponse<WebSocketFeed>>(`/api/marketplace/feeds/${feedId}`)
    return data.data!
  },

  // @group APIEndpoints > Marketplace > Protected : Authenticated actions
  createFeed: async (payload: CreateFeedPayload) => {
    const { data } = await apiClient.post<ApiResponse<WebSocketFeed>>('/api/marketplace/feeds', payload)
    return data.data!
  },

  updateFeed: async (feedId: string, payload: Partial<CreateFeedPayload>) => {
    const { data } = await apiClient.put<ApiResponse<WebSocketFeed>>(`/api/marketplace/feeds/${feedId}`, payload)
    return data.data!
  },

  deleteFeed: async (feedId: string) => {
    const { data } = await apiClient.delete<ApiResponse>(`/api/marketplace/feeds/${feedId}`)
    return data
  },

  getMyFeeds: async () => {
    const { data } = await apiClient.get<ApiResponse<WebSocketFeed[]>>('/api/marketplace/my-feeds')
    return data.data ?? []
  },

  subscribe: async (feedId: string) => {
    const { data } = await apiClient.post<ApiResponse<UserSubscription>>(`/api/marketplace/subscribe/${feedId}`)
    return data.data!
  },

  unsubscribe: async (feedId: string) => {
    const { data } = await apiClient.post<ApiResponse>(`/api/marketplace/unsubscribe/${feedId}`)
    return data
  },

  getSubscriptions: async () => {
    const { data } = await apiClient.get<ApiResponse<UserSubscription[]>>('/api/marketplace/subscriptions')
    return data.data ?? []
  },

  updateSubscriptionSettings: async (feedId: string, settings: UserSubscription['settings']) => {
    const { data } = await apiClient.put<ApiResponse>(`/api/marketplace/subscriptions/${feedId}/settings`, settings)
    return data
  },

  submitFeedData: async (feedId: string, feedData: unknown) => {
    const { data } = await apiClient.post<ApiResponse>(`/api/marketplace/feeds/${feedId}/data`, feedData)
    return data
  },

  updateAIPrompt: async (feedId: string, prompt: string) => {
    const { data } = await apiClient.put<ApiResponse>(`/api/marketplace/feeds/${feedId}/ai-prompt`, { prompt })
    return data
  },

  testFeed: async (payload: { url: string; connectionType: string }) => {
    const { data } = await apiClient.post<ApiResponse>('/api/marketplace/test-feed', payload)
    return data
  },

  // @group APIEndpoints > Marketplace > FeedControl : Start/stop feed engine + buffer retrieval
  startFeed: async (feedId: string) => {
    const { data } = await apiClient.post<ApiResponse>(`/api/marketplace/feeds/${feedId}/start`)
    return data
  },

  stopFeed: async (feedId: string) => {
    const { data } = await apiClient.post<ApiResponse>(`/api/marketplace/feeds/${feedId}/stop`)
    return data
  },

  getFeedBuffer: async (feedId: string, options?: { since?: string; limit?: number }) => {
    const { data } = await apiClient.get<ApiResponse<FeedMessage[]>>(
      `/api/marketplace/feeds/${feedId}/buffer`,
      { params: options }
    )
    return data.data ?? []
  },
}
