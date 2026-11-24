import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import FocusHeading from './FocusHeading'
import { fmtClock } from '../lib/format'
import { clearProgress } from '../lib/progress'
import { sortRanking } from '../lib/ranking'
import { fetchSessions, subscribeSessions } from '../lib/sessionApi'
import type { SessionState } from '../types/game'

interface Props {
  routeId: string
  routeCode: string
  routeTitle: string
  pointCount: number
  totalPoints: number
  state: SessionState
  team: string
  sessionId: string
  hasPhoto: boolean
}

interface Place {
  place: number
  total: number
  unfinished: boolean
}

const MEDAL = ['🥇', '🥈', '🥉']

function headline(pct: number, hasPhoto: boolean): string {
  if (hasPhoto) return 'Trasa ukończona!'
  if (pct >= 80) return 'Świetny wynik!'
  if (pct >= 50) return 'Dobra robota!'
  return 'Trasa ukończona!'
}

export default function FinishScreen({
  routeId,
  routeCode,
  routeTitle,
  pointCount,
  totalPoints,
  state,
  team,
  sessionId,
  hasPhoto,
}: Props) {
  const [place, setPlace] = useState<Place | null>(null)

  useEffect(() => {
    let cancelled = false
    const refresh = () =>
      fetchSessions(routeId)
        .then((rows) => {
          if (cancelled) return
          const sorted = sortRanking(rows)
          const idx = sorted.findIndex((r) => r.id === sessionId)
          if (idx >= 0) {
            setPlace({
              place: idx + 1,
              total: sorted.length,
              unfinished: sorted.some((r) => !r.finished_at),
            })
          }
        })
        .catch((e) => console.error(e))

    void refresh()
    const unsubscribe = subscribeSessions(routeId, () => void refresh())
    const timer = window.setInterval(() => void refresh(), 20000)
    return () => {
      cancelled = true
      unsubscribe()
      window.clearInterval(timer)
    }
  }, [routeId, sessionId])

  const duration = state.finishedAt
    ? Date.parse(state.finishedAt) - Date.parse(state.startedAt)
    : null
  const pct = totalPoints > 0 ? Math.min(100, Math.round((state.score / totalPoints) * 100)) : 0

  let placeLine: string | null = null
  if (place && place.total >= 2 && place.place <= 3) {
    placeLine =
      place.place === 1
        ? `${MEDAL[0]} ${place.unfinished ? 'Prowadzicie!' : 'Wygraliście!'}`
        : `${MEDAL[place.place - 1]} Miejsce ${place.place}!`
  }

  return (
    <main className="play finish">
      <h1 className="sr-only">{routeTitle}</h1>
      <section className="card finish-card">
        <span className="finish-flag" aria-hidden="true">
          🏁
        </span>
        <FocusHeading>Koniec trasy!</FocusHeading>
        <p className="lead">{headline(pct, hasPhoto)}</p>
        {placeLine && <p className="place-line">{placeLine}</p>}
        <p>
          Drużyna: <strong>{team}</strong>
        </p>
        <p className="big-score">
          {state.score} <span className="unit">/ {totalPoints} pkt</span>
        </p>
        <div className="bar" aria-hidden="true">
          <span style={{ width: `${pct}%` }} />
        </div>

        <dl className="tiles">
          <div className="tile">
            <dt>Czas</dt>
            <dd>{duration !== null ? fmtClock(duration) : '—'}</dd>
          </div>
          <div className="tile">
            <dt>Poprawne</dt>
            <dd>
              {state.correctCount} z {pointCount}
            </dd>
          </div>
          <div className="tile">
            <dt>Miejsce</dt>
            <dd>{place ? `${place.place} z ${place.total}` : '…'}</dd>
          </div>
        </dl>

        {place?.unfinished && (
          <p className="note">Wyniki tymczasowe: nie wszystkie drużyny skończyły już trasę.</p>
        )}
        {hasPhoto && (
          <p className="note">Punkty za zdjęcia pojawią się po zatwierdzeniu przez nauczyciela.</p>
        )}
      </section>

      <Link className="big" to={`/ranking/${routeCode}`}>
        Zobacz ranking
      </Link>
      <button
        type="button"
        className="big secondary"
        onClick={() => {
          clearProgress(routeCode)
          window.location.reload()
        }}
      >
        Zagraj od nowa
      </button>
      <Link to="/">Strona główna</Link>
    </main>
  )
}