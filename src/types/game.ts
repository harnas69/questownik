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
  points: GamePoint[]
}

export interface PointResult {
  pointId: string
  correct: boolean
  earned: number
  attempts: number
}