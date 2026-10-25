import { useEffect, useRef } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/auth'

function titleFor(path: string): string {
  if (path.startsWith('/konto')) return 'Konto – Questownik'
  if (path.startsWith('/edytor')) return 'Edytor tras – Questownik'
  if (path.startsWith('/gra')) return 'Gra – Questownik'
  if (path.startsWith('/ranking')) return 'Ranking – Questownik'
  if (path.startsWith('/nauczyciel')) return 'Panel nauczyciela – Questownik'
  return 'Questownik'
}

export default function Layout() {
  const { pathname } = useLocation()
  const { user } = useAuth()
  const content = useRef<HTMLDivElement>(null)
  const first = useRef(true)

  useEffect(() => {
    document.title = titleFor(pathname)
    if (first.current) {
      first.current = false
      return
    }
    content.current?.focus({ preventScroll: true })
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <>
      <a
        className="skip"
        href="#content"
        onClick={(e) => {
          e.preventDefault()
          content.current?.focus()
        }}
      >
        Przejdź do treści
      </a>
      <header className="site-header">
        <Link to="/" className="brand">
          <span aria-hidden="true">📍</span> Questownik
        </Link>
        <nav aria-label="Główna nawigacja">
          <Link to="/konto">{user ? 'Moje trasy' : 'Dla nauczyciela'}</Link>
        </nav>
      </header>
      <div id="content" tabIndex={-1} ref={content}>
        <Outlet />
      </div>
    </>
  )
}