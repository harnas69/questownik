import { TASK_LABELS, TASK_TYPES } from '../types/route'
import type { DraftPoint, TaskContent, TaskType } from '../types/route'
import { contentFor } from '../lib/points'

interface Props {
  point: DraftPoint
  index: number
  total: number
  onChange: (patch: Partial<DraftPoint>) => void
  onMoveUp: () => void
  onMoveDown: () => void
  onDelete: () => void
}

export default function PointForm({
  point,
  index,
  total,
  onChange,
  onMoveUp,
  onMoveDown,
  onDelete,
}: Props) {
  const setContent = (patch: Partial<TaskContent>) =>
    onChange({ content: { ...point.content, ...patch } })

  const setOption = (i: number, value: string) =>
    setContent({ options: point.content.options?.map((o, j) => (j === i ? value : o)) })

  const promptLabel =
    point.taskType === 'photo'
      ? 'Polecenie (co sfotografować)'
      : point.taskType === 'text'
        ? 'Tekst do wyświetlenia'
        : 'Treść pytania'

  return (
    <section aria-label={`Punkt ${index + 1}`} className="point-form">
      <h2>
        Punkt {index + 1} z {total}
      </h2>

      <label>
        Typ zadania
        <select
          value={point.taskType}
          onChange={(e) => {
            const t = e.target.value as TaskType
            onChange({ taskType: t, content: contentFor(t, point.content) })
          }}
        >
          {TASK_TYPES.map((t) => (
            <option key={t} value={t}>
              {TASK_LABELS[t]}
            </option>
          ))}
        </select>
      </label>

      <label>
        {promptLabel}
        <textarea
          rows={3}
          value={point.content.prompt}
          onChange={(e) => setContent({ prompt: e.target.value })}
        />
      </label>

      {point.taskType === 'quiz' && (
        <fieldset>
          <legend>Odpowiedzi (zaznacz poprawną)</legend>
          {point.content.options?.map((opt, i) => (
            <div key={i}>
              <input
                type="radio"
                name="correct"
                aria-label={`Poprawna: ${'ABCD'[i]}`}
                checked={point.content.correctIndex === i}
                onChange={() => setContent({ correctIndex: i })}
              />
              <input
                placeholder={`Odpowiedź ${'ABCD'[i]}`}
                value={opt}
                onChange={(e) => setOption(i, e.target.value)}
              />
            </div>
          ))}
        </fieldset>
      )}

      {(point.taskType === 'open' || point.taskType === 'code') && (
        <label>
          {point.taskType === 'code' ? 'Kod do wpisania' : 'Poprawna odpowiedź'}
          <input
            value={point.content.answer ?? ''}
            onChange={(e) => setContent({ answer: e.target.value })}
          />
        </label>
      )}

      <label>
        Promień aktywacji: {point.radiusM} m
        <input
          type="range"
          min={20}
          max={200}
          step={5}
          value={point.radiusM}
          onChange={(e) => onChange({ radiusM: Number(e.target.value) })}
        />
      </label>

      <label>
        Punkty do zdobycia
        <input
          type="number"
          min={0}
          max={1000}
          value={point.score}
          onChange={(e) => onChange({ score: Math.max(0, Number(e.target.value) || 0) })}
        />
      </label>

      <label>
        Podpowiedź (opcjonalnie)
        <input value={point.hint} onChange={(e) => onChange({ hint: e.target.value })} />
      </label>

      <div className="row">
        <button type="button" onClick={onMoveUp} disabled={index === 0}>
          ↑ Wyżej
        </button>
        <button type="button" onClick={onMoveDown} disabled={index === total - 1}>
          ↓ Niżej
        </button>
        <button type="button" onClick={onDelete}>
          Usuń punkt
        </button>
      </div>
    </section>
  )
}