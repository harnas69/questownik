import { describe, it, expect } from 'vitest'
import { contrastRatio, parseHex } from './contrast'

describe('contrastRatio', () => {
  it('czerń na bieli to 21:1, a ten sam kolor to 1:1', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 1)
    expect(contrastRatio('#336699', '#336699')).toBeCloseTo(1, 5)
  })

  it('zna graniczne wartości WCAG', () => {
    expect(contrastRatio('#767676', '#ffffff')).toBeGreaterThanOrEqual(4.5)
    expect(contrastRatio('#777777', '#ffffff')).toBeLessThan(4.5)
  })

  it('kolejność argumentów nie ma znaczenia', () => {
    expect(contrastRatio('#8a8678', '#ffffff')).toBeCloseTo(contrastRatio('#ffffff', '#8a8678'), 10)
  })
})

describe('parseHex', () => {
  it('odczytuje kolor i odrzuca zły format', () => {
    expect(parseHex('#ff8000')).toEqual([255, 128, 0])
    expect(() => parseHex('red')).toThrow()
    expect(() => parseHex('#fff')).toThrow()
  })
})