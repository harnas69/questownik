import type { SessionState } from '../types/game'

export interface SavedProgress {
  sessionId: string
  team: string
  /** Ostatni znany stan sesji z serwera: pozwala wznowić grę bez internetu */
  snapshot?: SessionState
  /** Kiedy zapisano stan (ms od 1970) */
  savedAt?: number
}

const key = (code: string) => `questownik:${code}`

function isSessionState(v: unknown): v is SessionState {
  if (typeof v !== 'object' || v === null) return false
  const s = v as Record<string, unknown>
  return (
    typeof s.teamName === 'string' &&
    typeof s.currentIdx === 'number' &&
    Number.isInteger(s.currentIdx) &&
    s.currentIdx >= 0 &&
    typeof s.score === 'number' &&
    Number.isFinite(s.score) &&
    typeof s.correctCount === 'number' &&
    Number.isFinite(s.correctCount) &&
    typeof s.startedAt === 'string' &&
    (s.finishedAt === null || typeof s.finishedAt === 'string')
  )
}

export function parseProgress(raw: string | null): SavedProgress | null {
  if (!raw) return null
  try {
    const p: unknown = JSON.parse(raw)
    if (typeof p !== 'object' || p === null) return null
    const o = p as Record<string, unknown>
    if (typeof o.sessionId !== 'string' || typeof o.team !== 'string') return null
    const out: SavedProgress = { sessionId: o.sessionId, team: o.team }
    if (isSessionState(o.snapshot)) {
      const s = o.snapshot
      out.snapshot = {
        teamName: s.teamName,
        currentIdx: s.currentIdx,
        score: s.score,
        correctCount: s.correctCount,
        startedAt: s.startedAt,
        finishedAt: s.finishedAt,
      }
      if (typeof o.savedAt === 'number') out.savedAt = o.savedAt
    }
    return out
  } catch {
    return null // uszkodzony zapis to to samo, co brak zapisu
  }
}

export function loadProgress(code: string): SavedProgress | null {
  try {
    return parseProgress(localStorage.getItem(key(code)))
  } catch {
    return null // brak dostępu do localStorage nie może zepsuć gry
  }
}

export function saveProgress(
  code: string,
  data: Pick<SavedProgress, 'sessionId' | 'team' | 'snapshot'>
) {
  try {
    const payload: SavedProgress = { sessionId: data.sessionId, team: data.team }
    if (data.snapshot) {
      payload.snapshot = data.snapshot
      payload.savedAt = Date.now()
    }
    localStorage.setItem(key(code), JSON.stringify(payload))
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