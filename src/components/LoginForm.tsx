import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import PasswordField from './PasswordField'
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

const EMAIL_RE = /^\S+@\S+\.\S+$/

export default function LoginForm() {
  const [mode, setMode] = useState<Mode>('in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [passError, setPassError] = useState<string | null>(null)
  const emailRef = useRef<HTMLInputElement>(null)
  const passRef = useRef<HTMLInputElement>(null)

  const formErrId = formError ? 'auth-form-error' : undefined

  const switchMode = (m: Mode) => {
    setMode(m)
    setFormError(null)
    setInfo(null)
    setEmailError(null)
    setPassError(null)
  }

  const google = async () => {
    setFormError(null)
    try {
      await signInWithGoogle()
    } catch (e) {
      console.error(e)
      setFormError(authErrorMessage(e))
    }
  }

  // Przycisk jest wyłączony tylko na czas żądania. Błędne dane dają komunikat i fokus na polu.
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (busy) return
    setFormError(null)
    setInfo(null)

    const eMsg = !email.trim()
      ? 'Wpisz adres e-mail.'
      : !EMAIL_RE.test(email.trim())
        ? 'Wpisz poprawny adres e-mail, np. nazwa@szkola.pl.'
        : null
    const pMsg =
      mode === 'reset'
        ? null
        : password === ''
          ? 'Wpisz hasło.'
          : mode === 'up' && password.length < 8
            ? 'Hasło musi mieć co najmniej 8 znaków.'
            : null
    setEmailError(eMsg)
    setPassError(pMsg)
    if (eMsg) {
      emailRef.current?.focus()
      return
    }
    if (pMsg) {
      passRef.current?.focus()
      return
    }

    setBusy(true)
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
      setFormError(authErrorMessage(err))
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

      <form className="auth-form" onSubmit={(e) => void submit(e)} noValidate>
        <div className="field">
          <label htmlFor="auth-email" className="field-label">
            Adres e-mail
          </label>
          <input
            id="auth-email"
            ref={emailRef}
            className="answer"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              setEmailError(null)
            }}
            aria-invalid={emailError ? true : undefined}
            aria-describedby={[emailError && 'auth-email-error', formErrId].filter(Boolean).join(' ') || undefined}
          />
          {emailError && (
            <p id="auth-email-error" role="alert" className="bad field-error">
              {emailError}
            </p>
          )}
        </div>

        {mode !== 'reset' && (
          <PasswordField
            id="auth-pass"
            label={mode === 'up' ? 'Hasło (minimum 8 znaków)' : 'Hasło'}
            value={password}
            onChange={(v) => {
              setPassword(v)
              setPassError(null)
            }}
            autoComplete={mode === 'in' ? 'current-password' : 'new-password'}
            error={passError}
            describedBy={formErrId}
            inputRef={passRef}
          />
        )}

        {formError && (
          <p id="auth-form-error" role="alert" className="bad">
            {formError}
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

        <button type="submit" className="big" disabled={busy}>
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
        onClick={() => switchMode(mode === 'in' ? 'up' : 'in')}
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