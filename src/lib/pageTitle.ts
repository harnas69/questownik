export const SITE = 'Questownik'

export function titleOf(...parts: (string | null | undefined)[]): string {
  return [...parts.filter((p): p is string => Boolean(p && p.trim())), SITE].join(' – ')
}

export interface PlayPhase {
  error: boolean
  routeTitle: string | null
  started: boolean
  index: number
  total: number
}

// Tytuł karty zmienia się wraz z postępem gry: start, zadanie N z M, koniec
export function playTitle(p: PlayPhase): string {
  if (p.error) return titleOf('Błąd')
  if (!p.routeTitle) return titleOf('Wczytuję trasę')
  if (!p.started) return titleOf(`Start: ${p.routeTitle}`)
  if (p.index >= p.total) return titleOf(`Koniec trasy: ${p.routeTitle}`)
  return titleOf(`Zadanie ${p.index + 1} z ${p.total}: ${p.routeTitle}`)
}

export function rankingTitle(routeTitle: string | null | undefined): string {
  return routeTitle ? titleOf(`Ranking: ${routeTitle}`) : titleOf('Ranking')
}