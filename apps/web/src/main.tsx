/**
 * KOSHK SKATE ERP — Application Entry Point
 * Phase 03.5 — Design System (updated from Phase 02)
 *
 * Wraps with:
 *   - BrowserRouter (React Router)
 *   - AuthProvider (JWT auth context)
 *   - ToastProvider (Phase 03.5 — replaces alert() system-wide)
 */

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ToastProvider } from './components/ui'
import './styles/index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
