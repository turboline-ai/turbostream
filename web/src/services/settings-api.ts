// @group APIEndpoints > Settings : Category and settings endpoint calls

import { apiClient } from './api-client'
import type { ApiResponse } from '@/types/api'
import type { FeedCategory } from '@/types/feed'

export const settingsApi = {
  getCategories: async () => {
    const { data } = await apiClient.get<ApiResponse<FeedCategory[]>>('/api/settings/categories')
    return data.data ?? []
  },

  getCategory: async (key: string) => {
    const { data } = await apiClient.get<ApiResponse<FeedCategory>>(`/api/settings/categories/${key}`)
    return data.data!
  },
}
