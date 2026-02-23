// @group Navigation : Left sidebar navigation

import { NavLink } from 'react-router-dom'
import { ROUTES } from '@/config/routes'
import { cn } from '@/utils/cn'
import { TokenUsageBar } from './token-usage-bar'
import {
  LayoutDashboard,
  Radio,
  Brain,
  Settings,
  Zap,
} from 'lucide-react'

const NAV_ITEMS = [
  { to: ROUTES.DASHBOARD, icon: LayoutDashboard, label: 'Dashboard' },
  { to: ROUTES.MY_FEEDS, icon: Radio, label: 'My Feeds' },
  { to: ROUTES.LLM, icon: Brain, label: 'AI Query' },
  { to: ROUTES.ACCOUNT, icon: Settings, label: 'Account' },
]

export function NavSidebar() {
  return (
    <aside className="flex flex-col w-56 min-h-screen border-r bg-card px-3 py-4 gap-1">
      {/* Logo */}
      <div className="flex items-center gap-2 px-3 mb-6">
        <Zap className="h-6 w-6 text-primary" />
        <span className="font-bold text-lg">TurboStream</span>
      </div>

      {/* Nav links */}
      <nav className="flex-1 flex flex-col gap-0.5">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              )
            }
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Token usage at bottom */}
      <div className="px-3 pb-2">
        <TokenUsageBar />
      </div>
    </aside>
  )
}
