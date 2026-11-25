import { TASK_TYPES } from '../types/route'
import type { TaskContent, TaskType } from '../types/route'
import type { GamePoint } from '../types/game'

// Kolumny tabeli points, które widzi gracz. Poprawne odpowiedzi leżą w point_answers,
// a tajne kody QR w point_unlocks: tych tabel klient w ogóle nie czyta.
export const PUBLIC_POINT_SELECT =
  'id, lat, lng, radius_m, task_type, content, score, hint, unlock'

export const PUBLIC_POINT_COLUMNS: readonly string[] = PUBLIC_POINT_SELECT.split(', ')

// Z treści zadania zostaje tylko to, co potrzebne do wyświetlenia. Nawet gdyby stary wiersz
// w bazie nadal miał pola correctIndex lub answer, aplikacja ich nie trzyma ani nie cache'uje.
export function publicContent(raw: unknown): TaskContent {
  const c = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>
  const content: TaskContent = { prompt: typeof c.prompt === 'string' ? c.prompt : '' }
  if (Array.isArray(c.options)) {
    content.options = c.options.filter((o): o is string => typeof o === 'string')
  }
  return content
}

export function mapPoint(raw: unknown): GamePoint {
  const r = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>
  const type = TASK_TYPES.includes(r.task_type as TaskType) ? (r.task_type as TaskType) : 'text'
  return {
    id: String(r.id),
    lat: Number(r.lat),
    lng: Number(r.lng),
    radiusM: Number(r.radius_m),
    taskType: type,
    content: publicContent(r.content),
    score: Number(r.score),
    hint: typeof r.hint === 'string' ? r.hint : null,
    unlock: r.unlock === 'qr' ? 'qr' : 'gps',
  }
}