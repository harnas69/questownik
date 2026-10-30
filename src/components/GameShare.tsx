import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import CopyButton from './CopyButton'

export default function GameShare({ code }: { code: string }) {
  const gameUrl = `${window.location.origin}/gra/${code}`
  const rankingUrl = `${window.location.origin}/ranking/${code}`
  const [qr, setQr] = useState<string | null>(null)

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
    <div className="card share">
      <div className="share-body">
        <div className="share-info">
          <div className="share-row">
            <span>
              Kod gry: <strong className="route-code">{code}</strong>
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
    </div>
  )
}