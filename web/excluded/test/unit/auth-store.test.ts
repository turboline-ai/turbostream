// @group UnitTests : Auth store state management tests

import { describe, it, expect, beforeEach } from 'vitest'
import { useAuthStore } from '@/stores/auth-store'
import type { User } from '@/types/user'

const mockUser: User = {
  _id: 'user-123',
  email: 'test@example.com',
  name: 'Test User',
  createdAt: '2024-01-01T00:00:00Z',
  twoFactorEnabled: false,
}

describe('useAuthStore', () => {
  beforeEach(() => {
    useAuthStore.getState().clearAuth()
  })

  // @group UnitTests > AuthStore : setAuth action
  it('sets auth state with token and user', () => {
    useAuthStore.getState().setAuth('my-jwt-token', mockUser)
    const state = useAuthStore.getState()
    expect(state.token).toBe('my-jwt-token')
    expect(state.user).toEqual(mockUser)
    expect(state.isAuthenticated).toBe(true)
  })

  // @group UnitTests > AuthStore : clearAuth action
  it('clears auth state', () => {
    useAuthStore.getState().setAuth('my-jwt-token', mockUser)
    useAuthStore.getState().clearAuth()
    const state = useAuthStore.getState()
    expect(state.token).toBeNull()
    expect(state.user).toBeNull()
    expect(state.isAuthenticated).toBe(false)
  })

  // @group UnitTests > AuthStore : updateUser action
  it('merges partial user updates', () => {
    useAuthStore.getState().setAuth('token', mockUser)
    useAuthStore.getState().updateUser({ name: 'Updated Name' })
    expect(useAuthStore.getState().user?.name).toBe('Updated Name')
    expect(useAuthStore.getState().user?.email).toBe('test@example.com')
  })

  it('does not update user when not authenticated', () => {
    useAuthStore.getState().updateUser({ name: 'Should Not Update' })
    expect(useAuthStore.getState().user).toBeNull()
  })

  // @group UnitTests > AuthStore : updateTokenUsage action
  it('updates token usage on user', () => {
    useAuthStore.getState().setAuth('token', mockUser)
    useAuthStore.getState().updateTokenUsage({
      currentMonth: '2024-01',
      tokensUsed: 5000,
      limit: 100000,
      lastResetDate: '2024-01-01T00:00:00Z',
      overdraftAllowed: false,
    })
    expect(useAuthStore.getState().user?.tokenUsage?.tokensUsed).toBe(5000)
  })

  it('starts with unauthenticated state', () => {
    const state = useAuthStore.getState()
    expect(state.isAuthenticated).toBe(false)
    expect(state.token).toBeNull()
    expect(state.user).toBeNull()
  })
})
