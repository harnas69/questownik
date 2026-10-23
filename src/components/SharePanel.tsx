import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import CopyButton from './CopyButton'

interface Props {
  code: string
  onReset: () => void
  onEdit: () => void
  onExport: () => void
}

export default function SharePanel({ code, onReset, onEdit, onExport }: Props) {
  const gameUrl = `${window.location.origin}/gra/${code}`
  const rankingUrl = `${window.location.origin}/ranking/${code}`
  const [qr, setQr] = useState<string | null>(null)
  const heading = useRef<HTMLHeadingElement>(null)

  // Po zapisie przenosimy uwagę (i widok) na panel
  useEffect(() => {
    heading.current?.focus()
  }, [])

  useEffect(() => {
    let cancelled = false
    QRCode.toDataURL(gameUrl, { width: 320, margin: 2, errorCorrectionLevel: 'M' })
      .then((url) => {
        if (!cancelled) setQr(url)
      })
      .catch((e) => console.error(e))
    return () => {
      cancelled = true
    }
  }, [gameUrl])

  return (
    <section className="card share" aria-label="Udostępnianie trasy">
      <h2 ref={heading} tabIndex={-1}>
        Trasa zapisana
      </h2>

      <div className="share-body">
        <div className="share-info">
          <div className="share-row">
            <span>
              Kod trasy: <strong className="route-code">{code}</strong>
            </span>
            <CopyButton text={code} label="Kopiuj kod" />
          </div>

          <div className="share-row">
            <span>
              Gra: <a href={gameUrl}>{gameUrl}</a>
            </span>
            <CopyButton text={gameUrl} label="Kopiuj link do gry" />
          </div>

          <div className="share-row">
            <span>
              Ranking: <a href={rankingUrl}>{rankingUrl}</a>
            </span>
            <CopyButton text={rankingUrl} label="Kopiuj link do rankingu" />
          </div>
        </div>

        {qr && (
          <div className="share-qr">
            <img
              className="qr"
              src={qr}
              width={260}
              height={260}
              alt={`Kod QR prowadzący do gry o kodzie ${code}`}
            />
            <a className="qr-download" href={qr} download={`questownik-${code}.png`}>
              Pobierz kod QR
            </a>
          </div>
        )}
      </div>

      <div className="share-actions">
        <button type="button" onClick={onReset}>
          Nowa trasa
        </button>
        <button type="button" onClick={onExport}>
          Eksport JSON (kopia trasy)
        </button>
        <button type="button" onClick={onEdit}>
          Wróć do edycji
        </button>
      </div>
      <p className="note">
        Zapisanej trasy nie można zmienić. „Wróć do edycji” zachowuje punkty, ale kolejny zapis
        utworzy nową trasę z nowym kodem.
      </p>
    </section>
  )
}