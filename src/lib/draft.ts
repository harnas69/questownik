import { parseRoute } from './routeJson'
import type { DraftPoint } from '../types/route'

export interface DraftData {
  title: string
  allowManual: boolean
  points: DraftPoint[]
}

export interface Draft extends DraftData {
  savedAt: number
}

// Szkic jest przypisany do konta i do trasy (albo do nowej trasy)
export const draftKey = (uid: string, templateId: string | null) =>
  `questownik:draft:${uid}:${templateId ?? 'new'}`

function sortKeys(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(sortKeys)
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>
    return Object.fromEntries(
      Object.keys(o)
        .sort()
        .map((k) => [k, sortKeys(o[k])])
    )
  }
  return v
}

// Kolejność kluczy nie ma znaczenia (jsonb w bazie sortuje klucze po swojemu)
export function canonical(value: unknown): string {
  return JSON.stringify(sortKeys(value))
}

export function fingerprint(d: DraftData): string {
  return canonical({ title: d.title, points: d.points, allowManual: d.allowManual })
}

export function worthSaving(d: DraftData): boolean {
  return d.title.trim() !== '' || d.points.length > 0
}

export function serializeDraft(d: DraftData, now: number = Date.now()): string {
  return JSON.stringify({
    title: d.title,
    allowManual: d.allowManual,
    points: d.points,
    savedAt: now,
  })
}

export function parseDraft(raw: string | null): Draft | null {
  if (!raw) return null
  try {
    const d: unknown = JSON.parse(raw)
    if (typeof d !== 'object' || d === null) return null
    const o = d as Record<string, unknown>
    if (
      typeof o.title !== 'string' ||
      typeof o.allowManual !== 'boolean' ||
      typeof o.savedAt !== 'number' ||
      !Array.isArray(o.points)
    ) {
      return null
    }
    // Punkty przechodzą tę samą walidację co import JSON, więc uszkodzony szkic zostanie odrzucony
    const points =
      o.points.length === 0
        ? []
        : parseRoute(JSON.stringify({ version: 1, title: 'x', points: o.points })).points
    return { title: o.title, allowManual: o.allowManual, points, savedAt: o.savedAt }
  } catch {
    return null
  }
}

export function loadDraft(key: string): Draft | null {
  try {
    return parseDraft(localStorage.getItem(key))
  } catch {
    return null
  }
}

export function clearDraft(key: string) {
  try {
    localStorage.removeItem(key)
  } catch {
    // pomijamy
  }
}

// Zwraca false tylko wtedy, gdy było co zapisać, a zapis się nie udał
export function saveDraft(key: string, d: DraftData): boolean {
  if (!worthSaving(d)) {
    clearDraft(key)
    return true
  }
  try {
    localStorage.setItem(key, serializeDraft(d))
    return true
  } catch {
    return false
  }
}