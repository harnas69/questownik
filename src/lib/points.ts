import type { DraftPoint, TaskContent, TaskType } from '../types/route'

export function newPoint(lat: number, lng: number): DraftPoint {
  return {
    lat,
    lng,
    radiusM: 30,
    taskType: 'text',
    content: { prompt: '' },
    score: 10,
    hint: '',
  }
}

export function contentFor(type: TaskType, prev: TaskContent): TaskContent {
  const prompt = prev.prompt
  if (type === 'quiz') return { prompt, options: ['', '', '', ''], correctIndex: 0 }
  if (type === 'open' || type === 'code') return { prompt, answer: '' }
  return { prompt }
}

export function moveItem<T>(arr: T[], from: number, to: number): T[] {
  if (from < 0 || from >= arr.length || to < 0 || to >= arr.length) return arr
  const copy = [...arr]
  const [item] = copy.splice(from, 1)
  copy.splice(to, 0, item)
  return copy
}

export function validatePoints(points: DraftPoint[]): string | null {
  for (let i = 0; i < points.length; i++) {
    const p = points[i]
    const n = i + 1
    if (!p.content.prompt.trim()) return `Punkt ${n}: uzupełnij treść zadania.`
    if (p.taskType === 'quiz' && (p.content.options ?? []).some((o) => !o.trim()))
      return `Punkt ${n}: uzupełnij wszystkie odpowiedzi quizu.`
    if ((p.taskType === 'open' || p.taskType === 'code') && !(p.content.answer ?? '').trim())
      return `Punkt ${n}: podaj poprawną odpowiedź.`
  }
  return null
}