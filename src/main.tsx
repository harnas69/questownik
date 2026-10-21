import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import EditorPage from './pages/EditorPage'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <EditorPage />
  </StrictMode>
)