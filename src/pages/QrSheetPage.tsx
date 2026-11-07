import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import QRCode from 'qrcode'
import { formatToken } from '../lib/qr'
import { getQrCodes, isForbidden } from '../lib/teacherApi'
import type { QrCodeItem } from '../lib/teacherApi'
import { readKey } from '../lib/teacherKey'

export default function QrSheetPage() {
  const code = (useParams().code ?? '').toUpperCase()
  const [key] = useState(() => readKey(code))
  const [items, setItems] = useState<QrCodeItem[] | null>(null)
  const [images, setImages] = useState<Record<number, string>>({})
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    getQrCodes(code, key)
      .then(async (list) => {
        if (cancelled) return
        setItems(list)
        const entries = await Promise.all(
          list.map(
            async (it) =>
              [
                it.position,
                await QRCode.toDataURL(`${window.location.origin}/gra/${code}#qr=${it.token}`, {
                  width: 360,
                  margin: 2,
                  errorCorrectionLevel: 'M',
                }),
              ] as const
          )
        )
        if (!cancelled) setImages(Object.fromEntries(entries))
      })
      .catch((e) => {
        console.error(e)
        if (!cancelled)
          setError(
            isForbidden(e)
              ? 'Brak dostępu do tej gry. Otwórz arkusz z panelu nauczyciela.'
              : 'Nie udało się wczytać kodów. Sprawdź internet i odśwież stronę.'
          )
      })
    return () => {
      cancelled = true
    }
  }, [code, key])

  return (
    <main className="teacher">
      <div className="no-print">
        <h1>Kody QR do wydruku (gra {code})</h1>
        <p>
          Wydrukuj arkusz, potnij na kartki i ukryj każdy kod w miejscu odpowiedniego punktu. Kod
          działa tylko dla swojego punktu i tylko w tej grze. Pod kodem QR jest ten sam kod
          tekstem, dla uczniów, którym skaner nie zadziała. Nie pokazuj arkusza uczniom przed grą.
        </p>
        <div className="row">
          <button type="button" onClick={() => window.print()} disabled={!items?.length}>
            Drukuj
          </button>
          <Link className="btn-link" to={`/nauczyciel/${code}#${key}`}>
            Wróć do panelu gry
          </Link>
        </div>
      </div>

      {error && (
        <p role="alert" className="bad">
          {error}
        </p>
      )}
      {items === null && !error && <p role="status">Wczytuję…</p>}
      {items !== null && items.length === 0 && (
        <p>Ta gra nie ma punktów odblokowywanych kodem QR.</p>
      )}

      <ul className="qr-grid">
        {items?.map((it) => (
          <li key={it.position} className="qr-card">
            <h2>Punkt {it.position + 1}</h2>
            {images[it.position] ? (
              <img
                src={images[it.position]}
                width={220}
                height={220}
                alt={`Kod QR dla punktu ${it.position + 1}`}
              />
            ) : (
              <p role="status">Generuję kod…</p>
            )}
            <p className="qr-text">
              Kod: <strong>{formatToken(it.token)}</strong>
            </p>
          </li>
        ))}
      </ul>
    </main>
  )
}