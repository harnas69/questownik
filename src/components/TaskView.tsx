import { useState } from 'react'
import type { GamePoint, PointResult } from '../types/game'
import { checkAnswer, pointsFor } from '../lib/scoring'

interface Props {
  point: GamePoint
  index: number
  total: number
  onDone: (result: PointResult) => void
}

export default function TaskView({ point, index, total, onDone }: Props) {
  const [text, setText] = useState('')
  const [choice, setChoice] = useState<number | null>(null)
  const [attempts, setAttempts] = useState(0)
  const [state, setState] = useState<'idle' | 'wrong' | 'right'>('idle')
  const [earned, setEarned] = useState(0)

  const isInfo = point.taskType === 'text' || point.taskType === 'photo'
  const isQuiz = point.taskType === 'quiz'
  const canSubmit = isInfo || (isQuiz ? choice !== null : text.trim() !== '')

  const submit = () => {
    const n = attempts + 1
    setAttempts(n)
    const given = isQuiz ? (choice as number) : text
    if (checkAnswer(point, given)) {
      setEarned(pointsFor(point.score, n))
      setState('right')
    } else {
      setState('wrong')
    }
  }

  const finish = (correct: boolean, pts: number) =>
    onDone({ pointId: point.id, correct, earned: pts, attempts })

  return (
    <section className="task" aria-label={`Zadanie ${index + 1}`}>
      <h2>
        Zadanie {index + 1} z {total}
      </h2>
      <p className="prompt">{point.content.prompt || 'Jesteś na miejscu!'}</p>

      {point.taskType === 'photo' && (
        <p>Zrób zdjęcie, a potem kliknij przycisk poniżej. (Wysyłanie zdjęć dodamy później.)</p>
      )}

      {isQuiz && state !== 'right' && (
        <div role="radiogroup" className="options">
          {point.content.options?.map((opt, i) => (
            <label key={i} className={choice === i ? 'opt sel' : 'opt'}>
              <input
                type="radio"
                name="answer"
                checked={choice === i}
                onChange={() => setChoice(i)}
              />
              <span>
                {'ABCD'[i]}. {opt}
              </span>
            </label>
          ))}
        </div>
      )}

      {(point.taskType === 'open' || point.taskType === 'code') && state !== 'right' && (
        <input
          className="answer"
          placeholder={point.taskType === 'code' ? 'Wpisz kod' : 'Twoja odpowiedź'}
          value={text}
          onChange={(e) => setText(e.target.value)}
          autoCapitalize="off"
          autoComplete="off"
        />
      )}

      {state === 'wrong' && (
        <p role="alert" className="bad">
          Niepoprawnie, spróbuj jeszcze raz.
        </p>
      )}
      {state === 'wrong' && point.hint && <p>💡 Podpowiedź: {point.hint}</p>}

      {state === 'right' ? (
        <>
          <p className="good">{isInfo ? 'Zaliczone!' : 'Dobrze!'} +{earned} pkt</p>
          <button className="big" onClick={() => finish(true, earned)}>
            Dalej
          </button>
        </>
      ) : (
        <>
          <button className="big" onClick={submit} disabled={!canSubmit}>
            {isInfo ? (point.taskType === 'photo' ? 'Zrobiłem zdjęcie' : 'Czytam dalej') : 'Sprawdź'}
          </button>
          {state === 'wrong' && attempts >= 2 && (
            <button className="big secondary" onClick={() => finish(false, 0)}>
              Pomiń (0 pkt)
            </button>
          )}
        </>
      )}
    </section>
  )
}