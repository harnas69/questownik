import type { TaskType } from '../types/route'

const LABELS: Record<TaskType, string> = {
  quiz: 'quiz',
  open: 'pytanie otwarte',
  code: 'kod',
  photo: 'zdjęcie',
  text: 'informacja',
}

const ORDER: TaskType[] = ['quiz', 'open', 'code', 'photo', 'text']

// Np. { quiz: 3, photo: 1 } -> "quiz ×3, zdjęcie ×1"
export function summarizeTypes(types: Partial<Record<TaskType, number>>): string {
  return ORDER.filter((t) => (types[t] ?? 0) > 0)
    .map((t) => `${LABELS[t]} ×${types[t]}`)
    .join(', ')
}