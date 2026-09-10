/**
 * KOSHK SKATE ERP — EmptyState Component
 * Phase 03.5 — Design System
 *
 * Used for all empty list / table / search result states.
 * UI-002: No emoji icons — Lucide SVG only.
 */

import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Package } from 'lucide-react'

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

export function EmptyState({
  icon: IconComponent = Package,
  title,
  description,
  action,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={['empty-state', className].filter(Boolean).join(' ')}
    >
      <div className="empty-state-icon">
        <IconComponent size={48} aria-hidden="true" />
      </div>
      <h3 className="empty-state-title">{title}</h3>
      {description && (
        <p className="empty-state-description">{description}</p>
      )}
      {action && <div className="empty-state-action">{action}</div>}

      <style>{`
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: var(--space-12) var(--space-8);
          text-align: center;
          gap: var(--space-3);
        }

        .empty-state-icon {
          color: var(--color-navy-300);
          margin-bottom: var(--space-2);
          opacity: 0.6;
        }

        .empty-state-title {
          font-size: var(--font-size-lg);
          font-weight: var(--font-weight-bold);
          color: var(--color-navy-800);
          margin: 0;
        }

        .empty-state-description {
          font-size: var(--font-size-sm);
          color: var(--color-text-muted);
          margin: 0;
          max-width: 360px;
          line-height: var(--line-height-relaxed);
        }

        .empty-state-action {
          margin-top: var(--space-2);
        }
      `}</style>
    </div>
  )
}
