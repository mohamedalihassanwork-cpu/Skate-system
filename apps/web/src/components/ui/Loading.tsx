/**
 * KOSHK SKATE ERP — LoadingSpinner + LoadingSkeleton Components
 * Phase 03.5 — Design System
 */

import type { CSSProperties } from 'react'
import { Loader2 } from 'lucide-react'

/* =============================================================================
   LoadingSpinner
   ============================================================================= */

type SpinnerSize = 'sm' | 'base' | 'lg' | 'page'

const SPINNER_SIZES: Record<SpinnerSize, number> = {
  sm:   16,
  base: 24,
  lg:   40,
  page: 64,
}

interface LoadingSpinnerProps {
  size?: SpinnerSize
  label?: string
  className?: string
  style?: CSSProperties
}

export function LoadingSpinner({
  size = 'base',
  label = 'جارٍ التحميل',
  className = '',
  style,
}: LoadingSpinnerProps) {
  const px = SPINNER_SIZES[size]

  return (
    <div
      role="status"
      aria-label={label}
      className={['spinner-container', className].filter(Boolean).join(' ')}
      style={style}
    >
      <Loader2
        size={px}
        aria-hidden="true"
        style={{ animation: 'spin 1s linear infinite', color: 'var(--color-navy-800)' }}
      />
    </div>
  )
}

/* =============================================================================
   LoadingSkeleton
   ============================================================================= */

interface LoadingSkeletonProps {
  width?: string
  height?: string
  radius?: string
  count?: number
  gap?: string
  className?: string
}

export function LoadingSkeleton({
  width = '100%',
  height = '1rem',
  radius = 'var(--radius-base)',
  count = 1,
  gap = '0.5rem',
  className = '',
}: LoadingSkeletonProps) {
  const lines = Array.from({ length: count })

  return (
    <div
      role="status"
      aria-label="جارٍ التحميل"
      aria-busy="true"
      style={{ display: 'flex', flexDirection: 'column', gap }}
    >
      {lines.map((_, i) => (
        <div
          key={i}
          className={['skeleton', className].filter(Boolean).join(' ')}
          style={{ width, height, borderRadius: radius }}
        />
      ))}
      <style>{`
        .skeleton {
          background: linear-gradient(
            90deg,
            var(--color-neutral-bg) 25%,
            var(--color-border) 50%,
            var(--color-neutral-bg) 75%
          );
          background-size: 200% 100%;
          animation: skeleton-shimmer 1.5s ease-in-out infinite;
        }
        .spinner-container {
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
      `}</style>
    </div>
  )
}

/* =============================================================================
   PageLoader — centered full-page spinner
   ============================================================================= */

export function PageLoader({ label }: { label?: string }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '60vh',
      flexDirection: 'column',
      gap: 'var(--space-4)',
    }}>
      <LoadingSpinner size="lg" label={label} />
      {label && (
        <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)', margin: 0 }}>
          {label}
        </p>
      )}
    </div>
  )
}
