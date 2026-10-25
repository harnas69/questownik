const storageKey = (code: string) => `questownik:teacher:${code}`

export function storeKey(code: string, key: string) {
  try {
    sessionStorage.setItem(storageKey(code), key)
  } catch {
    // pomijamy
  }
}

export function forgetKey(code: string) {
  try {
    sessionStorage.removeItem(storageKey(code))
  } catch {
    // pomijamy
  }
}

export function readKey(code: string): string {
  const fromHash = window.location.hash.replace(/^#/, '')
  if (fromHash) {
    storeKey(code, fromHash)
    return fromHash
  }
  try {
    return sessionStorage.getItem(storageKey(code)) ?? ''
  } catch {
    return ''
  }
}