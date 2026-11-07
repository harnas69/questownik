export const TASK_TYPES = ['text', 'quiz', 'open', 'code', 'photo'] as const
export type TaskType = (typeof TASK_TYPES)[number]

export const TASK_LABELS: Record<TaskType, string> = {
  text: 'Informacja (sam tekst)',
  quiz: 'Quiz (A/B/C/D)',
  open: 'Pytanie otwarte',
  code: 'Kod z tabliczki',
  photo: 'Zdjęcie',
}

export const UNLOCK_MODES = ['gps', 'qr'] as const
export type UnlockMode = (typeof UNLOCK_MODES)[number]

export const UNLOCK_LABELS: Record<UnlockMode, string> = {
  gps: 'GPS: dojście na miejsce',
  qr: 'Kod QR: zeskanowanie kartki',
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
  unlock: UnlockMode
}

export interface DraftRoute {
  title: string
  points: DraftPoint[]
}