// @group BusinessLogic > FeedForm : Feed edit page (reuses form logic)

import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useEffect } from 'react'
import { marketplaceApi } from '@/services/marketplace-api'
import { settingsApi } from '@/services/settings-api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { ROUTES } from '@/config/routes'
import toast from 'react-hot-toast'
import { ArrowLeft, Loader2 } from 'lucide-react'

const editSchema = z.object({
  name: z.string().min(3),
  description: z.string().min(10),
  category: z.string().min(1),
  icon: z.string().optional(),
  isPublic: z.boolean(),
  systemPrompt: z.string().optional(),
  defaultAIPrompt: z.string().optional(),
  aiAnalysisEnabled: z.boolean(),
  tags: z.string().optional(),
  website: z.string().optional(),
  bufferTtlMinutes: z.coerce.number().int().min(1).max(10080).optional(),
})

type EditFormValues = z.infer<typeof editSchema>

export function EditFeedPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: feed, isLoading } = useQuery({
    queryKey: ['feed', id],
    queryFn: () => marketplaceApi.getFeed(id!),
    enabled: !!id,
  })

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: settingsApi.getCategories,
  })

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<EditFormValues>({
    resolver: zodResolver(editSchema),
  })

  useEffect(() => {
    if (feed) {
      reset({
        name: feed.name,
        description: feed.description,
        category: feed.category,
        icon: feed.icon,
        isPublic: feed.isPublic,
        systemPrompt: feed.systemPrompt,
        defaultAIPrompt: feed.defaultAIPrompt,
        aiAnalysisEnabled: feed.aiAnalysisEnabled,
        tags: feed.tags.join(', '),
        website: feed.website,
        bufferTtlMinutes: feed.bufferTtlMinutes ?? undefined,
      })
    }
  }, [feed, reset])

  const updateMutation = useMutation({
    mutationFn: (values: EditFormValues) => marketplaceApi.updateFeed(id!, {
      ...values,
      tags: values.tags ? values.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
    }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['my-feeds'] })
      void queryClient.invalidateQueries({ queryKey: ['feed', id] })
      toast.success('Feed updated!')
      navigate(ROUTES.MY_FEEDS)
    },
    onError: () => toast.error('Failed to update feed'),
  })

  if (isLoading) return <LoadingSpinner fullPage />
  if (!feed) return <p className="text-center text-muted-foreground py-12">Feed not found.</p>

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(ROUTES.MY_FEEDS)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">Edit: {feed.name}</h1>
      </div>

      <form onSubmit={handleSubmit((v) => updateMutation.mutate(v))} className="space-y-4">
        <Card>
          <CardHeader><CardTitle>Basic information</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input {...register('name')} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea {...register('description')} />
              {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select defaultValue={feed.category} onValueChange={(v) => setValue('category', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => <SelectItem key={c.key} value={c.key}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Icon</Label>
                <Input maxLength={4} {...register('icon')} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Tags (comma-separated)</Label>
              <Input {...register('tags')} />
            </div>
            <div className="space-y-2">
              <Label>Website</Label>
              <Input {...register('website')} />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <Label>Public feed</Label>
              <Switch checked={watch('isPublic')} onCheckedChange={(v) => setValue('isPublic', v)} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>AI configuration</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <Label>Enable AI analysis</Label>
              <Switch checked={watch('aiAnalysisEnabled')} onCheckedChange={(v) => setValue('aiAnalysisEnabled', v)} />
            </div>
            <div className="space-y-2">
              <Label>System prompt</Label>
              <Textarea {...register('systemPrompt')} />
            </div>
            <div className="space-y-2">
              <Label>Default AI prompt</Label>
              <Textarea {...register('defaultAIPrompt')} />
            </div>
            <div className="space-y-2">
              <Label>Data buffer duration (minutes)</Label>
              <Input
                type="number"
                min={1}
                max={10080}
                placeholder="30 (default)"
                {...register('bufferTtlMinutes')}
              />
              <p className="text-xs text-muted-foreground">
                How long to retain incoming feed data for history replay. Default: 30 minutes. Max: 10080 (1 week).
              </p>
              {errors.bufferTtlMinutes && (
                <p className="text-xs text-destructive">{errors.bufferTtlMinutes.message}</p>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={() => navigate(ROUTES.MY_FEEDS)}>Cancel</Button>
          <Button type="submit" disabled={updateMutation.isPending}>
            {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save changes'}
          </Button>
        </div>
      </form>
    </div>
  )
}
