// @group BusinessLogic > MyFeeds : User's owned feed management

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { marketplaceApi } from '@/services/marketplace-api'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { StatusBadge } from '@/components/shared/status-badge'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle
} from '@/components/ui/dialog'
import { editFeedPath, ROUTES } from '@/config/routes'
import { formatNumber, formatRelative } from '@/utils/format'
import toast from 'react-hot-toast'
import { Plus, Edit, Trash2, Users, Play, Square } from 'lucide-react'
import { useState } from 'react'
import type { WebSocketFeed } from '@/types/feed'

// @group Utilities > MyFeeds : Feed type label helpers
const CONNECTION_TYPE_LABELS: Record<string, string> = {
  websocket: 'WS',
  socketio: 'Socket.IO',
  'http-polling': 'HTTP',
  protobuf: 'Protobuf',
}

export function MyFeedsPage() {
  const queryClient = useQueryClient()
  const [deleteTarget, setDeleteTarget] = useState<WebSocketFeed | null>(null)

  const { data: feeds = [], isLoading } = useQuery({
    queryKey: ['my-feeds'],
    queryFn: marketplaceApi.getMyFeeds,
  })

  const deleteMutation = useMutation({
    mutationFn: (feedId: string) => marketplaceApi.deleteFeed(feedId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['my-feeds'] })
      toast.success('Feed deleted')
      setDeleteTarget(null)
    },
    onError: () => toast.error('Failed to delete feed'),
  })

  const startMutation = useMutation({
    mutationFn: (feedId: string) => marketplaceApi.startFeed(feedId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['my-feeds'] })
      toast.success('Feed started')
    },
    onError: () => toast.error('Failed to start feed'),
  })

  const stopMutation = useMutation({
    mutationFn: (feedId: string) => marketplaceApi.stopFeed(feedId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['my-feeds'] })
      toast.success('Feed stopped')
    },
    onError: () => toast.error('Failed to stop feed'),
  })

  if (isLoading) return <LoadingSpinner fullPage />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Feeds</h1>
          <p className="text-muted-foreground">Manage your data feeds</p>
        </div>
        <Button asChild>
          <Link to={ROUTES.CREATE_FEED}>
            <Plus className="h-4 w-4" />
            New feed
          </Link>
        </Button>
      </div>

      {feeds.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
          <p className="text-muted-foreground">You haven't created any feeds yet.</p>
          <Button asChild>
            <Link to={ROUTES.CREATE_FEED}>Create your first feed</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {feeds.map((feed) => (
            <Card key={feed._id} className="flex flex-col">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {feed.icon && <span className="text-xl">{feed.icon}</span>}
                    <CardTitle className="text-base">{feed.name}</CardTitle>
                  </div>
                  <StatusBadge isActive={feed.isActive} />
                </div>
              </CardHeader>
              <CardContent className="flex-1">
                <p className="text-sm text-muted-foreground line-clamp-2">{feed.description}</p>
                <div className="mt-3 flex flex-wrap gap-1">
                  {feed.category && <Badge variant="secondary">{feed.category}</Badge>}
                  {feed.connectionType && (
                    <Badge variant="outline" className="font-mono text-xs">
                      {CONNECTION_TYPE_LABELS[feed.connectionType] ?? feed.connectionType}
                    </Badge>
                  )}
                  <Badge variant="outline">
                    <Users className="h-3 w-3 mr-1" />
                    {formatNumber(feed.subscriberCount)}
                  </Badge>
                </div>
                {feed.lastActiveAt && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Last active {formatRelative(feed.lastActiveAt)}
                  </p>
                )}
              </CardContent>
              <CardFooter className="gap-2 pt-2 border-t">
                <Button size="sm" variant="outline" className="flex-1" asChild>
                  <Link to={editFeedPath(feed._id)}>
                    <Edit className="h-3 w-3 mr-1" /> Edit
                  </Link>
                </Button>
                <Button
                  size="sm"
                  variant={feed.isActive ? 'secondary' : 'default'}
                  onClick={() =>
                    feed.isActive
                      ? stopMutation.mutate(feed._id)
                      : startMutation.mutate(feed._id)
                  }
                  disabled={startMutation.isPending || stopMutation.isPending}
                  title={feed.isActive ? 'Stop feed' : 'Start feed'}
                >
                  {feed.isActive ? (
                    <Square className="h-3 w-3" />
                  ) : (
                    <Play className="h-3 w-3" />
                  )}
                </Button>
                <Button size="sm" variant="destructive" onClick={() => setDeleteTarget(feed)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Single delete confirmation dialog — outside the map to avoid event propagation bugs */}
      <Dialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete feed</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deleteTarget?.name}"? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => deleteMutation.mutate(deleteTarget!._id)}
              disabled={deleteMutation.isPending}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
