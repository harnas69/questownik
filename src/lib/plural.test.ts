import { describe, it, expect } from 'vitest'
import { plural } from './plural'

const p = (n: number) => plural(n, 'punkt', 'punkty', 'punktów')

describe('plural', () => {
  it('liczba pojedyncza', () => {
    expect(p(1)).toBe('punkt')
  })
  it('2-4 oraz 22-24', () => {
    expect(p(2)).toBe('punkty')
    expect(p(4)).toBe('punkty')
    expect(p(22)).toBe('punkty')
  })
  it('0, 5+, 12-14', () => {
    expect(p(0)).toBe('punktów')
    expect(p(5)).toBe('punktów')
    expect(p(12)).toBe('punktów')
    expect(p(14)).toBe('punktów')
    expect(p(25)).toBe('punktów')
  })
})