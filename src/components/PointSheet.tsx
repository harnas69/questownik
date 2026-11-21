import PointForm from './PointForm'
import { TASK_LABELS } from '../types/route'
import type { DraftPoint } from '../types/route'

interface Props {
  point: DraftPoint
  index: number
  total: number
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
  open,
  onToggle,
  onChange,
  onMoveUp,
  onMoveDown,
  onDelete,
}: Props) {
  const text = point.content.prompt.trim()

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
          <span className={text ? 'sheet-sub' : 'sheet-sub warn'}>
            {open ? 'Dotknij, aby zwinąć' : text || 'Dotknij i uzupełnij treść zadania'}
          </span>
        </span>
        <span className="sheet-chevron" aria-hidden="true">
          {open ? '▾' : '▴'}
        </span>
      </button>

      {open && (
        <div id="sheet-panel" className="sheet-panel">
          <PointForm
            point={point}
            index={index}
            total={total}
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