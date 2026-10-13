/**
 * KOSHK SKATE ERP — Application Entry Point
 * Phase 03.5 — Design System (updated from Phase 02)
 *
 * Wraps with:
 *   - ErrorBoundary (SYS-003: catches render errors, prevents blank screen)
 *   - BrowserRouter (React Router)
 *   - AuthProvider (JWT auth context)
 *   - ToastProvider (Phase 03.5 — replaces alert() system-wide)
 */

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ToastProvider, ErrorBoundary } from './components/ui'
import { PrintProvider } from './contexts/PrintContext'
import './styles/index.css'
import App from './App.tsx'
import './styles/desktop.css'
import './styles/mobile-shared.css'
import './styles/mobile-modules.css'
import './styles/mobile-pages.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <PrintProvider>
            <ToastProvider>
              <App />
            </ToastProvider>
          </PrintProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
)
