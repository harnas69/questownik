import { plural } from '../lib/plural'
import type { ValidationError } from '../lib/points'

interface Props {
  errors: ValidationError[]
  onGo: (error: ValidationError) => void
  compact?: boolean
}

export default function ErrorSummary({ errors, onGo, compact = false }: Props) {
  if (errors.length === 0) return null
  const shown = errors.slice(0, compact ? 3 : 8)
  const rest = errors.length - shown.length

  return (
    <div role="alert" className="error-summary">
      <h2>
        Popraw {errors.length} {plural(errors.length, 'błąd', 'błędy', 'błędów')} w trasie
      </h2>
      <ul>
        {shown.map((e, i) => (
          <li key={`${e.point}-${e.field}-${e.option ?? ''}-${i}`}>
            <button type="button" className="link-button" onClick={() => onGo(e)}>
              {e.message}
            </button>
          </li>
        ))}
      </ul>
      {rest > 0 && <p className="note">…i {rest} więcej.</p>}
    </div>
  )
}