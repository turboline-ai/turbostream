// @group BusinessLogic > FeedDetail : Live feed stream viewer with LLM panel

import { useState, useRef, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { marketplaceApi } from '@/services/marketplace-api'
import { llmApi } from '@/services/llm-api'
import { useFeedStream } from '@/hooks/use-feed-stream'
import { useAuthStore } from '@/stores/auth-store'
import { wsClient } from '@/services/ws-client'
import { useWSStore } from '@/stores/ws-store'
import { StatusBadge, LiveBadge } from '@/components/shared/status-badge'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { formatRelative } from '@/utils/format'
import toast from 'react-hot-toast'
import { Brain, Trash2, Send, Users, Globe, Wifi, WifiOff, Loader2, Timer, Zap, ZapOff } from 'lucide-react'

// @group Utilities > FeedDetail : Generate a random request ID for LLM stream tracking
function generateId() {
  return Math.random().toString(36).slice(2, 12)
}

// @group Types > FeedDetail : Track question alongside requestId for display
interface QueryEntry {
  requestId: string
  question: string
}

export function FeedDetailPage() {
  const { id } = useParams<{ id: string }>()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const queryClient = useQueryClient()

  const [question, setQuestion] = useState('')
  const [isQuerying, setIsQuerying] = useState(false)
  // @group BusinessLogic > FeedDetail > StreamScoping : Track the current request ID to scope stream display
  const [activeRequestId, setActiveRequestId] = useState<string | null>(null)
  const [queryHistory, setQueryHistory] = useState<QueryEntry[]>([])

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const llmEndRef = useRef<HTMLDivElement>(null)

  // @group APIEndpoints > FeedDetail : Fetch feed details + subscriptions
  const { data: feed, isLoading } = useQuery({
    queryKey: ['feed', id],
    queryFn: () => marketplaceApi.getFeed(id!),
    enabled: !!id,
  })

  const { data: subscriptions = [] } = useQuery({
    queryKey: ['subscriptions'],
    queryFn: marketplaceApi.getSubscriptions,
    enabled: isAuthenticated,
  })

  const isSubscribed = subscriptions.some((s) => s.feedId === id)

  // @group WebSocket > FeedDetail : Subscribe to live feed stream + get messages
  const { feedMessages, llmMessages, wsStatus, autoAnalysisEnabled, toggleAutoAnalysis } = useFeedStream(isSubscribed ? id : undefined)

  const llmStreams = useWSStore((s) => s.llmStreams)
  const clearFeedMessages = useWSStore((s) => s.clearFeedMessages)

  // @group BusinessLogic > FeedDetail > StreamScoping : Get current request's stream (scoped, not global first-key)
  const activeStream = activeRequestId ? (llmStreams[activeRequestId] ?? null) : null

  // @group BusinessLogic > FeedDetail > StreamCompletion : Reactively watch stream completion (replaces setInterval polling)
  useEffect(() => {
    if (!activeRequestId) return
    const stream = llmStreams[activeRequestId]
    if (stream?.isComplete) {
      setIsQuerying(false)
    }
  }, [llmStreams, activeRequestId])

  // @group BusinessLogic > FeedDetail > AutoScroll : Auto-scroll feed messages on new data
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [feedMessages.length])

  useEffect(() => {
    llmEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [llmMessages.length, activeStream?.tokens])

  // @group APIEndpoints > FeedDetail > Subscriptions : Subscribe/unsubscribe mutations
  const subscribeMutation = useMutation({
    mutationFn: () => marketplaceApi.subscribe(id!),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['subscriptions'] })
      toast.success('Subscribed!')
    },
  })

  const unsubscribeMutation = useMutation({
    mutationFn: () => marketplaceApi.unsubscribe(id!),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['subscriptions'] })
      toast.success('Unsubscribed')
    },
  })

  const clearContextMutation = useMutation({
    mutationFn: () => llmApi.clearContext(id!),
    onSuccess: () => toast.success('Context cleared'),
  })

  // @group BusinessLogic > FeedDetail > ManualQuery : Send LLM stream query via WebSocket
  const handleLLMQuery = () => {
    if (!question.trim() || !id) return
    const requestId = generateId()
    const trimmedQuestion = question.trim()
    setActiveRequestId(requestId)
    setQueryHistory((prev) => [...prev, { requestId, question: trimmedQuestion }])
    setIsQuerying(true)
    setQuestion('')
    wsClient.queryLLMStream({
      feedId: id,
      question: trimmedQuestion,
      requestId,
      provider: undefined,
    })
  }

  if (isLoading) return <LoadingSpinner fullPage />
  if (!feed) return <p className="text-center text-muted-foreground py-12">Feed not found.</p>

  // @group BusinessLogic > FeedDetail > WSStatus : Map WS status to indicator icon
  const wsIndicator = () => {
    if (wsStatus === 'authenticated' || wsStatus === 'connected') {
      return <Wifi className="h-3.5 w-3.5 text-green-500" />
    }
    if (wsStatus === 'connecting') {
      return <Loader2 className="h-3.5 w-3.5 text-yellow-500 animate-spin" />
    }
    return <WifiOff className="h-3.5 w-3.5 text-muted-foreground" />
  }

  // @group BusinessLogic > FeedDetail > QueryLookup : Resolve question for a given requestId
  const getQuestion = (requestId: string) =>
    queryHistory.find((q) => q.requestId === requestId)?.question ?? ''

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            {feed.icon && <span className="text-3xl">{feed.icon}</span>}
            <div>
              <h1 className="text-2xl font-bold">{feed.name}</h1>
              <p className="text-sm text-muted-foreground">by {feed.ownerName}</p>
            </div>
          </div>
          <p className="mt-2 text-muted-foreground">{feed.description}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <StatusBadge isActive={feed.isActive} isVerified={feed.isVerified} isPublic={feed.isPublic} />
            {isSubscribed && <LiveBadge />}
            <Badge variant="secondary">
              <Users className="h-3 w-3 mr-1" />
              {feed.subscriberCount} subscribers
            </Badge>
            {feed.website && (
              <a href={feed.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary">
                <Globe className="h-3 w-3" /> Website
              </a>
            )}
          </div>
        </div>

        {isAuthenticated && (
          <Button
            variant={isSubscribed ? 'outline' : 'default'}
            onClick={() => isSubscribed ? unsubscribeMutation.mutate() : subscribeMutation.mutate()}
            disabled={subscribeMutation.isPending || unsubscribeMutation.isPending}
          >
            {isSubscribed ? 'Unsubscribe' : 'Subscribe to stream'}
          </Button>
        )}
      </div>

      {/* Main content grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Live data panel */}
        <Card className="flex flex-col">
          <CardHeader className="flex-row items-center justify-between pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              Live Data
              {isSubscribed && wsIndicator()}
              {feedMessages.length > 0 && (
                <Badge variant="secondary" className="text-xs">{feedMessages.length}</Badge>
              )}
            </CardTitle>
            <div className="flex items-center gap-1">
              {isSubscribed && <LiveBadge />}
              {feedMessages.length > 0 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  title="Clear messages"
                  onClick={() => id && clearFeedMessages(id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="flex-1 p-0">
            <ScrollArea className="h-96 px-4 pb-4">
              {feedMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                  <p className="text-sm text-muted-foreground">
                    {isSubscribed ? 'Waiting for data...' : 'Subscribe to view live data'}
                  </p>
                  {!isSubscribed && isAuthenticated && (
                    <Button
                      size="sm"
                      onClick={() => subscribeMutation.mutate()}
                      disabled={subscribeMutation.isPending}
                    >
                      Subscribe to stream
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-2 pt-2">
                  {feedMessages.map((msg, i) => (
                    <div key={i} className="rounded-md border bg-muted/30 p-2">
                      <p className="text-xs text-muted-foreground mb-1">{formatRelative(msg.timestamp)}</p>
                      <pre className="text-xs overflow-x-auto whitespace-pre-wrap break-all">
                        {typeof msg.data === 'string' ? msg.data : JSON.stringify(msg.data, null, 2)}
                      </pre>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* AI / LLM panel */}
        <Card className="flex flex-col">
          <CardHeader className="flex-row items-center justify-between pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Brain className="h-4 w-4" /> AI Analysis
              {autoAnalysisEnabled && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 text-green-600 border-green-500/40 bg-green-500/10">
                  Auto ON
                </Badge>
              )}
            </CardTitle>
            {isAuthenticated && isSubscribed && (
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  title={autoAnalysisEnabled ? 'Disable auto-analysis' : 'Enable auto-analysis'}
                  onClick={() => toggleAutoAnalysis(!autoAnalysisEnabled)}
                >
                  {autoAnalysisEnabled
                    ? <Zap className="h-3.5 w-3.5 text-green-500" />
                    : <ZapOff className="h-3.5 w-3.5 text-muted-foreground" />
                  }
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => clearContextMutation.mutate()} title="Clear AI context">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent className="flex-1 flex flex-col gap-3 p-4">
            <ScrollArea className="flex-1 h-60">
              <div className="space-y-2">
                {/* Auto-analysis messages (llm-broadcast + llm-intelligence) */}
                {llmMessages.map((msg, i) => (
                  <div key={i} className="rounded-md border bg-primary/5 p-2">
                    <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                      {msg.topic && (
                        <>
                          <Timer className="h-3 w-3" />
                          <span className="font-medium text-foreground/70">{msg.topic}</span>
                          <span>·</span>
                        </>
                      )}
                      <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">Auto</Badge>
                      <span>{msg.provider}</span>
                      <span>·</span>
                      <span>{formatRelative(msg.timestamp)}</span>
                    </p>
                    <p className="text-sm whitespace-pre-wrap">{msg.answer ?? msg.analysis ?? ''}</p>
                  </div>
                ))}

                {/* Active streaming response */}
                {activeStream && (
                  <div className="rounded-md border border-primary/30 bg-primary/5 p-2">
                    <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                      <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">Manual</Badge>
                      {activeRequestId && getQuestion(activeRequestId) && (
                        <span className="italic truncate max-w-[180px]">{getQuestion(activeRequestId)}</span>
                      )}
                    </p>
                    <p className="text-sm whitespace-pre-wrap">
                      {activeStream.tokens}
                      {!activeStream.isComplete && <span className="animate-pulse">▋</span>}
                    </p>
                  </div>
                )}

                {llmMessages.length === 0 && !activeStream && (
                  <p className="text-center text-muted-foreground text-sm py-8">
                    AI responses will appear here
                  </p>
                )}
                <div ref={llmEndRef} />
              </div>
            </ScrollArea>

            {isAuthenticated && isSubscribed && (
              <>
                <Separator />
                <div className="flex gap-2">
                  <Textarea
                    placeholder="Ask the AI about this feed's data..."
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    className="min-h-[60px] resize-none flex-1"
                    disabled={isQuerying}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleLLMQuery()
                      }
                    }}
                  />
                  <Button
                    size="icon"
                    onClick={handleLLMQuery}
                    disabled={!question.trim() || isQuerying}
                  >
                    {isQuerying
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : <Send className="h-4 w-4" />
                    }
                  </Button>
                </div>
              </>
            )}

            {isAuthenticated && !isSubscribed && (
              <p className="text-xs text-center text-muted-foreground">
                Subscribe to this feed to use AI analysis
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tags */}
      {feed.tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {feed.tags.map((tag) => (
            <Badge key={tag} variant="outline">{tag}</Badge>
          ))}
        </div>
      )}
    </div>
  )
}
