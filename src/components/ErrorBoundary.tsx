import { Component, useEffect, useRef } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { useLocation, useRouteError } from 'react-router-dom'
import {
  clearChunkReloadFlag,
  isChunkLoadError,
  safeSessionStorage,
  tryChunkReload,
} from '../lib/chunkReload'

function describeError(error: unknown): string {
  if (error instanceof Error) return `${error.name}: ${error.message}`
  try {
    return typeof error === 'string' ? error : JSON.stringify(error)
  } catch {
    return String(error)
  }
}

export function ErrorScreen({ kind, detail }: { kind: 'generic' | 'chunk'; detail?: string }) {
  const heading = useRef<HTMLHeadingElement>(null)

  // Fokus na nagłówku błędu, żeby czytnik ekranu od razu go odczytał
  useEffect(() => {
    heading.current?.focus()
  }, [])

  const chunk = kind === 'chunk'
  return (
    <main className="play">
      <div role="alert" className="error-box">
        <h1 ref={heading} tabIndex={-1}>
          {chunk ? 'Nie udało się wczytać strony' : 'Coś poszło nie tak'}
        </h1>
        <p className="lead">
          {chunk
            ? 'Nie udało się pobrać części aplikacji. Możliwe, że zmieniła się jej wersja albo zniknęło połączenie z internetem. Odśwież stronę.'
            : 'W aplikacji wystąpił nieoczekiwany błąd. Odśwież stronę. Jeśli problem wraca, wróć na stronę główną. Postęp w grze zapisuje się na serwerze po każdej odpowiedzi.'}
        </p>
        {import.meta.env.DEV && detail && <pre className="error-detail">{detail}</pre>}
      </div>
      <button type="button" className="big" onClick={() => window.location.reload()}>
        Odśwież stronę
      </button>
      <a className="big secondary" href="/">
        Wróć na stronę główną
      </a>
    </main>
  )
}

// Błędy samego routera (poza komponentami stron)
export function RouteErrorFallback() {
  const error = useRouteError()
  useEffect(() => {
    console.error(error)
  }, [error])
  return (
    <ErrorScreen
      kind={isChunkLoadError(error) ? 'chunk' : 'generic'}
      detail={describeError(error)}
    />
  )
}

interface BoundaryProps {
  children: ReactNode
  resetKey: string
}

interface BoundaryState {
  hasError: boolean
  error: unknown
  chunk: boolean
  gaveUp: boolean
}

class Boundary extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { hasError: false, error: null, chunk: false, gaveUp: false }

  static getDerivedStateFromError(error: unknown): Partial<BoundaryState> {
    return { hasError: true, error, chunk: isChunkLoadError(error), gaveUp: false }
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    console.error('ErrorBoundary:', error, info.componentStack)
    if (!isChunkLoadError(error)) return
    // Jedno przeładowanie na sesję: kolejny taki błąd pokazuje ekran błędu zamiast pętli
    if (tryChunkReload(safeSessionStorage())) {
      window.location.reload()
      return
    }
    this.setState({ gaveUp: true })
  }

  componentDidUpdate(prev: BoundaryProps) {
    // Przejście na inną stronę zdejmuje ekran błędu
    if (this.state.hasError && prev.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false, error: null, chunk: false, gaveUp: false })
    }
  }

  render() {
    const { hasError, error, chunk, gaveUp } = this.state
    if (!hasError) return this.props.children
    if (chunk && !gaveUp) {
      return (
        <main className="play">
          <p role="status">Wczytuję nową wersję aplikacji…</p>
        </main>
      )
    }
    return <ErrorScreen kind={chunk ? 'chunk' : 'generic'} detail={describeError(error)} />
  }
}

export default function ErrorBoundary({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()

  // Aplikacja działa już chwilę, więc kolejny błąd ładowania wolno znów rozwiązać przeładowaniem
  useEffect(() => {
    const t = window.setTimeout(() => clearChunkReloadFlag(safeSessionStorage()), 10_000)
    return () => window.clearTimeout(t)
  }, [])

  return <Boundary resetKey={pathname}>{children}</Boundary>
}