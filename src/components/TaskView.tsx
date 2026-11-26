import { useEffect, useId, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import type { AnswerResult, GamePoint } from '../types/game'
import { isGameClosed, isPointLocked, submitAnswer, submitPhoto } from '../lib/sessionApi'
import { resizeToJpeg } from '../lib/image'
import FocusHeading from './FocusHeading'

interface Props {
  point: GamePoint
  index: number
  total: number
  sessionId: string
  onNext: (result: AnswerResult) => void
  onLocked?: () => void
}

const ids = (...list: (string | false | null | undefined)[]) =>
  list.filter(Boolean).join(' ') || undefined

export default function TaskView({ point, index, total, sessionId, onNext, onLocked }: Props) {
  const [text, setText] = useState('')
  const [choice, setChoice] = useState<number | null>(null)
  const [attempts, setAttempts] = useState(0)
  const [state, setState] = useState<'idle' | 'wrong' | 'right'>('idle')
  const [result, setResult] = useState<AnswerResult | null>(null)
  const [busy, setBusy] = useState(false)
  const [netError, setNetError] = useState(false)
  const [closed, setClosed] = useState(false)
  const [photo, setPhoto] = useState<string | null>(null)
  const [preparing, setPreparing] = useState(false)
  const [photoError, setPhotoError] = useState<string | null>(null)
  const [missing, setMissing] = useState<string | null>(null)
  const nextRef = useRef<HTMLButtonElement>(null)
  const formRef = useRef<HTMLFormElement>(null)

  const uid = useId()
  const promptId = `${uid}-prompt`
  const wrongId = `${uid}-wrong`
  const missingId = `${uid}-missing`
  const photoErrId = `${uid}-photo-error`

  // Po dobrej odpowiedzi formularz znika, więc przenosimy fokus na "Dalej"
  useEffect(() => {
    if (state === 'right') nextRef.current?.focus()
  }, [state])

  const isPhoto = point.taskType === 'photo'
  const isInfo = point.taskType === 'text'
  const isQuiz = point.taskType === 'quiz'
  const isTyped = point.taskType === 'open' || point.taskType === 'code'
  const showQuiz = isQuiz && state !== 'right'
  const promptText = point.content.prompt || 'Jesteś na miejscu!'
  const disabled = busy || preparing || closed

  const onPick = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setPhotoError(null)
    setMissing(null)
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
      if (isGameClosed(e)) setClosed(true)
      else if (isPointLocked(e) && onLocked) onLocked()
      else setNetError(true)
    } finally {
      setBusy(false)
    }
  }

  // Enter na klawiaturze telefonu wysyła odpowiedź. Przycisk nie jest wyłączony przy braku
  // odpowiedzi: zamiast tego pokazujemy komunikat i ustawiamy fokus na polu.
  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (disabled) return
    const problem = isInfo
      ? null
      : isPhoto
        ? photo
          ? null
          : 'Najpierw zrób zdjęcie.'
        : isQuiz
          ? choice === null
            ? 'Wybierz jedną z odpowiedzi.'
            : null
          : text.trim() === ''
            ? 'Wpisz odpowiedź.'
            : null
    if (problem) {
      setMissing(problem)
      const selector = isQuiz
        ? 'input[type="radio"]'
        : isPhoto
          ? 'input[type="file"]'
          : 'input[type="text"]'
      formRef.current?.querySelector<HTMLElement>(selector)?.focus()
      return
    }
    setMissing(null)
    void send(false)
  }

  return (
    <section className="card" aria-label={`Zadanie ${index + 1}`}>
      <FocusHeading>
        Zadanie {index + 1} z {total}
      </FocusHeading>

      {!showQuiz && (
        <p id={promptId} className="prompt">
          {promptText}
        </p>
      )}

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
        <form ref={formRef} className="task-form" onSubmit={submit} noValidate>
          {isPhoto && (
            <div className="photo-box">
              <p className="note">
                Nie fotografuj osób: zrób zdjęcie miejsca lub przedmiotu. Zdjęcie zobaczy
                nauczyciel.
              </p>
              {photo && (
                <img className="photo-preview" src={photo} alt="Podgląd zrobionego zdjęcia" />
              )}
              <label className="file photo-pick">
                {preparing ? 'Przygotowuję zdjęcie…' : photo ? 'Zrób inne zdjęcie' : 'Zrób zdjęcie'}
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={onPick}
                  disabled={preparing || busy}
                  aria-describedby={ids(promptId, missing && missingId, photoError && photoErrId)}
                />
              </label>
              {photoError && (
                <p id={photoErrId} role="alert" className="bad">
                  {photoError}
                </p>
              )}
            </div>
          )}

          {showQuiz && (
            <fieldset
              className="options"
              aria-describedby={ids(state === 'wrong' && wrongId, missing && missingId)}
            >
              <legend className="prompt">{promptText}</legend>
              {point.content.options?.map((opt, i) => (
                <label key={i} className={choice === i ? 'opt sel' : 'opt'}>
                  <input
                    type="radio"
                    name="answer"
                    checked={choice === i}
                    onChange={() => {
                      setChoice(i)
                      setMissing(null)
                    }}
                  />
                  <span>
                    {'ABCD'[i]}. {opt}
                  </span>
                </label>
              ))}
            </fieldset>
          )}

          {isTyped && (
            <input
              className="answer"
              type="text"
              enterKeyHint="send"
              aria-label="Twoja odpowiedź"
              aria-invalid={state === 'wrong' || missing ? true : undefined}
              aria-describedby={ids(promptId, state === 'wrong' && wrongId, missing && missingId)}
              placeholder={point.taskType === 'code' ? 'Wpisz kod' : 'Twoja odpowiedź'}
              value={text}
              onChange={(e) => {
                setText(e.target.value)
                setMissing(null)
              }}
              autoCapitalize="off"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
            />
          )}

          {missing && (
            <p id={missingId} role="alert" className="bad">
              {missing}
            </p>
          )}

          {closed && (
            <p role="alert" className="bad">
              Nauczyciel zakończył tę grę. Twoje dotychczasowe wyniki zostają w rankingu.
            </p>
          )}

          {netError && (
            <p role="alert" className="bad">
              Brak połączenia z serwerem. Sprawdź internet i spróbuj ponownie. Jeśli problem się
              powtarza, odśwież stronę (postęp zostanie zachowany).
            </p>
          )}

          {state === 'wrong' && (
            <p id={wrongId} role="alert" className="bad">
              <span aria-hidden="true">✗ </span>Niepoprawnie, spróbuj jeszcze raz.
            </p>
          )}
          {state === 'wrong' && point.hint && (
            <p>
              <span aria-hidden="true">💡 </span>Podpowiedź: {point.hint}
            </p>
          )}

          <button type="submit" className="big" disabled={disabled}>
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
            <button
              type="button"
              className="big secondary"
              onClick={() => void send(true)}
              disabled={busy || closed}
            >
              Pomiń (0 pkt)
            </button>
          )}
        </form>
      )}
    </section>
  )
}