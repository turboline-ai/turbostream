// @group Navigation : Root layout shell — sidebar + topbar + page outlet

import { Outlet } from 'react-router-dom'
import { NavSidebar } from './nav-sidebar'
import { TopBar } from './top-bar'
import { useWebSocket } from '@/hooks/use-websocket'
import { useAuthStore } from '@/stores/auth-store'

export function AppShell() {
  // Initialize global WS connection (connected when authenticated)
  useWebSocket()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar — only shown when authenticated */}
      {isAuthenticated && <NavSidebar />}

      {/* Main area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
