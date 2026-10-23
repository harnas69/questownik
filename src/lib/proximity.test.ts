import { describe, it, expect } from 'vitest'
import { proximity } from './proximity'

describe('proximity', () => {
  it('w promieniu punktu jesteś na miejscu', () => {
    expect(proximity(25, 30)).toBe('here')
  })
  it('kolejne progi odległości', () => {
    expect(proximity(80, 30)).toBe('veryNear')
    expect(proximity(250, 30)).toBe('near')
    expect(proximity(800, 30)).toBe('onTheWay')
    expect(proximity(5000, 30)).toBe('far')
  })
})