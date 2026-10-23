import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import HomePage from './pages/HomePage'
import EditorPage from './pages/EditorPage'
import PlayPage from './pages/PlayPage'
import RankingPage from './pages/RankingPage'
import OfflineBanner from './components/OfflineBanner'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <OfflineBanner />
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/edytor" element={<EditorPage />} />
          <Route path="/gra/:code" element={<PlayPage />} />
          <Route path="/ranking/:code" element={<RankingPage />} />
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