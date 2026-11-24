import { describe, it, expect } from 'vitest'
import { fmtClock } from './format'

describe('fmtClock', () => {
  it('formatuje minuty i sekundy', () => {
    expect(fmtClock(26_000)).toBe('0:26')
    expect(fmtClock(65_000)).toBe('1:05')
  })

  it('dodaje godziny po 60 minutach', () => {
    expect(fmtClock(3_725_000)).toBe('1:02:05')
  })

  it('wartości ujemne traktuje jak zero', () => {
    expect(fmtClock(-500)).toBe('0:00')
  })
})