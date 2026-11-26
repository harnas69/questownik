import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import PasswordField from '../components/PasswordField'
import { PageSkeleton } from '../components/Skeleton'
import { passwordErrorMessage, updatePassword, useAuth } from '../lib/auth'

export default function ResetPasswordPage() {
  const { user, loading } = useAuth()
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [err1, setErr1] = useState<string | null>(null)
  const [err2, setErr2] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const ref1 = useRef<HTMLInputElement>(null)
  const ref2 = useRef<HTMLInputElement>(null)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (busy) return
    setFormError(null)
    const p1 = pw === '' ? 'Wpisz nowe hasło.' : pw.length < 8 ? 'Hasło musi mieć co najmniej 8 znaków.' : null
    const p2 = p1 ? null : pw2 === '' ? 'Powtórz nowe hasło.' : pw !== pw2 ? 'Hasła nie są takie same.' : null
    setErr1(p1)
    setErr2(p2)
    if (p1) {
      ref1.current?.focus()
      return
    }
    if (p2) {
      ref2.current?.focus()
      return
    }
    setBusy(true)
    try {
      await updatePassword(pw)
      setDone(true)
    } catch (error) {
      console.error(error)
      setFormError(passwordErrorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <PageSkeleton label="Sprawdzam link…" />

  if (!user) {
    return (
      <main className="play">
        <h1>Zmiana hasła</h1>
        <p role="alert" className="bad">
          Link wygasł albo jest nieprawidłowy. Poproś o nowy na stronie logowania („Nie pamiętasz
          hasła?”).
        </p>
        <Link className="btn-link" to="/konto">
          Przejdź do logowania
        </Link>
      </main>
    )
  }

  if (done) {
    return (
      <main className="play">
        <h1>Hasło zmienione</h1>
        <p role="status">Możesz teraz logować się nowym hasłem.</p>
        <Link className="big" to="/konto">
          Przejdź do mojego konta
        </Link>
      </main>
    )
  }

  const formErrId = formError ? 'reset-form-error' : undefined

  return (
    <main className="play">
      <h1>Ustaw nowe hasło</h1>
      <form className="card auth-form" onSubmit={(e) => void submit(e)} noValidate>
        <PasswordField
          id="new-pass"
          label="Nowe hasło (minimum 8 znaków)"
          value={pw}
          onChange={(v) => {
            setPw(v)
            setErr1(null)
          }}
          autoComplete="new-password"
          error={err1}
          describedBy={formErrId}
          toggleHint="nowe"
          inputRef={ref1}
        />
        <PasswordField
          id="new-pass2"
          label="Powtórz nowe hasło"
          value={pw2}
          onChange={(v) => {
            setPw2(v)
            setErr2(null)
          }}
          autoComplete="new-password"
          error={err2}
          describedBy={formErrId}
          toggleHint="powtórzone"
          inputRef={ref2}
        />
        {formError && (
          <p id="reset-form-error" role="alert" className="bad">
            {formError}
          </p>
        )}
        <button type="submit" className="big" disabled={busy}>
          {busy ? 'Zapisuję…' : 'Zapisz nowe hasło'}
        </button>
      </form>
    </main>
  )
}