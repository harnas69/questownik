/* oxlint-disable react/only-export-components */
import { StrictMode, Suspense, lazy } from 'react'
import type { ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import ConfirmProvider from './components/ConfirmProvider'
import Layout from './components/Layout'
import OfflineBanner from './components/OfflineBanner'
import HomePage from './pages/HomePage'
import PlayPage from './pages/PlayPage'
import './index.css'
import { PageSkeleton } from './components/Skeleton'

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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ConfirmProvider>
        <OfflineBanner />
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/konto" element={<Lazy><AccountPage /></Lazy>} />
            <Route path="/konto/reset" element={<Lazy><ResetPasswordPage /></Lazy>} />
            <Route path="/biblioteka" element={<Lazy><LibraryPage /></Lazy>} />
            <Route path="/prywatnosc" element={<Lazy><PrivacyPage /></Lazy>} />
            <Route path="/admin" element={<Lazy><AdminPage /></Lazy>} />
            <Route path="/edytor" element={<Lazy><EditorPage key="new" /></Lazy>} />
            <Route path="/edytor/:id" element={<Lazy><EditorPage key="edit" /></Lazy>} />
            <Route path="/gra/:code" element={<PlayPage />} />
            <Route path="/ranking/:code" element={<Lazy><RankingPage /></Lazy>} />
            <Route path="/nauczyciel/:code" element={<Lazy><TeacherPage /></Lazy>} />
            <Route path="/nauczyciel/:code/qr" element={<Lazy><QrSheetPage /></Lazy>} />
          </Route>
        </Routes>
      </ConfirmProvider>
    </BrowserRouter>
  </StrictMode>
)

// Service worker tylko w wersji produkcyjnej
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((e) => console.error('SW:', e))
  })
}