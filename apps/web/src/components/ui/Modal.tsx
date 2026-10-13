/**
 * KOSHK SKATE ERP — Modal Component
 * Phase 03.5 — Design System
 *
 * Reusable dialog shell. Handles backdrop, focus trap, keyboard dismiss, RTL.
 * UI-005: No native confirm()/alert(). Use Modal instead.
 *
 * AN-005 (Motion & Animation Audit — 2026-09-14): Exit animation added.
 *   - Three-state lifecycle: 'hidden' → 'visible' → 'closing' → 'hidden'.
 *   - Desktop exit : modal-exit (opacity + translateY 8px) at --transition-slow (300ms).
 *   - Mobile exit  : modal-sheet-exit (translateY 0 → 100%) at --transition-slow (300ms).
 *   - Backdrop exit: fadeOut at --transition-base (200ms) — faster than container.
 *   - pointer-events:none on backdrop + container during closing prevents mid-animation
 *     interaction. Close button disabled during closing.
 *   - Scroll lock persists through the exit animation (released only on 'hidden').
 *   - Escape / backdrop-click / X button disabled during closing to prevent double-trigger.
 *   - All existing Modal APIs (isOpen, onClose, title, children, footer, size,
 *     hideCloseButton, closeOnBackdrop) preserved without change.
 */

import { useEffect, useRef, useId, useState, type ReactNode } from 'react'
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

/**
 * AN-005 — Internal animation state machine:
 *   'hidden'  — not rendered (return null)
 *   'visible' — fully visible, all interactions enabled
 *   'closing' — exit animation playing; interactions disabled, element still in DOM
 */
type ModalState = 'hidden' | 'visible' | 'closing'

// Must match the CSS token values used in the exit keyframes.
let mobileScrollLocks = 0
let mobilePreviousOverflow = ''

