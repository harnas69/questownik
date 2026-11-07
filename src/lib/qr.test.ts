import { describe, it, expect } from 'vitest'
import { extractToken, formatToken } from './qr'

describe('extractToken', () => {
  it('odczytuje kod z pełnego linku', () => {
    expect(extractToken('https://questownik.vercel.app/gra/ABC123#qr=a3f92c7b1e')).toBe(
      'A3F92C7B1E'
    )
  })

  it('odczytuje kod z samego fragmentu adresu', () => {
    expect(extractToken('#qr=A3F92C7B1E')).toBe('A3F92C7B1E')
  })

  it('odczytuje kod wpisany ręcznie, z odstępem lub myślnikiem', () => {
    expect(extractToken('a3f92c7b1e')).toBe('A3F92C7B1E')
    expect(extractToken(' A3F92 C7B1E ')).toBe('A3F92C7B1E')
    expect(extractToken('A3F92-C7B1E')).toBe('A3F92C7B1E')
  })

  it('odrzuca kody o złej długości i obce teksty', () => {
    expect(extractToken('A3F92C7B1')).toBeNull()
    expect(extractToken('#qr=A3F92C7B1E1')).toBeNull()
    expect(extractToken('#konto')).toBeNull()
    expect(extractToken('https://example.com')).toBeNull()
    expect(extractToken('')).toBeNull()
  })
})

describe('formatToken', () => {
  it('dzieli kod na dwie grupy po pięć znaków', () => {
    expect(formatToken('A3F92C7B1E')).toBe('A3F92 C7B1E')
  })
})