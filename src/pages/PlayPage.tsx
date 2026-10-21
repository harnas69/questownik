import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import TaskView from '../components/TaskView'
import { loadRoute } from '../lib/gameApi'
import { distanceM, isInRange } from '../lib/geo'
import type { GeoPos } from '../lib/geo'
import { clearProgress, loadProgress, saveProgress } from '../lib/progress'
import type { GameRoute, PointResult } from '../types/game'

function fmtTime(ms: number): string {
  const s = Math.floor(ms / 1000)
  return `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, '0')} s`
}

export default function PlayPage() {
  const { code = '' } = useParams()
  const [search] = useSearchParams()
  const debug = search.get('debug') === '1'

  const [route, setRoute] = useState<GameRoute | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [team, setTeam] = useState('')
  const [started, setStarted] = useState(false)
  const [idx, setIdx] = useState(0)
  const [results, setResults] = useState<PointResult[]>([])
  const [startedAt, setStartedAt] = useState(0)
  const [finishedAt, setFinishedAt] = useState<number | null>(null)
  const [pos, setPos] = useState<GeoPos | null>(null)
  const [gpsError, setGpsError] = useState<string | null>(null)
  const [simulated, setSimulated] = useState(false)

  // 1. Pobierz trasę i ewentualnie przywróć postęp
  useEffect(() => {
    let cancelled = false
    loadRoute(code.toUpperCase())
      .then((r) => {
        if (cancelled) return
        setRoute(r)
        const saved = loadProgress(r.code)
        if (saved) {
          setTeam(saved.team)
          setIdx(saved.idx)
          setResults(saved.results)
          setStartedAt(saved.startedAt)
          setFinishedAt(saved.finishedAt)
          setStarted(true)
        }
      })
      .catch((e) => {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : 'Nie udało się wczytać trasy.')
      })
    return () => {
      cancelled = true
    }
  }, [code])

  // 2. Zapisuj postęp
  useEffect(() => {
    if (!route || !started) return
    saveProgress(route.code, { team, idx, results, startedAt, finishedAt })
  }, [route, started, team, idx, results, startedAt, finishedAt])

  // 3. Śledź pozycję GPS
  useEffect(() => {
    if (!started) return
    if (!navigator.geolocation) {
      setGpsError('Ta przeglądarka nie obsługuje geolokalizacji.')
      return
    }
    const id = navigator.geolocation.watchPosition(
      (p) => {
        setGpsError(null)
        setPos({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy })
      },
      (e) =>
        setGpsError(
          e.code === e.PERMISSION_DENIED
            ? 'Brak zgody na lokalizację. Włącz ją w ustawieniach przeglądarki i odśwież stronę.'
            : 'Nie można ustalić pozycji. Wyjdź na otwartą przestrzeń.'
        ),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 }
    )
    return () => navigator.geolocation.clearWatch(id)
  }, [started])

  if (loadError) {
    return (
      <main className="play">
        <p role="alert">{loadError}</p>
        <Link to="/">Wróć na stronę główną</Link>
      </main>
    )
  }
  if (!route) return <main className="play"><p>Wczytuję trasę…</p></main>

  if (route.points.length === 0) {
    return <main className="play"><p>Ta trasa nie ma punktów.</p><Link to="/">Wróć</Link></main>
  }

  // Ekran startowy
  if (!started) {
    return (
      <main className="play">
        <h1>{route.title}</h1>
        <p>{route.points.length} punktów do odwiedzenia. Gra korzysta z Twojej lokalizacji.</p>
        <input
          className="answer"
          placeholder="Nazwa drużyny"
          maxLength={30}
          value={team}
          onChange={(e) => setTeam(e.target.value)}
        />
        <p className="note">Nie podawaj imion i nazwisk, wystarczy nazwa drużyny.</p>
        <button
          className="big"
          disabled={!team.trim()}
          onClick={() => {
            setStartedAt(Date.now())
            setStarted(true)
          }}
        >
          Start
        </button>
      </main>
    )
  }

  const total = route.points.reduce((sum, r) => sum + r.score, 0)
  const score = results.reduce((sum, r) => sum + r.earned, 0)

  // Ekran końcowy
  if (idx >= route.points.length) {
    return (
      <main className="play">
        <h1>Koniec trasy!</h1>
        <p>Drużyna: <strong>{team}</strong></p>
        <p className="big-score">{score} / {total} pkt</p>
        <p>Czas: {fmtTime((finishedAt ?? Date.now()) - startedAt)}</p>
        <p>Poprawne odpowiedzi: {results.filter((r) => r.correct).length} z {route.points.length}</p>
        <button
          className="big secondary"
          onClick={() => {
            clearProgress(route.code)
            window.location.reload()
          }}
        >
          Zagraj od nowa
        </button>
        <Link to="/">Strona główna</Link>
      </main>
    )
  }

  const point = route.points[idx]
  const dist = pos ? distanceM(pos.lat, pos.lng, point.lat, point.lng) : null
  const inRange = simulated || (pos !== null && isInRange(pos, point))

  const onDone = (r: PointResult) => {
    setResults((prev) => [...prev, r])
    setSimulated(false)
    if (idx + 1 >= route.points.length) setFinishedAt(Date.now())
    setIdx(idx + 1)
  }

  return (
    <main className="play">
      <header className="hud">
        <span>{team}</span>
        <span>{score} pkt</span>
      </header>

      {inRange ? (
        <TaskView key={point.id} point={point} index={idx} total={route.points.length} onDone={onDone} />
      ) : (
        <section>
          <h2>Idź do punktu {idx + 1} z {route.points.length}</h2>
          {gpsError && <p role="alert" className="bad">{gpsError}</p>}
          {!gpsError && dist === null && <p>Szukam Twojej pozycji…</p>}
          {dist !== null && (
            <p className="big-score">{Math.round(dist)} m</p>
          )}
          {pos && <p className="note">Dokładność GPS: ±{Math.round(pos.accuracy)} m. Zadanie odblokuje się w promieniu {point.radiusM} m.</p>}
          <a
            className="big link-btn"
            href={`https://www.google.com/maps/dir/?api=1&destination=${point.lat},${point.lng}&travelmode=walking`}
            target="_blank"
            rel="noreferrer"
          >
            Nawiguj w Mapach Google
          </a>
          {debug && (
            <button className="big secondary" onClick={() => setSimulated(true)}>
              [debug] Symuluj dojście
            </button>
          )}
        </section>
      )}
    </main>
  )
}