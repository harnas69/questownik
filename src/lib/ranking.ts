export interface SessionRow {
  id: string
  team_name: string
  current_idx: number
  score: number
  correct_count: number
  started_at: string
  finished_at: string | null
}

export function durationMs(r: SessionRow): number | null {
  return r.finished_at ? Date.parse(r.finished_at) - Date.parse(r.started_at) : null
}

// Więcej punktów wygrywa. Remis: kto skończył, a wśród skończonych kto szybciej.
export function sortRanking<T extends SessionRow>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    const da = durationMs(a)
    const db = durationMs(b)
    if (da !== null && db !== null) return da - db
    if (da !== null) return -1
    if (db !== null) return 1
    return b.current_idx - a.current_idx
  })
}