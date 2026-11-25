const NETWORK_RE =
  /failed to fetch|networkerror|network request failed|load failed|fetch failed|network error/i

function browserOnline(): boolean | undefined {
  return typeof navigator === 'undefined' ? undefined : navigator.onLine
}

// Czy błąd wygląda na brak połączenia, a nie na odmowę serwera?
export function isNetworkError(
  e: unknown,
  online: boolean | undefined = browserOnline()
): boolean {
  if (online === false) return true
  if (typeof e === 'string') return NETWORK_RE.test(e)
  if (typeof e !== 'object' || e === null) return false
  const err = e as { message?: unknown; details?: unknown; name?: unknown }
  if (err.name === 'AuthRetryableFetchError') return true
  const text = [err.message, err.details]
    .filter((x): x is string => typeof x === 'string')
    .join(' ')
  return NETWORK_RE.test(text)
}