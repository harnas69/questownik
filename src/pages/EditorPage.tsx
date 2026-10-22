import { useState } from 'react'
import type { ChangeEvent } from 'react'
import MapView from '../components/MapView'
import PointForm from '../components/PointForm'
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

  const add = (lat: number, lng: number) => {
    setPoints((prev) => [...prev, newPoint(lat, lng)])
    setSelected(points.length)
  }

  const patchPoint = (i: number, patch: Partial<DraftPoint>) =>
    setPoints((prev) => prev.map((p, j) => (j === i ? { ...p, ...patch } : p)))

  const move = (i: number, to: number) => {
    setPoints((prev) => moveItem(prev, i, to))
    setSelected(to)
  }

  const remove = (i: number) => {
    setPoints((prev) => prev.filter((_, j) => j !== i))
    setSelected(null)
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
      setCode(await saveRoute(title, points))
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

  return (
    <main className="editor">
      <h1>Questownik – edytor tras</h1>

      <div className="row">
        <input placeholder="Tytuł trasy" value={title} onChange={(e) => setTitle(e.target.value)} />
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

      {code && (
        <>
          <p>
            Kod trasy: <strong>{code}</strong>
          </p>
          <p>
            Gra: <a href={`/gra/${code}`}>/gra/{code}</a>
          </p>
          <p>
            Ranking na żywo: <a href={`/ranking/${code}`}>/ranking/{code}</a>
          </p>
        </>
      )}
      {error && <p role="alert">{error}</p>}

      <div className="layout">
        <MapView
          points={points}
          selected={selected}
          onAdd={add}
          onSelect={setSelected}
          onMove={(i, lat, lng) => patchPoint(i, { lat, lng })}
        />
        <aside>
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
            <p>Kliknij na mapie, aby dodać punkt, albo wybierz istniejący marker.</p>
          )}
        </aside>
      </div>
    </main>
  )
}