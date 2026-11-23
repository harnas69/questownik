import { useEffect, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import CopyButton from '../components/CopyButton'
import LoginForm from '../components/LoginForm'
import Notice from '../components/Notice'
import PublishForm from '../components/PublishForm'
import { BlockSkeleton, PageSkeleton } from '../components/Skeleton'
import Tabs from '../components/Tabs'
import type { TabDef } from '../components/Tabs'
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
import { useConfirm } from '../lib/confirm'
import { plural } from '../lib/plural'
import { parseTeacherLink } from '../lib/teacherLink'
import { useNotice } from '../lib/useNotice'

type TabId = 'routes' | 'games' | 'settings'
type GameFilter = 'all' | 'open' | 'closed'

const SEARCH_MIN = 5
const norm = (s: string) => s.toLocaleLowerCase('pl-PL')
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('pl-PL')

function statusOf(t: TemplateItem): { text: string; cls: string } {
  if (t.hidden) return { text: 'Ukryta po zgłoszeniach', cls: 'status rejected' }
  if (t.is_public) return { text: 'Publiczna w bibliotece', cls: 'badge near' }
  return { text: 'Prywatna', cls: 'badge' }
}

function Empty({
  icon,
  title,
  text,
  children,
}: {
  icon: string
  title: string
  text: string
  children?: ReactNode
}) {
  return (
    <div className="card empty">
      <span className="empty-icon" aria-hidden="true">
        {icon}
      </span>
      <h3>{title}</h3>
      <p className="note">{text}</p>
      {children && <div className="row">{children}</div>}
    </div>
  )
}

function DeleteAccount() {
  const navigate = useNavigate()
  const askConfirm = useConfirm()
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const ok = text.trim().toLocaleUpperCase('pl-PL') === 'USUŃ'

  const run = async (e: FormEvent) => {
    e.preventDefault()
    if (!ok) return
    const sure = await askConfirm({
      title: 'Usunąć konto na zawsze?',
      message:
        'Konto, wszystkie Twoje trasy i gry (z wynikami i zdjęciami) zostaną usunięte bezpowrotnie.',
      confirmLabel: 'Usuń konto',
      danger: true,
    })
    if (!sure) return
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
        <button type="submit" className="danger" disabled={!ok || busy}>
          {busy ? 'Usuwam…' : 'Usuń konto na zawsze'}
        </button>
      </form>
    </details>
  )
}

function MyContent() {
  const navigate = useNavigate()
  const askConfirm = useConfirm()
  const [templates, setTemplates] = useState<TemplateItem[] | null>(null)
  const [games, setGames] = useState<GameItem[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useNotice()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [tab, setTab] = useState<TabId>('routes')
  const [tq, setTq] = useState('')
  const [gq, setGq] = useState('')
  const [gfilter, setGfilter] = useState<GameFilter>('all')
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
      t.games > 0 ? `Uruchomione z niej gry (${t.games}) zostaną i nadal będą działać. ` : ''
    const pub = t.is_public ? 'Zniknie też z biblioteki. ' : ''
    const ok = await askConfirm({
      title: `Usunąć trasę „${t.title}”?`,
      message: `${extra}${pub}Nie da się tego cofnąć.`,
      confirmLabel: 'Usuń trasę',
      danger: true,
    })
    if (!ok) return
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
    try {
      const code = await claimRoute(parsed.code, parsed.key)
      setLinkText('')
      await reload()
      setNotice(`Gra ${code} została dodana do Twojego konta (razem z trasą).`)
      setTab('games')
    } catch (err) {
      console.error(err)
      setError(accountErrorMessage(err))
    } finally {
      setClaiming(false)
    }
  }

  const origin = window.location.origin

  const tabs: TabDef[] = [
    {
      id: 'routes',
      label: 'Trasy',
      badge:
        templates && templates.length > 0
          ? {
              count: templates.length,
              label: plural(templates.length, 'trasa', 'trasy', 'tras'),
              tone: 'neutral',
            }
          : undefined,
    },
    {
      id: 'games',
      label: 'Gry',
      badge:
        games && games.length > 0
          ? { count: games.length, label: plural(games.length, 'gra', 'gry', 'gier'), tone: 'neutral' }
          : undefined,
    },
    { id: 'settings', label: 'Ustawienia' },
  ]

  const tqNorm = norm(tq.trim())
  const shownTemplates = (templates ?? []).filter((t) => tqNorm === '' || norm(t.title).includes(tqNorm))

  const gqNorm = norm(gq.trim())
  const shownGames = (games ?? []).filter(
    (g) =>
      (gfilter === 'all' || (gfilter === 'open' ? !g.closed : g.closed)) &&
      (gqNorm === '' || norm(g.title).includes(gqNorm) || g.code.toLowerCase().includes(gqNorm))
  )
  const gamesFiltering = gqNorm !== '' || gfilter !== 'all'

  return (
    <>
      <div className="row">
        <Link className="big" to="/edytor">
          Utwórz nową trasę
        </Link>
        <Link className="big secondary" to="/biblioteka">
          Biblioteka tras
        </Link>
      </div>

      {error && (
        <p role="alert" className="bad">
          {error}
        </p>
      )}
      <Notice text={notice} />

      <Tabs
        tabs={tabs}
        active={tab}
        onChange={(id) => setTab(id as TabId)}
        label="Sekcje konta"
        idPrefix="acc"
      />

      <div
        role="tabpanel"
        id={`acc-panel-${tab}`}
        aria-labelledby={`acc-${tab}`}
        tabIndex={0}
        className="tab-panel"
      >
        {tab === 'routes' && (
          <section className="block" aria-labelledby="h-routes">
            <h2 id="h-routes" className="sr-only">
              Moje trasy
            </h2>
            <p className="note">
              Trasa to szablon zadań. Uruchom z niej grę, gdy chcesz zagrać z klasą. Z jednej trasy
              możesz uruchomić wiele gier, każdą z własnym kodem i rankingiem.
            </p>

            {templates === null && !error && <BlockSkeleton rows={2} label="Wczytuję trasy…" />}

            {templates !== null && templates.length === 0 && (
              <Empty
                icon="🗺️"
                title="Nie masz jeszcze żadnych tras"
                text="Utwórz pierwszą od zera albo skopiuj gotową z biblioteki."
              >
                <Link className="btn-link primary" to="/edytor">
                  Utwórz trasę
                </Link>
                <Link className="btn-link" to="/biblioteka">
                  Przeglądaj bibliotekę
                </Link>
              </Empty>
            )}

            {templates !== null && templates.length > 0 && (
              <>
                {templates.length >= SEARCH_MIN && (
                  <div className="list-tools">
                    <label htmlFor="tq" className="sr-only">
                      Szukaj w moich trasach
                    </label>
                    <input
                      id="tq"
                      type="search"
                      className="answer"
                      placeholder="Szukaj trasy…"
                      autoComplete="off"
                      value={tq}
                      onChange={(e) => setTq(e.target.value)}
                    />
                  </div>
                )}

                {shownTemplates.length === 0 ? (
                  <p role="status">Nic nie znaleziono dla „{tq.trim()}”.</p>
                ) : (
                  <ul className="route-list">
                    {shownTemplates.map((t) => {
                      const st = statusOf(t)
                      return (
                        <li key={t.id} className="card route-item">
                          <div className="item-head">
                            <h3>{t.title}</h3>
                            <span className={st.cls}>{st.text}</span>
                          </div>
                          <p className="note">
                            {t.points} {plural(t.points, 'punkt', 'punkty', 'punktów')} · {t.games}{' '}
                            {plural(t.games, 'gra', 'gry', 'gier')} · zmieniona {fmtDate(t.updated_at)}
                          </p>
                          <div className="row">
                            <button
                              type="button"
                              className="primary"
                              disabled={busyId === t.id}
                              onClick={() => void launch(t)}
                            >
                              {busyId === t.id ? 'Chwileczkę…' : 'Uruchom grę'}
                            </button>
                            <Link className="btn-link" to={`/edytor/${t.id}`}>
                              Edytuj
                            </Link>
                          </div>
                          <details className="publish">
                            <summary>Więcej: biblioteka i usuwanie</summary>
                            <div className="more-box">
                              <h4>Udostępnianie w bibliotece</h4>
                              <PublishForm template={t} onDone={afterPublish} onError={setError} />
                              <hr className="sep" />
                              <button
                                type="button"
                                className="danger"
                                disabled={busyId === t.id}
                                onClick={() => void remove(t)}
                              >
                                Usuń trasę
                              </button>
                            </div>
                          </details>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </>
            )}
          </section>
        )}

        {tab === 'games' && (
          <section className="block" aria-labelledby="h-games">
            <h2 id="h-games" className="sr-only">
              Moje gry
            </h2>

            {games === null && !error && <BlockSkeleton rows={2} label="Wczytuję gry…" />}

            {games !== null && games.length === 0 && (
              <Empty
                icon="🎯"
                title="Nie prowadzisz jeszcze żadnej gry"
                text="Grę uruchamiasz z jednej ze swoich tras. Dostajesz kod i kod QR dla uczniów."
              >
                {templates !== null && templates.length > 0 ? (
                  <button type="button" className="primary" onClick={() => setTab('routes')}>
                    Przejdź do moich tras
                  </button>
                ) : (
                  <Link className="btn-link primary" to="/edytor">
                    Utwórz trasę
                  </Link>
                )}
              </Empty>
            )}

            {games !== null && games.length > 0 && (
              <>
                {games.length >= SEARCH_MIN && (
                  <div className="list-tools">
                    <label htmlFor="gq" className="sr-only">
                      Szukaj w moich grach
                    </label>
                    <input
                      id="gq"
                      type="search"
                      className="answer"
                      placeholder="Szukaj po tytule lub kodzie…"
                      autoComplete="off"
                      value={gq}
                      onChange={(e) => setGq(e.target.value)}
                    />
                    <label htmlFor="gf" className="sr-only">
                      Pokaż gry
                    </label>
                    <select
                      id="gf"
                      value={gfilter}
                      onChange={(e) => setGfilter(e.target.value as GameFilter)}
                    >
                      <option value="all">Wszystkie</option>
                      <option value="open">Trwające</option>
                      <option value="closed">Zakończone</option>
                    </select>
                  </div>
                )}

                {gamesFiltering && (
                  <p role="status" className="note">
                    Wyświetlono {shownGames.length} z {games.length}.
                  </p>
                )}

                {shownGames.length === 0 ? (
                  <p>Żadna gra nie pasuje do wybranych filtrów.</p>
                ) : (
                  <ul className="route-list">
                    {shownGames.map((g) => (
                      <li key={g.code} className="card route-item">
                        <div className="item-head">
                          <h3>{g.title}</h3>
                          <span className={g.closed ? 'badge' : 'badge near'}>
                            {g.closed ? 'Zakończona' : 'Trwa'}
                          </span>
                        </div>
                        <p className="game-code">
                          <span className="note">Kod gry</span>
                          <strong>{g.code}</strong>
                        </p>
                        <p className="note">
                          {g.teams} {plural(g.teams, 'drużyna', 'drużyny', 'drużyn')} · {g.points}{' '}
                          {plural(g.points, 'punkt', 'punkty', 'punktów')} · uruchomiona{' '}
                          {fmtDate(g.created_at)}
                        </p>
                        <div className="row">
                          <Link className="btn-link primary" to={`/nauczyciel/${g.code}#konto`}>
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
              </>
            )}
          </section>
        )}

        {tab === 'settings' && (
          <>
            <section className="block" aria-labelledby="h-claim">
              <h2 id="h-claim">Dodaj starą grę z linku nauczyciela</h2>
              <form className="card auth-form" onSubmit={claim}>
                <p className="note">
                  Dotyczy gier utworzonych, zanim pojawiły się konta. Wklej cały link nauczyciela
                  (z końcówką po znaku #), a gra trafi do Twojego konta razem z trasą.
                </p>
                <label htmlFor="claim-link" className="field-label">
                  Link nauczyciela
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
            </section>

            <section className="block" aria-labelledby="h-privacy">
              <h2 id="h-privacy">Prywatność</h2>
              <p>
                Przeczytaj, jakie dane zbiera Questownik i jak je usuwać.{' '}
                <Link to="/prywatnosc">Informacja o prywatności</Link>
              </p>
            </section>

            <section className="block" aria-labelledby="h-danger">
              <h2 id="h-danger">Usuwanie konta</h2>
              <DeleteAccount />
            </section>
          </>
        )}
      </div>
    </>
  )
}

export default function AccountPage() {
  const { user, loading } = useAuth()

  if (loading) return <PageSkeleton label="Sprawdzam logowanie…" />

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

  const initial = (user.email ?? 'G').charAt(0).toLocaleUpperCase('pl-PL')

  return (
    <main className="teacher account">
      <header className="profile">
        <span className="avatar" aria-hidden="true">
          {initial}
        </span>
        <div className="profile-text">
          <h1>Moje konto</h1>
          <p className="note">{user.email ?? 'Konto Google'}</p>
        </div>
        <button type="button" onClick={() => void signOutAccount()}>
          Wyloguj
        </button>
      </header>
      <MyContent />
    </main>
  )
}