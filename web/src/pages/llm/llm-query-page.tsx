// @group BusinessLogic > LLM : AI Query page — 2-panel live data + AI chat

import { useState, useRef, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { marketplaceApi } from '@/services/marketplace-api'
import { llmApi } from '@/services/llm-api'
import { wsClient } from '@/services/ws-client'
import { useWSStore } from '@/stores/ws-store'
import { useFeedStream } from '@/hooks/use-feed-stream'
import { useFeedBuffer } from '@/hooks/use-feed-buffer'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Send, Square, Trash2, Brain, Radio, Zap, Clock, MessageSquare,
} from 'lucide-react'
import { cn } from '@/utils/cn'

// @group Utilities > LLM : Generate unique request IDs
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

// @group Utilities > LLM : Format timestamp for display
function formatTime(ts: string | undefined): string {
  if (!ts) return ''
  try {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  } catch {
    return ''
  }
}

// @group Utilities > LLM : WS status indicator
const STATUS_DOT: Record<string, string> = {
  authenticated: 'bg-green-500',
  connected: 'bg-yellow-500',
  connecting: 'bg-yellow-400 animate-pulse',
  disconnected: 'bg-red-500',
  error: 'bg-red-500',
}

export function LLMQueryPage() {
  // @group BusinessLogic > LLM > Selection : Feed and provider state
  const [selectedFeedId, setSelectedFeedId] = useState('')
  const [selectedProvider, setSelectedProvider] = useState('')
  const [question, setQuestion] = useState('')
  const [autoAnalysis, setAutoAnalysis] = useState(false)
  const [activeRequestId, setActiveRequestId] = useState<string | null>(null)

  const llmStreams = useWSStore((s) => s.llmStreams)
  const clearFeedMessages = useWSStore((s) => s.clearFeedMessages)

  // @group BusinessLogic > LLM > Stream : Active streaming state
  const activeStream = activeRequestId ? llmStreams[activeRequestId] : null
  const isStreaming = !!activeStream && !activeStream.isComplete
  const clearLLMStream = useWSStore((s) => s.clearLLMStream)

  const dataEndRef = useRef<HTMLDivElement>(null)
  const aiEndRef = useRef<HTMLDivElement>(null)

  // @group BusinessLogic > LLM > Queries : Feed and provider data
  const { data: subscriptions = [] } = useQuery({
    queryKey: ['subscriptions'],
    queryFn: marketplaceApi.getSubscriptions,
  })

  const { data: allFeeds = [] } = useQuery({
    queryKey: ['feeds'],
    queryFn: () => marketplaceApi.listFeeds(),
  })

  const feedMap = new Map(allFeeds.map((f) => [f._id, f]))

  const { data: providers = [] } = useQuery({
    queryKey: ['llm-providers'],
    queryFn: llmApi.getProviders,
  })

  // @group BusinessLogic > LLM > LiveData : WebSocket feed stream
  const { feedMessages, llmMessages, wsStatus } = useFeedStream(selectedFeedId || undefined)

  // @group BusinessLogic > LLM > Buffer : Historical messages
  const { bufferedMessages } = useFeedBuffer(selectedFeedId || undefined)

  // @group BusinessLogic > LLM > AutoScroll : Scroll to bottom on new messages
  useEffect(() => {
    dataEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [feedMessages])

  useEffect(() => {
    aiEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [llmMessages, activeStream?.tokens])

  // @group BusinessLogic > LLM > StreamCompletion : Detect stream complete
  useEffect(() => {
    if (activeStream?.isComplete) {
      setActiveRequestId(null)
    }
  }, [activeStream?.isComplete])

  // @group BusinessLogic > LLM > AutoAnalysis : Toggle on server when changed
  useEffect(() => {
    if (!selectedFeedId) return
    wsClient.toggleAutoAnalysis(selectedFeedId, autoAnalysis)
  }, [autoAnalysis, selectedFeedId])

  // @group BusinessLogic > LLM > FeedChange : Reset state on feed change
  const handleFeedChange = (val: string) => {
    setSelectedFeedId(val)
    setAutoAnalysis(false)
    setActiveRequestId(null)
    if (activeRequestId) clearLLMStream(activeRequestId)
  }

  // @group BusinessLogic > LLM > Query : Send manual query over WS
  const handleQuery = () => {
    if (!question.trim() || !selectedFeedId || isStreaming) return
    const requestId = generateRequestId()
    setActiveRequestId(requestId)
    wsClient.queryLLMStream({
      feedId: selectedFeedId,
      question: question.trim(),
      provider: selectedProvider || undefined,
      requestId,
    })
    setQuestion('')
  }

  const handleStopStream = () => {
    if (activeRequestId) {
      clearLLMStream(activeRequestId)
      setActiveRequestId(null)
    }
  }

  const handleClearData = () => {
    if (selectedFeedId) clearFeedMessages(selectedFeedId)
  }

  const selectedFeed = feedMap.get(selectedFeedId)

  // Combine buffered (historical) + live messages, deduplicated by timestamp
  const allDataMessages = [
    ...bufferedMessages.map((m) => ({
      timestamp: m.timestamp,
      data: m.data,
      topic: undefined as string | undefined,
      source: 'buffer' as const,
    })),
    ...feedMessages.map((m) => ({
      timestamp: m.timestamp,
      data: m.data,
      topic: m.topic,
      source: 'live' as const,
    })),
  ].slice(-200) // cap at 200 total

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] gap-0">
      {/* @group Navigation > LLM > Header : Top bar with controls */}
      <div className="flex items-center gap-3 px-4 py-3 border-b bg-card shrink-0 flex-wrap">
        <Brain className="h-5 w-5 text-primary shrink-0" />
        <h1 className="font-bold text-lg shrink-0">AI Query</h1>

        {/* Feed selector */}
        <div className="flex-1 min-w-[180px] max-w-xs">
          <Select value={selectedFeedId} onValueChange={handleFeedChange}>
            <SelectTrigger className="h-8 text-sm">
              {selectedFeed ? (
                <span className="flex items-center gap-1 truncate">
                  {selectedFeed.icon && <span>{selectedFeed.icon}</span>}
                  <span className="truncate">{selectedFeed.name}</span>
                </span>
              ) : (
                <SelectValue placeholder="Select a feed…" />
              )}
            </SelectTrigger>
            <SelectContent>
              {subscriptions.map((sub) => {
                const feed = sub.feed ?? feedMap.get(sub.feedId)
                return (
                  <SelectItem key={sub.feedId} value={sub.feedId}>
                    <span className="flex items-center gap-2">
                      {feed?.icon && <span>{feed.icon}</span>}
                      <span>{feed?.name ?? sub.feedId}</span>
                    </span>
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
        </div>

        {/* WS status indicator */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
          <span className={cn('h-2 w-2 rounded-full', STATUS_DOT[wsStatus] ?? 'bg-muted')} />
          <span className="capitalize">{wsStatus}</span>
        </div>

        {/* Auto-analysis toggle */}
        {selectedFeedId && (
          <div className="flex items-center gap-2 ml-auto shrink-0">
            <Zap className="h-4 w-4 text-yellow-500" />
            <Label className="text-sm cursor-pointer">Auto-analysis</Label>
            <Switch
              checked={autoAnalysis}
              onCheckedChange={setAutoAnalysis}
              disabled={!selectedFeedId}
            />
          </div>
        )}
      </div>

      {/* Empty state */}
      {subscriptions.length === 0 && (
        <div className="flex-1 flex items-center justify-center">
          <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground max-w-sm">
            You have no subscribed feeds yet. Subscribe to feeds from the{' '}
            <a href="/marketplace" className="underline hover:text-foreground">Marketplace</a>{' '}
            to query them with AI.
          </div>
        </div>
      )}

      {/* @group BusinessLogic > LLM > Panels : 2-panel split layout */}
      {subscriptions.length > 0 && (
        <div className="flex flex-1 overflow-hidden">
          {/* Left panel — Live data */}
          <div className="flex flex-col w-1/2 border-r overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30 shrink-0">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Radio className="h-4 w-4 text-primary" />
                Live Data
                {allDataMessages.length > 0 && (
                  <Badge variant="secondary" className="text-xs">{allDataMessages.length}</Badge>
                )}
              </div>
              {feedMessages.length > 0 && (
                <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={handleClearData}>
                  <Trash2 className="h-3 w-3 mr-1" /> Clear
                </Button>
              )}
            </div>

            <ScrollArea className="flex-1 px-3 py-2">
              {!selectedFeedId ? (
                <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
                  Select a feed to see live data
                </div>
              ) : allDataMessages.length === 0 ? (
                <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
                  Waiting for data…
                </div>
              ) : (
                <div className="space-y-2">
                  {allDataMessages.map((msg, i) => (
                    <div
                      key={i}
                      className={cn(
                        'rounded-md border p-2 text-xs font-mono',
                        msg.source === 'buffer'
                          ? 'bg-muted/50 border-muted'
                          : 'bg-card border-border'
                      )}
                    >
                      <div className="flex items-center gap-2 mb-1 text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>{formatTime(msg.timestamp)}</span>
                        {msg.topic && (
                          <Badge variant="outline" className="text-[10px] py-0 h-4">{msg.topic}</Badge>
                        )}
                        {msg.source === 'buffer' && (
                          <Badge variant="secondary" className="text-[10px] py-0 h-4">history</Badge>
                        )}
                      </div>
                      <pre className="whitespace-pre-wrap break-all text-[11px] leading-relaxed max-h-32 overflow-auto">
                        {typeof msg.data === 'string' ? msg.data : JSON.stringify(msg.data, null, 2)}
                      </pre>
                    </div>
                  ))}
                  <div ref={dataEndRef} />
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Right panel — AI Analysis */}
          <div className="flex flex-col w-1/2 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2 border-b bg-muted/30 shrink-0">
              <MessageSquare className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">AI Analysis</span>
              {autoAnalysis && (
                <Badge variant="outline" className="text-xs gap-1">
                  <Zap className="h-3 w-3 text-yellow-500" /> Auto
                </Badge>
              )}
            </div>

            {/* AI messages list */}
            <ScrollArea className="flex-1 px-3 py-2">
              {!selectedFeedId ? (
                <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
                  Select a feed to start AI analysis
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Auto-analysis messages */}
                  {llmMessages.map((msg, i) => (
                    <div key={i} className="rounded-md border bg-card p-3 text-sm space-y-1">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Zap className="h-3 w-3 text-yellow-500" />
                        <span>Auto</span>
                        {msg.topic && (
                          <Badge variant="outline" className="text-[10px] py-0 h-4">{msg.topic}</Badge>
                        )}
                        <span className="ml-auto">{formatTime(msg.timestamp)}</span>
                      </div>
                      <p className="whitespace-pre-wrap leading-relaxed">
                        {msg.answer ?? msg.analysis ?? ''}
                      </p>
                      {msg.provider && (
                        <p className="text-[10px] text-muted-foreground">{msg.provider}</p>
                      )}
                    </div>
                  ))}

                  {/* Active streaming response */}
                  {(isStreaming || (activeStream && !activeStream.isComplete === false)) && activeStream && (
                    <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-sm space-y-1">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <MessageSquare className="h-3 w-3 text-primary" />
                        <span>Manual</span>
                        {isStreaming && (
                          <Badge variant="secondary" className="text-[10px]">Streaming</Badge>
                        )}
                      </div>
                      <p className="whitespace-pre-wrap leading-relaxed">
                        {activeStream.tokens}
                        {isStreaming && <span className="animate-pulse ml-0.5">▋</span>}
                      </p>
                    </div>
                  )}

                  {llmMessages.length === 0 && !activeStream && (
                    <div className="flex items-center justify-center h-24 text-sm text-muted-foreground">
                      {autoAnalysis
                        ? 'Auto-analysis will appear here when new data arrives'
                        : 'Ask a question below to analyze your feed data'}
                    </div>
                  )}

                  <div ref={aiEndRef} />
                </div>
              )}
            </ScrollArea>

            {/* @group BusinessLogic > LLM > Input : Manual query input */}
            <div className="border-t px-3 py-3 space-y-2 shrink-0">
              <Textarea
                placeholder="Ask a question about this feed data…"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                rows={2}
                disabled={isStreaming || !selectedFeedId}
                className="resize-none text-sm"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.ctrlKey) handleQuery()
                }}
              />
              <div className="flex items-center gap-2">
                {/* Provider selector */}
                <Select value={selectedProvider} onValueChange={setSelectedProvider}>
                  <SelectTrigger className="h-7 text-xs w-36">
                    <SelectValue placeholder="Default provider" />
                  </SelectTrigger>
                  <SelectContent>
                    {providers.filter((p) => p.available).map((p) => (
                      <SelectItem key={p.name} value={p.name} className="text-xs">
                        {p.displayName}
                        {p.isDefault && ' ✓'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <p className="text-[10px] text-muted-foreground flex-1 hidden sm:block">Ctrl+Enter</p>

                {isStreaming ? (
                  <Button variant="destructive" size="sm" className="h-7 px-2" onClick={handleStopStream}>
                    <Square className="h-3 w-3 mr-1" /> Stop
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    className="h-7 px-3"
                    onClick={handleQuery}
                    disabled={!question.trim() || !selectedFeedId || isStreaming}
                  >
                    <Send className="h-3 w-3 mr-1" /> Send
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
