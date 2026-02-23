// @group BusinessLogic > Account > APIKeys : API key creation and management

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { authApi } from '@/services/auth-api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger
} from '@/components/ui/dialog'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { formatRelative } from '@/utils/format'
import toast from 'react-hot-toast'
import { Plus, Trash2, Copy, Key, Loader2 } from 'lucide-react'
import type { APIKeyScope } from '@/types/api-key'

const SCOPES: { value: APIKeyScope; label: string; description: string }[] = [
  { value: 'websocket:subscribe', label: 'Subscribe', description: 'Subscribe to feed data streams' },
  { value: 'websocket:llm', label: 'LLM', description: 'Access LLM responses over WebSocket' },
  { value: 'websocket:topic', label: 'Topics', description: 'Subscribe to topic-routed streams' },
  { value: 'websocket:*', label: 'Full access', description: 'All WebSocket permissions' },
]

const createKeySchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  scopes: z.array(z.string()).min(1, 'Select at least one scope'),
})

type CreateKeyForm = z.infer<typeof createKeySchema>

export function APIKeysTab() {
  const queryClient = useQueryClient()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [newRawKey, setNewRawKey] = useState<string | null>(null)
  const [selectedScopes, setSelectedScopes] = useState<APIKeyScope[]>([])

  const { data: keys = [], isLoading } = useQuery({
    queryKey: ['api-keys'],
    queryFn: authApi.getApiKeys,
  })

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<CreateKeyForm>({
    resolver: zodResolver(createKeySchema),
  })

  const revokeMutation = useMutation({
    mutationFn: authApi.revokeApiKey,
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ['api-keys'] }); toast.success('Key revoked') },
    onError: () => toast.error('Failed to revoke key'),
  })

  const handleCreate = handleSubmit(async (values) => {
    await authApi.createApiKey({ name: values.name, scopes: values.scopes as APIKeyScope[] }).then((data) => {
      void queryClient.invalidateQueries({ queryKey: ['api-keys'] })
      setNewRawKey(data.rawKey)
      setIsDialogOpen(false)
      reset()
      setSelectedScopes([])
    }).catch(() => toast.error('Failed to create API key'))
  })

  const toggleScope = (scope: APIKeyScope) => {
    setSelectedScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]
    )
  }

  return (
    <div className="space-y-4">
      {/* New raw key display */}
      {newRawKey && (
        <Card className="border-primary/50 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-base text-primary">Save your API key</CardTitle>
            <CardDescription>This key will not be shown again. Copy it now.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 font-mono text-sm break-all rounded-md border bg-background p-3">
              {newRawKey}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigator.clipboard.writeText(newRawKey).then(() => toast.success('Copied!'))}
            >
              <Copy className="h-3 w-3 mr-1" /> Copy key
            </Button>
            <Button size="sm" onClick={() => setNewRawKey(null)}>Done</Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex-row items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2"><Key className="h-4 w-4" /> API Keys</CardTitle>
            <CardDescription>Keys for programmatic WebSocket access</CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" /> New key</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create API key</DialogTitle>
                <DialogDescription>Give your key a name and select its permissions.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-2">
                  <Label>Key name</Label>
                  <Input placeholder="My trading bot" {...register('name')} />
                  {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Permissions</Label>
                  <div className="space-y-2">
                    {SCOPES.map((scope) => (
                      <label key={scope.value} className="flex items-start gap-3 rounded-lg border p-3 cursor-pointer hover:bg-accent">
                        <input
                          type="checkbox"
                          className="mt-0.5"
                          checked={selectedScopes.includes(scope.value)}
                          onChange={() => toggleScope(scope.value)}
                        />
                        <div>
                          <p className="text-sm font-medium">{scope.label}</p>
                          <p className="text-xs text-muted-foreground">{scope.description}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                  {errors.scopes && <p className="text-xs text-destructive">{errors.scopes.message}</p>}
                </div>
                <Button type="submit" className="w-full" disabled={isSubmitting || selectedScopes.length === 0}>
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create key'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {isLoading ? <LoadingSpinner /> : keys.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-6">No API keys yet.</p>
          ) : (
            <div className="space-y-2">
              {keys.map((key) => (
                <div key={key.id} className="flex items-center justify-between rounded-lg border p-3 gap-3">
                  <div>
                    <p className="text-sm font-medium">{key.name}</p>
                    <p className="text-xs text-muted-foreground font-mono">
                      {key.prefix}...{key.lastChars}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {key.scopes.map((scope) => <Badge key={scope} variant="outline" className="text-xs">{scope}</Badge>)}
                    </div>
                    {key.lastUsedAt && (
                      <p className="text-xs text-muted-foreground mt-1">Used {formatRelative(key.lastUsedAt)}</p>
                    )}
                  </div>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => revokeMutation.mutate(key.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
