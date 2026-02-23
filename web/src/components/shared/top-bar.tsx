// @group Navigation : Top bar with user menu and WS status

import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { WSStatusIndicator } from './ws-status-indicator'
import { Button } from '@/components/ui/button'
import { ROUTES } from '@/config/routes'
import { LogOut, User } from 'lucide-react'

export function TopBar() {
  const { user, isAuthenticated, logout } = useAuth()

  return (
    <header className="flex h-14 items-center justify-between border-b px-6 bg-card">
      <div className="flex items-center gap-4">
        {isAuthenticated && <WSStatusIndicator />}
      </div>

      <div className="flex items-center gap-3">
        {isAuthenticated ? (
          <>
            <Link
              to={ROUTES.ACCOUNT}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">{user?.name ?? user?.email}</span>
            </Link>
            <Button variant="ghost" size="icon" onClick={() => void logout()} title="Logout">
              <LogOut className="h-4 w-4" />
            </Button>
          </>
        ) : (
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link to={ROUTES.LOGIN}>Sign in</Link>
            </Button>
            <Button size="sm" asChild>
              <Link to={ROUTES.REGISTER}>Sign up</Link>
            </Button>
          </div>
        )}
      </div>
    </header>
  )
}
