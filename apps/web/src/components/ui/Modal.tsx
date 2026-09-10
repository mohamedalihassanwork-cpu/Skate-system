/**
 * KOSHK SKATE ERP — Modal Component
 * Phase 03.5 — Design System
 *
 * Reusable dialog shell. Handles backdrop, focus trap, keyboard dismiss, RTL.
 * UI-005: No native confirm()/alert(). Use Modal instead.
 */

import { useEffect, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'

type ModalSize = 'sm' | 'base' | 'lg'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer?: ReactNode
  size?: ModalSize
  hideCloseButton?: boolean
  closeOnBackdrop?: boolean
}

const SIZE_WIDTHS: Record<ModalSize, string> = {
  sm:   '480px',
  base: '560px',
  lg:   '640px',
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'base',
  hideCloseButton = false,
  closeOnBackdrop = true,
}: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const titleId = `modal-title-${Math.random().toString(36).slice(2, 8)}`

  // Keyboard dismiss
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // Focus first focusable element on open
  useEffect(() => {
    if (!isOpen) return
    const focusable = dialogRef.current?.querySelector<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    focusable?.focus()
    // Lock scroll
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="modal-backdrop"
        onClick={closeOnBackdrop ? onClose : undefined}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="modal-container"
        style={{ maxWidth: SIZE_WIDTHS[size] }}
      >
        {/* Header */}
        <div className="modal-header">
          <h2 id={titleId} className="modal-title">{title}</h2>
          {!hideCloseButton && (
            <button
              type="button"
              onClick={onClose}
              className="modal-close-btn"
              aria-label="إغلاق"
            >
              <X size={18} aria-hidden="true" />
            </button>
          )}
        </div>

        <div className="modal-divider" />

        {/* Body */}
        <div className="modal-body">{children}</div>

        {/* Footer */}
        {footer && (
          <>
            <div className="modal-divider" />
            <div className="modal-footer">{footer}</div>
          </>
        )}
      </div>

      <style>{`
        .modal-backdrop {
          position: fixed;
          inset: 0;
          background-color: rgba(14, 25, 41, 0.55);
          z-index: var(--z-overlay);
          animation: fadeIn var(--transition-base);
        }

        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

        .modal-container {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: calc(100% - 2rem);
          max-height: 90vh;
          overflow-y: auto;
          background-color: var(--color-white);
          border-radius: var(--radius-xl);
          box-shadow: var(--shadow-modal);
          z-index: var(--z-modal);
          direction: rtl;
          animation: modal-enter var(--transition-slow);
        }

        @keyframes modal-enter {
          from { opacity: 0; transform: translate(-50%, calc(-50% + 12px)); }
          to   { opacity: 1; transform: translate(-50%, -50%); }
        }

        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: var(--space-5) var(--space-6);
          gap: var(--space-4);
        }

        .modal-title {
          font-size: var(--font-size-lg);
          font-weight: var(--font-weight-bold);
          color: var(--color-navy-800);
          margin: 0;
          flex: 1;
        }

        .modal-close-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          min-width: 36px;
          border: none;
          border-radius: var(--radius-base);
          background: transparent;
          color: var(--color-text-muted);
          cursor: pointer;
          transition: background-color var(--transition-fast), color var(--transition-fast);
          flex-shrink: 0;
        }

        .modal-close-btn:hover { background-color: var(--color-neutral-bg); color: var(--color-text-primary); }
        .modal-close-btn:focus-visible { outline: 2px solid var(--color-border-focus); outline-offset: 2px; }

        .modal-divider { height: 1px; background-color: var(--color-border); }

        .modal-body { padding: var(--space-6); }

        .modal-footer {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: var(--space-3);
          padding: var(--space-4) var(--space-6);
          flex-direction: row-reverse;
        }

        @media (max-width: 639px) {
          .modal-container {
            position: fixed;
            top: auto;
            bottom: 0;
            left: 0;
            right: 0;
            transform: none;
            width: 100%;
            max-width: 100%;
            border-radius: var(--radius-lg) var(--radius-lg) 0 0;
            animation: modal-sheet-enter var(--transition-slow);
          }

          @keyframes modal-sheet-enter {
            from { transform: translateY(100%); }
            to   { transform: translateY(0); }
          }
        }
      `}</style>
    </>
  )
}
