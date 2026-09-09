/**
 * KOSHK SKATE ERP — usePermission Hook
 * Phase 02 — Authentication & Permissions
 *
 * Returns true if the current authenticated user has the given permission key.
 * NOTE: This is for UI-only hints (show/hide). Server enforces permissions independently.
 * Rule 13: Frontend hiding is NOT the enforcement — backend is.
 */

import { useAuth } from '../contexts/AuthContext'

/**
 * @param key - Permission key, e.g. 'users.create', 'waivers.approve'
 * @returns true if the current user has this permission, false otherwise
 */
export function usePermission(key: string): boolean {
  const { hasPermission } = useAuth()
  return hasPermission(key)
}
