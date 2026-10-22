import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import TaskView from '../components/TaskView'
import { loadRoute } from '../lib/gameApi'
import { distanceM, isInRange } from '../lib/geo'
import type { GeoPos } from '../lib/geo'
import { clearProgress, loadProgress, saveProgress } from '../lib/progress'
import { createSession, fetchSessionState } from '../lib/sessionApi'
import type { AnswerResult, GameRoute, SessionState } from '../types/game'

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
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [state, setState] = useState<SessionState | null>(null)
  const [starting, setStarting] = useState(false)
  const [startError, setStartError] = useState<string | null>(null)
  const [pos, setPos] = useState<GeoPos | null>(null)
  const [gpsError, setGpsError] = useState<string | null>(null)
  const [unlocked, setUnlocked] = useState(false)

  const started = sessionId !== null && state !== null

  // 1. Pobierz trasę i odtwórz postęp z serwera
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const r = await loadRoute(code.toUpperCase())
      const saved = loadProgress(r.code)
      if (saved) {
        const s = await fetchSessionState(saved.sessionId)
        if (cancelled) return
        if (s) {
          setTeam(s.teamName)
          setSessionId(saved.sessionId)
          setState(s)
        } else {
          clearProgress(r.code)
        }
      }
      if (!cancelled) setRoute(r)
    })().catch((e) => {
      if (!cancelled) setLoadError(e instanceof Error ? e.message : 'Nie udało się wczytać trasy.')
    })
    return () => {
      cancelled = true
    }
  }, [code])

  // 2. Śledź pozycję GPS
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
  if (!route) {
    return (
      <main className="play">
        <p>Wczytuję trasę…</p>
      </main>
    )
  }
  if (route.points.length === 0) {
    return (
      <main className="play">
        <p>Ta trasa nie ma punktów.</p>
        <Link to="/">Wróć</Link>
      </main>
    )
  }

  // Ekran startowy
  if (!started || !sessionId || !state) {
    const start = async () => {
      setStarting(true)
      setStartError(null)
      try {
        const name = team.trim()
        const id = await createSession(route.id, name)
        const s = await fetchSessionState(id)
        if (!s) throw new Error('Nie znaleziono utworzonej sesji.')
        saveProgress(route.code, { sessionId: id, team: name })
        setSessionId(id)
        setState(s)
      } catch (e) {
        console.error(e)
        setStartError('Nie udało się rozpocząć gry. Sprawdź internet i spróbuj ponownie.')
      } finally {
        setStarting(false)
      }
    }

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
        {startError && (
          <p role="alert" className="bad">
            {startError}
          </p>
        )}
        <button className="big" disabled={!team.trim() || starting} onClick={start}>
          {starting ? 'Startuję…' : 'Start'}
        </button>
      </main>
    )
  }

  const total = route.points.reduce((sum, p) => sum + p.score, 0)

  // Ekran końcowy
  if (state.currentIdx >= route.points.length) {
    const duration = state.finishedAt
      ? fmtTime(Date.parse(state.finishedAt) - Date.parse(state.startedAt))
      : '—'
    return (
      <main className="play">
        <h1>Koniec trasy!</h1>
        <p>
          Drużyna: <strong>{team}</strong>
        </p>
        <p className="big-score">
          {state.score} / {total} pkt
        </p>
        <p>Czas: {duration}</p>
        <p>
          Poprawne odpowiedzi: {state.correctCount} z {route.points.length}
        </p>
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

  const point = route.points[state.currentIdx]
  const dist = pos ? distanceM(pos.lat, pos.lng, point.lat, point.lng) : null
  const inRange = unlocked || (pos !== null && isInRange(pos, point))

  // Tryb awaryjny (włącza nauczyciel): przycisk tylko gdy GPS zawodzi albo jesteś blisko
  const manualAllowed =
    route.allowManual &&
    (gpsError !== null ||
      dist === null ||
      dist <= 150 ||
      (pos !== null && pos.accuracy > 50))

  const onNext = (r: AnswerResult) => {
    setUnlocked(false)
    setState((prev) =>
      prev
        ? {
            ...prev,
            currentIdx: r.currentIdx,
            score: r.score,
            correctCount: r.correctCount,
            finishedAt: r.finishedAt,
          }
        : prev
    )
  }

  return (
    <main className="play">
      <header className="hud">
        <span>{team}</span>
        <span>{state.score} pkt</span>
      </header>

      {inRange ? (
        <TaskView
          key={point.id}
          point={point}
          index={state.currentIdx}
          total={route.points.length}
          sessionId={sessionId}
          onNext={onNext}
        />
      ) : (
        <section>
          <h2>
            Idź do punktu {state.currentIdx + 1} z {route.points.length}
          </h2>
          {gpsError && (
            <p role="alert" className="bad">
              {gpsError}
            </p>
          )}
          {!gpsError && dist === null && <p>Szukam Twojej pozycji…</p>}
          {dist !== null && <p className="big-score">{Math.round(dist)} m</p>}
          {pos && (
            <p className="note">
              Dokładność GPS: ±{Math.round(pos.accuracy)} m. Zadanie odblokuje się w promieniu{' '}
              {point.radiusM} m.
            </p>
          )}
          <a
            className="big link-btn"
            href={`https://www.google.com/maps/dir/?api=1&destination=${point.lat},${point.lng}&travelmode=walking`}
            target="_blank"
            rel="noreferrer"
          >
            Nawiguj w Mapach Google
          </a>
          {manualAllowed && (
            <button className="big secondary" onClick={() => setUnlocked(true)}>
              Jestem na miejscu
            </button>
          )}
          {debug && (
            <button className="big secondary" onClick={() => setUnlocked(true)}>
              [debug] Symuluj dojście
            </button>
          )}
        </section>
      )}
    </main>
  )
}