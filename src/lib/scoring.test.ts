import { describe, it, expect } from 'vitest'
import { checkAnswer, normalize, pointsFor } from './scoring'
import type { GamePoint } from '../types/game'

const base: GamePoint = {
  id: '1', lat: 0, lng: 0, radiusM: 30, score: 10, hint: null,
  taskType: 'open', content: { prompt: '?', answer: 'Łódź' },
}

describe('normalize', () => {
  it('ignoruje wielkość liter, polskie znaki i spacje', () => {
    expect(normalize('  ŁÓDŹ ')).toBe('lodz')
  })
})

describe('checkAnswer', () => {
  it('pytanie otwarte', () => {
    expect(checkAnswer(base, 'lodz')).toBe(true)
    expect(checkAnswer(base, 'Kraków')).toBe(false)
  })
  it('quiz po indeksie', () => {
    const quiz: GamePoint = { ...base, taskType: 'quiz', content: { prompt: '?', options: ['a', 'b'], correctIndex: 1 } }
    expect(checkAnswer(quiz, 1)).toBe(true)
    expect(checkAnswer(quiz, 0)).toBe(false)
  })
})

describe('pointsFor', () => {
  it('pełne punkty za pierwszą próbę, połowa za kolejne', () => {
    expect(pointsFor(10, 1)).toBe(10)
    expect(pointsFor(10, 2)).toBe(5)
  })
})