import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BlockSkeleton } from '../components/Skeleton'
import {
  accountErrorMessage,
  copyTemplate,
  launchGame,
  reportTemplate,
  searchLibrary,
} from '../lib/accountApi'
import type { LibraryItem, LibrarySort } from '../lib/accountApi'
import { useAuth } from '../lib/auth'
import { LEVELS, SIZE_OPTIONS, SUBJECTS, TYPE_OPTIONS, labelOf } from '../lib/categories'
import { summarizeTypes } from '../lib/library'
import { EMPTY_FILTERS, activeChips, countActive, removeFilter } from '../lib/libraryFilters'
import type { LibraryFilters } from '../lib/libraryFilters'
import { plural } from '../lib/plural'

const PAGE = 20

const REPORT_REASONS = [
  'Obraźliwa lub wulgarna treść',
  'Nieodpowiednia dla uczniów',
  'Błędna lub wprowadzająca w błąd',
  'Narusza prawa autorskie lub prywatność',
  'Inny powód',
]

interface Applied {
  q: string
  sort: LibrarySort
  filters: LibraryFilters
}

const INITIAL: Applied = { q: '', sort: 'new', filters: EMPTY_FILTERS }

export default function LibraryPage() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const [queryInput, setQueryInput] = useState('')
  const [applied, setApplied] = useState<Applied>(INITIAL)

  const [items, setItems] = useState<LibraryItem[] | null>(null)
  const [total, setTotal] = useState(0)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<{ text: string; editId?: string } | null>(null)

  const [busyId, setBusyId] = useState<string | null>(null)
  const [reportingId, setReportingId] = useState<string | null>(null)
  const [reason, setReason] = useState(REPORT_REASONS[0])

  const req = useRef(0)

  useEffect(() => {
    const id = ++req.current
    setItems(null)
    setError(null)
    searchLibrary(applied.q, applied.sort, applied.filters, PAGE, 0)
      .then((r) => {
        if (id !== req.current) return
        setItems(r.items)
        setTotal(r.total)
      })
      .catch((e) => {
        console.error(e)
        if (id === req.current)
          setError('Nie udało się wczytać biblioteki. Sprawdź internet i spróbuj ponownie.')
      })
  }, [applied])

  // Zmiana kolejności lub filtra działa od razu i uwzględnia też wpisany tekst
  const apply = (over: Partial<Applied> = {}) =>
    setApplied((prev) => ({ ...prev, q: queryInput.trim(), ...over }))

  const setFilter = (patch: Partial<LibraryFilters>) =>
    apply({ filters: { ...applied.filters, ...patch } })

  const submitSearch = (e: FormEvent) => {
    e.preventDefault()
    apply()
  }

  const loadMore = async () => {
    if (!items) return
    const id = ++req.current
    setLoadingMore(true)
    try {
      const r = await searchLibrary(applied.q, applied.sort, applied.filters, PAGE, items.length)
      if (id !== req.current) return
      setItems([...items, ...r.items])
      setTotal(r.total)
    } catch (e) {
      console.error(e)
      setError('Nie udało się wczytać kolejnych tras.')
    } finally {
      setLoadingMore(false)
    }
  }

  const launch = async (it: LibraryItem) => {
    setBusyId(it.id)
    setError(null)
    try {
      const code = await launchGame(it.id)
      navigate(`/nauczyciel/${code}#konto`)
    } catch (e) {
      console.error(e)
      setError(accountErrorMessage(e))
      setBusyId(null)
    }
  }

  const copy = async (it: LibraryItem) => {
    setBusyId(it.id)
    setError(null)
    setNotice(null)
    try {
      const id = await copyTemplate(it.id)
      setNotice({ text: `Skopiowano trasę „${it.title}” do Twoich tras.`, editId: id })
    } catch (e) {
      console.error(e)
      setError(accountErrorMessage(e))
    } finally {
      setBusyId(null)
    }
  }

  const report = async (e: FormEvent, it: LibraryItem) => {
    e.preventDefault()
    setBusyId(it.id)
    setError(null)
    setNotice(null)
    try {
      await reportTemplate(it.id, reason)
      setReportingId(null)
      setNotice({ text: 'Dziękujemy za zgłoszenie. Trasy zgłoszone przez kilka osób są ukrywane.' })
    } catch (err) {
      console.error(err)
      setError(accountErrorMessage(err))
    } finally {
      setBusyId(null)
    }
  }

  const filters = applied.filters
  const activeCount = countActive(filters)
  const chips = activeChips(filters)
  const hasMore = items !== null && items.length < total
  const narrowed = applied.q !== '' || activeCount > 0

  return (
    <main className="teacher">
      <h1>Biblioteka tras</h1>
      <p className="lead">
        Gotowe trasy udostępnione przez nauczycieli. Uruchom z nich grę dla swojej klasy albo
        skopiuj do swoich tras i dostosuj.
      </p>

      {!user && (
        <p className="note">
          Przeglądać może każdy. Aby uruchomić grę lub skopiować trasę,{' '}
          <Link to="/konto">zaloguj się</Link>.
        </p>
      )}

      <form className="library-search" onSubmit={submitSearch} role="search">
        <div className="ls-field ls-grow">
          <label htmlFor="lib-q" className="field-label">
            Szukaj trasy
          </label>
          <input
            id="lib-q"
            className="answer"
            type="search"
            maxLength={60}
            placeholder="tytuł, opis, autor lub miasto"
            autoComplete="off"
            value={queryInput}
            onChange={(e) => setQueryInput(e.target.value)}
          />
        </div>
        <div className="ls-field">
          <label htmlFor="lib-sort" className="field-label">
            Kolejność
          </label>
          <select
            id="lib-sort"
            value={applied.sort}
            onChange={(e) => apply({ sort: e.target.value as LibrarySort })}
          >
            <option value="new">Najnowsze</option>
            <option value="popular">Najczęściej używane</option>
          </select>
        </div>
        <button type="submit" className="primary ls-btn">
          Szukaj
        </button>
      </form>

      <details className="card filters">
        <summary>
          Filtry
          {activeCount > 0 && (
            <span className="tab-badge">
              <span aria-hidden="true">{activeCount}</span>
              <span className="sr-only">, aktywnych: {activeCount}</span>
            </span>
          )}
        </summary>
        <div className="filters-grid">
          <label className="f" htmlFor="f-subject">
            Przedmiot
            <select
              id="f-subject"
              value={filters.subject}
              onChange={(e) => setFilter({ subject: e.target.value })}
            >
              <option value="">Wszystkie</option>
              {SUBJECTS.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="f" htmlFor="f-level">
            Poziom
            <select
              id="f-level"
              value={filters.level}
              onChange={(e) => setFilter({ level: e.target.value })}
            >
              <option value="">Wszystkie</option>
              {LEVELS.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="f" htmlFor="f-type">
            Typ zadań
            <select
              id="f-type"
              value={filters.type}
              onChange={(e) => setFilter({ type: e.target.value })}
            >
              <option value="">Dowolny</option>
              {TYPE_OPTIONS.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="f" htmlFor="f-size">
            Długość trasy
            <select
              id="f-size"
              value={filters.size}
              onChange={(e) => setFilter({ size: e.target.value })}
            >
              <option value="">Dowolna</option>
              {SIZE_OPTIONS.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="f-check">
          <input
            type="checkbox"
            checked={filters.copyOnly}
            onChange={(e) => setFilter({ copyOnly: e.target.checked })}
          />
          <span>Tylko trasy, które można kopiować do swoich tras</span>
        </label>
      </details>

      {chips.length > 0 && (
        <ul className="active-filters" aria-label="Aktywne filtry">
          {chips.map((c) => (
            <li key={c.key}>
              <button
                type="button"
                className="fchip"
                aria-label={`Usuń filtr: ${c.text}`}
                onClick={() => apply({ filters: removeFilter(filters, c.key) })}
              >
                {c.text} <span aria-hidden="true">✕</span>
              </button>
            </li>
          ))}
          <li>
            <button
              type="button"
              className="link-button"
              onClick={() => apply({ filters: EMPTY_FILTERS })}
            >
              Wyczyść filtry
            </button>
          </li>
        </ul>
      )}

      {error && (
        <p role="alert" className="bad">
          {error}
        </p>
      )}

      <div role="status" className={notice ? 'banner good' : 'sr-only'}>
        {notice?.text}
        {notice?.editId && (
          <>
            {' '}
            <Link to={`/edytor/${notice.editId}`}>Edytuj kopię</Link>
          </>
        )}
      </div>

      {items === null && !error && <BlockSkeleton rows={3} label="Wczytuję bibliotekę…" />}

      {items !== null && (
        <p role="status" className="note">
          {items.length === 0
            ? narrowed
              ? 'Nic nie znaleziono. Zmień hasło albo poluzuj filtry.'
              : 'W bibliotece nie ma jeszcze tras. Opublikuj pierwszą w zakładce „Moje konto”.'
            : `Znaleziono ${total} ${plural(total, 'trasę', 'trasy', 'tras')}${
                items.length < total ? `, wyświetlono ${items.length}` : ''
              }.`}
        </p>
      )}

      {items !== null && items.length === 0 && activeCount > 0 && (
        <div>
          <button type="button" onClick={() => apply({ filters: EMPTY_FILTERS })}>
            Wyczyść filtry
          </button>
        </div>
      )}

      {items !== null && items.length > 0 && (
        <ul className="route-list">
          {items.map((it) => {
            const content = summarizeTypes(it.types).split(', ').filter(Boolean)
            const cats = [
              labelOf(SUBJECTS, it.subject),
              labelOf(LEVELS, it.level),
              it.city || null,
            ].filter((c): c is string => Boolean(c))
            return (
              <li key={it.id} className="card route-item lib-card">
                <div className="item-head">
                  <h2 className="route-title">{it.title}</h2>
                  {it.mine && <span className="badge">Twoja trasa</span>}
                </div>
                <p className="note">Autor: {it.author}</p>

                <ul className="chips" aria-label="Kategorie i zawartość trasy">
                  {cats.map((c) => (
                    <li key={c} className="chip-s cat">
                      {c}
                    </li>
                  ))}
                  <li className="chip-s">
                    {it.points} {plural(it.points, 'punkt', 'punkty', 'punktów')}
                  </li>
                  {content.map((c) => (
                    <li key={c} className="chip-s">
                      {c}
                    </li>
                  ))}
                  <li className="chip-s">
                    użyta w {it.games} {plural(it.games, 'grze', 'grach', 'grach')}
                  </li>
                </ul>

                {it.description && <p className="lib-desc">{it.description}</p>}

                {user ? (
                  <div className="row">
                    <button
                      type="button"
                      className="primary"
                      disabled={busyId === it.id}
                      onClick={() => void launch(it)}
                    >
                      {busyId === it.id ? 'Chwileczkę…' : 'Uruchom grę'}
                    </button>
                    {it.mine ? (
                      <Link className="btn-link" to={`/edytor/${it.id}`}>
                        Edytuj
                      </Link>
                    ) : (
                      <>
                        {it.allowCopy && (
                          <button
                            type="button"
                            disabled={busyId === it.id}
                            onClick={() => void copy(it)}
                          >
                            Kopiuj do moich tras
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setReportingId(reportingId === it.id ? null : it.id)
                            setReason(REPORT_REASONS[0])
                          }}
                          aria-expanded={reportingId === it.id}
                        >
                          Zgłoś
                        </button>
                      </>
                    )}
                  </div>
                ) : (
                  <p className="note">
                    <Link to="/konto">Zaloguj się</Link>, aby uruchomić grę z tej trasy.
                  </p>
                )}

                {reportingId === it.id && (
                  <form className="publish-form" onSubmit={(e) => void report(e, it)}>
                    <label htmlFor={`reason-${it.id}`} className="field-label">
                      Powód zgłoszenia
                    </label>
                    <select
                      id={`reason-${it.id}`}
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                    >
                      {REPORT_REASONS.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                    <div className="row">
                      <button type="submit" disabled={busyId === it.id}>
                        Wyślij zgłoszenie
                      </button>
                      <button type="button" onClick={() => setReportingId(null)}>
                        Anuluj
                      </button>
                    </div>
                  </form>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {hasMore && (
        <button type="button" disabled={loadingMore} onClick={() => void loadMore()}>
          {loadingMore ? 'Wczytuję…' : 'Pokaż więcej'}
        </button>
      )}
    </main>
  )
}