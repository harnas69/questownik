import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import HomePage from './pages/HomePage'
import PlayPage from './pages/PlayPage'
import OfflineBanner from './components/OfflineBanner'
import './index.css'

const EditorPage = lazy(() => import('./pages/EditorPage'))
const RankingPage = lazy(() => import('./pages/RankingPage'))
const TeacherPage = lazy(() => import('./pages/TeacherPage'))
const AccountPage = lazy(() => import('./pages/AccountPage'))

function Loading() {
  return (
    <main className="play">
      <p role="status">Wczytuję…</p>
    </main>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <OfflineBanner />
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<HomePage />} />
          <Route
            path="/konto"
            element={
              <Suspense fallback={<Loading />}>
                <AccountPage />
              </Suspense>
            }
          />
          <Route
            path="/edytor"
            element={
              <Suspense fallback={<Loading />}>
                <EditorPage key="new" />
              </Suspense>
            }
          />
          <Route
            path="/edytor/:id"
            element={
              <Suspense fallback={<Loading />}>
                <EditorPage key="edit" />
              </Suspense>
            }
          />
          <Route path="/gra/:code" element={<PlayPage />} />
          <Route
            path="/ranking/:code"
            element={
              <Suspense fallback={<Loading />}>
                <RankingPage />
              </Suspense>
            }
          />
          <Route
            path="/nauczyciel/:code"
            element={
              <Suspense fallback={<Loading />}>
                <TeacherPage />
              </Suspense>
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>
)

// Service worker tylko w wersji produkcyjnej
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((e) => console.error('SW:', e))
  })
}