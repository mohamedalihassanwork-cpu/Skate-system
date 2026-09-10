/**
 * KOSHK SKATE ERP — Toast + ToastProvider
 * Phase 03.5 — Design System
 *
 * Non-blocking feedback system. Replaces all alert() usage.
 * UI-005: alert() is permanently prohibited. Use showToast() instead.
 *
 * Usage:
 *   const { showToast } = useToast()
 *   showToast({ type: 'success', title: 'تم الحفظ بنجاح' })
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react'
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react'

/* =============================================================================
   Types
   ============================================================================= */

export type ToastType = 'success' | 'warning' | 'error' | 'info'

export interface ToastItem {
  id: string
  type: ToastType
  title: string
  message?: string
  duration: number
}

export interface ShowToastOptions {
  type: ToastType
  title: string
  message?: string
  /** Duration in ms. 0 = no auto-dismiss. Default: type-based. */
  duration?: number
}

/* =============================================================================
   Context
   ============================================================================= */

interface ToastContextValue {
  showToast: (options: ShowToastOptions) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const DEFAULT_DURATIONS: Record<ToastType, number> = {
  success: 3000,
  warning: 4000,
  info:    4000,
  error:   0,      // persistent — user must dismiss
}

/* =============================================================================
   ToastProvider
   ============================================================================= */

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const showToast = useCallback((options: ShowToastOptions) => {
    const id = Math.random().toString(36).slice(2, 10)
    const duration = options.duration ?? DEFAULT_DURATIONS[options.type]
    setToasts(prev => {
      const next = [...prev, { id, ...options, duration }]
      return next.slice(-3) // max 3 visible
    })
    if (duration > 0) {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id))
      }, duration)
    }
  }, [])

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  )
}

/* =============================================================================
   useToast hook
   ============================================================================= */

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within a ToastProvider')
  return ctx
}

/* =============================================================================
   Toast Container + Item
   ============================================================================= */

const TOAST_CONFIG: Record<ToastType, {
  bg: string; border: string; textColor: string; icon: typeof Info
}> = {
  success: { bg: 'var(--color-success-bg)', border: 'var(--color-success-500)', textColor: 'var(--color-success-text)', icon: CheckCircle2 },
  warning: { bg: 'var(--color-warning-bg)', border: 'var(--color-warning-500)', textColor: 'var(--color-warning-text)', icon: AlertTriangle },
  error:   { bg: 'var(--color-danger-bg)',  border: 'var(--color-danger-500)',  textColor: 'var(--color-danger-text)',  icon: XCircle      },
  info:    { bg: 'var(--color-info-bg)',    border: 'var(--color-info-500)',    textColor: 'var(--color-info-text)',    icon: Info         },
}

function ToastContainer({ toasts, onDismiss }: { toasts: ToastItem[]; onDismiss: (id: string) => void }) {
  return (
    <>
      <div
        role="region"
        aria-label="الإشعارات"
        aria-live="polite"
        style={{
          position: 'fixed',
          bottom: 'var(--space-6)',
          left: 'var(--space-6)',
          zIndex: 'var(--z-toast)' as unknown as number,
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-3)',
          width: 340,
          maxWidth: 'calc(100vw - 3rem)',
          pointerEvents: 'none',
        }}
      >
        {toasts.map(toast => (
          <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
        ))}
      </div>
      <style>{`
        .toast-item {
          display: flex;
          align-items: flex-start;
          gap: var(--space-3);
          padding: var(--space-4);
          border-radius: var(--radius-base);
          box-shadow: var(--shadow-lg);
          border: 1px solid;
          direction: rtl;
          animation: toast-slide-in 250ms ease-out;
          pointer-events: all;
        }
        .toast-dismiss {
          display: flex; align-items: center; justify-content: center;
          background: none; border: none; cursor: pointer;
          padding: 2px; border-radius: var(--radius-sm);
          opacity: 0.6; transition: opacity var(--transition-fast);
          flex-shrink: 0;
        }
        .toast-dismiss:hover { opacity: 1; }
      `}</style>
    </>
  )
}

function ToastItem({ toast, onDismiss }: { toast: ToastItem; onDismiss: (id: string) => void }) {
  const config = TOAST_CONFIG[toast.type]
  const IconComponent = config.icon

  return (
    <div
      className="toast-item"
      style={{
        backgroundColor: config.bg,
        borderColor: config.border,
      }}
    >
      <IconComponent size={18} color={config.textColor} aria-hidden="true" style={{ flexShrink: 0, marginTop: 1 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontWeight: 'var(--font-weight-semibold)', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)' }}>
          {toast.title}
        </p>
        {toast.message && (
          <p style={{ margin: 'var(--space-1) 0 0', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', lineHeight: 'var(--line-height-normal)' }}>
            {toast.message}
          </p>
        )}
      </div>
      <button
        type="button"
        className="toast-dismiss"
        onClick={() => onDismiss(toast.id)}
        aria-label="إغلاق الإشعار"
      >
        <X size={14} color="var(--color-text-muted)" aria-hidden="true" />
      </button>
    </div>
  )
}

/* Suppress unused warning — ToastItem uses useEffect pattern indirectly */
void useEffect
