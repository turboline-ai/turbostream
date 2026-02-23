// @group BusinessLogic > FeedForm : Multi-step feed creation wizard

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { marketplaceApi } from '@/services/marketplace-api'
import { settingsApi } from '@/services/settings-api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ROUTES } from '@/config/routes'
import toast from 'react-hot-toast'
import { ArrowLeft, ArrowRight, Plus, X, Loader2 } from 'lucide-react'
import type { CreateFeedPayload, KeyValue, ConnectionType } from '@/types/feed'

const CONNECTION_TYPES: ConnectionType[] = ['websocket', 'socketio', 'http-polling', 'protobuf']

const feedSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  url: z.string().url('Must be a valid URL'),
  category: z.string().min(1, 'Select a category'),
  icon: z.string().optional(),
  isPublic: z.boolean(),
  connectionType: z.enum(['websocket', 'socketio', 'http-polling', 'protobuf']),
  systemPrompt: z.string().optional(),
  defaultAIPrompt: z.string().optional(),
  aiAnalysisEnabled: z.boolean(),
  enableTopicRouting: z.boolean(),
  topicField: z.string().optional(),
  tags: z.string().optional(),
  website: z.string().optional(),
})

type FeedFormValues = z.infer<typeof feedSchema>

export function CreateFeedPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [step, setStep] = useState(1)
  const [queryParams, setQueryParams] = useState<KeyValue[]>([])
  const [headers, setHeaders] = useState<KeyValue[]>([])
  const [connectionMessages, setConnectionMessages] = useState<string[]>([])
  const [newMessage, setNewMessage] = useState('')

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: settingsApi.getCategories,
  })

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FeedFormValues>({
    resolver: zodResolver(feedSchema),
    defaultValues: { isPublic: true, aiAnalysisEnabled: true, enableTopicRouting: false, connectionType: 'websocket' },
  })

  const connectionType = watch('connectionType')

  const createMutation = useMutation({
    mutationFn: (payload: CreateFeedPayload) => marketplaceApi.createFeed(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['my-feeds'] })
      toast.success('Feed created!')
      navigate(ROUTES.MY_FEEDS)
    },
    onError: () => toast.error('Failed to create feed'),
  })

  const onSubmit = (values: FeedFormValues) => {
    const payload: CreateFeedPayload = {
      name: values.name,
      description: values.description,
      url: values.url,
      category: values.category,
      icon: values.icon,
      isPublic: values.isPublic,
      connectionType: values.connectionType,
      queryParams: queryParams.filter((p) => p.key),
      headers: headers.filter((h) => h.key),
      connectionMessages: connectionMessages.filter(Boolean),
      systemPrompt: values.systemPrompt,
      defaultAIPrompt: values.defaultAIPrompt,
      aiAnalysisEnabled: values.aiAnalysisEnabled,
      enableTopicRouting: values.enableTopicRouting,
      topicField: values.topicField,
      tags: values.tags ? values.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
      website: values.website,
    }
    createMutation.mutate(payload)
  }

  // @group BusinessLogic > FeedForm > KVEditor : Key-value pair editor helper
  const KVEditor = ({ items, onChange, placeholder }: { items: KeyValue[]; onChange: (items: KeyValue[]) => void; placeholder: string }) => (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex gap-2">
          <Input placeholder="Key" value={item.key} onChange={(e) => { const next = [...items]; next[i] = { ...item, key: e.target.value }; onChange(next) }} />
          <Input placeholder={placeholder} value={item.value} onChange={(e) => { const next = [...items]; next[i] = { ...item, value: e.target.value }; onChange(next) }} />
          <Button type="button" variant="ghost" size="icon" onClick={() => onChange(items.filter((_, j) => j !== i))}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={() => onChange([...items, { key: '', value: '' }])}>
        <Plus className="h-3 w-3 mr-1" /> Add
      </Button>
    </div>
  )

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(ROUTES.MY_FEEDS)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Create feed</h1>
          <p className="text-muted-foreground">Step {step} of 3</p>
        </div>
      </div>

      {/* Step indicators */}
      <div className="flex gap-2">
        {[1, 2, 3].map((s) => (
          <Badge key={s} variant={s === step ? 'default' : s < step ? 'success' : 'outline'}>
            {s === 1 ? 'Basic info' : s === 2 ? 'Connection' : 'AI config'}
          </Badge>
        ))}
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        {/* Step 1: Basic info */}
        {step === 1 && (
          <Card>
            <CardHeader><CardTitle>Basic information</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input placeholder="My awesome feed" {...register('name')} />
                {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Description *</Label>
                <Textarea placeholder="What does this feed provide?" {...register('description')} />
                {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Category *</Label>
                  <Select onValueChange={(v) => setValue('category', v)}>
                    <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => <SelectItem key={c.key} value={c.key}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {errors.category && <p className="text-xs text-destructive">{errors.category.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Icon (emoji)</Label>
                  <Input placeholder="📊" maxLength={4} {...register('icon')} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Tags (comma-separated)</Label>
                <Input placeholder="crypto, realtime, bitcoin" {...register('tags')} />
              </div>
              <div className="space-y-2">
                <Label>Website</Label>
                <Input placeholder="https://example.com" {...register('website')} />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <Label>Public feed</Label>
                <Switch checked={watch('isPublic')} onCheckedChange={(v) => setValue('isPublic', v)} />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Connection config */}
        {step === 2 && (
          <Card>
            <CardHeader><CardTitle>Connection settings</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Source URL *</Label>
                <Input placeholder="wss://stream.example.com/data" {...register('url')} />
                {errors.url && <p className="text-xs text-destructive">{errors.url.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Connection type *</Label>
                <Select defaultValue="websocket" onValueChange={(v) => setValue('connectionType', v as ConnectionType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CONNECTION_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Query parameters</Label>
                <KVEditor items={queryParams} onChange={setQueryParams} placeholder="Value" />
              </div>
              <div className="space-y-2">
                <Label>Headers</Label>
                <KVEditor items={headers} onChange={setHeaders} placeholder="Value" />
              </div>
              {connectionType === 'websocket' && (
                <div className="space-y-2">
                  <Label>Connection messages</Label>
                  <div className="space-y-2">
                    {connectionMessages.map((msg, i) => (
                      <div key={i} className="flex gap-2">
                        <Input value={msg} onChange={(e) => { const next = [...connectionMessages]; next[i] = e.target.value; setConnectionMessages(next) }} />
                        <Button type="button" variant="ghost" size="icon" onClick={() => setConnectionMessages(connectionMessages.filter((_, j) => j !== i))}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <div className="flex gap-2">
                      <Input placeholder='{"type":"subscribe"}' value={newMessage} onChange={(e) => setNewMessage(e.target.value)} />
                      <Button type="button" variant="outline" size="sm" onClick={() => { if (newMessage) { setConnectionMessages([...connectionMessages, newMessage]); setNewMessage('') } }}>
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 3: AI config */}
        {step === 3 && (
          <Card>
            <CardHeader><CardTitle>AI configuration</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <Label>Enable AI analysis</Label>
                  <p className="text-xs text-muted-foreground">Automatically analyze incoming data with AI</p>
                </div>
                <Switch checked={watch('aiAnalysisEnabled')} onCheckedChange={(v) => setValue('aiAnalysisEnabled', v)} />
              </div>
              <div className="space-y-2">
                <Label>System prompt</Label>
                <Textarea placeholder="You are an expert analyst for this feed..." {...register('systemPrompt')} />
              </div>
              <div className="space-y-2">
                <Label>Default AI prompt</Label>
                <Textarea placeholder="Summarize the latest data and highlight anomalies..." {...register('defaultAIPrompt')} />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <Label>Enable topic routing</Label>
                  <p className="text-xs text-muted-foreground">Route different topics to different AI prompts</p>
                </div>
                <Switch checked={watch('enableTopicRouting')} onCheckedChange={(v) => setValue('enableTopicRouting', v)} />
              </div>
              {watch('enableTopicRouting') && (
                <div className="space-y-2">
                  <Label>Topic field</Label>
                  <Input placeholder="e.g. symbol or event_type" {...register('topicField')} />
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Navigation buttons */}
        <div className="flex justify-between mt-4">
          <Button type="button" variant="outline" onClick={() => step > 1 ? setStep(step - 1) : navigate(ROUTES.MY_FEEDS)}>
            <ArrowLeft className="h-4 w-4 mr-1" /> {step === 1 ? 'Cancel' : 'Back'}
          </Button>
          {step < 3 ? (
            <Button type="button" onClick={() => setStep(step + 1)}>
              Next <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create feed'}
            </Button>
          )}
        </div>
      </form>
    </div>
  )
}
