/**
 * KOSHK SKATE ERP — Badge Component
 * Phase 03.5 — Design System
 *
 * Status/label pills enforcing semantic color mapping (OD-001 / DEC-034).
 * UI-002: All status displays must use this component.
 */

import type { ReactNode } from 'react'

/**
 * Status values for role/system badges (D-002 / D-005 / D-006):
 *   'role'   — role name pill, navy-50 bg / navy-700 text
 *   'system' — system-defined marker (gold-adjacent), maps to warning variant
 */
export type BadgeStatus =
  | 'available'
  | 'rented'
  | 'reserved'
  | 'maintenance'
  | 'damaged'
  | 'lost'
  | 'active'
  | 'inactive'
  | 'role'    // D-002 / D-006: user role name pills
  | 'system'  // D-005: نظامي — system-defined resource badge
  // Phase 05 — Rental statuses (DEC-064)
  | 'completed'   // alias for 'returned' in display
  | 'overdue'     // computed operational status — danger
  | 'cancelled'   // lifecycle status — neutral

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'role'

const STATUS_VARIANT_MAP: Record<BadgeStatus, BadgeVariant> = {
  available:   'success',
  active:      'success',
  completed:   'success',  // returned rental — Phase 05 DEC-064
  rented:      'info',
  reserved:    'warning',
  maintenance: 'warning',
  damaged:     'danger',
  lost:        'neutral',
  inactive:    'neutral',
  cancelled:   'neutral',  // Phase 05 DEC-064
  overdue:     'danger',   // Phase 05 DEC-064, DEC-066
  role:        'role',    // D-002 / D-006: navy-50 bg / navy-700 text
  system:      'warning', // D-005: gold-adjacent — system resources
}

const VARIANT_STYLES: Record<BadgeVariant, { bg: string; color: string }> = {
  success: { bg: 'var(--color-success-bg)',  color: 'var(--color-success-text)' },
  warning: { bg: 'var(--color-warning-bg)',  color: 'var(--color-warning-text)' },
  danger:  { bg: 'var(--color-danger-bg)',   color: 'var(--color-danger-text)'  },
  info:    { bg: 'var(--color-info-bg)',     color: 'var(--color-info-text)'    },
  neutral: { bg: 'var(--color-neutral-bg)',  color: 'var(--color-neutral-text)' },
  role:    { bg: 'var(--color-navy-50)',     color: 'var(--color-navy-700)'     }, // D-002 / D-006
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
      data-variant={resolvedVariant}
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
