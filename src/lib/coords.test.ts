import { describe, it, expect } from 'vitest'
import { formatCoord, parseCoord } from './coords'

describe('parseCoord', () => {
  it('przyjmuje kropkę i przecinek dziesiętny oraz znak stopnia', () => {
    expect(parseCoord('51.7611', 'lat')).toBe(51.7611)
    expect(parseCoord('51,7611', 'lat')).toBe(51.7611)
    expect(parseCoord(' 18.091° ', 'lng')).toBe(18.091)
    expect(parseCoord('-0.5', 'lng')).toBe(-0.5)
    expect(parseCoord('+12', 'lat')).toBe(12)
  })

  it('zaokrągla do sześciu miejsc po przecinku', () => {
    expect(parseCoord('51.76112345678', 'lat')).toBe(51.761123)
  })

  it('pilnuje zakresów osobno dla szerokości i długości', () => {
    expect(parseCoord('90', 'lat')).toBe(90)
    expect(parseCoord('90.1', 'lat')).toBeNull()
    expect(parseCoord('180', 'lng')).toBe(180)
    expect(parseCoord('95', 'lat')).toBeNull()
    expect(parseCoord('95', 'lng')).toBe(95)
    expect(parseCoord('-181', 'lng')).toBeNull()
  })

  it('odrzuca puste, tekst i dwie liczby naraz', () => {
    for (const bad of ['', '  ', 'abc', '51.7.6', '51 18', '1e2', '--5', '51,76,11']) {
      expect(parseCoord(bad, 'lat'), bad).toBeNull()
    }
  })
})

describe('formatCoord', () => {
  it('pokazuje liczbę bez zbędnych zer', () => {
    expect(formatCoord(51.7611)).toBe('51.7611')
    expect(formatCoord(51.76112345678)).toBe('51.761123')
    expect(formatCoord(18)).toBe('18')
  })
})