import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { extractGameCode } from '../lib/gameCode'

const STEPS = [
  'Wpisz kod gry od nauczyciela (albo wklej cały link) i nazwę drużyny.',
  'Idź do wskazanego punktu. Aplikacja pokazuje mapę i odległość.',
  'Gdy dotrzesz na miejsce lub zeskanujesz kod QR, odblokuje się zadanie.',
  'Zdobywaj punkty i śledź ranking na żywo.',
]

const FEATURES = [
  'Odblokowanie zadań przez GPS lub kod QR',
  'Quiz, pytanie otwarte, kod i zadania ze zdjęciem',
  'Ranking na żywo i wyniki do pobrania (CSV)',
  'Biblioteka gotowych tras od innych nauczycieli',
]

function RouteArt() {
  return (
    <svg className="route-art" viewBox="0 0 320 110" aria-hidden="true" focusable="false">
      <path className="ra-path" d="M20 80 C 70 20, 110 110, 160 55 S 260 10, 300 40" />
      <circle cx="20" cy="80" r="14" />
      <text x="20" y="80">1</text>
      <circle cx="160" cy="55" r="14" />
      <text x="160" y="55">2</text>
      <circle cx="300" cy="40" r="14" />
      <text x="300" y="40">3</text>
    </svg>
  )
}

export default function HomePage() {
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const code = extractGameCode(value)
    if (!code) {
      setError('Kod gry ma 6 znaków (cyfry i litery). Sprawdź, czy dobrze go przepisałeś.')
      return
    }
    navigate(`/gra/${code}`)
  }

  return (
    <main className="play home">
      <div className="hero">
        <RouteArt />
        <h1>Questownik</h1>
        <p className="lead">
          Idź na trasę, odblokowuj zadania na miejscu i zdobywaj punkty. Bez zakładania konta.
        </p>
      </div>

      <form className="card join-card" onSubmit={submit}>
        <label htmlFor="game-code" className="field-label">
          Kod gry
        </label>
        <input
          id="game-code"
          className="answer code-input"
          placeholder="np. 74C2TF"
          value={value}
          autoCapitalize="characters"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? 'game-code-error' : undefined}
          onChange={(e) => {
            setValue(e.target.value)
            setError(null)
          }}
        />
        {error && (
          <p id="game-code-error" role="alert" className="bad">
            {error}
          </p>
        )}
        <button type="submit" className="big" disabled={!value.trim()}>
          Dołącz do gry
        </button>
      </form>

      <section className="card" aria-labelledby="how">
        <h2 id="how">Jak to działa?</h2>
        <ol className="steps-grid">
          {STEPS.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="teachers" className="block">
        <h2 id="teachers">Dla nauczycieli</h2>
        <ul className="feature-list">
          {FEATURES.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
        <div className="cta-grid">
          <Link className="card cta-card" to="/biblioteka">
            <span className="cta-icon" aria-hidden="true">📚</span>
            <strong>Biblioteka tras</strong>
            <span>Gotowe trasy innych nauczycieli: uruchom z nich grę lub skopiuj do siebie.</span>
          </Link>
          <Link className="card cta-card" to="/konto">
            <span className="cta-icon" aria-hidden="true">🗺️</span>
            <strong>Moje konto</strong>
            <span>Utwórz własną trasę, uruchom grę z klasą i oglądaj wyniki na żywo.</span>
          </Link>
        </div>
      </section>
    </main>
  )
}