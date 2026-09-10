/**
 * KOSHK SKATE ERP — ConfirmDialog Component
 * Phase 03.5 — Design System
 *
 * Replaces all native confirm() usage.
 * UI-005: confirm() is permanently prohibited. Use this component instead.
 */

import { Modal } from './Modal'
import { Button } from './Button'
import { AlertTriangle } from 'lucide-react'

interface ConfirmDialogProps {
  isOpen: boolean
  onConfirm: () => void
  onCancel: () => void
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'default' | 'danger'
  loading?: boolean
}

export function ConfirmDialog({
  isOpen,
  onConfirm,
  onCancel,
  title,
  description,
  confirmLabel = 'تأكيد',
  cancelLabel = 'إلغاء',
  variant = 'danger',
  loading = false,
}: ConfirmDialogProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      size="sm"
      title={title}
      footer={
        <>
          <Button variant={variant === 'danger' ? 'danger' : 'primary'} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
          <Button variant="secondary" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </Button>
        </>
      }
    >
      <div style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'flex-start' }}>
        {variant === 'danger' && (
          <div style={{
            flexShrink: 0,
            width: 40, height: 40,
            borderRadius: 'var(--radius-base)',
            backgroundColor: 'var(--color-danger-bg)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <AlertTriangle size={20} color="var(--color-danger-500)" aria-hidden="true" />
          </div>
        )}
        <p style={{
          fontSize: 'var(--font-size-sm)',
          color: 'var(--color-text-secondary)',
          margin: 0,
          lineHeight: 'var(--line-height-relaxed)',
          flex: 1,
        }}>
          {description}
        </p>
      </div>
    </Modal>
  )
}
