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
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        })
        if (cancelled) {
          s.getTracks().forEach((t) => t.stop())
          return
        }
        stream = s

        // Ciągła ostrość tam, gdzie przeglądarka na to pozwala (na iPhonie ostrość jest automatyczna)
        try {
          const track = s.getVideoTracks()[0]
          const caps = (track.getCapabilities?.() ?? {}) as { focusMode?: string[] }
          if (caps.focusMode?.includes('continuous')) {
            await track.applyConstraints({
              advanced: [{ focusMode: 'continuous' }],
            } as unknown as MediaTrackConstraints)
          }
        } catch {
          // nieobsługiwane: skaner działa bez tego
        }

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
              const w = Math.min(video.videoWidth, 800)
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
          <div className="scan-view">
            <video ref={videoRef} playsInline muted autoPlay aria-label="Podgląd z aparatu" />
            <div className="scan-frame" aria-hidden="true" />
          </div>
          <p className="note" role="status">
            Ustaw kod QR w ramce i trzymaj telefon chwilę nieruchomo.
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