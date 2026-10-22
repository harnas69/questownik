import { describe, it, expect } from 'vitest'
import { sortRanking } from './ranking'
import type { SessionRow } from './ranking'

const row = (over: Partial<SessionRow>): SessionRow => ({
  id: 'x',
  team_name: 'T',
  current_idx: 0,
  score: 0,
  correct_count: 0,
  started_at: '2026-10-22T10:00:00Z',
  finished_at: null,
  ...over,
})

describe('sortRanking', () => {
  it('więcej punktów jest wyżej', () => {
    const r = sortRanking([row({ id: 'a', score: 10 }), row({ id: 'b', score: 30 })])
    expect(r.map((x) => x.id)).toEqual(['b', 'a'])
  })

  it('przy remisie wygrywa szybciej kończący drużyna', () => {
    const r = sortRanking([
      row({ id: 'wolna', score: 20, finished_at: '2026-10-22T10:30:00Z' }),
      row({ id: 'szybka', score: 20, finished_at: '2026-10-22T10:10:00Z' }),
    ])
    expect(r.map((x) => x.id)).toEqual(['szybka', 'wolna'])
  })

  it('przy remisie skończona wyprzedza niedokończoną', () => {
    const r = sortRanking([
      row({ id: 'w_grze', score: 20, current_idx: 2 }),
      row({ id: 'koniec', score: 20, finished_at: '2026-10-22T10:30:00Z' }),
    ])
    expect(r[0].id).toBe('koniec')
  })
})