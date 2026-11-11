import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { adminDeleteTemplate, amIAdmin, listReports, setHidden } from '../lib/adminApi'
import type { AdminReport } from '../lib/adminApi'
import { useAuth } from '../lib/auth'
import { useConfirm } from '../lib/confirm'
import { BlockSkeleton, PageSkeleton } from '../components/Skeleton'

export default function AdminPage() {
  const { user, loading } = useAuth()
  const uid = user?.id
  const askConfirm = useConfirm()

  const [admin, setAdmin] = useState<boolean | null>(null)
  const [reports, setReports] = useState<AdminReport[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)

  useEffect(() => {
    if (!uid) return
    let cancelled = false
    amIAdmin().then((ok) => {
      if (!cancelled) setAdmin(ok)
    })
    return () => {
      cancelled = true
    }
  }, [uid])

  useEffect(() => {
    if (admin !== true) return
    let cancelled = false
    listReports()
      .then((r) => {
        if (!cancelled) setReports(r)
      })
      .catch((e) => {
        console.error(e)
        if (!cancelled) setError('Nie udało się wczytać zgłoszeń.')
      })
    return () => {
      cancelled = true
    }
  }, [admin])

  const reload = async () => setReports(await listReports())

  const toggleHidden = async (r: AdminReport) => {
    const hide = !r.hidden
      if (!hide) {
      const ok = await askConfirm({
        title: 'Przywrócić trasę?',
        message: 'Zgłoszenia dotyczące tej trasy zostaną wyczyszczone.',
        confirmLabel: 'Przywróć',
      })
      if (!ok) return
    }
    setBusyId(r.id)
    setError(null)
    try {
      await setHidden(r.id, hide)
      await reload()
      setNotice(hide ? 'Trasa ukryta.' : 'Trasa przywrócona.')
    } catch (e) {
      console.error(e)
      setError('Nie udało się zmienić stanu trasy.')
    } finally {
      setBusyId(null)
    }
  }

  const remove = async (r: AdminReport) => {
    const ok = await askConfirm({
      title: `Usunąć trasę „${r.title}”?`,
      message: 'Trasa zostanie usunięta na stałe. Nie da się tego cofnąć.',
      confirmLabel: 'Usuń na stałe',
      danger: true,
    })
    if (!ok) return
    setBusyId(r.id)
    setError(null)
    try {
      await adminDeleteTemplate(r.id)
      await reload()
      setNotice('Trasa usunięta.')
    } catch (e) {
      console.error(e)
      setError('Nie udało się usunąć trasy.')
    } finally {
      setBusyId(null)
    }
  }

  if (loading || (user && admin === null)) return <PageSkeleton label="Sprawdzam uprawnienia…" />

  if (!user || admin !== true) {
    return (
      <main className="play">
        <h1>Panel moderatora</h1>
        <p role="alert" className="bad">
          Brak dostępu.
        </p>
        <Link to="/">Strona główna</Link>
      </main>
    )
  }

  return (
    <main className="teacher">
      <h1>Panel moderatora</h1>
      <p className="note">
        Trasy zgłoszone przez użytkowników. Trasa zgłoszona przez 3 różne konta jest ukrywana
        automatycznie. Autor, któremu ukryto dwie trasy, nie może już publikować w bibliotece.
      </p>

      {error && (
        <p role="alert" className="bad">
          {error}
        </p>
      )}
      <p role="status" className="notice">
        {notice}
      </p>

      {reports === null && !error && <BlockSkeleton rows={3} label="Wczytuję zgłoszenia…" />}
      {reports !== null && reports.length === 0 && <p>Brak zgłoszeń.</p>}

      {reports !== null && reports.length > 0 && (
        <ul className="route-list">
          {reports.map((r) => (
            <li key={r.id} className="card route-item">
              <h2 className="route-title">{r.title}</h2>
              <p className="note">
                Autor: {r.author || '—'} · zgłoszeń: <strong>{r.reports}</strong> ·{' '}
                {r.hidden ? 'ukryta' : r.isPublic ? 'publiczna' : 'prywatna'} · ostatnie zgłoszenie{' '}
                {new Date(r.lastReport).toLocaleString('pl-PL')}
              </p>
              <p>Powody:</p>
              <ul>
                {r.reasons.map((reason, i) => (
                  <li key={i}>{reason}</li>
                ))}
              </ul>
              <details>
                <summary>Treść zadań ({r.prompts.length})</summary>
                <ol>
                  {r.prompts.map((p, i) => (
                    <li key={i}>{p}</li>
                  ))}
                </ol>
              </details>
              <div className="row">
                <button type="button" disabled={busyId === r.id} onClick={() => void toggleHidden(r)}>
                  {r.hidden ? 'Przywróć' : 'Ukryj'}
                </button>
                <button type="button" disabled={busyId === r.id} onClick={() => void remove(r)}>
                  Usuń na stałe
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}