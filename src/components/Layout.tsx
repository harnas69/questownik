import { useEffect, useRef } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import ThemeToggle from './ThemeToggle'

function titleFor(path: string): string {
  if (path.startsWith('/admin')) return 'Moderacja – Questownik'
  if (path.startsWith('/prywatnosc')) return 'Prywatność – Questownik'
  if (path.startsWith('/biblioteka')) return 'Biblioteka tras – Questownik'
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
  const onPrivacy = pathname.startsWith('/prywatnosc')

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
          <span className="brand-mark" aria-hidden="true">
            <svg
              viewBox="0 0 24 24"
              width="20"
              height="20"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z" />
              <circle cx="12" cy="9.5" r="2.6" />
            </svg>
          </span>
          <span>Questownik</span>
        </Link>
        <nav aria-label="Główna nawigacja">
          <NavLink to="/biblioteka">Biblioteka</NavLink>
          <NavLink to="/konto" className="nav-cta">
            {user ? 'Moje konto' : 'Zaloguj się'}
          </NavLink>
          <ThemeToggle />
        </nav>
      </header>
      <div id="content" tabIndex={-1} ref={content}>
        <Outlet />
      </div>
      {!onPrivacy && (
        <footer className="site-footer">
          <span>Questownik</span>
          <Link to="/prywatnosc">Prywatność</Link>
        </footer>
      )}
    </>
  )
}