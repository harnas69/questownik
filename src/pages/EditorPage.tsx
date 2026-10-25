import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import type { Map as LeafletMap } from 'leaflet'
import MapView from '../components/MapView'
import PointForm from '../components/PointForm'
import PointList from '../components/PointList'
import SharePanel from '../components/SharePanel'
import { saveRoute } from '../lib/routes'
import { moveItem, newPoint, validatePoints } from '../lib/points'
import { exportRoute, parseRoute } from '../lib/routeJson'
import { getRouteForEdit, isForbidden, updateRoute } from '../lib/teacherApi'
import { readKey } from '../lib/teacherKey'
import type { DraftPoint } from '../types/route'
import { useAuth } from '../lib/auth'

type LoadState = 'loading' | 'ready' | 'blocked' | 'denied' | 'error'

function saveErrorMessage(e: unknown, editing: boolean): string {
  const msg = (e as { message?: string } | null)?.message ?? ''
    if (msg.includes('account required')) {
    return 'Sesja wygasła. Zaloguj się ponownie w nowej karcie (nie zamykaj tej, żeby nie stracić punktów) i zapisz jeszcze raz.'
  }
  if (msg.includes('route limit')) {
    return 'Osiągnięto limit 100 tras na koncie. Usuń niepotrzebne trasy w panelu nauczyciela.'
  }
  if (editing && msg.includes('route has sessions')) {
    return 'Ktoś właśnie rozpoczął grę na tej trasie, więc nie można jej już edytować. Wróć do panelu nauczyciela.'
  }
  if (editing && msg.includes('forbidden')) {
    return 'Brak uprawnień: klucz nauczyciela jest nieprawidłowy.'
  }
  return editing ? 'Nie udało się zapisać zmian.' : 'Nie udało się zapisać trasy.'
}

