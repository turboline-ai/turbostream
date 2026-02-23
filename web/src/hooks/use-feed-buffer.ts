// @group BusinessLogic > FeedBuffer : Historical feed message buffer retrieval hook

import { useQuery } from '@tanstack/react-query'
import { marketplaceApi } from '@/services/marketplace-api'
import type { FeedMessage } from '@/types/feed'

interface UseFeedBufferOptions {
  since?: string
  limit?: number
}

interface UseFeedBufferResult {
  bufferedMessages: FeedMessage[]
  isLoading: boolean
  isError: boolean
  refetch: () => void
}

/**
 * Fetches historical buffered messages from GET /api/marketplace/feeds/:feedId/buffer.
 * Returns messages newest-first, up to `limit` (default 200).
 * Automatically re-fetches when feedId changes.
 */
export function useFeedBuffer(
  feedId: string | undefined,
  options?: UseFeedBufferOptions
): UseFeedBufferResult {
  const { data, isLoading, isError, refetch } = useQuery<FeedMessage[]>({
    queryKey: ['feed-buffer', feedId, options?.since, options?.limit],
    queryFn: () =>
      marketplaceApi.getFeedBuffer(feedId!, {
        since: options?.since,
        limit: options?.limit,
      }),
    enabled: !!feedId,
    staleTime: 30_000, // consider fresh for 30 s — buffer updates via WS in real-time
  })

  return {
    bufferedMessages: data ?? [],
    isLoading,
    isError,
    refetch,
  }
}
