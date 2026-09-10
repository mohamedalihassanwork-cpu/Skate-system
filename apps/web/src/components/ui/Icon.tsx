/**
 * KOSHK SKATE ERP — Icon Component
 * Phase 03.5 — Design System
 *
 * Wrapper over Lucide React icons.
 * Enforces size standards and RTL flip support.
 * DEC-036: Lucide React is the sole approved icon library.
 */

import type { LucideIcon } from 'lucide-react'

interface IconProps {
  icon: LucideIcon
  size?: number
  className?: string
  /** Flip horizontally for RTL-directional icons (arrows, chevrons) */
  rtlFlip?: boolean
  'aria-label'?: string
  'aria-hidden'?: boolean | 'true' | 'false'
}

export function Icon({
  icon: LucideIconComponent,
  size = 16,
  className = '',
  rtlFlip = false,
  'aria-label': ariaLabel,
  'aria-hidden': ariaHidden = true,
}: IconProps) {
  return (
    <LucideIconComponent
      size={size}
      className={className}
      aria-label={ariaLabel}
      aria-hidden={ariaHidden}
      style={rtlFlip ? { transform: 'scaleX(-1)' } : undefined}
    />
  )
}
