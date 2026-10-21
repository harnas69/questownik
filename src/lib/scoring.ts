import type { GamePoint } from '../types/game'

export function normalize(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/ł/g, 'l')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
}

export function checkAnswer(point: GamePoint, given: string | number): boolean {
  if (point.taskType === 'quiz') return given === point.content.correctIndex
  if (point.taskType === 'open' || point.taskType === 'code')
    return normalize(String(given)) === normalize(point.content.answer ?? '')
  return true // text i photo: wystarczy potwierdzenie
}

// Pierwsza próba: pełne punkty, kolejne: połowa.
export function pointsFor(score: number, attempts: number): number {
  return attempts <= 1 ? score : Math.floor(score / 2)
}