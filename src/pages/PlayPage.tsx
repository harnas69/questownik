import { Suspense, lazy, useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import ArrivalFeedback from '../components/ArrivalFeedback'
import FinishScreen from '../components/FinishScreen'
import FocusHeading from '../components/FocusHeading'
import ProgressBar from '../components/ProgressBar'
import QrUnlock from '../components/QrUnlock'
import { PageSkeleton } from '../components/Skeleton'
import TaskView from '../components/TaskView'
import { loadRoute } from '../lib/gameApi'
import { distanceM, isInRange } from '../lib/geo'
import type { GeoPos } from '../lib/geo'
import { isNetworkError } from '../lib/network'
import { plural } from '../lib/plural'
import { clearProgress, loadProgress, saveProgress } from '../lib/progress'
import { PROXIMITY_LABEL, proximity } from '../lib/proximity'
import { extractToken } from '../lib/qr'
import { createSession, fetchSessionState, isGameClosed } from '../lib/sessionApi'
import { forgetUnlocked, isUnlockedLocal, markUnlocked } from '../lib/unlockStore'
import { useOnline } from '../lib/useOnline'
import { useWakeLock } from '../lib/useWakeLock'
import type { AnswerResult, GameRoute, SessionState } from '../types/game'

const PlayMap = lazy(() => import('../components/PlayMap'))

const MSG_NO_SNAPSHOT =
  'Brak połączenia z internetem. Nie mamy zapisanego stanu tej gry na tym urządzeniu, więc nie da się jej wznowić offline. Połącz się z internetem i odśwież stronę.'
const MSG_NO_ROUTE_OFFLINE =
  'Brak połączenia z internetem. Tej trasy nie ma jeszcze zapisanej na tym urządzeniu, więc nie da się jej wczytać offline. Połącz się z internetem i odśwież stronę.'

function fmtDist(m: number): { value: string; unit: string } {
  if (m < 1000) return { value: String(Math.round(m)), unit: 'm' }
  return { value: (m / 1000).toFixed(1).replace('.', ','), unit: 'km' }
}

export default function PlayPage() {
  const { code = '' } = useParams()
  const [search] = useSearchParams()
  // Tryb debug istnieje tylko w wersji deweloperskiej: na produkcji ?debug=1 nic nie robi
  const debug = import.meta.env.DEV && search.get('debug') === '1'

  const [route, setRoute] = useState<GameRoute | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [team, setTeam] = useState('')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [state, setState] = useState<SessionState | null>(null)
  const [stale, setStale] = useState(false) // pokazujemy ostatni znany stan, bez potwierdzenia z serwera
  const [starting, setStarting] = useState(false)
  const [startError, setStartError] = useState<string | null>(null)
  const [pos, setPos] = useState<GeoPos | null>(null)
  const [gpsError, setGpsError] = useState<string | null>(null)
  const [unlocked, setUnlocked] = useState(false)
  const [qrUnlocked, setQrUnlocked] = useState<string | null>(null)
  const [showHelp, setShowHelp] = useState(false)
  // Kod z linku zeskanowanego aparatem telefonu (adres: /gra/KOD#qr=...)
  const [pendingToken, setPendingToken] = useState<string | null>(() =>
    extractToken(window.location.hash)
  )

  const online = useOnline()
  const started = sessionId !== null && state !== null
  const routeCode = route?.code

  useWakeLock(started)

  // Kod nie powinien zostawać w pasku adresu ani w historii przeglądarki
  useEffect(() => {
    if (window.location.hash) {
      window.history.replaceState(
        window.history.state,
        '',
        window.location.pathname + window.location.search
      )
    }
  }, [])

  // 1. Pobierz trasę i odtwórz postęp (z serwera albo, bez internetu, z ostatniego znanego stanu)
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const r = await loadRoute(code.toUpperCase())
      const saved = loadProgress(r.code)
      if (saved) {
        try {
          const s = await fetchSessionState(saved.sessionId)
          if (cancelled) return
          if (s) {
            setTeam(s.teamName)
            setSessionId(saved.sessionId)
            setState(s)
          } else {
            clearProgress(r.code)
          }
        } catch (e) {
          if (cancelled) return
          if (!isNetworkError(e)) throw e
          if (!saved.snapshot) {
            setLoadError(MSG_NO_SNAPSHOT)
            return
          }
          setTeam(saved.team)
          setSessionId(saved.sessionId)
          setState(saved.snapshot)
          setStale(true)
        }
      }
      if (!cancelled) setRoute(r)
    })().catch((e) => {
      if (cancelled) return
      console.error(e)
      setLoadError(
        isNetworkError(e)
          ? MSG_NO_ROUTE_OFFLINE
          : e instanceof Error
            ? e.message
            : 'Nie udało się wczytać trasy.'
      )
    })
    return () => {
      cancelled = true
    }
  }, [code])

  // 2. Zapamiętuj ostatni znany stan sesji (nie nadpisuj go, dopóki pokazujemy stary)
  useEffect(() => {
    if (!routeCode || !sessionId || !state || stale) return
    saveProgress(routeCode, { sessionId, team: state.teamName, snapshot: state })
  }, [routeCode, sessionId, state, stale])

  // 3. Gdy sieć wraca, zsynchronizuj stan z serwerem
  useEffect(() => {
    if (!stale || !sessionId || !routeCode) return
    let cancelled = false
    const sync = async () => {
      try {
        const s = await fetchSessionState(sessionId)
        if (cancelled) return
        if (s) {
          setState(s)
          setStale(false)
        } else {
          // sesja została usunięta na serwerze: wracamy na ekran startowy
          clearProgress(routeCode)
          setSessionId(null)
          setState(null)
          setStale(false)
        }
      } catch (e) {
        if (!isNetworkError(e)) console.error(e)
      }
    }
    if (online) void sync()
    const timer = window.setInterval(() => {
      if (navigator.onLine) void sync()
    }, 8000)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [stale, sessionId, routeCode, online])

  // 4. Śledź pozycję GPS
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
        <p role="alert" className="bad">
          {loadError}
        </p>
        <button type="button" onClick={() => window.location.reload()}>
          Odśwież stronę
        </button>
        <Link to="/">Wróć na stronę główną</Link>
      </main>
    )
  }
  if (!route) return <PageSkeleton label="Wczytuję trasę…" />
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
        setStartError(
          isGameClosed(e)
            ? 'Ta gra została zakończona przez nauczyciela.'
            : 'Nie udało się rozpocząć gry. Sprawdź internet i spróbuj ponownie.'
        )
      } finally {
        setStarting(false)
      }
    }

    const n = route.points.length
    return (
      <main className="play">
        <div className="hero">
          <h1>{route.title}</h1>
          <p className="lead">
            {n} {plural(n, 'punkt', 'punkty', 'punktów')} do odwiedzenia. Gra korzysta z Twojej
            lokalizacji.
          </p>
        </div>
        <form
          className="card"
          onSubmit={(e) => {
            e.preventDefault()
            if (team.trim() && !starting) void start()
          }}
        >
          <label htmlFor="team" className="field-label">
            Nazwa drużyny
          </label>
          <input
            id="team"
            className="answer"
            placeholder="np. Szybcy Kaliszanie"
            maxLength={30}
            autoComplete="off"
            value={team}
            onChange={(e) => setTeam(e.target.value)}
          />
          <p className="note">Nie podawaj imion i nazwisk, wystarczy nazwa drużyny.</p>
          {startError && (
            <p role="alert" className="bad">
              {startError}
            </p>
          )}
          <button type="submit" className="big" disabled={!team.trim() || starting}>
            {starting ? 'Startuję…' : 'Start'}
          </button>
        </form>
      </main>
    )
  }

  const total = route.points.reduce((sum, p) => sum + p.score, 0)

  // Ekran końcowy
  if (state.currentIdx >= route.points.length) {
    return (
      <FinishScreen
        routeId={route.id}
        routeCode={route.code}
        routeTitle={route.title}
        pointCount={route.points.length}
        totalPoints={total}
        state={state}
        team={team}
        sessionId={sessionId}
        hasPhoto={route.points.some((p) => p.taskType === 'photo')}
      />
    )
  }

  const point = route.points[state.currentIdx]
  const isQr = point.unlock === 'qr'
  const qrOpen = isQr && (qrUnlocked === point.id || isUnlockedLocal(sessionId, point.id))
  const dist = pos ? distanceM(pos.lat, pos.lng, point.lat, point.lng) : null
  const inRange = isQr ? qrOpen : unlocked || (pos !== null && isInRange(pos, point))
  const prox = dist !== null ? proximity(dist, point.radiusM) : null
  const shown = dist !== null ? fmtDist(dist) : null

  // Tryb awaryjny (włącza nauczyciel): przycisk tylko gdy GPS zawodzi albo jesteś blisko
  const manualAllowed =
    route.allowManual &&
    (gpsError !== null ||
      dist === null ||
      dist <= 150 ||
      (pos !== null && pos.accuracy > 50))

  const onNext = (r: AnswerResult) => {
    setUnlocked(false)
    setQrUnlocked(null)
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

  const onQrUnlocked = () => {
    markUnlocked(sessionId, point.id)
    setQrUnlocked(point.id)
  }

  return (
    <main className="play">
      <h1 className="sr-only">{route.title}</h1>
      <header className="hud">
        <span className="chip">{team}</span>
        <span className="chip">{state.score} pkt</span>
      </header>

      <ProgressBar done={state.currentIdx} total={route.points.length} />

      {stale && (
        <p role="status" className="banner warn">
          Brak połączenia z serwerem. Pokazujemy ostatni znany stan gry. Gdy internet wróci,
          zsynchronizujemy go automatycznie, a odpowiedzi wyślesz dopiero wtedy.
        </p>
      )}

      {inRange ? (
        <>
          <ArrivalFeedback key={point.id} />
          <TaskView
            key={point.id}
            point={point}
            index={state.currentIdx}
            total={route.points.length}
            sessionId={sessionId}
            onNext={onNext}
            onLocked={() => {
              forgetUnlocked(sessionId, point.id)
              setQrUnlocked(null)
            }}
          />
        </>
      ) : isQr ? (
        <>
          <QrUnlock
            key={point.id}
            sessionId={sessionId}
            index={state.currentIdx}
            total={route.points.length}
            pendingToken={pendingToken}
            onPendingConsumed={() => setPendingToken(null)}
            onUnlocked={onQrUnlocked}
          />
          <section className="card">
            <h2>Wskazówka: gdzie szukać</h2>
            {gpsError && (
              <p role="alert" className="bad">
                {gpsError}
              </p>
            )}
            {shown ? (
              <p>
                Odległość do miejsca z kodem:{' '}
                <strong>
                  {shown.value} {shown.unit}
                </strong>
              </p>
            ) : (
              !gpsError && <p role="status">Szukam Twojej pozycji…</p>
            )}
            <button type="button" aria-expanded={showHelp} onClick={() => setShowHelp((v) => !v)}>
              {showHelp ? 'Ukryj mapę' : 'Pokaż mapę'}
            </button>
            {showHelp && (
              <Suspense
                fallback={
                  <div className="map-wrap map-loading" role="status">
                    Wczytuję mapę…
                  </div>
                }
              >
                <PlayMap key={point.id} target={point} pos={pos} />
              </Suspense>
            )}
          </section>
        </>
      ) : (
        <section className="card">
          <FocusHeading>
            Idź do punktu {state.currentIdx + 1} z {route.points.length}
          </FocusHeading>

          {gpsError && (
            <p role="alert" className="bad">
              {gpsError}
            </p>
          )}
          {!gpsError && shown === null && <p role="status">Szukam Twojej pozycji…</p>}

          {shown && prox && (
            <div className="distance">
              <p className="big-score">
                {shown.value} <span className="unit">{shown.unit}</span>
              </p>
              <span className={prox === 'veryNear' || prox === 'here' ? 'badge near' : 'badge'}>
                {PROXIMITY_LABEL[prox]}
              </span>
              {/* Czytnik ekranu ogłasza tylko zmianę kategorii, a nie każdy metr */}
              <p className="sr-only" aria-live="polite">
                {PROXIMITY_LABEL[prox]}
              </p>
            </div>
          )}

          <Suspense
            fallback={
              <div className="map-wrap map-loading" role="status">
                Wczytuję mapę…
              </div>
            }
          >
            <PlayMap key={point.id} target={point} pos={pos} />
          </Suspense>

          {pos && (
            <p className="note">
              Dokładność GPS: ±{Math.round(pos.accuracy)} m. Zadanie odblokuje się w promieniu{' '}
              {point.radiusM} m od punktu.
            </p>
          )}

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
          <a
            className="big secondary"
            href={`https://www.google.com/maps/dir/?api=1&destination=${point.lat},${point.lng}&travelmode=walking`}
            target="_blank"
            rel="noreferrer"
          >
            Otwórz w Mapach Google
          </a>
        </section>
      )}
    </main>
  )
}