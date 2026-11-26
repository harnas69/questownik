import { describe, it, expect } from 'vitest'
import { playTitle, rankingTitle, titleOf } from './pageTitle'

const base = { error: false, routeTitle: 'Kalisz', started: true, index: 0, total: 5 }

describe('titleOf', () => {
  it('łączy części i dopisuje nazwę serwisu, pomijając puste', () => {
    expect(titleOf('Ranking', null, '')).toBe('Ranking – Questownik')
    expect(titleOf()).toBe('Questownik')
  })
})

describe('playTitle', () => {
  it('opisuje kolejne etapy gry', () => {
    expect(playTitle({ ...base, routeTitle: null })).toBe('Wczytuję trasę – Questownik')
    expect(playTitle({ ...base, error: true })).toBe('Błąd – Questownik')
    expect(playTitle({ ...base, started: false })).toBe('Start: Kalisz – Questownik')
    expect(playTitle({ ...base, index: 1 })).toBe('Zadanie 2 z 5: Kalisz – Questownik')
    expect(playTitle({ ...base, index: 5 })).toBe('Koniec trasy: Kalisz – Questownik')
  })
})

describe('rankingTitle', () => {
  it('używa nazwy trasy, gdy jest znana', () => {
    expect(rankingTitle('Kalisz')).toBe('Ranking: Kalisz – Questownik')
    expect(rankingTitle(null)).toBe('Ranking – Questownik')
  })
})