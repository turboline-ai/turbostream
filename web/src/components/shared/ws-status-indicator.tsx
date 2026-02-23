// @group WebSocket : Connection status indicator dot

import { useWSStore } from '@/stores/ws-store'
import { cn } from '@/utils/cn'

const STATUS_CONFIG = {
  disconnected: { color: 'bg-gray-500', label: 'Disconnected' },
  connecting: { color: 'bg-yellow-500 animate-pulse', label: 'Connecting...' },
  connected: { color: 'bg-blue-500', label: 'Connected' },
  authenticated: { color: 'bg-green-500', label: 'Live' },
  error: { color: 'bg-red-500', label: 'Error' },
} as const

export function WSStatusIndicator() {
  const status = useWSStore((s) => s.status)
  const config = STATUS_CONFIG[status]

  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground" title={config.label}>
      <span className={cn('h-2 w-2 rounded-full', config.color)} />
      <span className="hidden sm:inline">{config.label}</span>
    </div>
  )
}