export default function EditorPage() {
  const { code: editParam } = useParams()
  const auth = useAuth()
  const editing = editParam !== undefined
  const editCode = (editParam ?? '').toUpperCase()
  const [editKey] = useState(() => (editing ? readKey(editCode) : ''))
  const [loadState, setLoadState] = useState<LoadState>(() =>
    editing ? (editKey ? 'loading' : 'denied') : 'ready'
  )
  const [updated, setUpdated] = useState(false)

  const [title, setTitle] = useState('')
  const [points, setPoints] = useState<DraftPoint[]>([])
  const [selected, setSelected] = useState<number | null>(null)
  const [code, setCode] = useState<string | null>(null)
  const [teacherKey, setTeacherKey] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [locating, setLocating] = useState(false)
  const [allowManual, setAllowManual] = useState(false)

  const mapRef = useRef<LeafletMap | null>(null)
  const countRef = useRef(0)

  useEffect(() => {
    countRef.current = points.length
  }, [points.length])

  // Wczytanie trasy do edycji
  useEffect(() => {
    if (!editing || !editKey) return
    let cancelled = false
    getRouteForEdit(editCode, editKey)
      .then((r) => {
        if (cancelled) return
        if (r.sessions > 0) {
          setLoadState('blocked')
          return
        }
        setTitle(r.title)
        setPoints(r.points)
        setAllowManual(r.allowManual)
        setSelected(r.points.length > 0 ? 0 : null)
        setLoadState('ready')
      })
      .catch((e) => {
        if (cancelled) return
        console.error(e)
        setLoadState(isForbidden(e) ? 'denied' : 'error')
      })
    return () => {
      cancelled = true
    }
  }, [editing, editCode, editKey])

  // Ostrzeżenie przed zamknięciem karty z niezapisanymi punktami
  useEffect(() => {
    if (points.length === 0 || code || updated) return
    const handler = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [points.length, code, updated])

  const add = (lat: number, lng: number) => {
    setPoints((prev) => [...prev, newPoint(lat, lng)])
    setSelected(countRef.current)
    countRef.current += 1
  }

  const addAtCenter = () => {
    const c = mapRef.current?.getCenter()
    if (c) add(c.lat, c.lng)
  }

  const addHere = () => {
    if (!navigator.geolocation) {
      setError('Ta przeglądarka nie obsługuje geolokalizacji.')
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setLocating(false)
        setError(null)
        const { latitude, longitude } = p.coords
        add(latitude, longitude)
        const map = mapRef.current
        if (map) map.setView([latitude, longitude], Math.max(map.getZoom(), 17))
      },
      () => {
        setLocating(false)
        setError('Nie udało się ustalić lokalizacji. Zezwól na dostęp do lokalizacji i spróbuj ponownie.')
      },
      { enableHighAccuracy: true, timeout: 15000 }
    )
  }

  const patchPoint = (i: number, patch: Partial<DraftPoint>) =>
    setPoints((prev) => prev.map((p, j) => (j === i ? { ...p, ...patch } : p)))

  const moveSelectedToCenter = () => {
    const c = mapRef.current?.getCenter()
    if (c && selected !== null) patchPoint(selected, { lat: c.lat, lng: c.lng })
  }

  const move = (i: number, to: number) => {
    setPoints((prev) => moveItem(prev, i, to))
    setSelected(to)
  }

  const remove = (i: number) => {
    setPoints((prev) => prev.filter((_, j) => j !== i))
    setSelected(null)
  }

  const reset = () => {
    setTitle('')
    setPoints([])
    setSelected(null)
    setCode(null)
    setTeacherKey(null)
    setError(null)
    setAllowManual(false)
  }

  const save = async () => {
    const problem = validatePoints(points)
    if (problem) {
      setError(problem)
      return
    }
    try {
      setError(null)
      setSaving(true)
      if (editing) {
        await updateRoute(editCode, editKey, title, points, allowManual)
        setUpdated(true)
      } else {
        const saved = await saveRoute(title, points, allowManual)
        setCode(saved.code)
        setTeacherKey(saved.teacherKey)
      }
    } catch (e) {
      console.error(e)
      setError(saveErrorMessage(e, editing))
    } finally {
      setSaving(false)
    }
  }

  const onExport = () => {
    const blob = new Blob([exportRoute({ title, points })], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const name = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    a.href = url
    a.download = `${name || 'trasa'}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const onImport = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const route = parseRoute(await file.text())
      setTitle(route.title)
      setPoints(route.points)
      setSelected(0)
      setCode(null)
      setTeacherKey(null)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nie udało się wczytać pliku.')
    }
    e.target.value = ''
  }

  const panelPath = `/nauczyciel/${editCode}#${editKey}`
    if (!editing && auth.loading) {
    return (
      <main className="play">
        <p role="status">Sprawdzam logowanie…</p>
      </main>
    )
  }

  if (!editing && !auth.user) {
    return (
      <main className="play">
        <h1>Edytor tras</h1>
        <section className="card">
          <p>
            Aby tworzyć i prowadzić trasy, zaloguj się na konto nauczyciela. Trasy zapiszą się na
            Twoim koncie, a uczniowie grają bez logowania.
          </p>
          <Link className="big" to="/konto">
            Zaloguj się lub załóż konto
          </Link>
        </section>
      </main>
    )
  }

  // ---- Ekrany edycji: wczytywanie, brak dostępu, blokada ----
  if (editing && loadState === 'loading') {
    return (
      <main className="play">
        <p role="status">Wczytuję trasę do edycji…</p>
      </main>
    )
  }

  if (editing && loadState === 'denied') {
    return (
      <main className="play">
        <h1>Edycja trasy</h1>
        <p role="alert" className="bad">
          Brak dostępu: klucz nauczyciela jest nieprawidłowy lub go brakuje. Wejdź do edycji
          przyciskiem w panelu nauczyciela (z linku, który pokazał się po zapisaniu trasy).
        </p>
        <Link to="/">Strona główna</Link>
      </main>
    )
  }

  if (editing && loadState === 'error') {
    return (
      <main className="play">
        <h1>Edycja trasy</h1>
        <p role="alert" className="bad">
          Nie udało się wczytać trasy. Sprawdź internet i odśwież stronę.
        </p>
      </main>
    )
  }

  if (editing && loadState === 'blocked') {
    return (
      <main className="play">
        <h1>Edycja niedostępna</h1>
        <p role="alert" className="bad">
          Ta trasa ma już wyniki drużyn, więc nie można jej edytować. Pobierz wyniki (CSV) i
          wyczyść je w panelu nauczyciela, a potem wróć do edycji.
        </p>
        <Link className="btn-link" to={panelPath}>
          Wróć do panelu nauczyciela
        </Link>
      </main>
    )
  }

  if (editing && updated) {
    return (
      <main className="editor">
        <h1>Trasa zaktualizowana</h1>
        <section className="card share">
          <p role="status">
            Zmiany zapisane. Kod trasy <strong className="route-code">{editCode}</strong> i linki
            dla graczy pozostają takie same.
          </p>
          <p className="note">
            Jeśli ktoś miał otwartą stronę gry przed zmianą, niech ją odświeży przed startem.
          </p>
          <div className="share-actions">
            <Link className="btn-link" to={panelPath}>
              Wróć do panelu nauczyciela
            </Link>
            <button type="button" onClick={() => setUpdated(false)}>
              Edytuj dalej
            </button>
          </div>
        </section>
      </main>
    )
  }

  // ---- Po zapisie nowej trasy: tylko panel udostępniania ----
  if (code) {
    return (
      <main className="editor">
        <h1>{title.trim() || 'Edytor tras'}</h1>
        <SharePanel
          code={code}
          teacherKey={teacherKey}
          onReset={reset}
          onEdit={() => {
            setCode(null)
            setTeacherKey(null)
          }}
          onExport={onExport}
        />
      </main>
    )
  }

  return (
    <main className="editor">
      <h1>{editing ? `Edycja trasy ${editCode}` : 'Edytor tras'}</h1>
      {editing && (
        <p className="note">
          Kod trasy i linki nie zmienią się po zapisaniu.{' '}
          <Link to={panelPath}>Wróć do panelu nauczyciela</Link>
        </p>
      )}

      <div className="row">
        <input
          aria-label="Tytuł trasy"
          placeholder="Tytuł trasy"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <button onClick={save} disabled={!title.trim() || points.length === 0 || saving}>
          {saving
            ? 'Zapisuję…'
            : editing
              ? `Zapisz zmiany (${points.length} pkt)`
              : `Zapisz trasę (${points.length} pkt)`}
        </button>
        <button onClick={onExport} disabled={!title.trim() || points.length === 0}>
          Eksport JSON
        </button>
        <label className="file">
          Import JSON
          <input type="file" accept="application/json,.json" onChange={onImport} />
        </label>
      </div>

      <div className="row">
        <label>
          <input
            type="checkbox"
            checked={allowManual}
            onChange={(e) => setAllowManual(e.target.checked)}
          />{' '}
          Tryb awaryjny: pozwól potwierdzić dojście przyciskiem przy słabym GPS
        </label>
      </div>

      {error && (
        <p role="alert" className="bad">
          {error}
        </p>
      )}

      <div className="toolbar" role="group" aria-label="Dodawanie i przesuwanie punktów">
        <button type="button" onClick={addAtCenter}>
          Dodaj punkt na środku mapy
        </button>
        <button type="button" onClick={addHere} disabled={locating}>
          {locating ? 'Szukam lokalizacji…' : 'Dodaj punkt w mojej lokalizacji'}
        </button>
        <button type="button" onClick={moveSelectedToCenter} disabled={selected === null}>
          Przesuń wybrany punkt na środek mapy
        </button>
      </div>
      <p className="note">
        Wskazówka: mapę przesuwasz strzałkami, a zbliżenie zmieniasz klawiszami + i −. Punkt
        możesz też dodać kliknięciem w mapę albo przeciągnąć marker.
      </p>

      <div className="layout">
        <MapView
          points={points}
          selected={selected}
          mapRef={mapRef}
          onAdd={add}
          onSelect={setSelected}
          onMove={(i, lat, lng) => patchPoint(i, { lat, lng })}
        />
        <aside>
          <PointList points={points} selected={selected} onSelect={setSelected} />
          {selected !== null && points[selected] ? (
            <PointForm
              point={points[selected]}
              index={selected}
              total={points.length}
              onChange={(patch) => patchPoint(selected, patch)}
              onMoveUp={() => move(selected, selected - 1)}
              onMoveDown={() => move(selected, selected + 1)}
              onDelete={() => remove(selected)}
            />
          ) : (
            points.length > 0 && (
              <p className="note">Wybierz punkt z listy lub z mapy, aby go edytować.</p>
            )
          )}
        </aside>
      </div>
    </main>
  )
}