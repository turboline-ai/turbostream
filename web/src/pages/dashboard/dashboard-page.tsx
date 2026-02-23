// @group BusinessLogic > Dashboard : Subscribed feeds overview

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { marketplaceApi } from '@/services/marketplace-api'
import { FeedCard } from '@/components/shared/feed-card'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { Button } from '@/components/ui/button'
import { Store } from 'lucide-react'
import toast from 'react-hot-toast'
import { ROUTES } from '@/config/routes'

export function DashboardPage() {
  const queryClient = useQueryClient()

  const { data: subscriptions = [], isLoading } = useQuery({
    queryKey: ['subscriptions'],
    queryFn: marketplaceApi.getSubscriptions,
  })

  const unsubscribeMutation = useMutation({
    mutationFn: marketplaceApi.unsubscribe,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['subscriptions'] })
      toast.success('Unsubscribed')
    },
    onError: () => toast.error('Failed to unsubscribe'),
  })

  if (isLoading) return <LoadingSpinner fullPage />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Your subscribed data feeds</p>
      </div>

      {subscriptions.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
          <Store className="h-12 w-12 text-muted-foreground" />
          <p className="text-muted-foreground">You haven't subscribed to any feeds yet.</p>
          <Button asChild>
            <Link to={ROUTES.MARKETPLACE}>Browse marketplace</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {subscriptions.map((sub) => {
            const feed = sub.feed
            if (!feed) return null
            return (
              <FeedCard
                key={sub._id}
                feed={feed}
                isSubscribed
                onUnsubscribe={(feedId) => unsubscribeMutation.mutate(feedId)}
                isLoading={unsubscribeMutation.isPending && unsubscribeMutation.variables === sub.feedId}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
