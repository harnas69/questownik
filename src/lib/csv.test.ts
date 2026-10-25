import { describe, it, expect } from 'vitest'
import { buildCsv, csvCell } from './csv'
import type { TeamResult } from './teacherApi'

describe('csvCell', () => {
  it('cytuje średniki i cudzysłowy', () => {
    expect(csvCell('a;b')).toBe('"a;b"')
    expect(csvCell('say "hi"')).toBe('"say ""hi"""')
  })
  it('neutralizuje formuły z Excela', () => {
    expect(csvCell('=SUM(A1)')).toBe("'=SUM(A1)")
    expect(csvCell('@cmd')).toBe("'@cmd")
  })
  it('liczby i puste wartości', () => {
    expect(csvCell(5)).toBe('5')
    expect(csvCell(null)).toBe('')
  })
})

describe('buildCsv', () => {
  const team: TeamResult = {
    id: 'a',
    team_name: 'Ala',
    current_idx: 2,
    score: 20,
    correct_count: 2,
    started_at: '2026-10-25T10:00:00Z',
    finished_at: '2026-10-25T10:05:30Z',
    results: [
      { position: 0, earned: 10, attempts: 1, correct: true },
      { position: 1, earned: 10, attempts: 1, correct: true },
    ],
  }

  it('buduje nagłówek i wiersz', () => {
    const lines = buildCsv([team], 2).split('\r\n')
    expect(lines[0]).toContain('Punkt 2')
    expect(lines[1]).toBe('1;Ala;20;2;2;ukończono;5:30;10;10')
  })
})