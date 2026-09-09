/**
 * KOSHK SKATE ERP — Application Entry Point
 * Phase 02 — Authentication & Permissions (updated)
 *
 * Wraps with:
 *   - BrowserRouter (React Router)
 *   - AuthProvider (JWT auth context)
 */

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import './styles/index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
