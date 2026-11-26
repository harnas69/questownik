import { useEffect, useRef } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import ThemeToggle from './ThemeToggle'

// Dla /gra i /ranking tytuł ustawia sama strona (z nazwą trasy), więc zwracamy null
function titleFor(path: string): string | null {
  if (path.startsWith('/gra') || path.startsWith('/ranking')) return null
  if (path.startsWith('/admin')) return 'Moderacja – Questownik'
  if (path.startsWith('/prywatnosc')) return 'Prywatność – Questownik'
  if (path.startsWith('/biblioteka')) return 'Biblioteka tras – Questownik'
  if (path.startsWith('/konto')) return 'Konto – Questownik'
  if (path.startsWith('/edytor')) return 'Edytor tras – Questownik'
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
    const title = titleFor(pathname)
    if (title) document.title = title
    if (first.current) {
      first.current = false
      return
    }
    const box = content.current
    if (!box) return
    window.scrollTo(0, 0)

    // Fokus trafia na pierwszy nagłówek h1 nowej strony. Strony ładowane leniwie nie mają go
    // od razu, więc czekamy, aż się pojawi (maksymalnie 1,5 s). Jeśli fokus jest już w treści
    // (np. strona sama ustawiła go na swoim nagłówku), niczego nie zmieniamy.
    const alreadyInside = () => {
      const ae = document.activeElement
      return !!ae && ae !== document.body && ae !== box && box.contains(ae)
    }
    const focusHeading = (): boolean => {
      if (alreadyInside()) return true
      const h = box.querySelector<HTMLElement>('h1')
      if (!h) return false
      if (!h.hasAttribute('tabindex')) h.setAttribute('tabindex', '-1')
      h.focus({ preventScroll: true })
      return true
    }

    if (focusHeading()) return
    const observer = new MutationObserver(() => {
      if (focusHeading()) observer.disconnect()
    })
    observer.observe(box, { childList: true, subtree: true })
    const timer = window.setTimeout(() => {
      observer.disconnect()
      const ae = document.activeElement
      if (!ae || ae === document.body) box.focus({ preventScroll: true })
    }, 1500)
    return () => {
      observer.disconnect()
      window.clearTimeout(timer)
    }
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
          <span className="brand-name">Questownik</span>
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