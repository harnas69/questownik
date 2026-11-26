import { describe, it, expect } from 'vitest'
import {
  LIMITS,
  addOption,
  errorId,
  fieldId,
  newPoint,
  parseScore,
  removeOption,
  validatePoints,
  validateRoute,
} from './points'
import type { ValidationError } from './points'
import type { DraftPoint } from '../types/route'

const ok = (over: Partial<DraftPoint> = {}): DraftPoint => ({
  ...newPoint(51.7, 18.1),
  content: { prompt: 'Pytanie' },
  ...over,
})
const quiz = (options: string[], correctIndex = 0): DraftPoint =>
  ok({ taskType: 'quiz', content: { prompt: 'Ile?', options, correctIndex } })
const where = (errs: ValidationError[]) =>
  errs.map((e) => `${e.point}:${e.field}${e.option ?? ''}`)

describe('validateRoute', () => {
  it('poprawna trasa nie ma błędów', () => {
    expect(validateRoute('Kalisz', [ok(), quiz(['a', 'b'])])).toEqual([])
  })

  it('brak tytułu i punktów daje oba błędy naraz', () => {
    expect(where(validateRoute('  ', []))).toEqual(['null:title', 'null:points'])
  })

  it('za długi tytuł i za dużo punktów', () => {
    expect(where(validateRoute('x'.repeat(LIMITS.title + 1), [ok()]))).toEqual(['null:title'])
    const many = Array.from({ length: LIMITS.points + 1 }, () => ok())
    expect(where(validatePoints(many))).toEqual(['null:points'])
  })
})

describe('validatePoints: treść zadania', () => {
  it('pusta i za długa treść', () => {
    expect(where(validatePoints([ok({ content: { prompt: '  ' } })]))).toEqual(['0:prompt'])
    const long = ok({ content: { prompt: 'x'.repeat(LIMITS.prompt + 1) } })
    expect(where(validatePoints([long]))).toEqual(['0:prompt'])
  })

  it('komunikaty mają wersję z numerem punktu i bez niego', () => {
    const [e] = validatePoints([ok({ content: { prompt: '' } })])
    expect(e.message).toBe('Punkt 1: uzupełnij treść zadania.')
    expect(e.text).toBe('Uzupełnij treść zadania.')
  })
})

describe('validatePoints: quiz', () => {
  it('pusta odpowiedź wskazuje konkretną odpowiedź', () => {
    expect(where(validatePoints([quiz(['a', ''])]))).toEqual(['0:option1'])
  })

  it('duplikaty ignorują wielkość liter i odstępy', () => {
    const errs = validatePoints([quiz(['Tak', '  tak ', 'nie'])])
    expect(where(errs)).toEqual(['0:option1'])
    expect(errs[0].message).toContain('powtarza odpowiedź A')
  })

  it('za długa odpowiedź', () => {
    expect(where(validatePoints([quiz(['a', 'x'.repeat(LIMITS.option + 1)])]))).toEqual([
      '0:option1',
    ])
  })
})

describe('validatePoints: pozostałe pola', () => {
  it('pytanie otwarte i kod wymagają odpowiedzi', () => {
    const open = ok({ taskType: 'open', content: { prompt: 'x', answer: ' ' } })
    const code = ok({ taskType: 'code', content: { prompt: 'x', answer: '' } })
    expect(where(validatePoints([open, code]))).toEqual(['0:answer', '1:answer'])
    const long = ok({ taskType: 'open', content: { prompt: 'x', answer: 'y'.repeat(LIMITS.answer + 1) } })
    expect(where(validatePoints([long]))).toEqual(['0:answer'])
  })

  it('podpowiedź i liczba punktów', () => {
    expect(where(validatePoints([ok({ hint: 'h'.repeat(LIMITS.hint + 1) })]))).toEqual(['0:hint'])
    for (const score of [-1, 1.5, 1001]) {
      expect(where(validatePoints([ok({ score })]))).toEqual(['0:score'])
    }
    expect(validatePoints([ok({ score: 0 }), ok({ score: 1000 })])).toEqual([])
  })

  it('zwraca wszystkie błędy, w kolejności punktów', () => {
    const errs = validatePoints([ok({ content: { prompt: '' } }), quiz(['a', 'a'])])
    expect(where(errs)).toEqual(['0:prompt', '1:option1'])
  })
})

describe('identyfikatory pól', () => {
  it('są stabilne i mają wersję dla komunikatu', () => {
    expect(fieldId(null, 'title')).toBe('route-title')
    expect(fieldId(null, 'points')).toBe('add-point-btn')
    expect(fieldId(2, 'prompt')).toBe('pt2-prompt')
    expect(fieldId(1, 'option', 3)).toBe('pt1-option3')
    expect(errorId(2, 'prompt')).toBe('pt2-prompt-error')
  })
})

describe('parseScore', () => {
  it('przyjmuje liczby całkowite z zakresu', () => {
    expect(parseScore('10')).toBe(10)
    expect(parseScore(' 0 ')).toBe(0)
    expect(parseScore('1000')).toBe(1000)
  })

  it('odrzuca puste, ułamki, ujemne i zbyt duże', () => {
    for (const bad of ['', '  ', '1,5', '-3', '1001', 'abc', '12a']) {
      expect(parseScore(bad)).toBeNull()
    }
  })
})

describe('opcje quizu', () => {
  const c = { prompt: 'x', options: ['a', 'b', 'c', 'd'], correctIndex: 2 }

  it('addOption dodaje pustą odpowiedź do czterech', () => {
    const three = addOption({ prompt: 'x', options: ['a', 'b', 'c'], correctIndex: 0 })
    expect(three.options).toEqual(['a', 'b', 'c', ''])
    expect(addOption(c)).toBe(c)
  })

  it('removeOption przesuwa poprawną odpowiedź', () => {
    expect(removeOption(c, 0).correctIndex).toBe(1)
    expect(removeOption(c, 3).correctIndex).toBe(2)
    expect(removeOption(c, 2)).toMatchObject({ options: ['a', 'b', 'd'], correctIndex: 0 })
  })

  it('nie zejdzie poniżej dwóch odpowiedzi', () => {
    const two = { prompt: 'x', options: ['a', 'b'], correctIndex: 0 }
    expect(removeOption(two, 1)).toBe(two)
  })
})