import { describe, it, expect } from 'vitest'
import { summarizeTypes } from './library'

describe('summarizeTypes', () => {
  it('podaje typy w ustalonej kolejności', () => {
    expect(summarizeTypes({ text: 2, photo: 1, quiz: 3 })).toBe(
      'quiz ×3, zdjęcie ×1, informacja ×2'
    )
  })

  it('pomija typy z zerem i puste dane', () => {
    expect(summarizeTypes({ quiz: 0 })).toBe('')
    expect(summarizeTypes({})).toBe('')
  })
})