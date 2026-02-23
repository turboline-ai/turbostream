// @group BusinessLogic : Reusable feed card for marketplace and dashboard

import { Link } from 'react-router-dom'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { StatusBadge } from './status-badge'
import { formatNumber, formatRelative } from '@/utils/format'
import { feedDetailPath } from '@/config/routes'
import { Users, Clock, Tag } from 'lucide-react'
import type { WebSocketFeed } from '@/types/feed'

interface FeedCardProps {
  feed: WebSocketFeed
  isSubscribed?: boolean
  onSubscribe?: (feedId: string) => void
  onUnsubscribe?: (feedId: string) => void
  isLoading?: boolean
}

export function FeedCard({ feed, isSubscribed, onSubscribe, onUnsubscribe, isLoading }: FeedCardProps) {
  return (
    <Card className="flex flex-col transition-colors hover:border-primary/50">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            {feed.icon && <span className="text-2xl">{feed.icon}</span>}
            <div>
              <CardTitle className="text-base">
                <Link to={feedDetailPath(feed._id)} className="hover:text-primary transition-colors">
                  {feed.name}
                </Link>
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">by {feed.ownerName}</p>
            </div>
          </div>
          <StatusBadge isVerified={feed.isVerified} />
        </div>
      </CardHeader>

      <CardContent className="flex-1 pb-3">
        <p className="text-sm text-muted-foreground line-clamp-2">{feed.description}</p>

        <div className="mt-3 flex flex-wrap gap-1">
          {feed.category && <Badge variant="secondary">{feed.category}</Badge>}
          {feed.tags?.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs">
              <Tag className="h-2.5 w-2.5 mr-1" />
              {tag}
            </Badge>
          ))}
        </div>
      </CardContent>

      <CardFooter className="flex items-center justify-between pt-2 border-t">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {formatNumber(feed.subscriberCount)}
          </span>
          {feed.lastActiveAt && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatRelative(feed.lastActiveAt)}
            </span>
          )}
        </div>

        {(onSubscribe || onUnsubscribe) && (
          <Button
            size="sm"
            variant={isSubscribed ? 'outline' : 'default'}
            disabled={isLoading}
            onClick={() => isSubscribed ? onUnsubscribe?.(feed._id) : onSubscribe?.(feed._id)}
          >
            {isSubscribed ? 'Unsubscribe' : 'Subscribe'}
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}
