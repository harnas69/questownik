import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import CopyButton from '../components/CopyButton'
import LoginForm from '../components/LoginForm'
import PublishForm from '../components/PublishForm'
import {
  accountErrorMessage,
  claimRoute,
  deleteMyAccount,
  deleteTemplate,
  launchGame,
  listGames,
  listTemplates,
} from '../lib/accountApi'
import type { GameItem, TemplateItem } from '../lib/accountApi'
import { signOutAccount, useAuth } from '../lib/auth'
import { plural } from '../lib/plural'
import { parseTeacherLink } from '../lib/teacherLink'

function statusOf(t: TemplateItem): { text: string; cls: string } {
  if (t.hidden) return { text: 'Ukryta po zgłoszeniach', cls: 'status rejected' }
  if (t.is_public) return { text: 'Publiczna w bibliotece', cls: 'badge near' }
  return { text: 'Prywatna', cls: 'badge' }
}

function DeleteAccount() {
  const navigate = useNavigate()
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const ok = text.trim().toLocaleUpperCase('pl-PL') === 'USUŃ'

  const run = async (e: FormEvent) => {
    e.preventDefault()
    if (!ok) return
    if (
      !window.confirm(
        'To ostatnie ostrzeżenie: konto, wszystkie Twoje trasy i gry (z wynikami i zdjęciami) zostaną usunięte bezpowrotnie. Kontynuować?'
      )
    )
      return
    setBusy(true)
    setError(null)
    try {
      await deleteMyAccount()
      await signOutAccount()
      navigate('/')
    } catch (err) {
      console.error(err)
      setError(accountErrorMessage(err))
      setBusy(false)
    }
  }

  return (
    <details className="card danger-zone">
      <summary>Usuń moje konto</summary>
      <form className="auth-form" onSubmit={run}>
        <p>
          Usunięcie konta kasuje na stałe: Twoje trasy (także te opublikowane w bibliotece), gry
          uruchomione z Twojego konta razem z wynikami drużyn i zdjęciami oraz samo konto. Nie da
          się tego cofnąć. Najpierw pobierz wyniki (CSV) z paneli gier, które chcesz zachować.
        </p>
        <label htmlFor="del-confirm" className="field-label">
          Aby potwierdzić, wpisz słowo USUŃ
        </label>
        <input
          id="del-confirm"
          className="answer"
          autoComplete="off"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        {error && (
          <p role="alert" className="bad">
            {error}
          </p>
        )}
        <button type="submit" disabled={!ok || busy}>
          {busy ? 'Usuwam…' : 'Usuń konto na zawsze'}
        </button>
      </form>
    </details>
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

  const afterPublish = async (message: string) => {
    await reload()
    setError(null)
    setNotice(message)
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
    const pub = t.is_public ? ' Zniknie też z biblioteki.' : ''
    if (!window.confirm(`Usunąć trasę „${t.title}”?${extra}${pub} Nie da się tego cofnąć.`)) return
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
      <div className="row">
        <Link className="big" to="/edytor">
          Utwórz nową trasę
        </Link>
        <Link className="big secondary" to="/biblioteka">
          Przeglądaj bibliotekę tras
        </Link>
      </div>

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
          możesz uruchomić wiele gier, każdą z własnym kodem i rankingiem. Trasę możesz też
          udostępnić innym w bibliotece.
        </p>
        {templates === null && !error && <p role="status">Wczytuję…</p>}
        {templates !== null && templates.length === 0 && (
          <p>Nie masz jeszcze żadnych tras. Utwórz pierwszą albo skopiuj gotową z biblioteki.</p>
        )}
        {templates !== null && templates.length > 0 && (
          <ul className="route-list">
            {templates.map((t) => {
              const st = statusOf(t)
              return (
                <li key={t.id} className="card route-item">
                  <h3>{t.title}</h3>
                  <p className="note">
                    <span className={st.cls}>{st.text}</span> · {t.points}{' '}
                    {plural(t.points, 'punkt', 'punkty', 'punktów')} · {t.games}{' '}
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
                  <details className="publish">
                    <summary>Biblioteka: {st.text.toLowerCase()}</summary>
                    <PublishForm template={t} onDone={afterPublish} onError={setError} />
                  </details>
                </li>
              )
            })}
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

      <DeleteAccount />
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