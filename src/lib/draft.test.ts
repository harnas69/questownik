import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest'
import {
  canonical,
  clearDraft,
  draftKey,
  fingerprint,
  loadDraft,
  parseDraft,
  saveDraft,
  serializeDraft,
  worthSaving,
} from './draft'
import type { DraftData } from './draft'
import { newPoint } from './points'
import { memoryStorage } from './testUtils'
import type { DraftPoint } from '../types/route'

const quiz: DraftPoint = {
  ...newPoint(51.76, 18.09),
  taskType: 'quiz',
  content: { prompt: 'Ile to 2+2?', options: ['3', '4', '5', '6'], correctIndex: 1 },
}
const data: DraftData = {
  title: 'Kalisz',
  allowManual: true,
  points: [newPoint(51.7, 18.0), quiz],
}

beforeEach(() => {
  vi.stubGlobal('localStorage', memoryStorage())
})
afterEach(() => {
  vi.unstubAllGlobals()
})

describe('canonical / fingerprint', () => {
  it('nie zależy od kolejności kluczy', () => {
    expect(canonical({ a: 1, b: { c: 2, d: 3 } })).toBe(canonical({ b: { d: 3, c: 2 }, a: 1 }))
  })

  it('te same dane w innej kolejności kluczy dają ten sam odcisk', () => {
    const reordered: DraftData = {
      allowManual: data.allowManual,
      points: data.points.map((p) => ({ ...p, content: { ...p.content } })),
      title: data.title,
    }
    expect(fingerprint(reordered)).toBe(fingerprint(data))
  })

  it('zmiana treści zmienia odcisk', () => {
    expect(fingerprint({ ...data, title: 'Inna' })).not.toBe(fingerprint(data))
  })
})

describe('serializeDraft / parseDraft', () => {
  it('zapis i odczyt dają te same dane', () => {
    expect(parseDraft(serializeDraft(data, 1000))).toEqual({ ...data, savedAt: 1000 })
  })

  it('odrzuca śmieci i złe typy', () => {
    expect(parseDraft(null)).toBeNull()
    expect(parseDraft('x')).toBeNull()
    expect(parseDraft('{}')).toBeNull()
    expect(
      parseDraft(JSON.stringify({ title: 1, allowManual: true, points: [], savedAt: 1 }))
    ).toBeNull()
  })

  it('odrzuca szkic z uszkodzonym punktem', () => {
    const bad = JSON.stringify({
      title: 'x',
      allowManual: false,
      savedAt: 1,
      points: [{ ...newPoint(1, 2), lat: 200 }],
    })
    expect(parseDraft(bad)).toBeNull()
  })

  it('przyjmuje szkic bez punktów', () => {
    const raw = JSON.stringify({ title: 'Tylko tytuł', allowManual: false, savedAt: 5, points: [] })
    expect(parseDraft(raw)).toEqual({
      title: 'Tylko tytuł',
      allowManual: false,
      points: [],
      savedAt: 5,
    })
  })
})

describe('zapis w pamięci przeglądarki', () => {
  it('draftKey zawiera konto i trasę', () => {
    expect(draftKey('u1', null)).toBe('questownik:draft:u1:new')
    expect(draftKey('u1', 't9')).toBe('questownik:draft:u1:t9')
  })

  it('saveDraft i loadDraft działają, clearDraft usuwa', () => {
    const k = draftKey('u1', null)
    expect(saveDraft(k, data)).toBe(true)
    expect(loadDraft(k)?.title).toBe('Kalisz')
    clearDraft(k)
    expect(loadDraft(k)).toBeNull()
  })

  it('pusty szkic nie jest zapisywany i kasuje poprzedni', () => {
    const k = draftKey('u1', null)
    saveDraft(k, data)
    expect(worthSaving({ title: '  ', allowManual: false, points: [] })).toBe(false)
    expect(saveDraft(k, { title: '  ', allowManual: false, points: [] })).toBe(true)
    expect(loadDraft(k)).toBeNull()
  })

  it('saveDraft zwraca false, gdy pamięć odmawia zapisu', () => {
    vi.stubGlobal('localStorage', {
      ...memoryStorage(),
      setItem: () => {
        throw new Error('quota')
      },
    })
    expect(saveDraft(draftKey('u1', null), data)).toBe(false)
  })
})