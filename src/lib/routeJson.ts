import { TASK_TYPES } from '../types/route'
import type { DraftPoint, DraftRoute, TaskContent, TaskType } from '../types/route'

type Raw = Record<string, unknown>

function isObj(v: unknown): v is Raw {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function fail(msg: string): never {
  throw new Error(msg)
}

function num(v: unknown, min: number, max: number, name: string, n: number): number {
  if (typeof v !== 'number' || !Number.isFinite(v) || v < min || v > max)
    fail(`Punkt ${n}: nieprawidłowe pole "${name}".`)
  return v
}

function parsePoint(raw: unknown, n: number): DraftPoint {
  if (!isObj(raw)) return fail(`Punkt ${n}: nieprawidłowy format.`)

  const taskType = raw.taskType
  if (typeof taskType !== 'string' || !TASK_TYPES.includes(taskType as TaskType))
    fail(`Punkt ${n}: nieznany typ zadania.`)

  const c = raw.content
  if (!isObj(c)) return fail(`Punkt ${n}: brak treści zadania.`)
  const prompt = c.prompt
  if (typeof prompt !== 'string') return fail(`Punkt ${n}: brak treści zadania.`)

  const content: TaskContent = { prompt }

  if (taskType === 'quiz') {
    const options = c.options
    if (
      !Array.isArray(options) ||
      options.length < 2 ||
      options.length > 4 ||
      !options.every((o) => typeof o === 'string')
    )
      fail(`Punkt ${n}: quiz wymaga 2–4 odpowiedzi.`)
    content.options = options as string[]
    content.correctIndex = num(c.correctIndex, 0, content.options.length - 1, 'correctIndex', n)
  }

  if (taskType === 'open' || taskType === 'code') {
    const answer = c.answer
    if (typeof answer !== 'string') return fail(`Punkt ${n}: brak poprawnej odpowiedzi.`)
    content.answer = answer
  }

  return {
    lat: num(raw.lat, -90, 90, 'lat', n),
    lng: num(raw.lng, -180, 180, 'lng', n),
    radiusM: num(raw.radiusM, 10, 500, 'radiusM', n),
    taskType: taskType as TaskType,
    content,
    score: num(raw.score, 0, 1000, 'score', n),
    hint: typeof raw.hint === 'string' ? raw.hint : '',
  }
}

export function exportRoute(route: DraftRoute): string {
  return JSON.stringify({ version: 1, title: route.title, points: route.points }, null, 2)
}

export function parseRoute(text: string): DraftRoute {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    return fail('To nie jest poprawny plik JSON.')
  }
  if (!isObj(data) || data.version !== 1) return fail('Nieobsługiwany format pliku trasy.')
  if (typeof data.title !== 'string' || !data.title.trim()) return fail('Brak tytułu trasy.')
  if (!Array.isArray(data.points) || data.points.length === 0) return fail('Trasa nie ma punktów.')

  return {
    title: data.title,
    points: data.points.map((p, i) => parsePoint(p, i + 1)),
  }
}