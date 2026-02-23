// @group BusinessLogic > Account > Sessions : Active session management and login history

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { authApi } from '@/services/auth-api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { formatRelative, formatDateTime } from '@/utils/format'
import toast from 'react-hot-toast'
import { Monitor, Smartphone, X, CheckCircle, XCircle } from 'lucide-react'

export function SessionsTab() {
  const queryClient = useQueryClient()

  const { data: sessions = [], isLoading: loadingSessions } = useQuery({
    queryKey: ['sessions'],
    queryFn: authApi.getSessions,
  })

  const { data: activity = [], isLoading: loadingActivity } = useQuery({
    queryKey: ['login-activity'],
    queryFn: authApi.getLoginActivity,
  })

  const terminateMutation = useMutation({
    mutationFn: authApi.terminateSession,
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ['sessions'] }); toast.success('Session terminated') },
    onError: () => toast.error('Failed to terminate session'),
  })

  const terminateOthersMutation = useMutation({
    mutationFn: authApi.terminateOtherSessions,
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ['sessions'] }); toast.success('All other sessions terminated') },
    onError: () => toast.error('Failed'),
  })

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex-row items-start justify-between">
          <div>
            <CardTitle>Active sessions</CardTitle>
            <CardDescription>Devices currently signed in to your account</CardDescription>
          </div>
          {sessions.length > 1 && (
            <Button size="sm" variant="outline" onClick={() => terminateOthersMutation.mutate()} disabled={terminateOthersMutation.isPending}>
              Terminate others
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {loadingSessions ? <LoadingSpinner /> : (
            <div className="space-y-2">
              {sessions.map((session) => (
                <div key={session._id} className="flex items-center justify-between rounded-lg border p-3 gap-3">
                  <div className="flex items-center gap-3">
                    {session.deviceType === 'mobile' ? <Smartphone className="h-4 w-4 text-muted-foreground" /> : <Monitor className="h-4 w-4 text-muted-foreground" />}
                    <div>
                      <p className="text-sm font-medium">{session.deviceName ?? 'Unknown device'}</p>
                      <p className="text-xs text-muted-foreground">{session.ipAddress} · {formatRelative(session.lastActive)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="success">Active</Badge>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => terminateMutation.mutate(session._id)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Login activity</CardTitle>
          <CardDescription>Recent login attempts</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingActivity ? <LoadingSpinner /> : (
            <div className="space-y-2">
              {activity.slice(0, 10).map((item) => (
                <div key={item._id} className="flex items-center justify-between text-sm py-2 border-b last:border-0">
                  <div className="flex items-center gap-2">
                    {item.success ? <CheckCircle className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-red-500" />}
                    <span className="text-muted-foreground">{item.ipAddress}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{formatDateTime(item.timestamp)}</span>
                </div>
              ))}
              {activity.length === 0 && <p className="text-muted-foreground text-sm text-center py-4">No activity recorded.</p>}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
