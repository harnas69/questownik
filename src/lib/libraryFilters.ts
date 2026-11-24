import { LEVELS, SIZE_OPTIONS, SUBJECTS, TYPE_OPTIONS, labelOf } from './categories'

export interface LibraryFilters {
  subject: string
  level: string
  type: string
  size: string
  copyOnly: boolean
}

export const EMPTY_FILTERS: LibraryFilters = {
  subject: '',
  level: '',
  type: '',
  size: '',
  copyOnly: false,
}

export function countActive(f: LibraryFilters): number {
  return [f.subject, f.level, f.type, f.size].filter(Boolean).length + (f.copyOnly ? 1 : 0)
}

export interface ActiveChip {
  key: keyof LibraryFilters
  text: string
}

export function activeChips(f: LibraryFilters): ActiveChip[] {
  const out: ActiveChip[] = []
  if (f.subject) out.push({ key: 'subject', text: `Przedmiot: ${labelOf(SUBJECTS, f.subject) ?? f.subject}` })
  if (f.level) out.push({ key: 'level', text: `Poziom: ${labelOf(LEVELS, f.level) ?? f.level}` })
  if (f.type) out.push({ key: 'type', text: `Zadania: ${labelOf(TYPE_OPTIONS, f.type) ?? f.type}` })
  if (f.size) out.push({ key: 'size', text: `Długość: ${labelOf(SIZE_OPTIONS, f.size) ?? f.size}` })
  if (f.copyOnly) out.push({ key: 'copyOnly', text: 'Można kopiować' })
  return out
}

export function removeFilter(f: LibraryFilters, key: keyof LibraryFilters): LibraryFilters {
  const next = { ...f }
  if (key === 'copyOnly') next.copyOnly = false
  else next[key] = ''
  return next
}