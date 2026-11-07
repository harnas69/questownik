import { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { extractToken } from '../lib/qr'
import { unlockErrorKind, unlockPoint } from '../lib/sessionApi'
import FocusHeading from './FocusHeading'

const QrScanner = lazy(() => import('./QrScanner'))

interface Props {
  sessionId: string
  index: number
  total: number
  pendingToken: string | null
  onPendingConsumed: () => void
  onUnlocked: () => void
}

export default function QrUnlock({
  sessionId,
  index,
  total,
  pendingToken,
  onPendingConsumed,
  onUnlocked,
}: Props) {
  const [scanning, setScanning] = useState(false)
  const [manual, setManual] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const usedPending = useRef(false)

  const attempt = useCallback(
    async (token: string) => {
      setBusy(true)
      setMessage(null)
      try {
        await unlockPoint(sessionId, token)
        onUnlocked()
      } catch (e) {
        console.error(e)
        const kind = unlockErrorKind(e)
        setMessage(
          kind === 'wrong'
            ? 'Nieprawidłowy kod. Upewnij się, że skanujesz kartkę z właściwego miejsca.'
            : kind === 'other'
              ? `To kod z innego punktu. Teraz szukasz kodu dla punktu ${index + 1}.`
              : kind === 'closed'
                ? 'Nauczyciel zakończył tę grę.'
                : 'Brak połączenia z serwerem. Sprawdź internet i spróbuj ponownie.'
        )
      } finally {
        setBusy(false)
      }
    },
    [sessionId, index, onUnlocked]
  )

  // Kod z linku (zeskanowany aparatem telefonu poza aplikacją)
  useEffect(() => {
    if (!pendingToken || usedPending.current) return
    usedPending.current = true
    onPendingConsumed()
    void attempt(pendingToken)
  }, [pendingToken, attempt, onPendingConsumed])

  const onScan = useCallback(
    (text: string) => {
      setScanning(false)
      const token = extractToken(text)
      if (!token) {
        setMessage('To nie jest kod Questownika. Zeskanuj kartkę z kodem dla tego punktu.')
        return
      }
      void attempt(token)
    },
    [attempt]
  )

  const submitManual = (e: FormEvent) => {
    e.preventDefault()
    const token = extractToken(manual)
    if (!token) {
      setMessage('Kod ma 10 znaków: cyfry 0-9 i litery A-F, np. A3F92 C7B1E.')
      return
    }
    void attempt(token)
  }

  return (
    <section className="card" aria-label={`Kod QR dla punktu ${index + 1}`}>
      <FocusHeading>
        Znajdź kod QR dla punktu {index + 1} z {total}
      </FocusHeading>
      <p>
        Dojdź do miejsca wskazanego przez nauczyciela i zeskanuj tam kod QR. Zadanie odblokuje się
        po zeskanowaniu.
      </p>

      {scanning ? (
        <Suspense fallback={<p role="status">Uruchamiam skaner…</p>}>
          <QrScanner onResult={onScan} onClose={() => setScanning(false)} />
        </Suspense>
      ) : (
        <button
          type="button"
          className="big"
          disabled={busy}
          onClick={() => {
            setMessage(null)
            setScanning(true)
          }}
        >
          {busy ? 'Sprawdzam kod…' : 'Skanuj kod QR'}
        </button>
      )}

      {message && (
        <p role="alert" className="bad">
          {message}
        </p>
      )}

      <form className="auth-form" onSubmit={submitManual}>
        <label htmlFor="qr-manual" className="field-label">
          Nie możesz zeskanować? Wpisz kod z kartki
        </label>
        <input
          id="qr-manual"
          className="answer code-input"
          placeholder="np. A3F92 C7B1E"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          value={manual}
          onChange={(e) => setManual(e.target.value)}
        />
        <button type="submit" disabled={busy || !manual.trim()}>
          Odblokuj zadanie
        </button>
      </form>
    </section>
  )
}