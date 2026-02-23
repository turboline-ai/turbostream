// @group Utilities : JWT decode and expiry helpers

interface JWTPayload {
  sub?: string
  exp?: number
  iat?: number
  email?: string
  name?: string
  username?: string
}

export function decodeJwt(token: string): JWTPayload | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))
    return payload as JWTPayload
  } catch {
    return null
  }
}

export function isTokenExpired(token: string): boolean {
  const payload = decodeJwt(token)
  if (!payload?.exp) return true
  // Add a 30-second buffer to avoid edge case expiry during a request
  return Date.now() / 1000 > payload.exp - 30
}
