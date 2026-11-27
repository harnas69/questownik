import { useEffect, useRef, useState } from 'react'
import { TASK_LABELS, TASK_TYPES, UNLOCK_LABELS, UNLOCK_MODES } from '../types/route'
import type { DraftPoint, TaskContent, TaskType, UnlockMode } from '../types/route'
import FieldError from './FieldError'
import {
  LIMITS,
  MAX_OPTIONS,
  MIN_OPTIONS,
  addOption,
  contentFor,
  errorId,
  fieldId,
  optionLetter,
  parseScore,
  removeOption,
} from '../lib/points'
import type { ErrorField, ValidationError } from '../lib/points'
import CoordFields from './CoordFields'

interface Props {
  point: DraftPoint
  index: number
  total: number
  errors: ValidationError[]
  onChange: (patch: Partial<DraftPoint>) => void
  onMoveUp: () => void
  onMoveDown: () => void
  onDelete: () => void
}

// Wartość trzymana jako tekst, żeby dało się ją wyczyścić; parsowanie przy opuszczeniu pola
function ScoreField({
  id,
  value,
  invalid,
  describedBy,
  onCommit,
}: {
  id: string
  value: number
  invalid: boolean
  describedBy?: string
  onCommit: (n: number) => void
}) {
  const [text, setText] = useState(String(value))
  const [prev, setPrev] = useState(value)
  const [rejected, setRejected] = useState(false)
  if (value !== prev) {
    setPrev(value)
    setText(String(value))
  }
  const noteId = `${id}-note`

  return (
    <>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={text}
        aria-invalid={invalid ? true : undefined}
        aria-describedby={[noteId, describedBy].filter(Boolean).join(' ')}
        onChange={(e) => {
          setText(e.target.value)
          setRejected(false)
        }}
        onBlur={() => {
          const n = parseScore(text)
          if (n === null) {
            setText(String(value))
            setRejected(true)
            return
          }
          setText(String(n))
          setRejected(false)
          if (n !== value) onCommit(n)
        }}
      />
      <p id={noteId} className="note">
        {rejected
          ? `Wpisz liczbę całkowitą od 0 do ${LIMITS.score}. Przywrócono poprzednią wartość.`
          : `Liczba całkowita od 0 do ${LIMITS.score}.`}
      </p>
    </>
  )
}

