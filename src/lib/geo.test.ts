import { describe, it, expect } from 'vitest'
import { distanceM, isInRange } from './geo'

describe('distanceM', () => {
  it('0 dla tego samego punktu', () => {
    expect(distanceM(51.76, 18.09, 51.76, 18.09)).toBe(0)
  })
  it('0,001 stopnia szerokości to około 111 m', () => {
    expect(distanceM(51.76, 18.09, 51.761, 18.09)).toBeCloseTo(111.2, 0)
  })
})

describe('isInRange', () => {
  const target = { lat: 51.76, lng: 18.09, radiusM: 30 }
  it('wewnątrz promienia', () => {
    expect(isInRange({ lat: 51.76, lng: 18.09, accuracy: 5 }, target)).toBe(true)
  })
  it('daleko od punktu', () => {
    expect(isInRange({ lat: 51.761, lng: 18.09, accuracy: 5 }, target)).toBe(false)
  })
  it('słaby GPS daje tolerancję, ale maksymalnie 25 m', () => {
    // około 50 m od punktu
    const pos = { lat: 51.76045, lng: 18.09, accuracy: 500 }
    expect(isInRange(pos, target)).toBe(true) // 50 <= 30 + 25
    const far = { lat: 51.7609, lng: 18.09, accuracy: 500 } // około 100 m
    expect(isInRange(far, target)).toBe(false)
  })
})