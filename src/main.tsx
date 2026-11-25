import { StrictMode, Suspense, lazy } from 'react'
import type { ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { Outlet, RouterProvider, createBrowserRouter } from 'react-router-dom'
import ConfirmProvider from './components/ConfirmProvider'
import ErrorBoundary, { RouteErrorFallback } from './components/ErrorBoundary'
import Layout from './components/Layout'
import OfflineBanner from './components/OfflineBanner'
import { PageSkeleton } from './components/Skeleton'
import HomePage from './pages/HomePage'
import NotFoundPage from './pages/NotFoundPage'
import PlayPage from './pages/PlayPage'
import './index.css'

const EditorPage = lazy(() => import('./pages/EditorPage'))
const RankingPage = lazy(() => import('./pages/RankingPage'))
const TeacherPage = lazy(() => import('./pages/TeacherPage'))
const AccountPage = lazy(() => import('./pages/AccountPage'))
const LibraryPage = lazy(() => import('./pages/LibraryPage'))
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'))
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'))
const AdminPage = lazy(() => import('./pages/AdminPage'))
const QrSheetPage = lazy(() => import('./pages/QrSheetPage'))

function Lazy({ children }: { children: ReactNode }) {
  return <Suspense fallback={<PageSkeleton />}>{children}</Suspense>
}

// Korzeń aplikacji: okna potwierdzeń, komunikat o braku internetu i ErrorBoundary wokół wszystkich stron
function Root() {
  return (
    <ConfirmProvider>
      <OfflineBanner />
      <ErrorBoundary>
        <Outlet />
      </ErrorBoundary>
    </ConfirmProvider>
  )
}

const router = createBrowserRouter([
  {
    element: <Root />,
    errorElement: <RouteErrorFallback />,
    children: [
      {
        element: <Layout />,
        children: [
          { path: '/', element: <HomePage /> },
          { path: '/konto', element: <Lazy><AccountPage /></Lazy> },
          { path: '/konto/reset', element: <Lazy><ResetPasswordPage /></Lazy> },
          { path: '/biblioteka', element: <Lazy><LibraryPage /></Lazy> },
          { path: '/prywatnosc', element: <Lazy><PrivacyPage /></Lazy> },
          { path: '/admin', element: <Lazy><AdminPage /></Lazy> },
          { path: '/edytor', element: <Lazy><EditorPage key="new" /></Lazy> },
          { path: '/edytor/:id', element: <Lazy><EditorPage key="edit" /></Lazy> },
          { path: '/gra/:code', element: <PlayPage /> },
          { path: '/ranking/:code', element: <Lazy><RankingPage /></Lazy> },
          { path: '/nauczyciel/:code', element: <Lazy><TeacherPage /></Lazy> },
          { path: '/nauczyciel/:code/qr', element: <Lazy><QrSheetPage /></Lazy> },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
)

// Service worker tylko w wersji produkcyjnej
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((e) => console.error('SW:', e))
  })
}