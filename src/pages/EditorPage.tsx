import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import type { Map as LeafletMap } from 'leaflet'
import MapView from '../components/MapView'
import PointForm from '../components/PointForm'
import PointList from '../components/PointList'
import SharePanel from '../components/SharePanel'
import { saveRoute } from '../lib/routes'
import { moveItem, newPoint, validatePoints } from '../lib/points'
import { exportRoute, parseRoute } from '../lib/routeJson'
import type { DraftPoint } from '../types/route'

export default function EditorPage() {
  const [title, setTitle] = useState('')
  const [points, setPoints] = useState<DraftPoint[]>([])
  const [selected, setSelected] = useState<number | null>(null)
  const [code, setCode] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [locating, setLocating] = useState(false)
  const [allowManual, setAllowManual] = useState(false)

  const mapRef = useRef<LeafletMap | null>(null)
  const countRef = useRef(0)

  useEffect(() => {
    countRef.current = points.length
  }, [points.length])

  // Ostrzeżenie przed zamknięciem karty z niezapisanymi punktami
  useEffect(() => {
    if (points.length === 0 || code) return
    const handler = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [points.length, code])

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
      setCode(await saveRoute(title, points, allowManual))
    } catch (e) {
      setError('Nie udało się zapisać trasy.')
      console.error(e)
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
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nie udało się wczytać pliku.')
    }
    e.target.value = ''
  }

  // Po zapisie pokazujemy tylko panel udostępniania
  if (code) {
    return (
      <main className="editor">
        <h1>{title.trim() || 'Edytor tras'}</h1>
        <SharePanel code={code} onReset={reset} onEdit={() => setCode(null)} onExport={onExport} />
      </main>
    )
  }

  return (
    <main className="editor">
      <h1>Edytor tras</h1>

      <div className="row">
        <input
          aria-label="Tytuł trasy"
          placeholder="Tytuł trasy"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <button onClick={save} disabled={!title.trim() || points.length === 0 || saving}>
          {saving ? 'Zapisuję…' : `Zapisz trasę (${points.length} pkt)`}
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