// @group UnitTests : JWT utility function tests

import { describe, it, expect } from 'vitest'
import { decodeJwt, isTokenExpired } from '@/utils/jwt'

// @group TestHelpers : Test JWT helpers
function makeJWT(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const body = btoa(JSON.stringify(payload))
  return `${header}.${body}.fakesignature`
}

describe('decodeJwt', () => {
  it('decodes a valid JWT payload', () => {
    const token = makeJWT({ sub: 'user123', email: 'test@example.com', exp: 9999999999 })
    const result = decodeJwt(token)
    expect(result?.sub).toBe('user123')
    expect(result?.email).toBe('test@example.com')
  })

  it('returns null for a malformed token', () => {
    expect(decodeJwt('not-a-jwt')).toBeNull()
    expect(decodeJwt('')).toBeNull()
    expect(decodeJwt('a.b')).toBeNull()
  })

  it('returns null when payload is invalid JSON', () => {
    const token = 'eyJhbGciOiJIUzI1NiJ9.INVALIDBASE64!!!.sig'
    expect(decodeJwt(token)).toBeNull()
  })
})

describe('isTokenExpired', () => {
  it('returns false for a token with a future expiry', () => {
    const futureExp = Math.floor(Date.now() / 1000) + 3600
    const token = makeJWT({ exp: futureExp })
    expect(isTokenExpired(token)).toBe(false)
  })

  it('returns true for an expired token', () => {
    const pastExp = Math.floor(Date.now() / 1000) - 3600
    const token = makeJWT({ exp: pastExp })
    expect(isTokenExpired(token)).toBe(true)
  })

  it('returns true for a token expiring within the 30-second buffer', () => {
    const nearExp = Math.floor(Date.now() / 1000) + 10 // expires in 10s (within 30s buffer)
    const token = makeJWT({ exp: nearExp })
    expect(isTokenExpired(token)).toBe(true)
  })

  it('returns true for a malformed token', () => {
    expect(isTokenExpired('bad-token')).toBe(true)
  })

  it('returns true for a token without exp claim', () => {
    const token = makeJWT({ sub: 'user123' })
    expect(isTokenExpired(token)).toBe(true)
  })
})
