// @group Types : User, session, and token usage types

export interface TokenUsage {
  currentMonth: string
  tokensUsed: number
  limit: number
  lastResetDate: string
  overdraftAllowed: boolean
}

export interface UserPreferences {
  theme: string
  language: string
  emailNotifications: boolean
  pushNotifications: boolean
  feedUpdateNotifications: boolean
  marketplaceNotifications: boolean
  autoConnect: boolean
  compactView: boolean
}

export interface BackupCode {
  code: string
  used: boolean
  usedAt?: string
}

export interface User {
  _id: string
  email: string
  name: string
  createdAt: string
  lastLogin?: string
  tokenUsage?: TokenUsage
  preferences?: UserPreferences
  twoFactorEnabled: boolean
}

export interface UserSession {
  _id: string
  userId: string
  userAgent: string
  ipAddress: string
  createdAt: string
  lastActive: string
  isActive: boolean
  deviceName?: string
  deviceType?: string
}

export interface LoginActivity {
  _id: string
  userId: string
  ipAddress: string
  userAgent: string
  success: boolean
  timestamp: string
}

export interface ChangePasswordPayload {
  currentPassword: string
  newPassword: string
}

export interface TwoFactorSetupResponse {
  secret: string
  qrCodeUrl: string
  manualEntryKey: string
}

export interface TwoFactorEnablePayload {
  secret: string
  token: string
}

export interface TwoFactorEnableResponse {
  backupCodes: string[]
}
