const FLAG = 'questownik:chunk-reload'

type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

export function safeSessionStorage(): Store | null {
  try {
    return window.sessionStorage
  } catch {
    return null
  }
}

const CHUNK_RE =
  /loading chunk [\w-]+ failed|loading css chunk|failed to fetch dynamically imported module|error loading dynamically imported module|importing a module script failed/i

// Błąd pobrania części aplikacji (np. po nowym wdrożeniu, gdy stare pliki zniknęły z serwera)
export function isChunkLoadError(error: unknown): boolean {
  if (typeof error === 'string') return CHUNK_RE.test(error)
  if (typeof error !== 'object' || error === null) return false
  const e = error as { name?: unknown; message?: unknown }
  if (e.name === 'ChunkLoadError') return true
  return typeof e.message === 'string' && CHUNK_RE.test(e.message)
}

// Zwraca true tylko raz na sesję przeglądarki. Bez dostępu do pamięci zwraca false,
// żeby nie wpaść w pętlę przeładowań.
export function tryChunkReload(store: Store | null): boolean {
  if (!store) return false
  try {
    if (store.getItem(FLAG)) return false
    store.setItem(FLAG, String(Date.now()))
    return true
  } catch {
    return false
  }
}

export function clearChunkReloadFlag(store: Store | null) {
  try {
    store?.removeItem(FLAG)
  } catch {
    // pomijamy
  }
}