const MODAL_EXIT_MS = 300   // --transition-slow: modal-exit / modal-sheet-exit
// (Backdrop uses --transition-base, 200ms, handled purely in CSS via animation duration)

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
  // D-003: useId() generates a stable, hydration-safe ID — replaces Math.random()
  const baseId = useId()
  const titleId = `modal-title-${baseId.replace(/:/g, '')}`

  // AN-005: Three-state animation lifecycle (initialised from the isOpen prop).
  const [modalState, setModalState] = useState<ModalState>(isOpen ? 'visible' : 'hidden')

  // Effect 1 — watch the external isOpen prop and drive state transitions.
  useEffect(() => {
    if (isOpen) {
      // Opening (or rapid re-open mid-close): immediately go to 'visible'.
      setModalState('visible')
    } else {
      // Closing: 'visible' → 'closing'. Ignore if already 'closing' or 'hidden'.
      setModalState(prev => (prev === 'visible' ? 'closing' : prev))
    }
  }, [isOpen])

  // Effect 2 — when 'closing' starts, set a timer to reach 'hidden' after the
  // exit animation completes. Cleanup cancels the timer if isOpen flips back.
  useEffect(() => {
    if (modalState !== 'closing') return
    const mobileReducedMotion = window.matchMedia('(max-width: 1023px) and (prefers-reduced-motion: reduce)').matches
    const timer = setTimeout(() => setModalState('hidden'), mobileReducedMotion ? 0 : MODAL_EXIT_MS)
    return () => clearTimeout(timer)
  }, [modalState])

  const isClosing = modalState === 'closing'

  // Keyboard dismiss — only active while fully visible (not during closing).
  useEffect(() => {
    if (modalState !== 'visible') return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        const dialogs = document.querySelectorAll('.modal-container')
        if (dialogs[dialogs.length - 1] !== dialogRef.current) return
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [modalState, onClose])

  // The existing desktop focus lifecycle also protects phone/tablet dialogs.
  const isRendered = modalState !== 'hidden'
  useEffect(() => {
    if (!isRendered) return
    const dialog = dialogRef.current
    if (!dialog) return
    const origin = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const isTopmost = () => {
      const dialogs = document.querySelectorAll('.modal-container')
      return dialogs[dialogs.length - 1] === dialog
    }
    const focusables = () => Array.from(dialog.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )).filter(element => element.getClientRects().length > 0)
    const frame = requestAnimationFrame(() => {
      if (isTopmost()) (focusables()[0] ?? dialog).focus()
    })
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || !isTopmost()) return
      const controls = focusables()
      const first = controls[0]
      const last = controls[controls.length - 1]
      if (!first) { event.preventDefault(); dialog.focus(); return }
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) {
        event.preventDefault(); last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first.focus()
      }
    }
    const onFocusIn = (event: FocusEvent) => {
      if (isTopmost() && event.target instanceof Node && !dialog.contains(event.target)) {
        (focusables()[0] ?? dialog).focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('focusin', onFocusIn)
    return () => {
      cancelAnimationFrame(frame)
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('focusin', onFocusIn)
      if (origin?.isConnected &&
          (dialog.contains(document.activeElement) || document.activeElement === document.body)) origin.focus()
    }
  }, [isRendered])

  // Scroll lock — maintained throughout the animation, released only on 'hidden'.
  useEffect(() => {
    if (modalState === 'hidden') return
    if (window.matchMedia('(max-width: 1023px)').matches) {
      if (mobileScrollLocks === 0) mobilePreviousOverflow = document.body.style.overflow
      mobileScrollLocks += 1
      document.body.style.overflow = 'hidden'
      return () => {
        mobileScrollLocks -= 1
        if (mobileScrollLocks === 0) document.body.style.overflow = mobilePreviousOverflow
      }
    }
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [modalState])

  // Fully hidden — nothing to render.
  if (modalState === 'hidden') return null

  return (
    <>
      {/* Backdrop */}
      <div
        className={`modal-backdrop${isClosing ? ' modal-backdrop--closing' : ''}`}
        onClick={(!isClosing && closeOnBackdrop) ? onClose : undefined}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div
        ref={dialogRef}
        role="dialog"
        tabIndex={-1}
        aria-modal="true"
        aria-labelledby={titleId}
        className={`modal-container${isClosing ? ' modal-container--closing' : ''}`}
        style={{ maxWidth: SIZE_WIDTHS[size] }}
      >
        {/* Header */}
        <div className="modal-header">
          <h2 id={titleId} className="modal-title">{title}</h2>
          {!hideCloseButton && (
            <button
              type="button"
              onClick={!isClosing ? onClose : undefined}
              className="modal-close-btn"
              aria-label="إغلاق"
              disabled={isClosing}
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
        /* ── Backdrop ── */
        .modal-backdrop {
          position: fixed;
          inset: 0;
          background-color: rgba(14, 25, 41, 0.55);
          z-index: var(--z-overlay);
          animation: fadeIn var(--transition-base);
        }

        /* AN-005: backdrop exit — fades out at --transition-base */
        .modal-backdrop--closing {
          animation: fadeOut var(--transition-base) forwards;
          pointer-events: none;
        }

        /* fadeIn/fadeOut keyframes are defined in design-system.css (AN-002) */

        /* ── Container (desktop) ── */
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

        /* AN-005: desktop container exit — fades + drifts down at --transition-slow (300ms) */
        .modal-container--closing {
          animation: modal-exit var(--transition-slow) forwards;
          pointer-events: none;
        }

        @keyframes modal-enter {
          from { opacity: 0; transform: translate(-50%, calc(-50% + 12px)); }
          to   { opacity: 1; transform: translate(-50%, -50%); }
        }

        @keyframes modal-exit {
          from { opacity: 1; transform: translate(-50%, -50%); }
          to   { opacity: 0; transform: translate(-50%, calc(-50% + 8px)); }
        }

        /* ── Header ── */
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

        /* M-005: enlarged from 36×36 → 44×44 px to meet WCAG 2.5.5 minimum touch target */
        .modal-close-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 44px;
          height: 44px;
          min-width: 44px;
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
        .modal-close-btn:disabled { opacity: 0.4; cursor: not-allowed; }

        /* ── Divider / Body / Footer ── */
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

        /* ── Mobile — bottom sheet ── */
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
            max-height: 85dvh;
            overflow-y: auto;
            -webkit-overflow-scrolling: touch;
            border-radius: var(--radius-lg) var(--radius-lg) 0 0;
            /* Safe area: account for home indicator on iOS */
            padding-bottom: env(safe-area-inset-bottom, 0);
            animation: modal-sheet-enter var(--transition-slow);
          }

          /* AN-005: mobile bottom-sheet exit — slides back down */
          .modal-container--closing {
            animation: modal-sheet-exit var(--transition-slow) forwards;
          }

          /* AN-005: mobile bottom-sheet enter/exit keyframes — Modal-specific, not in design-system.css */
          @keyframes modal-sheet-enter {
            from { transform: translateY(100%); }
            to   { transform: translateY(0); }
          }

          @keyframes modal-sheet-exit {
            from { transform: translateY(0); }
            to   { transform: translateY(100%); }
          }

          .modal-body {
            padding: var(--space-4);
          }

          .modal-footer {
            padding: var(--space-4);
            flex-direction: column;
            gap: var(--space-2);
          }

          .modal-footer .btn {
            width: 100%;
            justify-content: center;
          }
        }

      `}</style>
    </>
  )
}
