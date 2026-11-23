import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import GameShare from '../components/GameShare'
import { BlockSkeleton } from '../components/Skeleton'
import Tabs from '../components/Tabs'
import type { TabDef } from '../components/Tabs'
import { useConfirm } from '../lib/confirm'
import { buildCsv, downloadCsv } from '../lib/csv'
import { durationMs, sortRanking } from '../lib/ranking'
import {
  deleteReviewed,
  deleteRoute,
  fetchPhotoImage,
  getOverview,
  getQrCodes,
  getResults,
  isForbidden,
  listPhotos,
  resetSessions,
  reviewPhoto,
  setClosed,
} from '../lib/teacherApi'
import type { Overview, PhotoItem, TeamResult } from '../lib/teacherApi'
import { forgetKey, readKey, storeKey } from '../lib/teacherKey'
import { TASK_LABELS } from '../types/route'

function fmt(ms: number): string {
  const s = Math.floor(ms / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

const STATUS_LABEL: Record<PhotoItem['status'], string> = {
  pending: 'Do sprawdzenia',
  approved: 'Zatwierdzone',
  rejected: 'Odrzucone',
}

function PhotoImage({
  code,
  teacherKey,
  id,
  alt,
}: {
  code: string
  teacherKey: string
  id: string
  alt: string
}) {
  const [src, setSrc] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetchPhotoImage(code, teacherKey, id)
      .then((s) => {
        if (!cancelled) setSrc(s)
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [code, teacherKey, id])

  if (failed) return <p className="bad">Nie udało się wczytać zdjęcia.</p>
  if (!src) return <div className="skeleton sk-photo" role="status" aria-label="Wczytuję zdjęcie" />
  return <img className="photo-preview" src={src} alt={alt} />
}

export default function TeacherPage() {
  const code = (useParams().code ?? '').toUpperCase()
  const navigate = useNavigate()
  const askConfirm = useConfirm()

  const [key, setKey] = useState(() => readKey(code))
  const [keyInput, setKeyInput] = useState('')
  const [overview, setOverview] = useState<Overview | null>(null)
  const [teams, setTeams] = useState<TeamResult[]>([])
  const [photos, setPhotos] = useState<PhotoItem[]>([])
  const [qrCount, setQrCount] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [authError, setAuthError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [confirmCode, setConfirmCode] = useState('')
  const [chosen, setChosen] = useState<string | null>(null)

  const rejectKey = useCallback(() => {
    forgetKey(code)
    setKey('')
    setOverview(null)
    setError(null)
    setAuthError('Nieprawidłowy klucz nauczyciela. Użyj linku, który pokazał się po zapisaniu trasy.')
  }, [code])

  const load = useCallback(async () => {
    try {
      const [o, t, p, q] = await Promise.all([
        getOverview(code, key),
        getResults(code, key),
        listPhotos(code, key),
        getQrCodes(code, key),
      ])
      setOverview(o)
      setTeams(sortRanking(t))
      setPhotos(p)
      setQrCount(q.length)
      // Zakładka startowa jest ustalana raz, żeby panel nie przełączał się sam w trakcie pracy
      setChosen((c) => c ?? (o.teams === 0 ? 'join' : 'results'))
      setError(null)
    } catch (e) {
      console.error(e)
      if (isForbidden(e)) rejectKey()
      else setError('Nie udało się wczytać danych. Sprawdź internet.')
    }
  }, [code, key, rejectKey])

  // Zmiana klucza w pasku adresu (po #) działa od razu
  useEffect(() => {
    const onHash = () => {
      const h = window.location.hash.replace(/^#/, '')
      if (!h) return
      storeKey(code, h)
      setOverview(null)
      setError(null)
      setAuthError(null)
      setKey(h)
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [code])

  useEffect(() => {
    if (!key) return
    void load()
    const t = window.setInterval(() => void load(), 15000)
    return () => window.clearInterval(t)
  }, [key, load])

  const guard = async (fn: () => Promise<void>, failMsg: string) => {
    try {
      await fn()
    } catch (e) {
      console.error(e)
      if (isForbidden(e)) rejectKey()
      else setError(failMsg)
    }
  }

  const submitKey = (e: FormEvent) => {
    e.preventDefault()
    const k = keyInput.trim()
    if (!k) return
    storeKey(code, k)
    setAuthError(null)
    setKey(k)
  }

  const review = async (id: string, approve: boolean) => {
    setBusyId(id)
    await guard(async () => {
      await reviewPhoto(code, key, id, approve)
      await load()
    }, 'Nie udało się zapisać decyzji. Spróbuj ponownie.')
    setBusyId(null)
  }

  const removeReviewed = async () => {
    const ok = await askConfirm({
      title: 'Usunąć sprawdzone zdjęcia?',
      message:
        'Zatwierdzone i odrzucone zdjęcia zostaną usunięte. Punkty drużyn zostają. Nie da się tego cofnąć.',
      confirmLabel: 'Usuń zdjęcia',
      danger: true,
    })
    if (!ok) return
    await guard(async () => {
      await deleteReviewed(code, key)
      await load()
      setNotice('Usunięto sprawdzone zdjęcia.')
    }, 'Nie udało się usunąć zdjęć.')
  }

  const toggleClosed = async () => {
    if (!overview) return
    const closing = !overview.closed
    if (closing) {
      const ok = await askConfirm({
        title: 'Zakończyć grę?',
        message:
          'Nowe drużyny nie wystartują, a obecne nie przejdą do kolejnych punktów. Wyniki zostaną, a grę można wznowić.',
        confirmLabel: 'Zakończ grę',
      })
      if (!ok) return
    }
    await guard(async () => {
      await setClosed(code, key, closing)
      await load()
      setNotice(closing ? 'Gra zakończona.' : 'Gra wznowiona.')
    }, 'Nie udało się zmienić stanu gry.')
  }

  const reset = async () => {
    const ok = await askConfirm({
      title: 'Wyczyścić wyniki?',
      message:
        'Wyniki wszystkich drużyn i zdjęcia zostaną usunięte. Gra zostanie, a gracze zaczną od nowa. Nie da się tego cofnąć.',
      confirmLabel: 'Wyczyść wyniki',
      danger: true,
    })
    if (!ok) return
    await guard(async () => {
      const n = await resetSessions(code, key)
      await load()
      setNotice(`Wyczyszczono wyniki (drużyn: ${n}).`)
    }, 'Nie udało się wyczyścić wyników.')
  }

  const removeRoute = async (e: FormEvent) => {
    e.preventDefault()
    if (confirmCode.trim().toUpperCase() !== code) return
    await guard(async () => {
      await deleteRoute(code, key)
      forgetKey(code)
      navigate('/konto')
    }, 'Nie udało się usunąć gry.')
  }

  const exportCsv = () => {
    if (!overview) return
    downloadCsv(`wyniki-${code}.csv`, buildCsv(teams, overview.points.length))
  }

  if (!key) {
    return (
      <main className="play">
        <h1>Panel nauczyciela</h1>
        <form className="card" onSubmit={submitKey}>
          <label htmlFor="tkey" className="field-label">
            Klucz nauczyciela (gra {code})
          </label>
          <input
            id="tkey"
            className="answer"
            autoComplete="off"
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
          />
          {authError && (
            <p role="alert" className="bad">
              {authError}
            </p>
          )}
          <button type="submit" className="big" disabled={!keyInput.trim()}>
            Otwórz panel
          </button>
        </form>
      </main>
    )
  }

  if (!overview) {
    return (
      <main className="teacher">
        <h1>Panel nauczyciela</h1>
        {error ? (
          <p role="alert" className="bad">
            {error}
          </p>
        ) : (
          <BlockSkeleton rows={3} label="Wczytuję panel gry…" />
        )}
      </main>
    )
  }

  const pointCount = overview.points.length
  const rated = overview.points
    .filter((p) => p.answered > 0)
    .map((p) => ({ ...p, rate: Math.round((p.correct / p.answered) * 100) }))
  const hardest = rated.length > 0 ? rated.reduce((a, b) => (b.rate < a.rate ? b : a)) : null

  const showPhotos = overview.points.some((p) => p.type === 'photo') || photos.length > 0
  const sortedPhotos = [...photos].sort((a, b) => {
    if ((a.status === 'pending') !== (b.status === 'pending')) return a.status === 'pending' ? -1 : 1
    return Date.parse(a.created_at) - Date.parse(b.created_at)
  })
  const pending = sortedPhotos.filter((i) => i.status === 'pending').length
  const reviewed = sortedPhotos.length - pending

  const tabs: TabDef[] = [
    { id: 'results', label: 'Wyniki' },
    ...(showPhotos
      ? [
          {
            id: 'photos',
            label: 'Zdjęcia',
            badge: pending > 0 ? { count: pending, label: 'do sprawdzenia' } : undefined,
          },
        ]
      : []),
    { id: 'join', label: 'Dołączanie' },
    { id: 'manage', label: 'Zarządzanie' },
  ]
  const active = chosen && tabs.some((t) => t.id === chosen) ? chosen : 'results'

  return (
    <main className="teacher">
      <header className="panel-head">
        <p className="eyebrow-s">Panel nauczyciela · kod {code}</p>
        <h1>{overview.title}</h1>
        <div className="row">
          <span className={overview.closed ? 'badge' : 'badge near'}>
            {overview.closed ? 'Gra zakończona' : 'Gra trwa'}
          </span>
          <span>
            Drużyn: <strong>{overview.teams}</strong> · ukończyło:{' '}
            <strong>{overview.finished}</strong>
          </span>
        </div>
        <div className="row">
          <Link className="btn-link" to={`/ranking/${code}`}>
            Ranking na projektor
          </Link>
          <button type="button" onClick={() => void load()}>
            Odśwież
          </button>
        </div>
        <p className="note">Dane odświeżają się same co 15 sekund.</p>
      </header>

      {error && (
        <p role="alert" className="bad">
          {error}
        </p>
      )}
      <p role="status" className="notice">
        {notice}
      </p>

      <Tabs tabs={tabs} active={active} onChange={setChosen} label="Sekcje panelu" idPrefix="tp" />

      <div
        role="tabpanel"
        id={`tp-panel-${active}`}
        aria-labelledby={`tp-${active}`}
        tabIndex={0}
        className="tab-panel"
      >
        {active === 'results' && (
          <>
            <section className="block" aria-labelledby="h-results">
              <h2 id="h-results">Wyniki drużyn</h2>
              {teams.length === 0 ? (
                <p>Żadna drużyna jeszcze nie wystartowała.</p>
              ) : (
                <div className="table-wrap">
                  <table className="data-table">
                    <caption className="sr-only">Wyniki drużyn</caption>
                    <thead>
                      <tr>
                        <th scope="col">#</th>
                        <th scope="col">Drużyna</th>
                        <th scope="col">Postęp</th>
                        <th scope="col">Punkty</th>
                        <th scope="col">Czas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {teams.map((t, i) => {
                        const d = durationMs(t)
                        return (
                          <tr key={t.id}>
                            <td>{i + 1}</td>
                            <td>{t.team_name}</td>
                            <td>
                              {Math.min(t.current_idx, pointCount)}/{pointCount}
                            </td>
                            <td>{t.score}</td>
                            <td>{d !== null ? fmt(d) : 'w grze'}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="row">
                <button type="button" onClick={exportCsv} disabled={teams.length === 0}>
                  Pobierz wyniki (CSV)
                </button>
              </div>
            </section>

            <section className="block" aria-labelledby="h-stats">
              <h2 id="h-stats">Statystyki zadań</h2>
              <ul className="stat-list">
                {overview.points.map((p) => {
                  const rate = p.answered > 0 ? Math.round((p.correct / p.answered) * 100) : null
                  const isHardest = hardest !== null && hardest.position === p.position && hardest.rate < 100
                  return (
                    <li key={p.position} className="card stat-item">
                      <div className="row">
                        <span className="pl-num" aria-hidden="true">
                          {p.position + 1}
                        </span>
                        <strong>Punkt {p.position + 1}</strong>
                        <span className="note">{TASK_LABELS[p.type]}</span>
                        {isHardest && <span className="badge">Najtrudniejsze</span>}
                      </div>
                      <p>{p.prompt}</p>
                      <div className="bar" aria-hidden="true">
                        <span style={{ width: `${rate ?? 0}%` }} />
                      </div>
                      <p className="stat-meta">
                        <span>
                          Odpowiedzi:{' '}
                          <strong>
                            {p.answered}/{overview.teams}
                          </strong>
                        </span>
                        <span>
                          Poprawne: <strong>{rate !== null ? `${rate}%` : '—'}</strong>
                        </span>
                        <span>
                          Średnio prób: <strong>{p.avg_attempts ?? '—'}</strong>
                        </span>
                      </p>
                    </li>
                  )
                })}
              </ul>
              <p className="note">
                Przy zadaniach ze zdjęciem „poprawne” oznacza zdjęcia zatwierdzone przez Ciebie.
              </p>
            </section>
          </>
        )}

        {active === 'photos' && (
          <section className="block" aria-labelledby="h-photos">
            <h2 id="h-photos">Zdjęcia</h2>
            <p role="status">
              Do sprawdzenia: <strong>{pending}</strong>, sprawdzone: {reviewed}
            </p>
            <div className="row">
              <button type="button" onClick={() => void removeReviewed()} disabled={reviewed === 0}>
                Usuń sprawdzone zdjęcia
              </button>
            </div>
            {sortedPhotos.length === 0 && <p>Nikt jeszcze nie wysłał zdjęcia.</p>}
            <div className="teacher-list">
              {sortedPhotos.map((it) => (
                <article
                  key={it.id}
                  className="card teacher-card"
                  aria-label={`Zdjęcie drużyny ${it.team}, punkt ${it.position + 1}`}
                >
                  <PhotoImage
                    code={code}
                    teacherKey={key}
                    id={it.id}
                    alt={`Zdjęcie drużyny ${it.team}, punkt ${it.position + 1}`}
                  />
                  <p>
                    <strong>{it.team}</strong> · punkt {it.position + 1}
                  </p>
                  <p className="note">Zadanie: {it.prompt}</p>
                  <p>
                    <span className={`status ${it.status}`}>{STATUS_LABEL[it.status]}</span>
                  </p>
                  <div className="row">
                    <button
                      type="button"
                      className="approve"
                      disabled={busyId === it.id || it.status === 'approved'}
                      aria-label={`Zatwierdź zdjęcie drużyny ${it.team}`}
                      onClick={() => void review(it.id, true)}
                    >
                      Zatwierdź
                    </button>
                    <button
                      type="button"
                      disabled={busyId === it.id || it.status === 'rejected'}
                      aria-label={`Odrzuć zdjęcie drużyny ${it.team}`}
                      onClick={() => void review(it.id, false)}
                    >
                      Odrzuć
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {active === 'join' && (
          <>
            <section className="block" aria-labelledby="h-share">
              <h2 id="h-share">Dołączanie do gry</h2>
              <GameShare code={code} />
            </section>
            {qrCount > 0 && (
              <section className="block" aria-labelledby="h-qr">
                <h2 id="h-qr">Kody QR do wydruku</h2>
                <p>
                  Punkty tej gry odblokowywane kodem QR: <strong>{qrCount}</strong>. Wydrukuj kody
                  i ukryj je w odpowiednich miejscach.
                </p>
                <Link className="btn-link" to={`/nauczyciel/${code}/qr#${key}`}>
                  Otwórz arkusz kodów QR
                </Link>
              </section>
            )}
          </>
        )}

        {active === 'manage' && (
          <section className="block" aria-labelledby="h-manage">
            <h2 id="h-manage">Zarządzanie grą</h2>
            <div className="manage-item">
              <p>
                <strong>{overview.closed ? 'Wznów grę' : 'Zakończ grę'}</strong>:{' '}
                {overview.closed
                  ? 'drużyny znów mogą startować i grać dalej.'
                  : 'nowe drużyny nie wystartują, a obecne nie przejdą do kolejnych punktów. Możesz nadal oceniać zdjęcia.'}
              </p>
              <button type="button" onClick={() => void toggleClosed()}>
                {overview.closed ? 'Wznów grę' : 'Zakończ grę'}
              </button>
            </div>

            <div className="manage-item">
              <p>
                <strong>Zmiana zadań</strong>: treść działającej gry jest zamrożona, żeby nie psuć
                wyników. Zmień trasę w zakładce „Moje trasy” i uruchom z niej nową grę.
              </p>
              <Link className="btn-link" to="/konto">
                Przejdź do moich tras
              </Link>
            </div>

            <div className="manage-item">
              <p>
                <strong>Wyczyść wyniki</strong>: usuwa drużyny, wyniki i zdjęcia, a gra zostaje.
                Przydatne przed kolejnym podejściem klasy. Pobierz najpierw CSV.
              </p>
              <button type="button" onClick={() => void reset()} disabled={overview.teams === 0}>
                Wyczyść wyniki graczy
              </button>
            </div>

            <form className="manage-item danger" onSubmit={removeRoute}>
              <p>
                <strong>Usuń grę</strong> razem z wynikami drużyn i zdjęciami. Trasa w „Moich
                trasach” zostaje, więc możesz uruchomić z niej nową grę. Nie da się tego cofnąć.
              </p>
              <label htmlFor="confirm-code">Wpisz kod gry ({code}), aby potwierdzić</label>
              <input
                id="confirm-code"
                autoComplete="off"
                value={confirmCode}
                onChange={(e) => setConfirmCode(e.target.value)}
              />
              <button
                type="submit"
                className="danger"
                disabled={confirmCode.trim().toUpperCase() !== code}
              >
                Usuń grę na zawsze
              </button>
            </form>
          </section>
        )}
      </div>
    </main>
  )
}