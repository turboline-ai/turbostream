// @group APIClient : Axios instance with JWT injection and 401 handling

import axios from 'axios'
import { API_URL } from '@/config/env'

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// @group APIClient > Interceptors : Attach token and handle auth errors
apiClient.interceptors.request.use((config) => {
  const raw = localStorage.getItem('turbostream-auth')
  if (raw) {
    try {
      const state = JSON.parse(raw) as { state?: { token?: string } }
      const token = state?.state?.token
      if (token) {
        config.headers['Authorization'] = `Bearer ${token}`
      }
    } catch {
      // ignore parse errors
    }
  }
  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (
      axios.isAxiosError(error) &&
      error.response?.status === 401 &&
      !error.response?.data?.requiresTwoFactor
    ) {
      // Clear auth and redirect to login
      localStorage.removeItem('turbostream-auth')
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)
