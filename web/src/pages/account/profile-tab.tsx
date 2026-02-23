// @group BusinessLogic > Account > Profile : User profile display and preferences

import { useAuthStore } from '@/stores/auth-store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/utils/format'
import { TokenUsageBar } from '@/components/shared/token-usage-bar'
import { User, Calendar, Mail } from 'lucide-react'

export function ProfileTab() {
  const user = useAuthStore((s) => s.user)

  if (!user) return null

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>Profile</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
              <User className="h-8 w-8" />
            </div>
            <div>
              <p className="text-xl font-semibold">{user.name}</p>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Mail className="h-3 w-3" />
                {user.email}
              </div>
              {user.createdAt && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                  <Calendar className="h-3 w-3" />
                  Member since {formatDate(user.createdAt)}
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            {user.twoFactorEnabled && <Badge variant="success">2FA enabled</Badge>}
          </div>
        </CardContent>
      </Card>

      {user.tokenUsage && (
        <Card>
          <CardHeader><CardTitle>Token usage</CardTitle></CardHeader>
          <CardContent>
            <TokenUsageBar />
            <p className="mt-2 text-xs text-muted-foreground">
              Resets monthly · {user.tokenUsage.overdraftAllowed ? 'Overdraft allowed' : 'No overdraft'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
