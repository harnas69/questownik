import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'

export default function HomePage() {
  const [code, setCode] = useState('')
  const navigate = useNavigate()

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const c = code.trim().toUpperCase()
    if (c) navigate(`/gra/${c}`)
  }

  return (
    <main className="play">
      <div className="hero">
        <h1>Questownik</h1>
        <p className="lead">
          Miejska gra terenowa: idź na trasę, odblokowuj zadania na miejscu i zdobywaj punkty.
        </p>
      </div>

      <form className="card" onSubmit={submit}>
        <label htmlFor="route-code" className="field-label">
          Kod trasy od nauczyciela
        </label>
        <input
          id="route-code"
          className="answer code-input"
          placeholder="np. 74C2TF"
          value={code}
          maxLength={6}
          autoCapitalize="characters"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          onChange={(e) => setCode(e.target.value)}
        />
        <button type="submit" className="big" disabled={!code.trim()}>
          Dołącz do gry
        </button>
      </form>

      <section className="card" aria-labelledby="how">
        <h2 id="how">Jak to działa?</h2>
        <ol className="steps">
          <li>Wpisz kod trasy i nazwę drużyny.</li>
          <li>Idź do wskazanego punktu. Aplikacja pokazuje odległość.</li>
          <li>Gdy dotrzesz na miejsce, odblokuje się zadanie.</li>
          <li>Zdobywaj punkty i śledź ranking na żywo.</li>
        </ol>
      </section>

      <p className="note">
            Jesteś nauczycielem? <Link to="/konto">Zaloguj się i stwórz trasę</Link>
      </p>
    </main>
  )
}