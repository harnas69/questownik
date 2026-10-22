import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { fetchSessions, loadRouteInfo, subscribeSessions } from '../lib/sessionApi'
import type { RouteInfo } from '../lib/sessionApi'
import { durationMs, sortRanking } from '../lib/ranking'
import type { SessionRow } from '../lib/ranking'

function fmt(ms: number): string {
  const s = Math.floor(ms / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export default function RankingPage() {
  const { code = '' } = useParams()
  const [info, setInfo] = useState<RouteInfo | null>(null)
  const [rows, setRows] = useState<SessionRow[]>([])
  const [error, setError] = useState<string | null>(null)

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
              if (!cancelled) setRows(sortRanking(d))
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

  if (error) {
    return (
      <main className="play">
        <p role="alert">{error}</p>
        <Link to="/">Strona główna</Link>
      </main>
    )
  }
  if (!info) return <main className="play"><p>Wczytuję ranking…</p></main>

  return (
    <main className="ranking">
      <h1>Ranking: {info.title}</h1>
      <p className="note">Kod trasy: {info.code}. Ranking odświeża się na żywo.</p>
      {rows.length === 0 ? (
        <p>Żadna drużyna jeszcze nie wystartowała.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Drużyna</th>
              <th>Postęp</th>
              <th>Punkty</th>
              <th>Czas</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const d = durationMs(r)
              return (
                <tr key={r.id}>
                  <td>{i + 1}</td>
                  <td>{r.team_name}</td>
                  <td>{Math.min(r.current_idx, info.pointCount)}/{info.pointCount}</td>
                  <td>{r.score}</td>
                  <td>{d !== null ? fmt(d) : 'w grze'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </main>
  )
}