import { describe, it, expect } from 'vitest'
import { PUBLIC_POINT_COLUMNS, mapPoint, publicContent } from './gamePoints'

describe('PUBLIC_POINT_COLUMNS', () => {
  it('nie zawiera pól z odpowiedziami ani kodami', () => {
    const joined = PUBLIC_POINT_COLUMNS.join(' ').toLowerCase()
    expect(joined).not.toMatch(/answer|token|correct|secret/)
  })

  it('zawiera to, czego potrzebuje gracz', () => {
    expect(PUBLIC_POINT_COLUMNS).toEqual(
      expect.arrayContaining(['id', 'lat', 'lng', 'radius_m', 'task_type', 'content', 'unlock'])
    )
  })
})

describe('publicContent', () => {
  it('usuwa poprawne odpowiedzi nawet ze starych wierszy', () => {
    expect(
      publicContent({ prompt: 'Pytanie', options: ['a', 'b'], correctIndex: 1, answer: 'tajne' })
    ).toEqual({ prompt: 'Pytanie', options: ['a', 'b'] })
  })

  it('znosi brak lub śmieci', () => {
    expect(publicContent(null)).toEqual({ prompt: '' })
    expect(publicContent({ prompt: 5, options: [1, 'a'] })).toEqual({ prompt: '', options: ['a'] })
  })
})

describe('mapPoint', () => {
  const row = {
    id: 'p1',
    lat: 51.7,
    lng: 18.1,
    radius_m: 30,
    task_type: 'quiz',
    content: { prompt: 'Pytanie', options: ['a', 'b'], correctIndex: 1 },
    score: 10,
    hint: null,
    unlock: 'qr',
  }

  it('mapuje wiersz bazy na punkt gry', () => {
    expect(mapPoint(row)).toEqual({
      id: 'p1',
      lat: 51.7,
      lng: 18.1,
      radiusM: 30,
      taskType: 'quiz',
      content: { prompt: 'Pytanie', options: ['a', 'b'] },
      score: 10,
      hint: null,
      unlock: 'qr',
    })
  })

  it('nieznany typ zadania i sposób odblokowania mają bezpieczne wartości domyślne', () => {
    const p = mapPoint({ ...row, task_type: 'dziwny', unlock: 'cokolwiek' })
    expect(p.taskType).toBe('text')
    expect(p.unlock).toBe('gps')
  })
})