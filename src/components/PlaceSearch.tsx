import { useEffect, useId, useRef, useState } from 'react'
import type { FormEvent, KeyboardEvent } from 'react'
import ExternalLink from './ExternalLink'
import { GeocodeError, MIN_QUERY, searchPlaces, shortLabel } from '../lib/geocode'
import type { Bias, GeoResult } from '../lib/geocode'
import { plural } from '../lib/plural'

interface Props {
  compact?: boolean
  getBias?: () => Bias | undefined
  onShow: (lat: number, lng: number) => void
  onAdd: (lat: number, lng: number) => void
}

type Status = 'idle' | 'loading' | 'done' | 'error'

function errorText(e: unknown): string {
  if (e instanceof GeocodeError) {
    if (e.kind === 'rate') {
      return 'Serwer wyszukiwania prosi o zwolnienie tempa. Spróbuj za kilka sekund.'
    }
    if (e.kind === 'network') {
      return 'Brak połączenia z wyszukiwarką adresów. Sprawdź internet i spróbuj ponownie.'
    }
    return 'Wyszukiwarka adresów nie odpowiedziała poprawnie. Spróbuj ponownie za chwilę.'
  }
  return 'Nie udało się wyszukać adresu. Spróbuj ponownie.'
}

export default function PlaceSearch({ compact = false, getBias, onShow, onAdd }: Props) {
  const uid = useId()
  const inputId = `${uid}-q`
  const hintId = `${uid}-hint`
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [results, setResults] = useState<GeoResult[]>([])
  const [asked, setAsked] = useState('')
  const [message, setMessage] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => () => abortRef.current?.abort(), [])

  const clear = () => {
    abortRef.current?.abort()
    setResults([])
    setStatus('idle')
    setMessage('')
  }

  // Zapytanie wysyła tylko Enter albo przycisk: Nominatim nie obsługuje wyszukiwania w trakcie pisania
  const run = async (e: FormEvent) => {
    e.preventDefault()
    const q = query.trim()
    if (q.length < MIN_QUERY) {
      setResults([])
      setStatus('error')
      setMessage(`Wpisz adres lub nazwę miejsca (co najmniej ${MIN_QUERY} znaki).`)
      inputRef.current?.focus()
      return
    }
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl
    setStatus('loading')
    setResults([])
    setAsked(q)
    setMessage('Szukam…')
    try {
      const found = await searchPlaces(q, { bias: getBias?.(), signal: ctrl.signal })
      if (ctrl.signal.aborted) return
      setResults(found)
      setStatus('done')
      setMessage(
        found.length === 0
          ? `Nie znaleziono miejsca „${q}”. Spróbuj dopisać miasto albo użyć innej nazwy.`
          : `Znaleziono ${found.length} ${plural(found.length, 'miejsce', 'miejsca', 'miejsc')}. Naciśnij Tab, aby przejść do wyników.`
      )
    } catch (err) {
      if (ctrl.signal.aborted) return
      console.error(err)
      setResults([])
      setStatus('error')
      setMessage(errorText(err))
    }
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape' && (results.length > 0 || message)) {
      e.preventDefault()
      clear()
    }
  }

  const body = (
    <>
      <form className="place-form" role="search" onSubmit={(e) => void run(e)} noValidate>
        <label htmlFor={inputId} className="field-label">
          Szukaj adresu
        </label>
        <div className="place-row">
          <input
            id={inputId}
            ref={inputRef}
            type="search"
            enterKeyHint="search"
            autoComplete="off"
            spellCheck={false}
            maxLength={120}
            placeholder="np. Rynek, Kalisz"
            value={query}
            aria-describedby={hintId}
            aria-invalid={status === 'error' ? true : undefined}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
          />
          <button type="submit" disabled={status === 'loading'}>
            {status === 'loading' ? 'Szukam…' : 'Szukaj'}
          </button>
        </div>
        <p id={hintId} className="note">
          Wpisz adres lub nazwę miejsca i naciśnij Enter. Wpisany tekst jest wysyłany do serwerów
          OpenStreetMap, a zapytania są ograniczone do jednego na sekundę. Esc czyści wyniki.
        </p>
      </form>

      <p role="status" aria-live="polite" className={message && status !== 'error' ? 'note' : 'sr-only'}>
        {status !== 'error' ? message : ''}
      </p>
      {status === 'error' && message && (
        <p role="alert" className="bad">
          {message}
        </p>
      )}

      {results.length > 0 && (
        <>
          <ul className="place-results" aria-label={`Wyniki wyszukiwania: ${asked}`}>
            {results.map((r) => (
              <li key={r.id} className="place-item">
                <span className="place-label">{r.label}</span>
                <span className="row">
                  <button
                    type="button"
                    onClick={() => {
                      onShow(r.lat, r.lng)
                      setMessage(`Pokazano na mapie: ${shortLabel(r.label)}.`)
                    }}
                  >
                    Pokaż na mapie
                    <span className="sr-only">: {shortLabel(r.label)}</span>
                  </button>
                  <button
                    type="button"
                    className="primary"
                    onClick={() => {
                      onAdd(r.lat, r.lng)
                      setMessage(`Dodano punkt: ${shortLabel(r.label)}.`)
                    }}
                  >
                    Dodaj punkt tutaj
                    <span className="sr-only">: {shortLabel(r.label)}</span>
                  </button>
                </span>
              </li>
            ))}
          </ul>
          <p className="note">
            Wyniki: Nominatim, dane ©{' '}
            <ExternalLink href="https://www.openstreetmap.org/copyright">
              współtwórcy OpenStreetMap
            </ExternalLink>
            .
          </p>
        </>
      )}
    </>
  )

  if (compact) {
    return (
      <details className="card place-search">
        <summary>Szukaj adresu</summary>
        {body}
      </details>
    )
  }
  return <div className="place-search">{body}</div>
}