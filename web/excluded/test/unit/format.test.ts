// @group UnitTests : Format utility function tests

import { describe, it, expect } from 'vitest'
import { formatNumber, truncate, formatTokenUsage } from '@/utils/format'

describe('formatNumber', () => {
  it('formats numbers below 1000 as-is', () => {
    expect(formatNumber(0)).toBe('0')
    expect(formatNumber(999)).toBe('999')
    expect(formatNumber(42)).toBe('42')
  })

  it('formats thousands with K suffix', () => {
    expect(formatNumber(1000)).toBe('1.0K')
    expect(formatNumber(1500)).toBe('1.5K')
    expect(formatNumber(999999)).toBe('1000.0K')
  })

  it('formats millions with M suffix', () => {
    expect(formatNumber(1_000_000)).toBe('1.0M')
    expect(formatNumber(2_500_000)).toBe('2.5M')
  })
})

describe('truncate', () => {
  it('does not truncate short strings', () => {
    expect(truncate('hello', 10)).toBe('hello')
    expect(truncate('exactly10!', 10)).toBe('exactly10!')
  })

  it('truncates long strings with ellipsis', () => {
    expect(truncate('this is a long string', 10)).toBe('this is...')
    expect(truncate('abcdefghij', 7)).toBe('abcd...')
  })
})

describe('formatTokenUsage', () => {
  it('formats token usage as used / limit', () => {
    expect(formatTokenUsage(5000, 100_000)).toBe('5.0K / 100.0K')
    expect(formatTokenUsage(0, 50_000)).toBe('0 / 50.0K')
  })
})
