// @group Authentication : Auth store selectors and actions

import { useAuthStore } from '@/stores/auth-store'
import { authApi } from '@/services/auth-api'
import { wsClient } from '@/services/ws-client'
import { useNavigate } from 'react-router-dom'
import { ROUTES } from '@/config/routes'
import toast from 'react-hot-toast'

export function useAuth() {
  const { token, user, isAuthenticated, setAuth, clearAuth, updateUser } = useAuthStore()
  const navigate = useNavigate()

  const login = async (email: string, password: string, totpToken?: string) => {
    const result = await authApi.login({ email, password, totpToken })
    if (result.success && result.token && result.user) {
      setAuth(result.token, result.user)
      wsClient.connect(result.token, result.user._id)
      return { success: true as const }
    }
    if (result.requiresTwoFactor) {
      return { success: false as const, requiresTwoFactor: true }
    }
    return { success: false as const, message: result.message }
  }

  const logout = async () => {
    try { await authApi.logout() } catch { /* ignore */ }
    wsClient.disconnect()
    clearAuth()
    navigate(ROUTES.LOGIN)
  }

  const refreshUser = async () => {
    try {
      const user = await authApi.getMe()
      updateUser(user)
    } catch { /* ignore */ }
  }

  const showSuccessToast = (msg: string) => toast.success(msg)
  const showErrorToast = (msg: string) => toast.error(msg)

  return {
    token,
    user,
    isAuthenticated,
    login,
    logout,
    refreshUser,
    showSuccessToast,
    showErrorToast,
  }
}
