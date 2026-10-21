import type { PointResult } from '../types/game'

export interface SavedProgress {
  team: string
  idx: number
  results: PointResult[]
  startedAt: number
  finishedAt: number | null
}

const key = (code: string) => `questownik:${code}`

export function loadProgress(code: string): SavedProgress | null {
  try {
    const raw = localStorage.getItem(key(code))
    return raw ? (JSON.parse(raw) as SavedProgress) : null
  } catch {
    return null // brak dostępu do localStorage nie może zepsuć gry
  }
}

export function saveProgress(code: string, data: SavedProgress) {
  try {
    localStorage.setItem(key(code), JSON.stringify(data))
  } catch {
    // ignorujemy
  }
}

export function clearProgress(code: string) {
  try {
    localStorage.removeItem(key(code))
  } catch {
    // ignorujemy
  }
}