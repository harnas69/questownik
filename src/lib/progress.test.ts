import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest'
import { clearProgress, loadProgress, parseProgress, saveProgress } from './progress'
import { memoryStorage } from './testUtils'
import type { SessionState } from '../types/game'

const snapshot: SessionState = {
  teamName: 'Ala',
  currentIdx: 2,
  score: 20,
  correctCount: 2,
  startedAt: '2026-11-25T10:00:00Z',
  finishedAt: null,
}

beforeEach(() => {
  vi.stubGlobal('localStorage', memoryStorage())
})
afterEach(() => {
  vi.unstubAllGlobals()
})

describe('saveProgress / loadProgress', () => {
  it('zapisuje i odczytuje sesję razem z ostatnim znanym stanem', () => {
    saveProgress('ABC123', { sessionId: 's1', team: 'Ala', snapshot })
    const p = loadProgress('ABC123')
    expect(p?.sessionId).toBe('s1')
    expect(p?.team).toBe('Ala')
    expect(p?.snapshot).toEqual(snapshot)
    expect(typeof p?.savedAt).toBe('number')
  })

  it('zapis bez stanu (stary format) nadal się wczytuje', () => {
    saveProgress('ABC123', { sessionId: 's1', team: 'Ala' })
    const p = loadProgress('ABC123')
    expect(p).toEqual({ sessionId: 's1', team: 'Ala' })
  })

  it('kody gier nie mieszają się ze sobą', () => {
    saveProgress('AAA111', { sessionId: 's1', team: 'A' })
    saveProgress('BBB222', { sessionId: 's2', team: 'B' })
    expect(loadProgress('AAA111')?.sessionId).toBe('s1')
    expect(loadProgress('BBB222')?.sessionId).toBe('s2')
  })

  it('clearProgress usuwa zapis', () => {
    saveProgress('ABC123', { sessionId: 's1', team: 'Ala', snapshot })
    clearProgress('ABC123')
    expect(loadProgress('ABC123')).toBeNull()
  })

  it('brak dostępu do pamięci nie przerywa gry', () => {
    vi.stubGlobal('localStorage', {
      ...memoryStorage(),
      getItem: () => {
        throw new Error('denied')
      },
      setItem: () => {
        throw new Error('denied')
      },
    })
    expect(() => saveProgress('ABC123', { sessionId: 's1', team: 'Ala' })).not.toThrow()
    expect(loadProgress('ABC123')).toBeNull()
  })
})

describe('parseProgress', () => {
  it('odrzuca uszkodzony JSON i brakujące pola', () => {
    expect(parseProgress(null)).toBeNull()
    expect(parseProgress('{nie json')).toBeNull()
    expect(parseProgress('{}')).toBeNull()
    expect(parseProgress(JSON.stringify({ sessionId: 1, team: 'x' }))).toBeNull()
  })

  it('uszkodzony stan jest pomijany, a sesja zostaje', () => {
    const raw = JSON.stringify({
      sessionId: 's1',
      team: 'Ala',
      snapshot: { teamName: 'Ala', currentIdx: -1, score: 'dużo' },
    })
    expect(parseProgress(raw)).toEqual({ sessionId: 's1', team: 'Ala' })
  })
})