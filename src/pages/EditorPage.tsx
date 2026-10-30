import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import type { Map as LeafletMap } from 'leaflet'
import MapView from '../components/MapView'
import PointForm from '../components/PointForm'
import PointList from '../components/PointList'
import { accountErrorMessage, getTemplate, launchGame, saveTemplate } from '../lib/accountApi'
import { useAuth } from '../lib/auth'
import { moveItem, newPoint, validatePoints } from '../lib/points'
import { exportRoute, parseRoute } from '../lib/routeJson'
import { isForbidden } from '../lib/teacherApi'
import type { DraftPoint } from '../types/route'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const EMPTY = JSON.stringify({ title: '', points: [], allowManual: false })

type LoadState = 'loading' | 'ready' | 'denied' | 'error'

export default function EditorPage() {
  const { id: editParam } = useParams()
  const navigate = useNavigate()
  const auth = useAuth()
  const uid = auth.user?.id

  const editing = editParam !== undefined
  const validId = editing && UUID.test(editParam)

  const [templateId, setTemplateId] = useState<string | null>(validId ? editParam : null)
  const [loadState, setLoadState] = useState<LoadState>(
    editing ? (validId ? 'loading' : 'denied') : 'ready'
  )
  const [saved, setSaved] = useState(false)
  const [baseline, setBaseline] = useState(EMPTY)

  const [title, setTitle] = useState('')
  const [points, setPoints] = useState<DraftPoint[]>([])
  const [selected, setSelected] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [launching, setLaunching] = useState(false)
  const [locating, setLocating] = useState(false)
  const [allowManual, setAllowManual] = useState(false)

  const mapRef = useRef<LeafletMap | null>(null)
  const countRef = useRef(0)

  const dirty = JSON.stringify({ title, points, allowManual }) !== baseline

  useEffect(() => {
    countRef.current = points.length
  }, [points.length])

  // Wczytanie trasy do edycji
  useEffect(() => {
    if (!validId || !uid || !editParam) return
    let cancelled = false
    getTemplate(editParam)
      .then((r) => {
        if (cancelled) return
        setTitle(r.title)
        setPoints(r.points)
        setAllowManual(r.allowManual)
        setSelected(r.points.length > 0 ? 0 : null)
        setBaseline(
          JSON.stringify({ title: r.title, points: r.points, allowManual: r.allowManual })
        )
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
  }, [validId, uid, editParam])

  // Ostrzeżenie przed zamknięciem karty z niezapisanymi zmianami
  useEffect(() => {
    if (!dirty) return
    const handler = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [dirty])

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

  const startNew = () => {
    if (editing) {
      navigate('/edytor')
      return
    }
    setTitle('')
    setPoints([])
    setSelected(null)
    setAllowManual(false)
    setTemplateId(null)
    setSaved(false)
    setError(null)
    setBaseline(EMPTY)
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
      const id = await saveTemplate(templateId, title, points, allowManual)
      setTemplateId(id)
      setBaseline(JSON.stringify({ title, points, allowManual }))
      setSaved(true)
    } catch (e) {
      console.error(e)
      setError(accountErrorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  const launch = async () => {
    if (!templateId) return
    setLaunching(true)
    setError(null)
    try {
      const code = await launchGame(templateId)
      navigate(`/nauczyciel/${code}#konto`)
    } catch (e) {
      console.error(e)
      setError(accountErrorMessage(e))
      setLaunching(false)
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
      setSaved(false)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nie udało się wczytać pliku.')
    }
    e.target.value = ''
  }

  // ---- Logowanie i wczytywanie ----
  if (auth.loading) {
    return (
      <main className="play">
        <p role="status">Sprawdzam logowanie…</p>
      </main>
    )
  }

  if (!auth.user) {
    return (
      <main className="play">
        <h1>Edytor tras</h1>
        <section className="card">
          <p>
            Aby tworzyć trasy i prowadzić gry, zaloguj się na konto nauczyciela. Uczniowie grają
            bez logowania.
          </p>
          <Link className="big" to="/konto">
            Zaloguj się lub załóż konto
          </Link>
        </section>
      </main>
    )
  }

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
          Nie masz dostępu do tej trasy albo ona nie istnieje. Wybierz ją z listy na swoim koncie.
        </p>
        <Link className="btn-link" to="/konto">
          Moje trasy
        </Link>
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

  // ---- Po zapisie ----
  if (saved) {
    return (
      <main className="editor">
        <h1>{title.trim()}</h1>
        <section className="card share" aria-label="Trasa zapisana">
          <h2>Trasa zapisana</h2>
          <p role="status">
            Trasa jest w zakładce „Moje trasy”. Gdy będziesz gotów zagrać z klasą, uruchom grę:
            dostaniesz kod i kod QR dla uczniów. Zmiany trasy nie wpływają na gry, które już
            uruchomiłeś.
          </p>
          {error && (
            <p role="alert" className="bad">
              {error}
            </p>
          )}
          <button type="button" className="big" disabled={launching} onClick={() => void launch()}>
            {launching ? 'Uruchamiam…' : 'Uruchom grę'}
          </button>
          <div className="share-actions">
            <Link className="btn-link" to="/konto">
              Moje trasy
            </Link>
            <button type="button" onClick={() => setSaved(false)}>
              Edytuj dalej
            </button>
            <button type="button" onClick={onExport}>
              Eksport JSON (kopia)
            </button>
            <button type="button" onClick={startNew}>
              Nowa trasa
            </button>
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="editor">
      <h1>{templateId ? 'Edycja trasy' : 'Nowa trasa'}</h1>
      {templateId && (
        <p className="note">
          Zapisanie zmian nadpisze trasę. Gry już uruchomione z tej trasy zostają bez zmian.{' '}
          <Link to="/konto">Wróć do moich tras</Link>
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
            : templateId
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