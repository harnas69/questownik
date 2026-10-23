import { TASK_LABELS } from '../types/route'
import type { DraftPoint } from '../types/route'

interface Props {
  points: DraftPoint[]
  selected: number | null
  onSelect: (index: number) => void
}

export default function PointList({ points, selected, onSelect }: Props) {
  if (points.length === 0) {
    return (
      <p className="note">
        Brak punktów. Kliknij na mapie albo użyj przycisków nad mapą.
      </p>
    )
  }

  return (
    <ol className="point-list" aria-label="Lista punktów trasy">
      {points.map((p, i) => {
        const text = p.content.prompt.trim()
        return (
          <li key={i}>
            <button
              type="button"
              className={i === selected ? 'pl-item sel' : 'pl-item'}
              aria-current={i === selected ? 'true' : undefined}
              onClick={() => onSelect(i)}
            >
              <span className="pl-num" aria-hidden="true">
                {i + 1}
              </span>
              <span className="pl-body">
                <span className="pl-type">
                  Punkt {i + 1}: {TASK_LABELS[p.taskType]}
                </span>
                <span className="pl-text">{text || 'Brak treści zadania'}</span>
              </span>
              {!text && (
                <span className="pl-warn" role="img" aria-label="Uzupełnij treść zadania">
                  !
                </span>
              )}
            </button>
          </li>
        )
      })}
    </ol>
  )
}