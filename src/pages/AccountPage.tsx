import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import CopyButton from '../components/CopyButton'
import { claimRoute, listMyRoutes } from '../lib/accountApi'
import type { MyRoute } from '../lib/accountApi'
import {
  authErrorMessage,
  signInWithEmail,
  signInWithGoogle,
  signOutAccount,
  signUpWithEmail,
  useAuth,
} from '../lib/auth'
import { plural } from '../lib/plural'
import { parseTeacherLink } from '../lib/teacherLink'

function claimErrorMessage(e: unknown): string {
  const msg = (e as { message?: string } | null)?.message ?? ''
  if (msg.includes('already owned')) return 'Ta trasa należy już do innego konta.'
  if (msg.includes('account required')) return 'Sesja wygasła. Zaloguj się ponownie.'
  if (msg.includes('forbidden'))
    return 'Nieprawidłowy link nauczyciela (albo ta trasa powstała zbyt dawno, by dało się ją dodać).'
  return 'Nie udało się dodać trasy. Spróbuj ponownie.'
}

function LoginForm() {
  const [mode, setMode] = useState<'in' | 'up'>('in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

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
      } else {
        const r = await signUpWithEmail(email, password)
        if (r === 'confirm') {
          setInfo(
            'Jeśli ten adres nie był jeszcze używany, wysłaliśmy na niego link potwierdzający. Sprawdź pocztę (także folder spam), kliknij link i wróć tutaj.'
          )
        }
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
      <h2 id="auth-title">{mode === 'in' ? 'Zaloguj się' : 'Załóż konto'}</h2>
      <button type="button" className="big secondary" onClick={() => void google()}>
        Kontynuuj z Google
      </button>
      <p className="auth-or">lub e-mailem</p>
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
        {error && (
          <p role="alert" className="bad">
            {error}
          </p>
        )}
        {info && <p role="status">{info}</p>}
        <button
          type="submit"
          className="big"
          disabled={busy || !email.trim() || password.length < 8}
        >
          {busy ? 'Chwileczkę…' : mode === 'in' ? 'Zaloguj się' : 'Załóż konto'}
        </button>
      </form>
      <button
        type="button"
        className="link-button"
        onClick={() => {
          setMode(mode === 'in' ? 'up' : 'in')
          setError(null)
          setInfo(null)
        }}
      >
        {mode === 'in' ? 'Nie masz konta? Załóż je' : 'Masz już konto? Zaloguj się'}
      </button>
    </section>
  )
}

function MyRoutes() {
  const [routes, setRoutes] = useState<MyRoute[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState('')
  const [linkText, setLinkText] = useState('')
  const [claiming, setClaiming] = useState(false)

  useEffect(() => {
    let cancelled = false
    listMyRoutes()
      .then((r) => {
        if (!cancelled) setRoutes(r)
      })
      .catch((e) => {
        console.error(e)
        if (!cancelled) setError('Nie udało się wczytać Twoich tras. Sprawdź internet i odśwież stronę.')
      })
    return () => {
      cancelled = true
    }
  }, [])

  const claim = async (e: FormEvent) => {
    e.preventDefault()
    const parsed = parseTeacherLink(linkText)
    if (!parsed) {
      setError('To nie wygląda na link nauczyciela. Wklej cały link, który pokazał się po zapisaniu trasy.')
      return
    }
    setClaiming(true)
    setError(null)
    setNotice('')
    try {
      const code = await claimRoute(parsed.code, parsed.key)
      setLinkText('')
      setNotice(`Trasa ${code} została dodana do Twojego konta.`)
      setRoutes(await listMyRoutes())
    } catch (err) {
      console.error(err)
      setError(claimErrorMessage(err))
    } finally {
      setClaiming(false)
    }
  }

  const origin = window.location.origin

  return (
    <>
      <Link className="big" to="/edytor">
        Utwórz nową trasę
      </Link>

      {error && (
        <p role="alert" className="bad">
          {error}
        </p>
      )}
      <p role="status" className="notice">
        {notice}
      </p>

      <section aria-labelledby="my-routes-title" className="block">
        <h2 id="my-routes-title">Twoje trasy</h2>
        {routes === null && !error && <p role="status">Wczytuję…</p>}
        {routes !== null && routes.length === 0 && (
          <p>Nie masz jeszcze żadnych tras. Utwórz pierwszą albo dodaj istniejącą poniżej.</p>
        )}
        {routes !== null && routes.length > 0 && (
          <ul className="route-list">
            {routes.map((r) => (
              <li key={r.code} className="card route-item">
                <h3>{r.title}</h3>
                <p className="note">
                  Kod: <strong>{r.code}</strong> · {r.points}{' '}
                  {plural(r.points, 'punkt', 'punkty', 'punktów')} · {r.teams}{' '}
                  {plural(r.teams, 'drużyna', 'drużyny', 'drużyn')} ·{' '}
                  {r.closed ? 'gra zakończona' : 'gra trwa'} · utworzona{' '}
                  {new Date(r.created_at).toLocaleDateString('pl-PL')}
                </p>
                <div className="row">
                  <Link className="btn-link" to={`/nauczyciel/${r.code}#konto`}>
                    Panel
                  </Link>
                  {r.teams === 0 && (
                    <Link className="btn-link" to={`/edytor/${r.code}#konto`}>
                      Edytuj
                    </Link>
                  )}
                  <Link className="btn-link" to={`/gra/${r.code}`}>
                    Zagraj
                  </Link>
                  <CopyButton text={`${origin}/gra/${r.code}`} label="Kopiuj link do gry" />
                </div>
                {r.teams > 0 && (
                  <p className="note">
                    Edycja będzie możliwa po wyczyszczeniu wyników w panelu.
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <details className="card">
        <summary>Dodaj istniejącą trasę z linku nauczyciela</summary>
        <form className="auth-form" onSubmit={claim}>
          <label htmlFor="claim-link" className="field-label">
            Link nauczyciela (z końcówką po znaku #)
          </label>
          <input
            id="claim-link"
            className="answer"
            autoComplete="off"
            value={linkText}
            onChange={(e) => setLinkText(e.target.value)}
          />
          <button type="submit" disabled={claiming || !linkText.trim()}>
            {claiming ? 'Dodaję…' : 'Dodaj do mojego konta'}
          </button>
        </form>
      </details>
    </>
  )
}

export default function AccountPage() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <main className="play">
        <p role="status">Sprawdzam logowanie…</p>
      </main>
    )
  }

  if (!user) {
    return (
      <main className="play">
        <h1>Konto nauczyciela</h1>
        <p className="lead">
          Konto jest potrzebne do tworzenia i prowadzenia tras. Uczniowie grają bez logowania.
        </p>
        <LoginForm />
      </main>
    )
  }

  return (
    <main className="teacher">
      <h1>Moje trasy</h1>
      <div className="row">
        <span className="note">Zalogowano jako {user.email ?? 'konto Google'}</span>
        <button type="button" onClick={() => void signOutAccount()}>
          Wyloguj
        </button>
      </div>
      <MyRoutes />
    </main>
  )
}