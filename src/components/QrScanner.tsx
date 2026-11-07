import { useEffect, useRef, useState } from 'react'
import jsQR from 'jsqr'

interface Props {
  onResult: (text: string) => void
  onClose: () => void
}

export default function QrScanner({ onResult, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const resultRef = useRef(onResult)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    resultRef.current = onResult
  }, [onResult])

  useEffect(() => {
    let stream: MediaStream | null = null
    let raf = 0
    let cancelled = false
    let last = 0

    const stop = () => {
      cancelled = true
      cancelAnimationFrame(raf)
      stream?.getTracks().forEach((t) => t.stop())
    }

    const start = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError('Ta przeglądarka nie obsługuje aparatu. Wpisz kod ręcznie.')
        return
      }
      try {
        const s = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        })
        if (cancelled) {
          s.getTracks().forEach((t) => t.stop())
          return
        }
        stream = s
        const video = videoRef.current
        if (!video) return
        video.srcObject = s
        await video.play()

        const tick = (time: number) => {
          if (cancelled) return
          if (time - last > 120 && video.readyState >= 2 && video.videoWidth > 0) {
            last = time
            const canvas = canvasRef.current
            const ctx = canvas?.getContext('2d', { willReadFrequently: true })
            if (canvas && ctx) {
              const w = Math.min(video.videoWidth, 640)
              const h = Math.round(video.videoHeight * (w / video.videoWidth))
              canvas.width = w
              canvas.height = h
              ctx.drawImage(video, 0, 0, w, h)
              const img = ctx.getImageData(0, 0, w, h)
              const code = jsQR(img.data, w, h, { inversionAttempts: 'dontInvert' })
              if (code && code.data) {
                stop()
                resultRef.current(code.data)
                return
              }
            }
          }
          raf = requestAnimationFrame(tick)
        }
        raf = requestAnimationFrame(tick)
      } catch (e) {
        console.error(e)
        const name = (e as { name?: string } | null)?.name
        setError(
          name === 'NotAllowedError'
            ? 'Brak zgody na aparat. Zezwól na dostęp do aparatu w ustawieniach przeglądarki albo wpisz kod ręcznie.'
            : 'Nie udało się uruchomić aparatu. Wpisz kod ręcznie.'
        )
      }
    }

    void start()
    return stop
  }, [])

  return (
    <div className="scanner">
      {error ? (
        <p role="alert" className="bad">
          {error}
        </p>
      ) : (
        <>
          <video ref={videoRef} playsInline muted aria-label="Podgląd z aparatu" />
          <p className="note" role="status">
            Skieruj aparat na kod QR i trzymaj chwilę nieruchomo.
          </p>
        </>
      )}
      <canvas ref={canvasRef} hidden />
      <button type="button" onClick={onClose}>
        Zamknij skaner
      </button>
    </div>
  )
}