import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  authErrorMessage,
  requestPasswordReset,
  signInWithEmail,
  signInWithGoogle,
  signUpWithEmail,
} from '../lib/auth'

type Mode = 'in' | 'up' | 'reset'

const TITLES: Record<Mode, string> = {
  in: 'Zaloguj się',
  up: 'Załóż konto',
  reset: 'Odzyskaj hasło',
}

export default function LoginForm() {
  const [mode, setMode] = useState<Mode>('in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  const switchMode = (m: Mode) => {
    setMode(m)
    setError(null)
    setInfo(null)
  }

  const google = async () => {
    setError(null)
    try {
      await signInWithGoogle()
    } catch (e) {
      console.error(e)
      setError(authErrorMessage(e))
    }
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setInfo(null)
    try {
      if (mode === 'in') {
        await signInWithEmail(email, password)
      } else if (mode === 'up') {
        const r = await signUpWithEmail(email, password)
        if (r === 'confirm') {
          setInfo(
            'Jeśli ten adres nie był jeszcze używany, wysłaliśmy na niego link potwierdzający. Sprawdź pocztę (także folder spam), kliknij link i wróć tutaj.'
          )
        }
      } else {
        await requestPasswordReset(email)
        setInfo(
          'Jeśli konto z tym adresem istnieje, wysłaliśmy na nie link do ustawienia nowego hasła. Sprawdź pocztę (także folder spam).'
        )
      }
    } catch (err) {
      console.error(err)
      setError(authErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="card" aria-labelledby="auth-title">
      <h2 id="auth-title">{TITLES[mode]}</h2>

      {mode !== 'reset' && (
        <>
          <button type="button" className="big secondary" onClick={() => void google()}>
            Kontynuuj z Google
          </button>
          <p className="auth-or">lub e-mailem</p>
        </>
      )}

      <form className="auth-form" onSubmit={submit}>
        <label htmlFor="auth-email" className="field-label">
          Adres e-mail
        </label>
        <input
          id="auth-email"
          className="answer"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        {mode !== 'reset' && (
          <>
            <label htmlFor="auth-pass" className="field-label">
              Hasło (minimum 8 znaków)
            </label>
            <input
              id="auth-pass"
              className="answer"
              type="password"
              minLength={8}
              autoComplete={mode === 'in' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </>
        )}

        {error && (
          <p role="alert" className="bad">
            {error}
          </p>
        )}
        {info && <p role="status">{info}</p>}

        {mode === 'up' && (
          <p className="note">
            Zakładając konto, potwierdzasz, że zapoznałeś się z{' '}
            <Link to="/prywatnosc">informacją o prywatności</Link>.
          </p>
        )}
        {mode === 'reset' && (
          <p className="note">
            Dotyczy kont założonych e-mailem. Konta Google nie mają hasła w Questowniku, więc użyj
            przycisku „Kontynuuj z Google”.
          </p>
        )}

        <button
          type="submit"
          className="big"
          disabled={busy || !email.trim() || (mode !== 'reset' && password.length < 8)}
        >
          {busy
            ? 'Chwileczkę…'
            : mode === 'in'
              ? 'Zaloguj się'
              : mode === 'up'
                ? 'Załóż konto'
                : 'Wyślij link do zmiany hasła'}
        </button>
      </form>

      {mode === 'in' && (
        <button type="button" className="link-button" onClick={() => switchMode('reset')}>
          Nie pamiętasz hasła?
        </button>
      )}
      <button
        type="button"
        className="link-button"
        onClick={() => switchMode(mode === 'up' ? 'in' : mode === 'in' ? 'up' : 'in')}
      >
        {mode === 'in'
          ? 'Nie masz konta? Załóż je'
          : mode === 'up'
            ? 'Masz już konto? Zaloguj się'
            : 'Wróć do logowania'}
      </button>
    </section>
  )
}