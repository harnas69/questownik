import { useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { Link, useBlocker, useNavigate, useParams } from 'react-router-dom'
import type { Map as LeafletMap } from 'leaflet'
import ErrorSummary from '../components/ErrorSummary'
import FieldError from '../components/FieldError'
import MapView from '../components/MapView'
import PointForm from '../components/PointForm'
import PointList from '../components/PointList'
import PointSheet from '../components/PointSheet'
import { PageSkeleton } from '../components/Skeleton'
import { accountErrorMessage, getTemplate, launchGame, saveTemplate } from '../lib/accountApi'
import { useAuth } from '../lib/auth'
import { useConfirm } from '../lib/confirm'
import { clearDraft, draftKey, fingerprint, loadDraft, saveDraft } from '../lib/draft'
import type { Draft } from '../lib/draft'
import { plural } from '../lib/plural'
import { errorId, fieldId, moveItem, newPoint, validateRoute } from '../lib/points'
import type { ValidationError } from '../lib/points'
import { exportRoute, parseRoute } from '../lib/routeJson'
import { isForbidden } from '../lib/teacherApi'
import { useMediaQuery } from '../lib/useMediaQuery'
import type { DraftPoint } from '../types/route'
import PlaceSearch from '../components/PlaceSearch'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const EMPTY = fingerprint({ title: '', points: [], allowManual: false })

type LoadState = 'loading' | 'ready' | 'denied' | 'error'

function formatWhen(ts: number): string {
  return new Date(ts).toLocaleString('pl-PL', { dateStyle: 'short', timeStyle: 'short' })
}

export default function EditorPage() {
  const auth = useAuth()
  const { id } = useParams()

  if (auth.loading) return <PageSkeleton label="Sprawdzam logowanie…" />

  if (!auth.user) {
    return (
      <main className="play">
        <h1>Edytor tras</h1>
        <section className="card">
          <p>
            Aby tworzyć trasy i prowadzić gry, zaloguj się na konto nauczyciela. Uczniowie grają
            bez logowania.
          </p>
          <Link className="big" to="/konto">
            Zaloguj się lub załóż konto
          </Link>
        </section>
      </main>
    )
  }

  return <Editor key={id ?? 'new'} uid={auth.user.id} />
}

function Editor({ uid }: { uid: string }) {
  const { id: editParam } = useParams()
  const navigate = useNavigate()
  const askConfirm = useConfirm()
  const isMobile = useMediaQuery('(max-width: 800px)')

  const editing = editParam !== undefined
  const validId = editing && UUID.test(editParam)

  const [templateId, setTemplateId] = useState<string | null>(validId ? editParam : null)
  const [loadState, setLoadState] = useState<LoadState>(
    editing ? (validId ? 'loading' : 'denied') : 'ready'
  )
  const [saved, setSaved] = useState(false)
  const [baseline, setBaseline] = useState(EMPTY)
  const [draftOffer, setDraftOffer] = useState<Draft | null>(() => {
    if (editing) return null // przy edycji istniejącej trasy szkic sprawdzamy po jej wczytaniu
    const d = loadDraft(draftKey(uid, null))
    return d && fingerprint(d) !== EMPTY ? d : null
  })

  const [title, setTitle] = useState('')
  const [points, setPoints] = useState<DraftPoint[]>([])
  const [selected, setSelected] = useState<number | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [attempted, setAttempted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [launching, setLaunching] = useState(false)
  const [locating, setLocating] = useState(false)
  const [allowManual, setAllowManual] = useState(false)
  const [, forceRender] = useState(0)

  const mapRef = useRef<LeafletMap | null>(null)
  const countRef = useRef(0)
  const pendingFocus = useRef<{ id: string; until: number } | null>(null)

  const storageKey = draftKey(uid, templateId)
  const dirty = fingerprint({ title, points, allowManual }) !== baseline

  // Błędy liczą się na bieżąco, ale dopiero po pierwszej próbie zapisu
  const errors = useMemo<ValidationError[]>(
    () => (attempted ? validateRoute(title, points) : []),
    [attempted, title, points]
  )
  const titleError = errors.find((e) => e.field === 'title')
  const selectedErrors = selected !== null ? errors.filter((e) => e.point === selected) : []

  // Najnowsze wartości dla obsługi blokady nawigacji
  const latest = useRef({ storageKey, title, points, allowManual, dirty, draftOffer })
  useEffect(() => {
    latest.current = { storageKey, title, points, allowManual, dirty, draftOffer }
  })

  useEffect(() => {
    countRef.current = points.length
  }, [points.length])

  // Fokus na wskazanym polu, gdy tylko pojawi się w drzewie (np. po rozwinięciu panelu punktu)
  useEffect(() => {
    const p = pendingFocus.current
    if (!p) return
    const el = document.getElementById(p.id)
    if (el) {
      pendingFocus.current = null
      el.focus()
      el.scrollIntoView({ block: 'center' })
    } else if (Date.now() > p.until) {
      pendingFocus.current = null
    }
  })

  // Wczytanie trasy do edycji
  useEffect(() => {
    if (!validId || !editParam) return
    let cancelled = false
    getTemplate(editParam)
      .then((r) => {
        if (cancelled) return
        const base = fingerprint({
          title: r.title,
          points: r.points,
          allowManual: r.allowManual,
        })
        setTitle(r.title)
        setPoints(r.points)
        setAllowManual(r.allowManual)
        setSelected(r.points.length > 0 ? 0 : null)
        setBaseline(base)
        const d = loadDraft(draftKey(uid, editParam))
        if (d && fingerprint(d) !== base) setDraftOffer(d)
        else if (d) clearDraft(draftKey(uid, editParam))
        setLoadState('ready')
      })
      .catch((e) => {
        if (cancelled) return
        console.error(e)
        setLoadState(isForbidden(e) ? 'denied' : 'error')
      })
    return () => {
      cancelled = true
    }
  }, [validId, uid, editParam])

  // Autozapis szkicu (około sekundy po ostatniej zmianie). Gdy czeka starszy szkic, nie nadpisujemy go.
  useEffect(() => {
    if (!dirty || draftOffer || saved) return
    const t = window.setTimeout(() => {
      saveDraft(storageKey, { title, points, allowManual })
    }, 1000)
    return () => window.clearTimeout(t)
  }, [dirty, draftOffer, saved, storageKey, title, points, allowManual])

  // Zamknięcie lub odświeżenie karty z niezapisanymi zmianami
  useEffect(() => {
    if (!dirty) return
    const handler = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [dirty])

  // Przejście na inną stronę aplikacji (link, przycisk Wstecz) z niezapisanymi zmianami
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      dirty && currentLocation.pathname !== nextLocation.pathname
  )
  const confirming = useRef(false)

  useEffect(() => {
    if (blocker.state !== 'blocked' || confirming.current) return
    confirming.current = true
    const { proceed, reset } = blocker
    const cur = latest.current
    // Zapis bez czekania na debounce, żeby ostatnie zmiany nie przepadły
    const draftSaved = cur.dirty && !cur.draftOffer ? saveDraft(cur.storageKey, cur) : false
    void askConfirm({
      title: 'Opuścić edytor?',
      message: draftSaved
        ? 'Masz niezapisane zmiany w trasie. Zachowaliśmy je jako szkic na tym urządzeniu: gdy wrócisz do edytora, zaproponujemy ich przywrócenie.'
        : 'Masz niezapisane zmiany w trasie. Po wyjściu zostaną utracone.',
      confirmLabel: 'Wyjdź z edytora',
      cancelLabel: 'Zostań w edytorze',
      danger: !draftSaved,
    }).then((ok) => {
      confirming.current = false
      if (ok) proceed()
      else reset()
    })
  }, [blocker, askConfirm])

  const goToError = (err: ValidationError) => {
    if (err.point !== null) {
      setSelected(err.point)
      setSheetOpen(true)
    }
    pendingFocus.current = {
      id: fieldId(err.point, err.field, err.option),
      until: Date.now() + 2000,
    }
    forceRender((n) => n + 1)
  }

  const add = (lat: number, lng: number) => {
    setPoints((prev) => [...prev, newPoint(lat, lng)])
    setSelected(countRef.current)
    countRef.current += 1
    setSheetOpen(false)
  }

  const addAtCenter = () => {
    const c = mapRef.current?.getCenter()
    if (c) add(c.lat, c.lng)
  }

  const addHere = () => {
    if (!navigator.geolocation) {
      setError('Ta przeglądarka nie obsługuje geolokalizacji.')
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setLocating(false)
        setError(null)
        const { latitude, longitude } = p.coords
        add(latitude, longitude)
        const map = mapRef.current
        if (map) map.setView([latitude, longitude], Math.max(map.getZoom(), 17))
      },
      () => {
        setLocating(false)
        setError('Nie udało się ustalić lokalizacji. Zezwól na dostęp do lokalizacji i spróbuj ponownie.')
      },
      { enableHighAccuracy: true, timeout: 15000 }
    )
  }

  const patchPoint = (i: number, patch: Partial<DraftPoint>) => {
    setError(null)
    setPoints((prev) => prev.map((p, j) => (j === i ? { ...p, ...patch } : p)))
  }

  const moveSelectedToCenter = () => {
    const c = mapRef.current?.getCenter()
    if (c && selected !== null) patchPoint(selected, { lat: c.lat, lng: c.lng })
  }

  const move = (i: number, to: number) => {
    setPoints((prev) => moveItem(prev, i, to))
    setSelected(to)
  }

  const remove = async (i: number) => {
    const ok = await askConfirm({
      title: `Usunąć punkt ${i + 1}?`,
      message: 'Treść zadania tego punktu zostanie utracona.',
      confirmLabel: 'Usuń punkt',
      danger: true,
    })
    if (!ok) return
    setPoints((prev) => prev.filter((_, j) => j !== i))
    setSelected(null)
    setSheetOpen(false)
  }

  const selectFromList = (i: number) => {
    setSelected(i)
    setSheetOpen(true)
  }

  const selectFromMap = (i: number) => {
    setSelected(i)
    setSheetOpen(false)
  }

  const restoreDraft = () => {
    if (!draftOffer) return
    setTitle(draftOffer.title)
    setPoints(draftOffer.points)
    setAllowManual(draftOffer.allowManual)
    setSelected(draftOffer.points.length > 0 ? 0 : null)
    setSheetOpen(false)
    setAttempted(false)
    setError(null)
    setDraftOffer(null)
  }

  const discardDraft = () => {
    clearDraft(storageKey)
    setDraftOffer(null)
  }

  const startNew = () => {
    if (editing) {
      navigate('/edytor')
      return
    }
    setTitle('')
    setPoints([])
    setSelected(null)
    setSheetOpen(false)
    setAllowManual(false)
    setTemplateId(null)
    setSaved(false)
    setAttempted(false)
    setError(null)
    setBaseline(EMPTY)
  }

  // Zapis nie jest blokowany przyciskiem: błędne dane dają listę błędów i fokus na pierwszym polu
  const save = async () => {
    const found = validateRoute(title, points)
    if (found.length > 0) {
      setAttempted(true)
      setError(null)
      goToError(found[0])
      return
    }
    try {
      setError(null)
      setSaving(true)
      const id = await saveTemplate(templateId, title, points, allowManual)
      clearDraft(storageKey) // klucz sprzed zapisu: dla nowej trasy to szkic "new"
      setTemplateId(id)
      setBaseline(fingerprint({ title, points, allowManual }))
      setAttempted(false)
      setSaved(true)
    } catch (e) {
      console.error(e)
      setError(accountErrorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  const launch = async () => {
    if (!templateId) return
    setLaunching(true)
    setError(null)
    try {
      const code = await launchGame(templateId)
      navigate(`/nauczyciel/${code}#konto`)
    } catch (e) {
      console.error(e)
      setError(accountErrorMessage(e))
      setLaunching(false)
    }
  }

  const onExport = () => {
    const blob = new Blob([exportRoute({ title, points })], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const name = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    a.href = url
    a.download = `${name || 'trasa'}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const onImport = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const route = parseRoute(await file.text())
      setTitle(route.title)
      setPoints(route.points)
      setSelected(0)
      setSheetOpen(false)
      setSaved(false)
      setAttempted(false)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nie udało się wczytać pliku.')
    }
    e.target.value = ''
  }

  // ---- Wczytywanie edycji ----
  if (editing && loadState === 'loading') return <PageSkeleton label="Wczytuję trasę do edycji…" />

  if (editing && loadState === 'denied') {
    return (
      <main className="play">
        <h1>Edycja trasy</h1>
        <p role="alert" className="bad">
          Nie masz dostępu do tej trasy albo ona nie istnieje. Wybierz ją z listy na swoim koncie.
        </p>
        <Link className="btn-link" to="/konto">
          Moje trasy
        </Link>
      </main>
    )
  }

  if (editing && loadState === 'error') {
    return (
      <main className="play">
        <h1>Edycja trasy</h1>
        <p role="alert" className="bad">
          Nie udało się wczytać trasy. Sprawdź internet i odśwież stronę.
        </p>
      </main>
    )
  }

  // ---- Po zapisie ----
  if (saved) {
    return (
      <main className="editor">
        <h1>{title.trim()}</h1>
        <section className="card share" aria-label="Trasa zapisana">
          <h2>Trasa zapisana</h2>
          <p role="status">
            Trasa jest w zakładce „Moje trasy”. Gdy będziesz gotów zagrać z klasą, uruchom grę:
            dostaniesz kod i kod QR dla uczniów. Zmiany trasy nie wpływają na gry, które już
            uruchomiłeś.
          </p>
          {error && (
            <p role="alert" className="bad">
              {error}
            </p>
          )}
          <button type="button" className="big" disabled={launching} onClick={() => void launch()}>
            {launching ? 'Uruchamiam…' : 'Uruchom grę'}
          </button>
          <div className="share-actions">
            <Link className="btn-link" to="/konto">
              Moje trasy
            </Link>
            <button type="button" onClick={() => setSaved(false)}>
              Edytuj dalej
            </button>
            <button type="button" onClick={onExport}>
              Eksport JSON (kopia)
            </button>
            <button type="button" onClick={startNew}>
              Nowa trasa
            </button>
          </div>
        </section>
      </main>
    )
  }

  const saveLabel = saving
    ? 'Zapisuję…'
    : templateId
      ? `Zapisz zmiany (${points.length} pkt)`
      : `Zapisz trasę (${points.length} pkt)`

  const titleAria = {
    'aria-invalid': titleError ? (true as const) : undefined,
    'aria-describedby': titleError ? errorId(null, 'title') : undefined,
  }

  const draftBanner = draftOffer ? (
    <div className="banner warn draft-banner" role="region" aria-label="Niezapisany szkic">
      <p>
        Znaleziono niezapisany szkic z {formatWhen(draftOffer.savedAt)} ({draftOffer.points.length}{' '}
        {plural(draftOffer.points.length, 'punkt', 'punkty', 'punktów')}). Chcesz go przywrócić?
      </p>
      <div className="row">
        <button type="button" className="primary" onClick={restoreDraft}>
          Przywróć szkic
        </button>
        <button type="button" onClick={discardDraft}>
          Odrzuć szkic
        </button>
      </div>
    </div>
  ) : null

  const showOnMap = (lat: number, lng: number) => {
    const map = mapRef.current
    if (map) map.setView([lat, lng], Math.max(map.getZoom(), 17))
  }

  const addFromSearch = (lat: number, lng: number) => {
    add(lat, lng)
    showOnMap(lat, lng)
  }

  // Widoczny fragment mapy to podpowiedź dla wyszukiwarki (wyniki stąd są wyżej)
  const searchBias = () => {
    const b = mapRef.current?.getBounds()
    return b
      ? { west: b.getWest(), south: b.getSouth(), east: b.getEast(), north: b.getNorth() }
      : undefined
  }

  const mapEl = (
    <div className="map-col">
      <PlaceSearch
        compact={isMobile}
        getBias={searchBias}
        onShow={showOnMap}
        onAdd={addFromSearch}
      />
      <div className="map-holder">
        <MapView
          points={points}
          selected={selected}
          mapRef={mapRef}
          onAdd={add}
          clickToAdd={!isMobile}
          onSelect={selectFromMap}
          onMove={(i, lat, lng) => patchPoint(i, { lat, lng })}
        />
        <div className="crosshair" aria-hidden="true" />
      </div>
    </div>
  )

  // ===== Telefon: mapa, lista w pasku i dolny panel z zapisem =====
  if (isMobile) {
    return (
      <main className="editor with-dock">
        <h1>{templateId ? 'Edycja trasy' : 'Nowa trasa'}</h1>
        {templateId && (
          <p className="note">
            Zapisanie nadpisze trasę. Gry już uruchomione zostają bez zmian.{' '}
            <Link to="/konto">Moje trasy</Link>
          </p>
        )}

        {draftBanner}

        <div className="field">
          <input
            id="route-title"
            className="answer"
            aria-label="Tytuł trasy"
            placeholder="Tytuł trasy"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value)
              setError(null)
            }}
            {...titleAria}
          />
          <FieldError id={errorId(null, 'title')} text={titleError?.text} />
        </div>

        <details className="card more-options">
          <summary>Więcej opcji</summary>
          <label>
            <input
              type="checkbox"
              checked={allowManual}
              onChange={(e) => setAllowManual(e.target.checked)}
            />
            <span>Tryb awaryjny: przycisk „Jestem na miejscu” przy słabym GPS</span>
          </label>
          <div className="row">
            <button type="button" onClick={onExport} disabled={!title.trim() || points.length === 0}>
              Eksport JSON
            </button>
            <label className="file">
              Import JSON
              <input type="file" accept="application/json,.json" onChange={onImport} />
            </label>
          </div>
        </details>

        {mapEl}

        <div className="toolbar-m" role="group" aria-label="Dodawanie i przesuwanie punktów">
          <button
            type="button"
            id="add-point-btn"
            className="big"
            onClick={addAtCenter}
            aria-label="Dodaj punkt na środku mapy"
          >
            Dodaj punkt
          </button>
          <button
            type="button"
            onClick={addHere}
            disabled={locating}
            aria-label="Dodaj punkt w mojej lokalizacji"
          >
            {locating ? 'Szukam…' : 'Moja lokalizacja'}
          </button>
          <button
            type="button"
            onClick={moveSelectedToCenter}
            disabled={selected === null}
            aria-label="Przesuń wybrany punkt na środek mapy"
          >
            Przesuń do celownika
          </button>
        </div>

        {points.length === 0 ? (
          <p className="note">
            Przesuń mapę tak, aby celownik wskazywał miejsce, i dotknij „Dodaj punkt”.
          </p>
        ) : (
          <PointList points={points} selected={selected} onSelect={selectFromList} />
        )}

        <div className="dock">
          {selected !== null && points[selected] && (
            <PointSheet
              point={points[selected]}
              index={selected}
              total={points.length}
              errors={selectedErrors}
              open={sheetOpen}
              onToggle={() => setSheetOpen((v) => !v)}
              onChange={(patch) => patchPoint(selected, patch)}
              onMoveUp={() => move(selected, selected - 1)}
              onMoveDown={() => move(selected, selected + 1)}
              onDelete={() => void remove(selected)}
            />
          )}
          <div className="dock-save">
            {error && (
              <p role="alert" className="bad">
                {error}
              </p>
            )}
            <ErrorSummary errors={errors} onGo={goToError} compact />
            <button type="button" className="big" disabled={saving} onClick={() => void save()}>
              {saveLabel}
            </button>
          </div>
        </div>
      </main>
    )
  }

  // ===== Komputer =====
  return (
    <main className="editor">
      <h1>{templateId ? 'Edycja trasy' : 'Nowa trasa'}</h1>
      {templateId && (
        <p className="note">
          Zapisanie zmian nadpisze trasę. Gry już uruchomione z tej trasy zostają bez zmian.{' '}
          <Link to="/konto">Wróć do moich tras</Link>
        </p>
      )}

      {draftBanner}

      <div className="row">
        <input
          id="route-title"
          aria-label="Tytuł trasy"
          placeholder="Tytuł trasy"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value)
            setError(null)
          }}
          {...titleAria}
        />
        <button onClick={() => void save()} disabled={saving}>
          {saveLabel}
        </button>
        <button onClick={onExport} disabled={!title.trim() || points.length === 0}>
          Eksport JSON
        </button>
        <label className="file">
          Import JSON
          <input type="file" accept="application/json,.json" onChange={onImport} />
        </label>
      </div>
      <FieldError id={errorId(null, 'title')} text={titleError?.text} />

      <div className="row">
        <label>
          <input
            type="checkbox"
            checked={allowManual}
            onChange={(e) => setAllowManual(e.target.checked)}
          />{' '}
          Tryb awaryjny: pozwól potwierdzić dojście przyciskiem przy słabym GPS
        </label>
      </div>

      {error && (
        <p role="alert" className="bad">
          {error}
        </p>
      )}
      <ErrorSummary errors={errors} onGo={goToError} />

      <div className="toolbar" role="group" aria-label="Dodawanie i przesuwanie punktów">
        <button type="button" id="add-point-btn" onClick={addAtCenter}>
          Dodaj punkt na środku mapy
        </button>
        <button type="button" onClick={addHere} disabled={locating}>
          {locating ? 'Szukam lokalizacji…' : 'Dodaj punkt w mojej lokalizacji'}
        </button>
        <button type="button" onClick={moveSelectedToCenter} disabled={selected === null}>
          Przesuń wybrany punkt na środek mapy
        </button>
      </div>
      <p className="note">
        Wskazówka: mapę przesuwasz strzałkami, a zbliżenie zmieniasz klawiszami + i −. Punkt
        możesz też dodać kliknięciem w mapę albo przeciągnąć marker.
      </p>

      <div className="layout">
        {mapEl}
        <aside>
          <PointList points={points} selected={selected} onSelect={selectFromList} />
          {selected !== null && points[selected] ? (
            <PointForm
              key={selected}
              point={points[selected]}
              index={selected}
              total={points.length}
              errors={selectedErrors}
              onChange={(patch) => patchPoint(selected, patch)}
              onMoveUp={() => move(selected, selected - 1)}
              onMoveDown={() => move(selected, selected + 1)}
              onDelete={() => void remove(selected)}
            />
          ) : (
            points.length > 0 && (
              <p className="note">Wybierz punkt z listy lub z mapy, aby go edytować.</p>
            )
          )}
        </aside>
      </div>
    </main>
  )
}