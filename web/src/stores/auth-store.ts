// @group Authentication : Global auth state with localStorage persistence

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, TokenUsage } from '@/types/user'

interface AuthState {
  token: string | null
  user: User | null
  isAuthenticated: boolean
  setAuth: (token: string, user: User) => void
  clearAuth: () => void
  updateUser: (partial: Partial<User>) => void
  updateTokenUsage: (usage: TokenUsage) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      isAuthenticated: false,

      setAuth: (token, user) => set({ token, user, isAuthenticated: true }),

      clearAuth: () => set({ token: null, user: null, isAuthenticated: false }),

      updateUser: (partial) => {
        const user = get().user
        if (user) set({ user: { ...user, ...partial } })
      },

      updateTokenUsage: (usage) => {
        const user = get().user
        if (user) set({ user: { ...user, tokenUsage: usage } })
      },
    }),
    {
      name: 'turbostream-auth',
      partialize: (state) => ({ token: state.token, user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
)
