import { useEffect } from 'react'

export default function ArrivalFeedback() {
  useEffect(() => {
    try {
      if ('vibrate' in navigator) navigator.vibrate([200, 100, 200])
    } catch {
      // przeglądarka może zablokować wibrację: pomijamy
    }
  }, [])

  return (
    <p className="arrived" role="status">
      <span aria-hidden="true">📍 </span>Jesteś na miejscu!
    </p>
  )
}