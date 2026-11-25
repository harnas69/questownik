import { describe, it, expect } from 'vitest'
import { isNetworkError } from './network'

describe('isNetworkError', () => {
  it('rozpoznaje typowe komunikaty przeglądarek', () => {
    expect(isNetworkError(new TypeError('Failed to fetch'), true)).toBe(true)
    expect(isNetworkError({ message: 'TypeError: Load failed' }, true)).toBe(true)
    expect(
      isNetworkError({ message: 'NetworkError when attempting to fetch resource.' }, true)
    ).toBe(true)
    expect(isNetworkError({ message: '', details: 'TypeError: Failed to fetch' }, true)).toBe(true)
    expect(isNetworkError('Network request failed', true)).toBe(true)
  })

  it('rozpoznaje błąd ponawiania żądania logowania', () => {
    expect(isNetworkError({ name: 'AuthRetryableFetchError', message: 'x' }, true)).toBe(true)
  })

  it('nie myli odmowy serwera z brakiem sieci', () => {
    expect(isNetworkError({ message: 'new row violates row-level security policy' }, true)).toBe(
      false
    )
    expect(isNetworkError({ message: 'session not found' }, true)).toBe(false)
    expect(isNetworkError(null, true)).toBe(false)
    expect(isNetworkError(undefined, true)).toBe(false)
  })

  it('gdy przeglądarka jest offline, każdy błąd traktuje jako sieciowy', () => {
    expect(isNetworkError({ message: 'cokolwiek' }, false)).toBe(true)
  })
})