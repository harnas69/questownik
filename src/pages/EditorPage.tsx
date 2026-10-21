import { useState } from 'react'
import MapView from '../components/MapView'
import { saveRoute } from '../lib/routes'
import type { DraftPoint } from '../types/route'

export default function EditorPage() {
  const [title, setTitle] = useState('')
  const [points, setPoints] = useState<DraftPoint[]>([])
  const [code, setCode] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const add = (lat: number, lng: number) =>
    setPoints((prev) => [...prev, { lat, lng, radiusM: 30 }])

  const save = async () => {
    try {
      setError(null)
      setCode(await saveRoute(title, points))
    } catch (e) {
      setError('Nie udało się zapisać trasy.')
      console.error(e)
    }
  }

  return (
    <main>
      <h1>Questownik – edytor tras</h1>
      <input
        placeholder="Tytuł trasy"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <button onClick={save} disabled={!title || points.length === 0}>
        Zapisz trasę ({points.length} pkt)
      </button>
      {code && <p>Kod trasy: <strong>{code}</strong></p>}
      {error && <p role="alert">{error}</p>}
      <MapView points={points} onAdd={add} />
    </main>
  )
}