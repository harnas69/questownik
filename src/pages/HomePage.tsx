import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

export default function HomePage() {
  const [code, setCode] = useState('')
  const navigate = useNavigate()
  const go = () => {
    const c = code.trim().toUpperCase()
    if (c) navigate(`/gra/${c}`)
  }

  return (
    <main className="play">
      <h1>Questownik</h1>
      <p>Miejska gra terenowa. Wpisz kod trasy od nauczyciela.</p>
      <input
        className="answer"
        placeholder="Kod trasy (np. 74C2TF)"
        value={code}
        maxLength={6}
        autoCapitalize="characters"
        onChange={(e) => setCode(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && go()}
      />
      <button className="big" onClick={go} disabled={!code.trim()}>
        Dołącz do gry
      </button>
      <p className="note">
        Jesteś nauczycielem? <Link to="/edytor">Stwórz trasę</Link>
      </p>
    </main>
  )
}