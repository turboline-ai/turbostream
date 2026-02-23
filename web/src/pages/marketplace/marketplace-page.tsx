// @group BusinessLogic > Marketplace : Feed browsing, search, and subscription

import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { marketplaceApi } from '@/services/marketplace-api'
import { settingsApi } from '@/services/settings-api'
import { FeedCard } from '@/components/shared/feed-card'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuthStore } from '@/stores/auth-store'
import { useDebounce } from '@/hooks/use-debounce'
import toast from 'react-hot-toast'
import { Search } from 'lucide-react'

export function MarketplacePage() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('all')

  const debouncedSearch = useDebounce(search, 300)

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: settingsApi.getCategories,
    staleTime: 5 * 60_000,
  })

  const { data: allFeeds = [], isLoading: loadingAll } = useQuery({
    queryKey: ['feeds', selectedCategory],
    queryFn: () => marketplaceApi.listFeeds({ category: selectedCategory ?? undefined }),
    enabled: activeTab === 'all' && !debouncedSearch,
  })

  const { data: popularFeeds = [], isLoading: loadingPopular } = useQuery({
    queryKey: ['feeds-popular'],
    queryFn: marketplaceApi.getPopularFeeds,
    enabled: activeTab === 'popular',
  })

  const { data: recentFeeds = [], isLoading: loadingRecent } = useQuery({
    queryKey: ['feeds-recent'],
    queryFn: marketplaceApi.getRecentFeeds,
    enabled: activeTab === 'recent',
  })

  const { data: searchResults = [], isLoading: loadingSearch } = useQuery({
    queryKey: ['feeds-search', debouncedSearch],
    queryFn: () => marketplaceApi.searchFeeds(debouncedSearch),
    enabled: !!debouncedSearch,
  })

  const { data: subscriptions = [] } = useQuery({
    queryKey: ['subscriptions'],
    queryFn: marketplaceApi.getSubscriptions,
    enabled: isAuthenticated,
  })

  const subscribedFeedIds = new Set(subscriptions.map((s) => s.feedId))

  const subscribeMutation = useMutation({
    mutationFn: marketplaceApi.subscribe,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['subscriptions'] })
      toast.success('Subscribed successfully')
    },
    onError: () => toast.error('Failed to subscribe'),
  })

  const unsubscribeMutation = useMutation({
    mutationFn: marketplaceApi.unsubscribe,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['subscriptions'] })
      toast.success('Unsubscribed')
    },
    onError: () => toast.error('Failed to unsubscribe'),
  })

  const handleSubscribe = useCallback((feedId: string) => subscribeMutation.mutate(feedId), [subscribeMutation])
  const handleUnsubscribe = useCallback((feedId: string) => unsubscribeMutation.mutate(feedId), [unsubscribeMutation])

  const displayFeeds = debouncedSearch ? searchResults : (
    activeTab === 'popular' ? popularFeeds : activeTab === 'recent' ? recentFeeds : allFeeds
  )
  const isLoading = debouncedSearch ? loadingSearch : (
    activeTab === 'popular' ? loadingPopular : activeTab === 'recent' ? loadingRecent : loadingAll
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Marketplace</h1>
        <p className="text-muted-foreground">Browse and subscribe to real-time data feeds</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search feeds..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Category filters */}
      {!debouncedSearch && (
        <div className="flex flex-wrap gap-2">
          <Badge
            variant={selectedCategory === null ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setSelectedCategory(null)}
          >
            All
          </Badge>
          {categories.map((cat) => (
            <Badge
              key={cat.key}
              variant={selectedCategory === cat.key ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setSelectedCategory(cat.key)}
            >
              {cat.icon} {cat.name}
            </Badge>
          ))}
        </div>
      )}

      {/* Tabs (hidden when searching) */}
      {!debouncedSearch ? (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="popular">Popular</TabsTrigger>
            <TabsTrigger value="recent">Recent</TabsTrigger>
          </TabsList>

          {['all', 'popular', 'recent'].map((tab) => (
            <TabsContent key={tab} value={tab}>
              <FeedGrid
                feeds={displayFeeds}
                isLoading={isLoading}
                subscribedFeedIds={subscribedFeedIds}
                isAuthenticated={isAuthenticated}
                onSubscribe={handleSubscribe}
                onUnsubscribe={handleUnsubscribe}
              />
            </TabsContent>
          ))}
        </Tabs>
      ) : (
        <FeedGrid
          feeds={displayFeeds}
          isLoading={isLoading}
          subscribedFeedIds={subscribedFeedIds}
          isAuthenticated={isAuthenticated}
          onSubscribe={handleSubscribe}
          onUnsubscribe={handleUnsubscribe}
        />
      )}
    </div>
  )
}

// @group BusinessLogic > Marketplace > Components : Feed grid
interface FeedGridProps {
  feeds: import('@/types/feed').WebSocketFeed[]
  isLoading: boolean
  subscribedFeedIds: Set<string>
  isAuthenticated: boolean
  onSubscribe: (id: string) => void
  onUnsubscribe: (id: string) => void
}

function FeedGrid({ feeds, isLoading, subscribedFeedIds, isAuthenticated, onSubscribe, onUnsubscribe }: FeedGridProps) {
  if (isLoading) return <div className="flex justify-center py-12"><LoadingSpinner /></div>
  if (!feeds.length) return <p className="py-12 text-center text-muted-foreground">No feeds found.</p>

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mt-4">
      {feeds.map((feed) => (
        <FeedCard
          key={feed._id}
          feed={feed}
          isSubscribed={subscribedFeedIds.has(feed._id)}
          onSubscribe={isAuthenticated ? onSubscribe : undefined}
          onUnsubscribe={isAuthenticated ? onUnsubscribe : undefined}
        />
      ))}
    </div>
  )
}