export default function PointForm({
  point,
  index,
  total,
  errors,
  onChange,
  onMoveUp,
  onMoveDown,
  onDelete,
}: Props) {
  const optionRefs = useRef<(HTMLInputElement | null)[]>([])
  const focusIdx = useRef<number | null>(null)
  const [note, setNote] = useState('')

  // Po dodaniu lub usunięciu odpowiedzi ustawiamy fokus na odpowiednim polu
  useEffect(() => {
    const i = focusIdx.current
    if (i === null) return
    const el = optionRefs.current[i]
    if (el) {
      focusIdx.current = null
      el.focus()
    }
  })

  const err = (field: ErrorField, option?: number) =>
    errors.find((e) => e.field === field && e.option === option)

  const attrs = (field: ErrorField, option?: number) => {
    const e = err(field, option)
    return {
      'aria-invalid': e ? (true as const) : undefined,
      'aria-describedby': e ? errorId(index, field, option) : undefined,
    }
  }

  const setContent = (patch: Partial<TaskContent>) =>
    onChange({ content: { ...point.content, ...patch } })

  const setOption = (i: number, value: string) =>
    setContent({ options: point.content.options?.map((o, j) => (j === i ? value : o)) })

  const options = point.content.options ?? []

  const addOpt = () => {
    focusIdx.current = options.length
    onChange({ content: addOption(point.content) })
    setNote(`Dodano odpowiedź ${optionLetter(options.length)}.`)
  }

  const removeOpt = (i: number) => {
    const wasCorrect = (point.content.correctIndex ?? 0) === i
    focusIdx.current = Math.min(i, options.length - 2)
    onChange({ content: removeOption(point.content, i) })
    setNote(
      `Usunięto odpowiedź ${optionLetter(i)}.${wasCorrect ? ' Poprawną odpowiedzią jest teraz A. Sprawdź to.' : ''}`
    )
  }

  const promptLabel =
    point.taskType === 'photo'
      ? 'Polecenie (co sfotografować)'
      : point.taskType === 'text'
        ? 'Tekst do wyświetlenia'
        : 'Treść pytania'

  const typeId = `pt${index}-type`
  const unlockId = `pt${index}-unlock`
  const radiusId = `pt${index}-radius`
  const scoreError = err('score')

  return (
    <section aria-label={`Punkt ${index + 1}`} className="point-form">
      <h2>
        Punkt {index + 1} z {total}
      </h2>

      <div className="field">
        <label htmlFor={typeId} className="field-label">
          Typ zadania
        </label>
        <select
          id={typeId}
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
      </div>

      <div className="field">
        <label htmlFor={fieldId(index, 'prompt')} className="field-label">
          {promptLabel}
        </label>
        <textarea
          id={fieldId(index, 'prompt')}
          rows={3}
          value={point.content.prompt}
          onChange={(e) => setContent({ prompt: e.target.value })}
          {...attrs('prompt')}
        />
        <FieldError id={errorId(index, 'prompt')} text={err('prompt')?.text} />
      </div>

      {point.taskType === 'quiz' && (
        <fieldset>
          <legend>Odpowiedzi (zaznacz poprawną)</legend>
          {options.map((opt, i) => {
            const letter = optionLetter(i)
            const e = err('option', i)
            return (
              <div key={i}>
                <div className="opt-row">
                  <input
                    type="radio"
                    name={`correct-${index}`}
                    aria-label={`Zaznacz odpowiedź ${letter} jako poprawną`}
                    checked={(point.content.correctIndex ?? 0) === i}
                    onChange={() => setContent({ correctIndex: i })}
                  />
                  <input
                    id={fieldId(index, 'option', i)}
                    ref={(el) => {
                      optionRefs.current[i] = el
                    }}
                    type="text"
                    aria-label={`Treść odpowiedzi ${letter}`}
                    placeholder={`Odpowiedź ${letter}`}
                    autoComplete="off"
                    value={opt}
                    onChange={(ev) => setOption(i, ev.target.value)}
                    {...attrs('option', i)}
                  />
                  <button
                    type="button"
                    className="opt-remove"
                    aria-label={`Usuń odpowiedź ${letter}`}
                    disabled={options.length <= MIN_OPTIONS}
                    onClick={() => removeOpt(i)}
                  >
                    Usuń
                  </button>
                </div>
                <FieldError id={errorId(index, 'option', i)} text={e?.text} />
              </div>
            )
          })}
          <div className="row">
            <button type="button" onClick={addOpt} disabled={options.length >= MAX_OPTIONS}>
              Dodaj odpowiedź
            </button>
            <span className="note">
              Quiz ma od {MIN_OPTIONS} do {MAX_OPTIONS} odpowiedzi.
            </span>
          </div>
          <p role="status" className="note">
            {note}
          </p>
        </fieldset>
      )}

      {(point.taskType === 'open' || point.taskType === 'code') && (
        <div className="field">
          <label htmlFor={fieldId(index, 'answer')} className="field-label">
            {point.taskType === 'code' ? 'Kod do wpisania' : 'Poprawna odpowiedź'}
          </label>
          <input
            id={fieldId(index, 'answer')}
            type="text"
            autoComplete="off"
            value={point.content.answer ?? ''}
            onChange={(e) => setContent({ answer: e.target.value })}
            {...attrs('answer')}
          />
          <FieldError id={errorId(index, 'answer')} text={err('answer')?.text} />
        </div>
      )}

      <div className="field">
        <label htmlFor={unlockId} className="field-label">
          Sposób odblokowania zadania
        </label>
        <select
          id={unlockId}
          value={point.unlock}
          onChange={(e) => onChange({ unlock: e.target.value as UnlockMode })}
        >
          {UNLOCK_MODES.map((m) => (
            <option key={m} value={m}>
              {UNLOCK_LABELS[m]}
            </option>
          ))}
        </select>
      </div>

      {point.unlock === 'gps' ? (
        <div className="field">
          <label htmlFor={radiusId} className="field-label">
            Promień aktywacji: {point.radiusM} m
          </label>
          <input
            id={radiusId}
            type="range"
            min={20}
            max={200}
            step={5}
            value={point.radiusM}
            onChange={(e) => onChange({ radiusM: Number(e.target.value) })}
          />
        </div>
      ) : (
        <p className="note">
          Zadanie odblokuje się dopiero po zeskanowaniu kodu QR. Kody wydrukujesz w panelu gry po
          jej uruchomieniu. Pozycja punktu na mapie służy graczom tylko jako wskazówka, gdzie
          szukać kodu.
        </p>
      )}
      <CoordFields index={index} lat={point.lat} lng={point.lng} onChange={onChange} />
      <div className="field">
        <label htmlFor={fieldId(index, 'score')} className="field-label">
          Punkty do zdobycia
        </label>
        <ScoreField
          id={fieldId(index, 'score')}
          value={point.score}
          invalid={Boolean(scoreError)}
          describedBy={scoreError ? errorId(index, 'score') : undefined}
          onCommit={(n) => onChange({ score: n })}
        />
        <FieldError id={errorId(index, 'score')} text={scoreError?.text} />
      </div>

      <div className="field">
        <label htmlFor={fieldId(index, 'hint')} className="field-label">
          Podpowiedź (opcjonalnie)
        </label>
        <input
          id={fieldId(index, 'hint')}
          type="text"
          autoComplete="off"
          value={point.hint}
          onChange={(e) => onChange({ hint: e.target.value })}
          {...attrs('hint')}
        />
        <FieldError id={errorId(index, 'hint')} text={err('hint')?.text} />
      </div>

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