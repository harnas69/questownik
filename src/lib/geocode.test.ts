import { describe, it, expect, vi } from 'vitest'
import {
  GeocodeError,
  MIN_QUERY,
  buildUrl,
  createGeocoder,
  createLimiter,
  parseResults,
  shortLabel,
} from './geocode'
import type { Limiter } from './geocode'

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

const place = (id: number, lat = '51.76', lon = '18.09', name = `Miejsce ${id}`) => ({
  place_id: id,
  lat,
  lon,
  display_name: name,
})

const immediate: Limiter = (task) => task()

describe('buildUrl', () => {
  it('buduje zapytanie po polsku z limitem wyników', () => {
    const u = new URL(buildUrl('Rynek Kalisz'))
    expect(u.origin + u.pathname).toBe('https://nominatim.openstreetmap.org/search')
    expect(u.searchParams.get('q')).toBe('Rynek Kalisz')
    expect(u.searchParams.get('format')).toBe('jsonv2')
    expect(u.searchParams.get('limit')).toBe('5')
    expect(u.searchParams.get('accept-language')).toBe('pl')
    expect(u.searchParams.has('viewbox')).toBe(false)
  })

  it('dodaje widok mapy jako podpowiedź, a nie ograniczenie', () => {
    const u = new URL(buildUrl('x', { west: 18, south: 51.7, east: 18.2, north: 51.8 }))
    expect(u.searchParams.get('viewbox')).toBe('18.00000,51.80000,18.20000,51.70000')
    expect(u.searchParams.get('bounded')).toBe('0')
  })

  it('koduje znaki specjalne', () => {
    const u = new URL(buildUrl('ul. Złota 1 & 2'))
    expect(u.searchParams.get('q')).toBe('ul. Złota 1 & 2')
  })
})

describe('parseResults', () => {
  it('zamienia odpowiedź Nominatim na wyniki', () => {
    expect(parseResults([place(1, '51.76', '18.09', 'Rynek, Kalisz')])).toEqual([
      { id: '1', label: 'Rynek, Kalisz', lat: 51.76, lng: 18.09 },
    ])
  })

  it('pomija wpisy bez współrzędnych, spoza zakresu, bez nazwy i duplikaty', () => {
    const out = parseResults([
      place(1),
      place(1),
      place(2, '', '18'),
      place(3, '95', '18'),
      place(4, '51', '200'),
      place(5, '51', '18', '  '),
      null,
      'tekst',
    ])
    expect(out.map((r) => r.id)).toEqual(['1'])
  })

  it('rzuca błąd formatu, gdy odpowiedź nie jest listą', () => {
    expect(() => parseResults({ error: 'x' })).toThrow(GeocodeError)
  })
})

describe('shortLabel', () => {
  it('zostawia dwa pierwsze człony nazwy', () => {
    expect(shortLabel('Rynek, Śródmieście I, Kalisz, Polska')).toBe('Rynek, Śródmieście I')
    expect(shortLabel('Kalisz')).toBe('Kalisz')
  })
})

describe('createLimiter', () => {
  const fakeClock = () => {
    let t = 0
    return {
      now: () => t,
      sleep: async (ms: number) => {
        t += ms
      },
    }
  }

  it('pierwsze zadanie startuje od razu, kolejne po odstępie', async () => {
    const clock = fakeClock()
    const run = createLimiter(1000, clock)
    const starts: number[] = []
    const task = async () => {
      starts.push(clock.now())
    }
    await Promise.all([run(task), run(task), run(task)])
    expect(starts).toEqual([0, 1000, 2000])
  })

  it('wycofane zadanie nie jest uruchamiane i nie zużywa limitu', async () => {
    const clock = fakeClock()
    const run = createLimiter(1000, clock)
    const ctrl = new AbortController()
    const task = vi.fn(async () => 'ok')
    const first = run(task)
    const second = run(task, ctrl.signal)
    ctrl.abort()
    const third = run(task)
    await first
    await expect(second).rejects.toMatchObject({ name: 'AbortError' })
    await third
    expect(task).toHaveBeenCalledTimes(2)
  })

  it('błąd jednego zadania nie blokuje kolejnych', async () => {
    const run = createLimiter(0, { now: () => 0, sleep: async () => {} })
    await expect(run(async () => Promise.reject(new Error('x')))).rejects.toThrow('x')
    await expect(run(async () => 'dalej')).resolves.toBe('dalej')
  })
})

describe('createGeocoder', () => {
  const make = (fetchFn: ReturnType<typeof vi.fn>) =>
    createGeocoder({ fetchFn: fetchFn as unknown as typeof fetch, limiter: immediate })

  it('zwraca wyniki i wysyła nagłówki identyfikujące aplikację', async () => {
    const fetchFn = vi.fn(async () => json([place(1)]))
    const results = await make(fetchFn).search('Rynek Kalisz')
    expect(results).toHaveLength(1)
    const [, init] = fetchFn.mock.calls[0] as unknown as [string, RequestInit]
    expect(init.headers).toMatchObject({ Accept: 'application/json' })
    expect(init.referrerPolicy).toBe('strict-origin-when-cross-origin')
  })

  it('pamięta wyniki: to samo zapytanie nie wysyła drugiego żądania', async () => {
    const fetchFn = vi.fn(async () => json([place(1)]))
    const g = make(fetchFn)
    await g.search('Rynek Kalisz')
    await g.search('  rynek   kalisz ')
    expect(fetchFn).toHaveBeenCalledTimes(1)
  })

  it('zbyt krótkie zapytanie nie wysyła nic', async () => {
    const fetchFn = vi.fn(async () => json([]))
    expect(await make(fetchFn).search('a'.repeat(MIN_QUERY - 1))).toEqual([])
    expect(fetchFn).not.toHaveBeenCalled()
  })

  it('rozróżnia rodzaje błędów', async () => {
    const kind = async (f: () => Promise<Response>) => {
      try {
        await make(vi.fn(f)).search('Rynek Kalisz')
        return 'ok'
      } catch (e) {
        return e instanceof GeocodeError ? e.kind : 'inny'
      }
    }
    expect(await kind(async () => json({}, 429))).toBe('rate')
    expect(await kind(async () => json({}, 503))).toBe('server')
    expect(await kind(async () => json({ nie: 'lista' }))).toBe('format')
    expect(await kind(async () => Promise.reject(new TypeError('Failed to fetch')))).toBe('network')
  })

  it('przerwane zapytanie przepuszcza AbortError bez zamiany na błąd sieci', async () => {
    const abort = new DOMException('Przerwano', 'AbortError')
    const g = make(vi.fn(async () => Promise.reject(abort)))
    await expect(g.search('Rynek Kalisz')).rejects.toBe(abort)
  })
})