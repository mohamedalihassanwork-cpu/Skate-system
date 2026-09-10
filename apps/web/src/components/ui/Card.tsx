/**
 * KOSHK SKATE ERP — Card Component
 * Phase 03.5 — Design System
 *
 * Standard white surface container.
 */

import type { ReactNode } from 'react'

type CardPadding = 'compact' | 'standard'

interface CardProps {
  children: ReactNode
  padding?: CardPadding
  hover?: boolean
  onClick?: () => void
  className?: string
  as?: 'div' | 'article' | 'section'
}

export function Card({
  children,
  padding = 'standard',
  hover = false,
  onClick,
  className = '',
  as: Tag = 'div',
}: CardProps) {
  const paddingValue = padding === 'compact' ? 'var(--space-5)' : 'var(--space-6)'
  const isClickable = Boolean(onClick)

  return (
    <>
      <Tag
        className={['card', hover || isClickable ? 'card--hover' : '', className].filter(Boolean).join(' ')}
        style={{ padding: paddingValue }}
        onClick={onClick}
        role={isClickable ? 'button' : undefined}
        tabIndex={isClickable ? 0 : undefined}
        onKeyDown={isClickable ? (e) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick?.() }
        } : undefined}
      >
        {children}
      </Tag>
      <style>{`
        .card {
          background-color: var(--color-white);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-card);
          border: 1px solid var(--color-border);
          transition: box-shadow var(--transition-fast), transform var(--transition-fast);
        }
        .card--hover:hover {
          box-shadow: var(--shadow-md);
          transform: translateY(-1px);
          cursor: pointer;
        }
        .card:focus-visible {
          outline: 2px solid var(--color-border-focus);
          outline-offset: 2px;
        }
      `}</style>
    </>
  )
}
