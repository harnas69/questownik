import { describe, it, expect } from 'vitest'
import { splitPodium } from './ranking'
import type { SessionRow } from './ranking'

const row = (id: string, score: number): SessionRow => ({
  id,
  team_name: id,
  current_idx: 0,
  score,
  correct_count: 0,
  started_at: '2026-11-24T10:00:00Z',
  finished_at: null,
})

describe('splitPodium', () => {
  it('na podium trafiają trzy najlepsze drużyny z punktami', () => {
    const { podium, rest } = splitPodium([row('a', 50), row('b', 40), row('c', 30), row('d', 20), row('e', 0)])
    expect(podium.map((r) => r.id)).toEqual(['a', 'b', 'c'])
    expect(rest.map((r) => r.id)).toEqual(['d', 'e'])
  })

  it('drużyny bez punktów nie trafiają na podium', () => {
    const { podium, rest } = splitPodium([row('a', 10), row('b', 0), row('c', 0)])
    expect(podium.map((r) => r.id)).toEqual(['a'])
    expect(rest.map((r) => r.id)).toEqual(['b', 'c'])
  })

  it('bez punktów podium jest puste', () => {
    const { podium, rest } = splitPodium([row('a', 0), row('b', 0)])
    expect(podium).toEqual([])
    expect(rest).toHaveLength(2)
  })

  it('obsługuje pustą listę', () => {
    expect(splitPodium([])).toEqual({ podium: [], rest: [] })
  })
})