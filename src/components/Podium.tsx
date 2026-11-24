import { fmtClock } from '../lib/format'
import { durationMs } from '../lib/ranking'
import type { SessionRow } from '../lib/ranking'

const MEDAL = ['🥇', '🥈', '🥉']

interface Props {
  rows: SessionRow[]
  mineId: string | null
}

// W kodzie kolejność to 1, 2, 3 (tak czyta czytnik ekranu), a układ graficzny ustawia CSS: 2, 1, 3
export default function Podium({ rows, mineId }: Props) {
  return (
    <section aria-labelledby="podium-title" className="podium-wrap">
      <h2 id="podium-title" className="sr-only">
        Podium
      </h2>
      <ol className="podium" role="list">
        {rows.map((r, i) => {
          const d = durationMs(r)
          const mine = r.id === mineId
          return (
            <li key={r.id} className={`pd pd-${i + 1}${mine ? ' mine' : ''}`}>
              <span className="pd-medal" aria-hidden="true">
                {MEDAL[i]}
              </span>
              <strong className="pd-name">
                <span className="sr-only">Miejsce {i + 1}: </span>
                {r.team_name}
              </strong>
              <span className="pd-score">{r.score} pkt</span>
              <span className="pd-time">{d !== null ? fmtClock(d) : 'w grze'}</span>
              {mine && <span className="badge near">Twoja drużyna</span>}
              <span className="pd-step" aria-hidden="true">
                {i + 1}
              </span>
            </li>
          )
        })}
      </ol>
    </section>
  )
}