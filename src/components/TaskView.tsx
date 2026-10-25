import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import type { AnswerResult, GamePoint } from '../types/game'
import { submitAnswer, submitPhoto } from '../lib/sessionApi'
import { resizeToJpeg } from '../lib/image'
import FocusHeading from './FocusHeading'

interface Props {
  point: GamePoint
  index: number
  total: number
  sessionId: string
  onNext: (result: AnswerResult) => void
}

export default function TaskView({ point, index, total, sessionId, onNext }: Props) {
  const [text, setText] = useState('')
  const [choice, setChoice] = useState<number | null>(null)
  const [attempts, setAttempts] = useState(0)
  const [state, setState] = useState<'idle' | 'wrong' | 'right'>('idle')
  const [result, setResult] = useState<AnswerResult | null>(null)
  const [busy, setBusy] = useState(false)
  const [netError, setNetError] = useState(false)
  const [photo, setPhoto] = useState<string | null>(null)
  const [preparing, setPreparing] = useState(false)
  const [photoError, setPhotoError] = useState<string | null>(null)
  const nextRef = useRef<HTMLButtonElement>(null)

  // Po dobrej odpowiedzi przycisk "Sprawdź" znika, więc przenosimy fokus na "Dalej"
  useEffect(() => {
    if (state === 'right') nextRef.current?.focus()
  }, [state])

  const isPhoto = point.taskType === 'photo'
  const isInfo = point.taskType === 'text'
  const isQuiz = point.taskType === 'quiz'
  const canSubmit =
    !busy &&
    !preparing &&
    (isInfo || (isPhoto ? photo !== null : isQuiz ? choice !== null : text.trim() !== ''))

  const onPick = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setPhotoError(null)
    setPreparing(true)
    try {
      setPhoto(await resizeToJpeg(file))
    } catch (err) {
      console.error(err)
      setPhotoError('Nie udało się odczytać zdjęcia. Spróbuj zrobić je jeszcze raz.')
    } finally {
      setPreparing(false)
    }
  }

  const send = async (skip: boolean) => {
    setBusy(true)
    setNetError(false)
    try {
      if (isPhoto && photo) {
        const res = await submitPhoto(sessionId, point.id, photo)
        setResult(res)
        setState('right')
        return
      }
      const given = skip || isInfo ? null : isQuiz ? choice : text
      const res = await submitAnswer(sessionId, point.id, given, skip)
      setAttempts(res.attempts)
      if (skip) {
        onNext(res)
        return
      }
      if (res.correct) {
        setResult(res)
        setState('right')
      } else {
        setState('wrong')
      }
    } catch (e) {
      console.error(e)
      setNetError(true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="card" aria-label={`Zadanie ${index + 1}`}>
      <FocusHeading>
        Zadanie {index + 1} z {total}
      </FocusHeading>
      <p className="prompt">{point.content.prompt || 'Jesteś na miejscu!'}</p>

      {isPhoto && state !== 'right' && (
        <div className="photo-box">
          <p className="note">
            Nie fotografuj osób: zrób zdjęcie miejsca lub przedmiotu. Zdjęcie zobaczy nauczyciel.
          </p>
          {photo && <img className="photo-preview" src={photo} alt="Podgląd zrobionego zdjęcia" />}
          <label className="file photo-pick">
            {preparing ? 'Przygotowuję zdjęcie…' : photo ? 'Zrób inne zdjęcie' : 'Zrób zdjęcie'}
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={onPick}
              disabled={preparing || busy}
            />
          </label>
          {photoError && (
            <p role="alert" className="bad">
              {photoError}
            </p>
          )}
        </div>
      )}

      {isQuiz && state !== 'right' && (
        <fieldset className="options">
          <legend className="sr-only">Wybierz odpowiedź</legend>
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
        </fieldset>
      )}

      {(point.taskType === 'open' || point.taskType === 'code') && state !== 'right' && (
        <input
          className="answer"
          aria-label="Twoja odpowiedź"
          placeholder={point.taskType === 'code' ? 'Wpisz kod' : 'Twoja odpowiedź'}
          value={text}
          onChange={(e) => setText(e.target.value)}
          autoCapitalize="off"
          autoComplete="off"
        />
      )}

      {netError && (
        <p role="alert" className="bad">
          Brak połączenia z serwerem. Sprawdź internet i spróbuj ponownie. Jeśli problem się
          powtarza, odśwież stronę (postęp zostanie zachowany).
        </p>
      )}

      {state === 'wrong' && (
        <p role="alert" className="bad">
          <span aria-hidden="true">✗ </span>Niepoprawnie, spróbuj jeszcze raz.
        </p>
      )}
      {state === 'wrong' && point.hint && <p>💡 Podpowiedź: {point.hint}</p>}

      {state === 'right' && result ? (
        <>
          <p className="good" role="status">
            <span aria-hidden="true">✓ </span>
            {isPhoto
              ? 'Zdjęcie wysłane! Punkty pojawią się po zatwierdzeniu przez nauczyciela.'
              : `${isInfo ? 'Zaliczone!' : 'Dobrze!'} +${result.earned} pkt`}
          </p>
          <button ref={nextRef} className="big" onClick={() => onNext(result)}>
            Dalej
          </button>
        </>
      ) : (
        <>
          <button className="big" onClick={() => send(false)} disabled={!canSubmit}>
            {busy
              ? isPhoto
                ? 'Wysyłam…'
                : 'Sprawdzam…'
              : isPhoto
                ? 'Wyślij zdjęcie'
                : isInfo
                  ? 'Czytam dalej'
                  : 'Sprawdź'}
          </button>
          {state === 'wrong' && attempts >= 2 && (
            <button className="big secondary" onClick={() => send(true)} disabled={busy}>
              Pomiń (0 pkt)
            </button>
          )}
        </>
      )}
    </section>
  )
}