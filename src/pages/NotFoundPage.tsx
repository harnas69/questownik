import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <main className="play">
      <h1>Nie znaleziono strony</h1>
      <p className="lead">Adres jest nieprawidłowy albo strona została przeniesiona.</p>
      <Link className="big" to="/">
        Wróć na stronę główną
      </Link>
    </main>
  )
}