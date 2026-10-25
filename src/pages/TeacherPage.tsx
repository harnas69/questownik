import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  deleteReviewed,
  fetchPhotoImage,
  isForbidden,
  listPhotos,
  reviewPhoto,
} from '../lib/teacherApi'
import type { PhotoItem } from '../lib/teacherApi'

const storageKey = (code: string) => `questownik:teacher:${code}`

function readKey(code: string): string {
  const fromHash = window.location.hash.replace(/^#/, '')
  try {
    if (fromHash) {
      sessionStorage.setItem(storageKey(code), fromHash)
      return fromHash
    }
    return sessionStorage.getItem(storageKey(code)) ?? ''
  } catch {
    return fromHash
  }
}

const STATUS_LABEL: Record<PhotoItem['status'], string> = {
  pending: 'Do sprawdzenia',
  approved: 'Zatwierdzone',
  rejected: 'Odrzucone',
}

function PhotoImage({ code, teacherKey, id, alt }: { code: string; teacherKey: string; id: string; alt: string }) {
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
  if (!src) return <p role="status">Wczytuję zdjęcie…</p>
  return <img className="photo-preview" src={src} alt={alt} />
}

export default function TeacherPage() {
  const code = (useParams().code ?? '').toUpperCase()
  const [key, setKey] = useState(() => readKey(code))
  const [keyInput, setKeyInput] = useState('')
  const [items, setItems] = useState<PhotoItem[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setItems(await listPhotos(code, key))
      setError(null)
    } catch (e) {
      console.error(e)
      setError(
        isForbidden(e)
          ? 'Nieprawidłowy klucz nauczyciela. Użyj linku, który pokazał się po zapisaniu trasy.'
          : 'Nie udało się wczytać zdjęć. Sprawdź internet.'
      )
    }
  }, [code, key])

  useEffect(() => {
    if (!key) return
    void load()
    const t = window.setInterval(() => void load(), 15000)
    return () => window.clearInterval(t)
  }, [key, load])

  const submitKey = (e: FormEvent) => {
    e.preventDefault()
    const k = keyInput.trim()
    if (!k) return
    try {
      sessionStorage.setItem(storageKey(code), k)
    } catch {
      // pomijamy
    }
    setKey(k)
  }

  const review = async (id: string, approve: boolean) => {
    setBusyId(id)
    try {
      await reviewPhoto(code, key, id, approve)
      await load()
    } catch (e) {
      console.error(e)
      setError('Nie udało się zapisać decyzji. Spróbuj ponownie.')
    } finally {
      setBusyId(null)
    }
  }

  const removeReviewed = async () => {
    if (!window.confirm('Usunąć zatwierdzone i odrzucone zdjęcia? Nie da się tego cofnąć.')) return
    try {
      await deleteReviewed(code, key)
      await load()
    } catch (e) {
      console.error(e)
      setError('Nie udało się usunąć zdjęć.')
    }
  }

  if (!key) {
    return (
      <main className="play">
        <h1>Panel nauczyciela</h1>
        <form className="card" onSubmit={submitKey}>
          <label htmlFor="tkey" className="field-label">
            Klucz nauczyciela (trasa {code})
          </label>
          <input
            id="tkey"
            className="answer"
            autoComplete="off"
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
          />
          <button type="submit" className="big" disabled={!keyInput.trim()}>
            Otwórz panel
          </button>
        </form>
      </main>
    )
  }

  const sorted = [...(items ?? [])].sort((a, b) => {
    if ((a.status === 'pending') !== (b.status === 'pending')) return a.status === 'pending' ? -1 : 1
    return Date.parse(a.created_at) - Date.parse(b.created_at)
  })
  const pending = sorted.filter((i) => i.status === 'pending').length
  const reviewed = sorted.length - pending

  return (
    <main className="teacher">
      <h1>Panel nauczyciela: zdjęcia</h1>
      <p className="note">
        Trasa {code}. Lista odświeża się co 15 sekund.{' '}
        <Link to={`/ranking/${code}`}>Zobacz ranking</Link>
      </p>

      {error && (
        <p role="alert" className="bad">
          {error}
        </p>
      )}

      {items === null && !error && <p role="status">Wczytuję…</p>}

      {items !== null && (
        <>
          <p role="status">
            Do sprawdzenia: <strong>{pending}</strong>, sprawdzone: {reviewed}
          </p>
          <div className="row">
            <button type="button" onClick={() => void load()}>
              Odśwież
            </button>
            <button type="button" onClick={removeReviewed} disabled={reviewed === 0}>
              Usuń sprawdzone zdjęcia
            </button>
          </div>

          {sorted.length === 0 && <p>Nikt jeszcze nie wysłał zdjęcia.</p>}

          <div className="teacher-list">
            {sorted.map((it) => (
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
        </>
      )}
    </main>
  )
}