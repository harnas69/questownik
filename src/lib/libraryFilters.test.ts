import { describe, it, expect } from 'vitest'
import { labelOf, SUBJECTS } from './categories'
import { EMPTY_FILTERS, activeChips, countActive, removeFilter } from './libraryFilters'

describe('labelOf', () => {
  it('zwraca nazwę kategorii albo null', () => {
    expect(labelOf(SUBJECTS, 'historia')).toBe('Historia')
    expect(labelOf(SUBJECTS, 'nie-ma')).toBeNull()
    expect(labelOf(SUBJECTS, null)).toBeNull()
    expect(labelOf(SUBJECTS, '')).toBeNull()
  })
})

describe('countActive', () => {
  it('puste filtry to zero', () => {
    expect(countActive(EMPTY_FILTERS)).toBe(0)
  })

  it('liczy ustawione pola i opcję kopiowania', () => {
    expect(countActive({ ...EMPTY_FILTERS, subject: 'historia', copyOnly: true })).toBe(2)
  })
})

describe('activeChips', () => {
  it('opisuje aktywne filtry po polsku', () => {
    const chips = activeChips({ ...EMPTY_FILTERS, subject: 'historia', type: 'photo' })
    expect(chips.map((c) => c.text)).toEqual(['Przedmiot: Historia', 'Zadania: Zdjęcie'])
  })

  it('bez filtrów nie zwraca nic', () => {
    expect(activeChips(EMPTY_FILTERS)).toEqual([])
  })
})

describe('removeFilter', () => {
  it('usuwa jeden filtr i zostawia pozostałe', () => {
    const f = { ...EMPTY_FILTERS, subject: 'historia', level: 'lo', copyOnly: true }
    expect(removeFilter(f, 'subject')).toEqual({ ...f, subject: '' })
    expect(removeFilter(f, 'copyOnly')).toEqual({ ...f, copyOnly: false })
  })
})