import type { DraftPoint, TaskContent, TaskType } from '../types/route'

// Zgodne z ograniczeniami funkcji create_route w bazie
export const LIMITS = {
  title: 100,
  points: 50,
  prompt: 1000,
  option: 200,
  answer: 200,
  hint: 300,
  score: 1000,
} as const

export const MIN_OPTIONS = 2
export const MAX_OPTIONS = 4

export function newPoint(lat: number, lng: number): DraftPoint {
  return {
    lat,
    lng,
    radiusM: 30,
    taskType: 'text',
    content: { prompt: '' },
    score: 10,
    hint: '',
    unlock: 'gps',
  }
}

export function contentFor(type: TaskType, prev: TaskContent): TaskContent {
  const prompt = prev.prompt
  if (type === 'quiz') return { prompt, options: ['', '', '', ''], correctIndex: 0 }
  if (type === 'open' || type === 'code') return { prompt, answer: '' }
  return { prompt }
}

export function moveItem<T>(arr: T[], from: number, to: number): T[] {
  if (from < 0 || from >= arr.length || to < 0 || to >= arr.length) return arr
  const copy = [...arr]
  const [item] = copy.splice(from, 1)
  copy.splice(to, 0, item)
  return copy
}

export const optionLetter = (j: number): string => 'ABCD'[j] ?? String(j + 1)

// Liczba punktów: tylko cyfry, 0..1000 (puste lub błędne dane zwracają null)
export function parseScore(text: string): number | null {
  const t = text.trim()
  if (!/^\d{1,4}$/.test(t)) return null
  const n = Number(t)
  return n >= 0 && n <= LIMITS.score ? n : null
}

export function addOption(c: TaskContent): TaskContent {
  const options = c.options ?? []
  if (options.length >= MAX_OPTIONS) return c
  return { ...c, options: [...options, ''] }
}

// Usunięcie odpowiedzi poprawia numer poprawnej. Gdy usuwamy poprawną, poprawną zostaje A.
export function removeOption(c: TaskContent, i: number): TaskContent {
  const options = c.options ?? []
  if (options.length <= MIN_OPTIONS || i < 0 || i >= options.length) return c
  const cur = c.correctIndex ?? 0
  const correctIndex = i < cur ? cur - 1 : i === cur ? 0 : cur
  return { ...c, options: options.filter((_, j) => j !== i), correctIndex }
}

export type ErrorField = 'title' | 'points' | 'prompt' | 'option' | 'answer' | 'hint' | 'score'

export interface ValidationError {
  /** Indeks punktu (od 0) albo null dla błędów całej trasy */
  point: number | null
  field: ErrorField
  /** Indeks odpowiedzi quizu dla field === 'option' */
  option?: number
  /** Komunikat do wyświetlenia przy polu */
  text: string
  /** Komunikat do podsumowania (z numerem punktu) */
  message: string
}

// Identyfikator elementu DOM, na którym ustawiamy fokus
export function fieldId(point: number | null, field: ErrorField, option?: number): string {
  if (field === 'title') return 'route-title'
  if (field === 'points' || point === null) return 'add-point-btn'
  return field === 'option' ? `pt${point}-option${option ?? 0}` : `pt${point}-${field}`
}

export const errorId = (point: number | null, field: ErrorField, option?: number): string =>
  `${fieldId(point, field, option)}-error`

const capFirst = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
const normOption = (s: string) => s.trim().replace(/\s+/g, ' ').toLocaleLowerCase('pl-PL')

export function validatePoints(points: DraftPoint[]): ValidationError[] {
  const errors: ValidationError[] = []
  const push = (point: number | null, field: ErrorField, raw: string, option?: number) => {
    const text = capFirst(raw)
    errors.push({
      point,
      field,
      option,
      text,
      message: point === null ? text : `Punkt ${point + 1}: ${raw}`,
    })
  }

  if (points.length === 0) push(null, 'points', 'Dodaj co najmniej jeden punkt na mapie.')
  if (points.length > LIMITS.points) {
    push(null, 'points', `Trasa może mieć najwyżej ${LIMITS.points} punktów (masz ${points.length}).`)
  }

  points.forEach((p, i) => {
    const prompt = p.content.prompt.trim()
    if (prompt === '') push(i, 'prompt', 'uzupełnij treść zadania.')
    else if (prompt.length > LIMITS.prompt) {
      push(i, 'prompt', `treść zadania może mieć najwyżej ${LIMITS.prompt} znaków (jest ${prompt.length}).`)
    }

    if (p.taskType === 'quiz') {
      const seen = new Map<string, number>()
      ;(p.content.options ?? []).forEach((o, j) => {
        const v = o.trim()
        const letter = optionLetter(j)
        if (v === '') {
          push(i, 'option', `uzupełnij odpowiedź ${letter}.`, j)
          return
        }
        if (v.length > LIMITS.option) {
          push(i, 'option', `odpowiedź ${letter} może mieć najwyżej ${LIMITS.option} znaków (jest ${v.length}).`, j)
          return
        }
        const key = normOption(v)
        const first = seen.get(key)
        if (first === undefined) seen.set(key, j)
        else push(i, 'option', `odpowiedź ${letter} powtarza odpowiedź ${optionLetter(first)}. Każda odpowiedź musi być inna.`, j)
      })
    }

    if (p.taskType === 'open' || p.taskType === 'code') {
      const a = (p.content.answer ?? '').trim()
      if (a === '') push(i, 'answer', 'podaj poprawną odpowiedź.')
      else if (a.length > LIMITS.answer) {
        push(i, 'answer', `poprawna odpowiedź może mieć najwyżej ${LIMITS.answer} znaków (jest ${a.length}).`)
      }
    }

    if (p.hint.length > LIMITS.hint) {
      push(i, 'hint', `podpowiedź może mieć najwyżej ${LIMITS.hint} znaków (jest ${p.hint.length}).`)
    }
    if (!Number.isInteger(p.score) || p.score < 0 || p.score > LIMITS.score) {
      push(i, 'score', `liczba punktów musi być liczbą całkowitą od 0 do ${LIMITS.score}.`)
    }
  })

  return errors
}

export function validateRoute(title: string, points: DraftPoint[]): ValidationError[] {
  const errors: ValidationError[] = []
  const t = title.trim()
  const add = (text: string) =>
    errors.push({ point: null, field: 'title', text, message: text })
  if (t === '') add('Wpisz tytuł trasy.')
  else if (t.length > LIMITS.title) {
    add(`Tytuł może mieć najwyżej ${LIMITS.title} znaków (jest ${t.length}).`)
  }
  return [...errors, ...validatePoints(points)]
}