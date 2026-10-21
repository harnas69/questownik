import { describe, it, expect } from 'vitest'
import { exportRoute, parseRoute } from './routeJson'
import { moveItem, newPoint } from './points'
import type { DraftPoint } from '../types/route'

const quiz: DraftPoint = {
  ...newPoint(51.76, 18.09),
  taskType: 'quiz',
  content: { prompt: 'Ile to 2+2?', options: ['3', '4'], correctIndex: 1 },
}

describe('routeJson', () => {
  it('eksport i import dają ten sam wynik', () => {
    const route = { title: 'Test', points: [quiz] }
    expect(parseRoute(exportRoute(route))).toEqual(route)
  })

  it('odrzuca niepoprawny JSON', () => {
    expect(() => parseRoute('{nie json')).toThrow()
  })

  it('odrzuca współrzędne spoza zakresu', () => {
    const bad = exportRoute({ title: 'X', points: [{ ...quiz, lat: 200 }] })
    expect(() => parseRoute(bad)).toThrow(/lat/)
  })

  it('odrzuca quiz z błędnym indeksem poprawnej odpowiedzi', () => {
    const bad = exportRoute({
      title: 'X',
      points: [{ ...quiz, content: { ...quiz.content, correctIndex: 5 } }],
    })
    expect(() => parseRoute(bad)).toThrow(/correctIndex/)
  })
})

describe('moveItem', () => {
  it('zamienia kolejność', () => {
    expect(moveItem([1, 2, 3], 0, 1)).toEqual([2, 1, 3])
  })
  it('ignoruje indeksy spoza zakresu', () => {
    expect(moveItem([1, 2, 3], 0, -1)).toEqual([1, 2, 3])
  })
})