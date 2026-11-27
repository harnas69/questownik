export interface GeoResult {
  id: string
  label: string
  lat: number
  lng: number
}

export interface Bias {
  west: number
  south: number
  east: number
  north: number
}

export const MIN_QUERY = 3
export const MAX_QUERY = 120
// Nominatim: najwyżej 1 zapytanie na sekundę. Dodajemy zapas.
export const MIN_INTERVAL_MS = 1100
const ENDPOINT = 'https://nominatim.openstreetmap.org/search'

export type GeocodeErrorKind = 'rate' | 'network' | 'server' | 'format'

export class GeocodeError extends Error {
  readonly kind: GeocodeErrorKind
  constructor(kind: GeocodeErrorKind, message: string) {
    super(message)
    this.name = 'GeocodeError'
    this.kind = kind
  }
}

const abortError = () => new DOMException('Przerwano', 'AbortError')

function isAbort(e: unknown): boolean {
  return e instanceof DOMException && e.name === 'AbortError'
}

// ---- Kolejka z odstępem między zapytaniami ----

export type Limiter = <T>(task: () => Promise<T>, signal?: AbortSignal) => Promise<T>

interface Clock {
  now: () => number
  sleep: (ms: number) => Promise<void>
}

const realClock: Clock = {
  now: () => Date.now(),
  sleep: (ms) => new Promise<void>((resolve) => setTimeout(resolve, ms)),
}

// Zadania startują jedno po drugim, co najmniej intervalMs od siebie.
// Zadanie wycofane (signal.aborted) nie jest wysyłane i nie zużywa limitu.
export function createLimiter(intervalMs: number, clock: Clock = realClock): Limiter {
  let chain: Promise<unknown> = Promise.resolve()
  let lastStart = Number.NEGATIVE_INFINITY

  return <T>(task: () => Promise<T>, signal?: AbortSignal): Promise<T> => {
    const result = chain.then(async () => {
      if (signal?.aborted) throw abortError()
      const wait = lastStart + intervalMs - clock.now()
      if (wait > 0) await clock.sleep(wait)
      if (signal?.aborted) throw abortError()
      lastStart = clock.now()
      return task()
    })
    chain = result.catch(() => undefined)
    return result
  }
}

// ---- Zapytanie i odpowiedź ----

export function buildUrl(query: string, bias?: Bias): string {
  const p = new URLSearchParams({
    q: query,
    format: 'jsonv2',
    limit: '5',
    addressdetails: '0',
    'accept-language': 'pl',
  })
  if (bias) {
    // Podpowiedź, nie ograniczenie: wyniki z widocznego fragmentu mapy są wyżej
    p.set('viewbox', [bias.west, bias.north, bias.east, bias.south].map((n) => n.toFixed(5)).join(','))
    p.set('bounded', '0')
  }
  return `${ENDPOINT}?${p.toString()}`
}

function num(v: unknown): number {
  if (typeof v === 'number') return v
  if (typeof v === 'string' && v.trim() !== '') return Number(v)
  return Number.NaN
}

export function parseResults(data: unknown): GeoResult[] {
  if (!Array.isArray(data)) {
    throw new GeocodeError('format', 'Nieoczekiwana odpowiedź wyszukiwarki')
  }
  const seen = new Set<string>()
  const out: GeoResult[] = []
  for (const raw of data) {
    if (typeof raw !== 'object' || raw === null) continue
    const r = raw as Record<string, unknown>
    const lat = num(r.lat)
    const lng = num(r.lon)
    const label = typeof r.display_name === 'string' ? r.display_name.trim() : ''
    if (!label || !Number.isFinite(lat) || !Number.isFinite(lng)) continue
    if (Math.abs(lat) > 90 || Math.abs(lng) > 180) continue
    const id = String(r.place_id ?? `${lat},${lng}`)
    if (seen.has(id)) continue
    seen.add(id)
    out.push({ id, label, lat, lng })
  }
  return out
}

// "Rynek, Śródmieście I, Kalisz, ..." -> "Rynek, Śródmieście I"
export function shortLabel(label: string): string {
  return label.split(',').slice(0, 2).join(',').trim()
}

export interface GeocoderDeps {
  fetchFn?: typeof fetch
  limiter?: Limiter
}

export interface SearchOptions {
  bias?: Bias
  signal?: AbortSignal
}

export function createGeocoder(deps: GeocoderDeps = {}) {
  const limiter = deps.limiter ?? createLimiter(MIN_INTERVAL_MS)
  const doFetch: typeof fetch = deps.fetchFn ?? ((...args) => fetch(...args))
  const cache = new Map<string, GeoResult[]>()

  async function request(url: string, signal?: AbortSignal): Promise<GeoResult[]> {
    let res: Response
    try {
      res = await doFetch(url, {
        signal,
        headers: { Accept: 'application/json' },
        // Przeglądarka nie pozwala ustawić User-Agent. Nominatim akceptuje też Referer,
        // więc wysyłamy adres strony.
        referrerPolicy: 'strict-origin-when-cross-origin',
      })
    } catch (e) {
      if (isAbort(e)) throw e
      throw new GeocodeError('network', 'Brak połączenia z wyszukiwarką adresów')
    }
    if (res.status === 429) throw new GeocodeError('rate', 'Zbyt wiele zapytań')
    if (!res.ok) throw new GeocodeError('server', `Wyszukiwarka zwróciła błąd ${res.status}`)
    let data: unknown
    try {
      data = await res.json()
    } catch {
      throw new GeocodeError('format', 'Nieczytelna odpowiedź wyszukiwarki')
    }
    return parseResults(data)
  }

  return {
    async search(query: string, opts: SearchOptions = {}): Promise<GeoResult[]> {
      const q = query.trim().replace(/\s+/g, ' ').slice(0, MAX_QUERY)
      if (q.length < MIN_QUERY) return []
      const url = buildUrl(q, opts.bias)
      const key = `${q.toLowerCase()}|${
        opts.bias
          ? [opts.bias.west, opts.bias.south, opts.bias.east, opts.bias.north]
              .map((n) => n.toFixed(2))
              .join(',')
          : ''
      }`
      const hit = cache.get(key)
      if (hit) return hit
      const results = await limiter(() => request(url, opts.signal), opts.signal)
      cache.set(key, results)
      if (cache.size > 30) {
        const oldest = cache.keys().next().value
        if (oldest !== undefined) cache.delete(oldest)
      }
      return results
    },
  }
}

const geocoder = createGeocoder()

export function searchPlaces(query: string, opts?: SearchOptions): Promise<GeoResult[]> {
  return geocoder.search(query, opts)
}