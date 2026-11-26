import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Podium from '../components/Podium'
import { PageSkeleton } from '../components/Skeleton'
import { fmtClock } from '../lib/format'
import { plural } from '../lib/plural'
import { loadProgress } from '../lib/progress'
import { durationMs, sortRanking, splitPodium } from '../lib/ranking'
import type { SessionRow } from '../lib/ranking'
import { fetchSessions, loadRouteInfo, subscribeSessions } from '../lib/sessionApi'
import type { RouteInfo } from '../lib/sessionApi'
import { rankingTitle } from '../lib/pageTitle'
import { useDocumentTitle } from '../lib/useDocumentTitle'

interface RowProps {
  place: number
  row: SessionRow
  pointCount: number
  mine: boolean
}

function RankRow({ place, row, pointCount, mine }: RowProps) {
  const d = durationMs(row)
  const pct =
    pointCount > 0 ? Math.min(100, Math.round((row.current_idx / pointCount) * 100)) : 0
  return (
    <li className={mine ? 'rk-row mine' : 'rk-row'}>
      <span className="rk-pos">
        <span className="sr-only">Miejsce </span>
        {place}
      </span>
      <div className="rk-main">
        <strong className="rk-name">
          {row.team_name}
          {mine && <span className="badge near rk-you">Twoja drużyna</span>}
        </strong>
        <span className="rk-sub">
          Postęp {Math.min(row.current_idx, pointCount)}/{pointCount} ·{' '}
          {d !== null ? `czas ${fmtClock(d)}` : 'w grze'}
        </span>
        <span className="rk-bar" aria-hidden="true">
          <span style={{ width: `${pct}%` }} />
        </span>
      </div>
      <span className="rk-score">
        <strong>{row.score}</strong> <span>pkt</span>
      </span>
    </li>
  )
}

export default function RankingPage() {
  const { code = '' } = useParams()
  const [info, setInfo] = useState<RouteInfo | null>(null)
  const [rows, setRows] = useState<SessionRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [projector, setProjector] = useState(false)
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null)

  // Sesja z tego urządzenia (jeśli ktoś grał w tej przeglądarce)
  const mineId = loadProgress(code.toUpperCase())?.sessionId ?? null
  useDocumentTitle(rankingTitle(info?.title))
  useEffect(() => {
    let cancelled = false
    let unsubscribe: () => void = () => {}
    let timer: number | undefined

    loadRouteInfo(code.toUpperCase())
      .then(async (r) => {
        if (cancelled) return
        setInfo(r)
        const refresh = () =>
          fetchSessions(r.id)
            .then((d) => {
              if (cancelled) return
              setRows(sortRanking(d))
              setUpdatedAt(new Date())
            })
            .catch((e) => console.error(e))
        await refresh()
        if (cancelled) return
        unsubscribe = subscribeSessions(r.id, refresh)
        timer = window.setInterval(refresh, 20000) // zapas, gdyby Realtime zawiódł
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Nie udało się wczytać rankingu.')
      })

    return () => {
      cancelled = true
      unsubscribe()
      if (timer) window.clearInterval(timer)
    }
  }, [code])

  // Wyjście ze strony kończy pełny ekran
  useEffect(
    () => () => {
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
    },
    []
  )

  const toggleProjector = () => {
    const next = !projector
    setProjector(next)
    const el = document.documentElement
    if (next && el.requestFullscreen) el.requestFullscreen().catch(() => {})
    else if (!next && document.fullscreenElement) document.exitFullscreen().catch(() => {})
  }

  if (error) {
    return (
      <main className="play">
        <p role="alert" className="bad">
          {error}
        </p>
        <Link to="/">Strona główna</Link>
      </main>
    )
  }
  if (!info) return <PageSkeleton label="Wczytuję ranking…" />

  const { podium, rest } = splitPodium(rows)
  const leader = podium[0]

  return (
    <main className={projector ? 'ranking projector' : 'ranking'}>
      <header className="rk-head">
        <div>
          <p className="eyebrow-s">Ranking · kod {info.code}</p>
          <h1>{info.title}</h1>
        </div>
        <button type="button" aria-pressed={projector} onClick={toggleProjector}>
          {projector ? 'Zamknij tryb projektora' : 'Tryb projektora'}
        </button>
      </header>

      <p className="note live">
        <span className="dot" aria-hidden="true" />
        <span>
          Na żywo
          {updatedAt ? ` · aktualizacja ${updatedAt.toLocaleTimeString('pl-PL')}` : ''} ·{' '}
          {rows.length} {plural(rows.length, 'drużyna', 'drużyny', 'drużyn')}
        </span>
      </p>

      <p className="sr-only" aria-live="polite">
        {leader ? `Prowadzi drużyna ${leader.team_name}.` : ''}
      </p>

      {projector && (
        <p className="join-strip">
          Dołącz na <strong>{window.location.host}</strong> · kod <strong>{info.code}</strong>
        </p>
      )}

      {rows.length === 0 && (
        <div className="card empty">
          <span className="empty-icon" aria-hidden="true">
            ⏳
          </span>
          <h2>Czekamy na pierwszą drużynę</h2>
          <p className="note">
            Uczniowie dołączają na stronie głównej, wpisując kod gry {info.code}.
          </p>
        </div>
      )}

      {podium.length > 0 && <Podium rows={podium} mineId={mineId} />}

      {rest.length > 0 && (
        <section aria-labelledby="rk-rest">
          <h2 id="rk-rest" className={podium.length === 0 ? 'sr-only' : 'rk-rest-title'}>
            {podium.length === 0 ? 'Drużyny' : 'Pozostałe drużyny'}
          </h2>
          <ol className="rk-list" role="list" start={podium.length + 1}>
            {rest.map((r, i) => (
              <RankRow
                key={r.id}
                place={podium.length + i + 1}
                row={r}
                pointCount={info.pointCount}
                mine={r.id === mineId}
              />
            ))}
          </ol>
        </section>
      )}
    </main>
  )
}