// @group APIEndpoints > Auth : All /api/auth/* endpoint calls

import { apiClient } from './api-client'
import type { AuthResponse, ApiResponse } from '@/types/api'
import type {
  User,
  UserSession,
  LoginActivity,
  TokenUsage,
  ChangePasswordPayload,
  TwoFactorSetupResponse,
  TwoFactorEnablePayload,
  TwoFactorEnableResponse,
} from '@/types/user'
import type { APIKey, CreateAPIKeyPayload, CreateAPIKeyResponse } from '@/types/api-key'

// @group APIEndpoints > Auth > Public : Registration and login
export const authApi = {
  register: async (payload: { email: string; password: string; name: string }) => {
    const { data } = await apiClient.post<AuthResponse>('/api/auth/register', payload)
    return data
  },

  login: async (payload: { email: string; password: string; totpToken?: string }) => {
    const { data } = await apiClient.post<AuthResponse>('/api/auth/login', payload)
    return data
  },

  // @group APIEndpoints > Auth > Protected : Authenticated user actions
  getMe: async () => {
    const { data } = await apiClient.get<ApiResponse<User>>('/api/auth/me')
    return data.data!
  },

  getTokenUsage: async () => {
    const { data } = await apiClient.get<ApiResponse<TokenUsage>>('/api/auth/token-usage')
    return data.data!
  },

  logout: async () => {
    await apiClient.post('/api/auth/logout')
  },

  changePassword: async (payload: ChangePasswordPayload) => {
    const { data } = await apiClient.post<ApiResponse>('/api/auth/change-password', payload)
    return data
  },

  // @group APIEndpoints > Auth > 2FA : Two-factor authentication management
  setup2FA: async () => {
    const { data } = await apiClient.post<ApiResponse<TwoFactorSetupResponse>>('/api/auth/2fa/setup')
    return data.data!
  },

  enable2FA: async (payload: TwoFactorEnablePayload) => {
    const { data } = await apiClient.post<ApiResponse<TwoFactorEnableResponse>>('/api/auth/2fa/enable', payload)
    return data.data!
  },

  disable2FA: async () => {
    const { data } = await apiClient.post<ApiResponse>('/api/auth/2fa/disable')
    return data
  },

  getBackupCodeStatus: async () => {
    const { data } = await apiClient.get<ApiResponse<{ unusedCount: number }>>('/api/auth/2fa/backup-codes/status')
    return data.data!
  },

  regenerateBackupCodes: async () => {
    const { data } = await apiClient.post<ApiResponse<{ backupCodes: string[] }>>('/api/auth/2fa/backup-codes/regenerate')
    return data.data!
  },

  // @group APIEndpoints > Auth > Sessions : Session management
  getSessions: async () => {
    const { data } = await apiClient.get<ApiResponse<UserSession[]>>('/api/auth/sessions')
    return data.data ?? []
  },

  terminateSession: async (sessionId: string) => {
    const { data } = await apiClient.delete<ApiResponse>(`/api/auth/sessions/${sessionId}`)
    return data
  },

  terminateOtherSessions: async () => {
    const { data } = await apiClient.post<ApiResponse>('/api/auth/sessions/terminate-others')
    return data
  },

  getLoginActivity: async () => {
    const { data } = await apiClient.get<ApiResponse<LoginActivity[]>>('/api/auth/login-activity')
    return data.data ?? []
  },

  // @group APIEndpoints > Auth > APIKeys : API key management
  getApiKeys: async () => {
    const { data } = await apiClient.get<ApiResponse<APIKey[]>>('/api/auth/api-keys')
    return data.data ?? []
  },

  createApiKey: async (payload: CreateAPIKeyPayload) => {
    const { data } = await apiClient.post<ApiResponse<CreateAPIKeyResponse>>('/api/auth/api-keys', payload)
    return data.data!
  },

  revokeApiKey: async (keyId: string) => {
    const { data } = await apiClient.delete<ApiResponse>(`/api/auth/api-keys/${keyId}`)
    return data
  },
}
