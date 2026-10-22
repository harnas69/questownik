import { useOnline } from '../lib/useOnline'

export default function OfflineBanner() {
  const online = useOnline()
  if (online) return null
  return (
    <div role="status" className="offline">
      Brak internetu. Odległość do punktu działa dalej, ale sprawdzanie odpowiedzi wymaga
      połączenia.
    </div>
  )
}