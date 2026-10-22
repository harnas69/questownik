export interface SavedProgress {
  sessionId: string
  team: string
}

const key = (code: string) => `questownik:${code}`

export function loadProgress(code: string): SavedProgress | null {
  try {
    const raw = localStorage.getItem(key(code))
    if (!raw) return null
    const p = JSON.parse(raw) as Partial<SavedProgress>
    if (typeof p.sessionId === 'string' && typeof p.team === 'string') {
      return { sessionId: p.sessionId, team: p.team }
    }
    return null // stary format z poprzednich etapów
  } catch {
    return null
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