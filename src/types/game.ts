import type { TaskContent, TaskType } from './route'

export interface GamePoint {
  id: string
  lat: number
  lng: number
  radiusM: number
  taskType: TaskType
  content: TaskContent
  score: number
  hint: string | null
}

export interface GameRoute {
  id: string
  code: string
  title: string
  allowManual: boolean
  points: GamePoint[]
}

export interface AnswerResult {
  correct: boolean
  earned: number
  attempts: number
  currentIdx: number
  score: number
  correctCount: number
  finishedAt: string | null
}

export interface SessionState {
  teamName: string
  currentIdx: number
  score: number
  correctCount: number
  startedAt: string
  finishedAt: string | null
}