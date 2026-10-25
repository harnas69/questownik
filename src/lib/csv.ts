import { durationMs } from './ranking'
import type { TeamResult } from './teacherApi'

// Komórki zaczynające się od = + - @ Excel traktuje jak formuły, więc dodajemy apostrof
function neutralize(s: string): string {
  return /^[=+\-@\t\r]/.test(s) ? `'${s}` : s
}

export function csvCell(v: string | number | null): string {
  if (v === null) return ''
  const s = typeof v === 'string' ? neutralize(v) : String(v)
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

function fmt(ms: number): string {
  const s = Math.floor(ms / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

// Separator średnik, bo polski Excel domyślnie tak oczekuje.
// Kolejność wierszy = kolejność w podanej tablicy (miejsce = numer wiersza).
export function buildCsv(teams: TeamResult[], pointCount: number): string {
  const head = ['Miejsce', 'Drużyna', 'Punkty', 'Poprawne odpowiedzi', 'Ukończone punkty', 'Status', 'Czas (min:s)']
  for (let i = 1; i <= pointCount; i++) head.push(`Punkt ${i}`)

  const lines = [head.map(csvCell).join(';')]
  teams.forEach((t, idx) => {
    const d = durationMs(t)
    const row: (string | number | null)[] = [
      idx + 1,
      t.team_name,
      t.score,
      t.correct_count,
      Math.min(t.current_idx, pointCount),
      t.finished_at ? 'ukończono' : 'w grze',
      d !== null ? fmt(d) : '',
    ]
    for (let i = 0; i < pointCount; i++) {
      const r = t.results.find((x) => x.position === i)
      row.push(r ? r.earned : null)
    }
    lines.push(row.map(csvCell).join(';'))
  })
  return lines.join('\r\n')
}

export function downloadCsv(filename: string, csv: string) {
  // BOM na początku sprawia, że Excel poprawnie czyta polskie znaki
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}