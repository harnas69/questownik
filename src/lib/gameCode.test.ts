import { describe, it, expect } from 'vitest'
import { extractGameCode } from './gameCode'

describe('extractGameCode', () => {
  it('przyjmuje zwykły kod, także małymi literami', () => {
    expect(extractGameCode('kty27g')).toBe('KTY27G')
    expect(extractGameCode('  KTY27G ')).toBe('KTY27G')
  })

  it('przyjmuje kod z odstępem lub myślnikiem', () => {
    expect(extractGameCode('KTY 27G')).toBe('KTY27G')
    expect(extractGameCode('KTY-27G')).toBe('KTY27G')
  })

  it('wyciąga kod z linku do gry lub rankingu', () => {
    expect(extractGameCode('https://questownik.vercel.app/gra/kty27g')).toBe('KTY27G')
    expect(extractGameCode('https://questownik.vercel.app/ranking/KTY27G?debug=1')).toBe('KTY27G')
  })

  it('odrzuca zbyt krótkie, zbyt długie i obce teksty', () => {
    expect(extractGameCode('KTY27')).toBeNull()
    expect(extractGameCode('KTY27GX')).toBeNull()
    expect(extractGameCode('')).toBeNull()
    expect(extractGameCode('ab!d12')).toBeNull()
  })
})