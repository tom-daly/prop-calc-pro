import { describe, it, expect } from 'vitest'
import { fmt, fmtPct, fmtCompact } from '../utils/format'

describe('fmt (currency formatting)', () => {
  it('formats positive whole numbers', () => {
    expect(fmt(1000)).toBe('$1,000')
  })

  it('rounds to nearest dollar', () => {
    expect(fmt(1234.56)).toBe('$1,235')
    expect(fmt(1234.49)).toBe('$1,234')
  })

  it('formats zero', () => {
    expect(fmt(0)).toBe('$0')
  })

  it('formats negative numbers', () => {
    expect(fmt(-500)).toBe('$-500')
  })

  it('formats large numbers with commas', () => {
    expect(fmt(1234567)).toBe('$1,234,567')
  })

  it('formats very small numbers', () => {
    expect(fmt(0.4)).toBe('$0')
    expect(fmt(0.5)).toBe('$1')
  })
})

describe('fmtPct (percentage formatting)', () => {
  it('formats with 2 decimal places', () => {
    expect(fmtPct(5.5)).toBe('5.50%')
  })

  it('formats zero', () => {
    expect(fmtPct(0)).toBe('0.00%')
  })

  it('formats negative percentages', () => {
    expect(fmtPct(-3.14)).toBe('-3.14%')
  })

  it('formats whole numbers', () => {
    expect(fmtPct(10)).toBe('10.00%')
  })

  it('rounds to 2 decimal places', () => {
    // JavaScript toFixed uses banker's rounding: 5.555 → '5.55' (rounds to even)
    expect(fmtPct(5.555)).toBe('5.55%')
    expect(fmtPct(5.554)).toBe('5.55%')
    expect(fmtPct(5.556)).toBe('5.56%')
  })
})

describe('fmtCompact (compact currency)', () => {
  it('formats thousands as $Xk', () => {
    expect(fmtCompact(150000)).toBe('$150k')
  })

  it('formats millions as $X.XM', () => {
    expect(fmtCompact(1500000)).toBe('$1.5M')
  })

  it('rounds thousands', () => {
    expect(fmtCompact(155400)).toBe('$155k')
    expect(fmtCompact(155600)).toBe('$156k')
  })

  it('returns --- for zero', () => {
    expect(fmtCompact(0)).toBe('---')
  })

  it('returns --- for negative', () => {
    expect(fmtCompact(-1000)).toBe('---')
  })

  it('returns --- for null/undefined', () => {
    expect(fmtCompact(null)).toBe('---')
    expect(fmtCompact(undefined)).toBe('---')
  })

  it('formats exact million', () => {
    expect(fmtCompact(1000000)).toBe('$1.0M')
  })

  it('formats values just below 1M as thousands', () => {
    expect(fmtCompact(999000)).toBe('$999k')
  })
})
