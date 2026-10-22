import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import HomePage from './pages/HomePage'
import EditorPage from './pages/EditorPage'
import PlayPage from './pages/PlayPage'
import RankingPage from './pages/RankingPage'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/edytor" element={<EditorPage />} />
        <Route path="/gra/:code" element={<PlayPage />} />
        <Route path="/ranking/:code" element={<RankingPage />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
)