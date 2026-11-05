import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { passwordErrorMessage, updatePassword, useAuth } from '../lib/auth'

export default function ResetPasswordPage() {
  const { user, loading } = useAuth()
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (pw !== pw2) {
      setError('Hasła nie są takie same.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await updatePassword(pw)
      setDone(true)
    } catch (err) {
      console.error(err)
      setError(passwordErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <main className="play">
        <p role="status">Sprawdzam link…</p>
      </main>
    )
  }

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

  return (
    <main className="play">
      <h1>Ustaw nowe hasło</h1>
      <form className="card auth-form" onSubmit={submit}>
        <label htmlFor="new-pass" className="field-label">
          Nowe hasło (minimum 8 znaków)
        </label>
        <input
          id="new-pass"
          className="answer"
          type="password"
          minLength={8}
          autoComplete="new-password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
        />
        <label htmlFor="new-pass2" className="field-label">
          Powtórz nowe hasło
        </label>
        <input
          id="new-pass2"
          className="answer"
          type="password"
          minLength={8}
          autoComplete="new-password"
          value={pw2}
          onChange={(e) => setPw2(e.target.value)}
        />
        {error && (
          <p role="alert" className="bad">
            {error}
          </p>
        )}
        <button type="submit" className="big" disabled={busy || pw.length < 8 || pw2.length < 8}>
          {busy ? 'Zapisuję…' : 'Zapisz nowe hasło'}
        </button>
      </form>
    </main>
  )
}