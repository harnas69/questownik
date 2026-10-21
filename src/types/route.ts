export const TASK_TYPES = ['text', 'quiz', 'open', 'code', 'photo'] as const
export type TaskType = (typeof TASK_TYPES)[number]

export const TASK_LABELS: Record<TaskType, string> = {
  text: 'Informacja (sam tekst)',
  quiz: 'Quiz (A/B/C/D)',
  open: 'Pytanie otwarte',
  code: 'Kod z tabliczki',
  photo: 'Zdjęcie',
}

export interface TaskContent {
  prompt: string
  options?: string[]
  correctIndex?: number
  answer?: string
}

export interface DraftPoint {
  lat: number
  lng: number
  radiusM: number
  taskType: TaskType
  content: TaskContent
  score: number
  hint: string
}

export interface DraftRoute {
  title: string
  points: DraftPoint[]
}