/**
 * KOSHK SKATE ERP — Badge Component
 * Phase 03.5 — Design System
 *
 * Status/label pills enforcing semantic color mapping (OD-001 / DEC-034).
 * UI-002: All status displays must use this component.
 */

import type { ReactNode } from 'react'

export type BadgeStatus =
  | 'available'
  | 'rented'
  | 'reserved'
  | 'maintenance'
  | 'damaged'
  | 'lost'
  | 'active'
  | 'inactive'

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral'

const STATUS_VARIANT_MAP: Record<BadgeStatus, BadgeVariant> = {
  available:   'success',
  active:      'success',
  rented:      'info',
  reserved:    'warning',
  maintenance: 'warning',
  damaged:     'danger',
  lost:        'neutral',
  inactive:    'neutral',
}

const VARIANT_STYLES: Record<BadgeVariant, { bg: string; color: string }> = {
  success: { bg: 'var(--color-success-bg)',  color: 'var(--color-success-text)' },
  warning: { bg: 'var(--color-warning-bg)',  color: 'var(--color-warning-text)' },
  danger:  { bg: 'var(--color-danger-bg)',   color: 'var(--color-danger-text)'  },
  info:    { bg: 'var(--color-info-bg)',     color: 'var(--color-info-text)'    },
  neutral: { bg: 'var(--color-neutral-bg)',  color: 'var(--color-neutral-text)' },
}

interface BadgeProps {
  children: ReactNode
  status?: BadgeStatus
  variant?: BadgeVariant
  className?: string
}

export function Badge({ children, status, variant, className = '' }: BadgeProps) {
  const resolvedVariant: BadgeVariant =
    variant ?? (status ? STATUS_VARIANT_MAP[status] : 'neutral')
  const { bg, color } = VARIANT_STYLES[resolvedVariant]

  return (
    <span
      className={['badge', className].filter(Boolean).join(' ')}
      style={{ backgroundColor: bg, color }}
    >
      {children}
      <style>{`
        .badge {
          display: inline-flex;
          align-items: center;
          padding: 2px 10px;
          border-radius: var(--radius-full);
          font-size: var(--font-size-xs);
          font-weight: var(--font-weight-bold);
          white-space: nowrap;
          line-height: 1.6;
        }
      `}</style>
    </span>
  )
}
