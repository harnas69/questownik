import PointForm from './PointForm'
import { plural } from '../lib/plural'
import type { ValidationError } from '../lib/points'
import { TASK_LABELS } from '../types/route'
import type { DraftPoint } from '../types/route'

interface Props {
  point: DraftPoint
  index: number
  total: number
  errors: ValidationError[]
  open: boolean
  onToggle: () => void
  onChange: (patch: Partial<DraftPoint>) => void
  onMoveUp: () => void
  onMoveDown: () => void
  onDelete: () => void
}

export default function PointSheet({
  point,
  index,
  total,
  errors,
  open,
  onToggle,
  onChange,
  onMoveUp,
  onMoveDown,
  onDelete,
}: Props) {
  const text = point.content.prompt.trim()
  const warn = errors.length > 0 || !text
  const sub =
    errors.length > 0
      ? `${errors.length} ${plural(errors.length, 'błąd', 'błędy', 'błędów')} do poprawy`
      : open
        ? 'Dotknij, aby zwinąć'
        : text || 'Dotknij i uzupełnij treść zadania'

  return (
    <section className="sheet" aria-label="Edycja wybranego punktu">
      <button
        type="button"
        className="sheet-bar"
        aria-expanded={open}
        aria-controls={open ? 'sheet-panel' : undefined}
        onClick={onToggle}
      >
        <span className="pl-num" aria-hidden="true">
          {index + 1}
        </span>
        <span className="sheet-text">
          <strong>
            Punkt {index + 1} z {total} · {TASK_LABELS[point.taskType]}
            {point.unlock === 'qr' ? ' · kod QR' : ''}
          </strong>
          <span className={warn ? 'sheet-sub warn' : 'sheet-sub'}>{sub}</span>
        </span>
        <span className="sheet-chevron" aria-hidden="true">
          {open ? '▾' : '▴'}
        </span>
      </button>

      {open && (
        <div id="sheet-panel" className="sheet-panel">
          <PointForm
            key={index}
            point={point}
            index={index}
            total={total}
            errors={errors}
            onChange={onChange}
            onMoveUp={onMoveUp}
            onMoveDown={onMoveDown}
            onDelete={onDelete}
          />
          <button type="button" className="big" onClick={onToggle}>
            Gotowe
          </button>
        </div>
      )}
    </section>
  )
}