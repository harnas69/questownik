import { useState } from 'react'

export type ThemeChoice = 'auto' | 'light' | 'dark'

const KEY = 'questownik:theme'

export function readTheme(): ThemeChoice {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'light' || v === 'dark' ? v : 'auto'
  } catch {
    return 'auto'
  }
}

export function applyTheme(t: ThemeChoice) {
  const el = document.documentElement
  if (t === 'auto') el.removeAttribute('data-theme')
  else el.setAttribute('data-theme', t)
}

export function useTheme() {
  const [theme, setTheme] = useState<ThemeChoice>(readTheme)

  const set = (t: ThemeChoice) => {
    setTheme(t)
    applyTheme(t)
    try {
      if (t === 'auto') localStorage.removeItem(KEY)
      else localStorage.setItem(KEY, t)
    } catch {
      // brak dostępu do pamięci: motyw działa do końca sesji
    }
  }

  return { theme, set }
}