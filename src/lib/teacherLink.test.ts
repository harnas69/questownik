import { describe, it, expect } from 'vitest'
import { parseTeacherLink } from './teacherLink'

const key = 'a1'.repeat(32)

describe('parseTeacherLink', () => {
  it('odczytuje kod i klucz z pełnego linku', () => {
    expect(parseTeacherLink(`https://questownik.vercel.app/nauczyciel/kty27g#${key}`)).toEqual({
      code: 'KTY27G',
      key,
    })
  })

  it('toleruje białe znaki wokół linku', () => {
    expect(parseTeacherLink(`  https://x.pl/nauczyciel/ABC123#${key}\n`)).toEqual({
      code: 'ABC123',
      key,
    })
  })

  it('odrzuca link bez klucza', () => {
    expect(parseTeacherLink('https://x.pl/nauczyciel/ABC123')).toBeNull()
  })

  it('odrzuca zwykły tekst', () => {
    expect(parseTeacherLink('to nie jest link')).toBeNull()
  })
})