import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import CopyButton from '../components/CopyButton'
import {
  accountErrorMessage,
  claimRoute,
  deleteTemplate,
  launchGame,
  listGames,
  listTemplates,
} from '../lib/accountApi'
import type { GameItem, TemplateItem } from '../lib/accountApi'
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

function MyContent() {
  const navigate = useNavigate()
  const [templates, setTemplates] = useState<TemplateItem[] | null>(null)
  const [games, setGames] = useState<GameItem[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [linkText, setLinkText] = useState('')
  const [claiming, setClaiming] = useState(false)

  useEffect(() => {
    let cancelled = false
    Promise.all([listTemplates(), listGames()])
      .then(([t, g]) => {
        if (cancelled) return
        setTemplates(t)
        setGames(g)
      })
      .catch((e) => {
        console.error(e)
        if (!cancelled) setError('Nie udało się wczytać danych. Sprawdź internet i odśwież stronę.')
      })
    return () => {
      cancelled = true
    }
  }, [])

  const reload = async () => {
    const [t, g] = await Promise.all([listTemplates(), listGames()])
    setTemplates(t)
    setGames(g)
  }

  const launch = async (t: TemplateItem) => {
    setBusyId(t.id)
    setError(null)
    try {
      const code = await launchGame(t.id)
      navigate(`/nauczyciel/${code}#konto`)
    } catch (e) {
      console.error(e)
      setError(accountErrorMessage(e))
      setBusyId(null)
    }
  }

  const remove = async (t: TemplateItem) => {
    const extra =
      t.games > 0 ? ` Uruchomione z niej gry (${t.games}) zostaną i nadal będą działać.` : ''
    if (!window.confirm(`Usunąć trasę „${t.title}”?${extra} Nie da się tego cofnąć.`)) return
    setBusyId(t.id)
    setError(null)
    try {
      await deleteTemplate(t.id)
      await reload()
      setNotice('Trasa została usunięta.')
    } catch (e) {
      console.error(e)
      setError(accountErrorMessage(e))
    } finally {
      setBusyId(null)
    }
  }

  const claim = async (e: FormEvent) => {
    e.preventDefault()
    const parsed = parseTeacherLink(linkText)
    if (!parsed) {
      setError(
        'To nie wygląda na link nauczyciela. Wklej cały link, który pokazał się po zapisaniu trasy.'
      )
      return
    }
    setClaiming(true)
    setError(null)
    setNotice('')
    try {
      const code = await claimRoute(parsed.code, parsed.key)
      setLinkText('')
      await reload()
      setNotice(`Gra ${code} została dodana do Twojego konta (razem z trasą).`)
    } catch (err) {
      console.error(err)
      setError(accountErrorMessage(err))
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
        <h2 id="my-routes-title">Moje trasy</h2>
        <p className="note">
          Trasa to szablon zadań. Uruchom z niej grę, gdy chcesz zagrać z klasą. Z jednej trasy
          możesz uruchomić wiele gier, każdą z własnym kodem i rankingiem.
        </p>
        {templates === null && !error && <p role="status">Wczytuję…</p>}
        {templates !== null && templates.length === 0 && (
          <p>Nie masz jeszcze żadnych tras. Utwórz pierwszą.</p>
        )}
        {templates !== null && templates.length > 0 && (
          <ul className="route-list">
            {templates.map((t) => (
              <li key={t.id} className="card route-item">
                <h3>{t.title}</h3>
                <p className="note">
                  {t.points} {plural(t.points, 'punkt', 'punkty', 'punktów')} · {t.games}{' '}
                  {plural(t.games, 'gra', 'gry', 'gier')} · zmieniona{' '}
                  {new Date(t.updated_at).toLocaleDateString('pl-PL')}
                </p>
                <div className="row">
                  <button type="button" disabled={busyId === t.id} onClick={() => void launch(t)}>
                    {busyId === t.id ? 'Chwileczkę…' : 'Uruchom grę'}
                  </button>
                  <Link className="btn-link" to={`/edytor/${t.id}`}>
                    Edytuj
                  </Link>
                  <button type="button" disabled={busyId === t.id} onClick={() => void remove(t)}>
                    Usuń
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="my-games-title" className="block">
        <h2 id="my-games-title">Moje gry</h2>
        {games === null && !error && <p role="status">Wczytuję…</p>}
        {games !== null && games.length === 0 && (
          <p>Nie prowadzisz jeszcze żadnej gry. Uruchom ją z jednej ze swoich tras.</p>
        )}
        {games !== null && games.length > 0 && (
          <ul className="route-list">
            {games.map((g) => (
              <li key={g.code} className="card route-item">
                <h3>{g.title}</h3>
                <p className="note">
                  Kod: <strong>{g.code}</strong> · {g.teams}{' '}
                  {plural(g.teams, 'drużyna', 'drużyny', 'drużyn')} ·{' '}
                  {g.closed ? 'zakończona' : 'trwa'} · uruchomiona{' '}
                  {new Date(g.created_at).toLocaleDateString('pl-PL')}
                </p>
                <div className="row">
                  <Link className="btn-link" to={`/nauczyciel/${g.code}#konto`}>
                    Panel
                  </Link>
                  <Link className="btn-link" to={`/gra/${g.code}`}>
                    Zagraj
                  </Link>
                  <CopyButton text={`${origin}/gra/${g.code}`} label="Kopiuj link do gry" />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <details className="card">
        <summary>Dodaj starą grę z linku nauczyciela</summary>
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
          Konto jest potrzebne do tworzenia tras i prowadzenia gier. Uczniowie grają bez logowania.
        </p>
        <LoginForm />
      </main>
    )
  }

  return (
    <main className="teacher">
      <h1>Moje konto</h1>
      <div className="row">
        <span className="note">Zalogowano jako {user.email ?? 'konto Google'}</span>
        <button type="button" onClick={() => void signOutAccount()}>
          Wyloguj
        </button>
      </div>
      <MyContent />
    </main>
  )
}