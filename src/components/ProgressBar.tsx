export default function ProgressBar({ done, total }: { done: number; total: number }) {
  const value = Math.min(done, total)
  const pct = total > 0 ? Math.round((value / total) * 100) : 0
  return (
    <div>
      <div className="progress-label">
        <span>Ukończone punkty</span>
        <span>
          {value} / {total}
        </span>
      </div>
      <div
        className="progress"
        role="progressbar"
        aria-label="Postęp trasy"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={value}
      >
        <div style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}