/**
 * KOSHK SKATE ERP — Button Component
 * Phase 03.5 — Design System
 *
 * The single authoritative button for the ERP.
 * Variants: primary | secondary | ghost | danger
 * Sizes: sm | base | lg
 * UI-002: All buttons must use this component.
 */

import type { ReactNode, ButtonHTMLAttributes } from 'react'
import { Loader2 } from 'lucide-react'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
type ButtonSize = 'sm' | 'base' | 'lg'

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  children: ReactNode
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  fullWidth?: boolean
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:   'btn-primary',
  secondary: 'btn-secondary',
  ghost:     'btn-ghost',
  danger:    'btn-danger',
}

const sizeStyles: Record<ButtonSize, string> = {
  sm:   'btn-sm',
  base: 'btn-base',
  lg:   'btn-lg',
}

export function Button({
  children,
  variant = 'primary',
  size = 'base',
  loading = false,
  fullWidth = false,
  disabled,
  className = '',
  type = 'button',
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading

  return (
    <>
      <button
        type={type}
        disabled={isDisabled}
        aria-busy={loading ? true : undefined}
        className={[
          'btn',
          variantStyles[variant],
          sizeStyles[size],
          fullWidth ? 'btn-full-width' : '',
          className,
        ].filter(Boolean).join(' ')}
        {...rest}
      >
        {loading && (
          <Loader2
            size={size === 'sm' ? 14 : 16}
            aria-hidden="true"
            style={{ animation: 'spin 1s linear infinite', flexShrink: 0 }}
          />
        )}
        {children}
      </button>

      <style>{`
        .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: var(--space-2);
          border: none;
          border-radius: var(--radius-base);
          font-family: var(--font-family-base);
          font-weight: var(--font-weight-semibold);
          cursor: pointer;
          transition: background-color var(--transition-fast),
                      border-color var(--transition-fast),
                      box-shadow var(--transition-fast),
                      opacity var(--transition-fast);
          text-decoration: none;
          white-space: nowrap;
          position: relative;
          line-height: 1;
        }

        /* Sizes */
        .btn-sm   { height: 32px; font-size: var(--font-size-xs);  padding: 0 0.875rem; min-height: 32px; }
        .btn-base { height: 40px; font-size: var(--font-size-sm);  padding: 0 1.125rem; min-height: 44px; }
        .btn-lg   { height: 44px; font-size: var(--font-size-base); padding: 0 1.5rem;  min-height: 44px; }
        .btn-full-width { width: 100%; }

        /* Primary */
        .btn-primary {
          background-color: var(--color-navy-800);
          color: var(--color-white);
          border: 1.5px solid transparent;
        }
        .btn-primary:hover:not(:disabled) { background-color: var(--color-navy-700); }
        .btn-primary:active:not(:disabled) { background-color: var(--color-navy-900); }

        /* Secondary */
        .btn-secondary {
          background-color: var(--color-white);
          color: var(--color-navy-800);
          border: 1.5px solid var(--color-navy-800);
        }
        .btn-secondary:hover:not(:disabled) { background-color: var(--color-navy-50); }
        .btn-secondary:active:not(:disabled) { background-color: var(--color-navy-100); }

        /* Ghost */
        .btn-ghost {
          background-color: transparent;
          color: var(--color-navy-800);
          border: 1.5px solid transparent;
        }
        .btn-ghost:hover:not(:disabled) {
          background-color: var(--color-navy-50);
          border-color: var(--color-border);
        }
        .btn-ghost:active:not(:disabled) { background-color: var(--color-navy-100); }

        /* Danger */
        .btn-danger {
          background-color: var(--color-danger-500);
          color: var(--color-white);
          border: 1.5px solid transparent;
        }
        .btn-danger:hover:not(:disabled) { background-color: #d43a3c; }
        .btn-danger:active:not(:disabled) { background-color: #b83234; }

        /* Disabled */
        .btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* Focus */
        .btn:focus-visible {
          outline: 2px solid var(--color-border-focus);
          outline-offset: 2px;
        }
      `}</style>
    </>
  )
}
