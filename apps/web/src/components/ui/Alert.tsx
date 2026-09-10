/**
 * KOSHK SKATE ERP — Alert Component
 * Phase 03.5 — Design System
 *
 * Inline contextual banner for persistent page-level messages.
 * Use Toast for transient feedback.
 */

import type { ReactNode } from 'react'
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react'

type AlertVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral'

interface AlertProps {
  variant: AlertVariant
  title?: string
  children: ReactNode
  dismissible?: boolean
  onDismiss?: () => void
  className?: string
  style?: React.CSSProperties
}

const VARIANT_CONFIG: Record<AlertVariant, {
  bg: string; border: string; icon: typeof Info; iconColor: string
}> = {
  success: { bg: 'var(--color-success-bg)', border: 'var(--color-success-500)', icon: CheckCircle2, iconColor: 'var(--color-success-text)' },
  warning: { bg: 'var(--color-warning-bg)', border: 'var(--color-warning-500)', icon: AlertTriangle, iconColor: 'var(--color-warning-text)' },
  danger:  { bg: 'var(--color-danger-bg)',  border: 'var(--color-danger-500)',  icon: XCircle,      iconColor: 'var(--color-danger-text)'  },
  info:    { bg: 'var(--color-info-bg)',    border: 'var(--color-info-500)',    icon: Info,         iconColor: 'var(--color-info-text)'    },
  neutral: { bg: 'var(--color-neutral-bg)', border: 'var(--color-neutral-text)', icon: Info,        iconColor: 'var(--color-neutral-text)' },
}

export function Alert({ variant, title, children, dismissible, onDismiss, className = '', style }: AlertProps) {
  const config = VARIANT_CONFIG[variant]
  const IconComponent = config.icon

  return (
    <div
      role="alert"
      className={['ds-alert', className].filter(Boolean).join(' ')}
      style={{ backgroundColor: config.bg, borderRightColor: config.border, ...style }}
    >
      <IconComponent size={18} color={config.iconColor} aria-hidden="true" style={{ flexShrink: 0, marginTop: 1 }} />
      <div style={{ flex: 1 }}>
        {title && <p style={{ fontWeight: 'var(--font-weight-semibold)', margin: '0 0 var(--space-1)', color: 'var(--color-text-primary)' }}>{title}</p>}
        <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', lineHeight: 'var(--line-height-normal)' }}>
          {children}
        </div>
      </div>
      {dismissible && onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="إغلاق التنبيه"
          style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: 'var(--space-1)',
            color: 'var(--color-text-muted)', borderRadius: 'var(--radius-sm)',
            display: 'flex', alignItems: 'center', flexShrink: 0,
          }}
        >
          <X size={16} aria-hidden="true" />
        </button>
      )}
      <style>{`
        .ds-alert {
          display: flex;
          align-items: flex-start;
          gap: var(--space-3);
          padding: var(--space-3) var(--space-4);
          border-radius: var(--radius-base);
          border-right: 4px solid;
        }
      `}</style>
    </div>
  )
}
