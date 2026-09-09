/**
 * KOSHK SKATE ERP — Permission Gate Component
 * Phase 02 — Authentication & Permissions
 *
 * Renders children only if the current user has the required permission.
 * Used for UI-level conditional rendering (show/hide buttons, menu items, etc.)
 *
 * IMPORTANT: This is NOT a security enforcement mechanism.
 * Rule 13: Backend must enforce all permissions independently.
 */

import { usePermission } from '../hooks/usePermission'
import type { ReactNode } from 'react'

interface PermissionGateProps {
  permission: string
  children: ReactNode
  /** Optional fallback rendered when permission is missing */
  fallback?: ReactNode
}

/**
 * PermissionGate — renders children only when the user has the required permission key.
 *
 * @example
 * <PermissionGate permission="users.create">
 *   <button>إضافة مستخدم</button>
 * </PermissionGate>
 */
export function PermissionGate({ permission, children, fallback = null }: PermissionGateProps) {
  const hasPermission = usePermission(permission)
  return hasPermission ? <>{children}</> : <>{fallback}</>
}
