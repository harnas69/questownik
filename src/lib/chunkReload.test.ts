import { describe, it, expect } from 'vitest'
import { clearChunkReloadFlag, isChunkLoadError, tryChunkReload } from './chunkReload'
import { memoryStorage } from './testUtils'

describe('isChunkLoadError', () => {
  it('rozpoznaje komunikaty Chrome, Firefoksa, Safari i webpacka', () => {
    expect(
      isChunkLoadError(
        new TypeError('Failed to fetch dynamically imported module: https://x/assets/a.js')
      )
    ).toBe(true)
    expect(isChunkLoadError(new TypeError('error loading dynamically imported module'))).toBe(true)
    expect(isChunkLoadError(new TypeError('Importing a module script failed.'))).toBe(true)
    expect(isChunkLoadError({ name: 'ChunkLoadError', message: 'x' })).toBe(true)
    expect(isChunkLoadError(new Error('Loading chunk 12 failed.'))).toBe(true)
  })

  it('zwykłe błędy to nie błędy ładowania', () => {
    expect(isChunkLoadError(new Error('Cannot read properties of undefined'))).toBe(false)
    expect(isChunkLoadError(null)).toBe(false)
    expect(isChunkLoadError('Failed to fetch')).toBe(false)
  })
})

describe('tryChunkReload', () => {
  it('pozwala na jedno przeładowanie, kolejne blokuje', () => {
    const s = memoryStorage()
    expect(tryChunkReload(s)).toBe(true)
    expect(tryChunkReload(s)).toBe(false)
  })

  it('po wyczyszczeniu flagi znów pozwala', () => {
    const s = memoryStorage()
    tryChunkReload(s)
    clearChunkReloadFlag(s)
    expect(tryChunkReload(s)).toBe(true)
  })

  it('bez dostępu do pamięci nie przeładowuje (brak pętli)', () => {
    expect(tryChunkReload(null)).toBe(false)
    const broken = {
      ...memoryStorage(),
      getItem: () => {
        throw new Error('denied')
      },
    }
    expect(tryChunkReload(broken)).toBe(false)
  })
})