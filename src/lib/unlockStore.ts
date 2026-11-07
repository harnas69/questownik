const key = (sessionId: string) => `questownik:unlock:${sessionId}`

function read(sessionId: string): string[] {
  try {
    const raw = localStorage.getItem(key(sessionId))
    const parsed: unknown = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}

function write(sessionId: string, ids: string[]) {
  try {
    localStorage.setItem(key(sessionId), JSON.stringify(ids))
  } catch {
    // brak miejsca lub dostępu: pomijamy
  }
}

export function isUnlockedLocal(sessionId: string, pointId: string): boolean {
  return read(sessionId).includes(pointId)
}

export function markUnlocked(sessionId: string, pointId: string) {
  const ids = read(sessionId)
  if (!ids.includes(pointId)) write(sessionId, [...ids, pointId])
}

export function forgetUnlocked(sessionId: string, pointId: string) {
  write(
    sessionId,
    read(sessionId).filter((id) => id !== pointId)
  )
}