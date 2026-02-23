// @group Types : API response envelope types

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  message?: string
  error?: string
}

export interface PaginatedResponse<T> {
  success: boolean
  data: T[]
  total?: number
  page?: number
  pageSize?: number
}

export interface AuthResponse {
  success: boolean
  token?: string
  user?: import('./user').User
  message?: string
  requiresTwoFactor?: boolean
}
