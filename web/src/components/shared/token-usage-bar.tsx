// @group BusinessLogic : Token usage progress bar with threshold colors

import { useWSStore } from '@/stores/ws-store'
import { useAuthStore } from '@/stores/auth-store'
import { Progress } from '@/components/ui/progress'
import { formatTokenUsage } from '@/utils/format'
import { cn } from '@/utils/cn'

export function TokenUsageBar() {
  const wsTokenUsage = useWSStore((s) => s.tokenUsage)
  const userTokenUsage = useAuthStore((s) => s.user?.tokenUsage)

  const usage = wsTokenUsage ?? userTokenUsage
  if (!usage) return null

  const percent = usage.limit > 0 ? Math.min((usage.tokensUsed / usage.limit) * 100, 100) : 0
  const isWarning = percent > 75
  const isCritical = percent > 90

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Tokens</span>
        <span>{formatTokenUsage(usage.tokensUsed, usage.limit)}</span>
      </div>
      <Progress
        value={percent}
        className={cn(
          'h-1.5',
          isCritical ? '[&>div]:bg-red-500' : isWarning ? '[&>div]:bg-yellow-500' : ''
        )}
      />
    </div>
  )
}
