/**
 * KOSHK SKATE ERP — Permission Enforcement Middleware
 * Phase 02 — Authentication & Permissions
 *
 * Usage:
 *   router.post('/users', authenticate, requirePermission('users.create'), handler)
 *
 * What it does:
 *   1. Assumes `authenticate` middleware has already run (req.user is set)
 *   2. Loads the user's permissions from the DB via the auth service
 *   3. Checks if the required permission key is in the user's permission set
 *   4. Returns 403 if not allowed
 *
 * Rule 13: Permissions MUST be enforced server-side. Frontend hiding is NOT enforcement.
 * DEC-016: Roles are data-driven. Permission checks use the key string.
 */

import type { Request, Response, NextFunction } from 'express'
import { loadUserWithPermissions } from '../modules/auth/auth.service.js'

/**
 * requirePermission — middleware factory.
 *
 * @param permissionKey - e.g. 'users.create', 'waivers.approve', 'rentals.view'
 *
 * Must be used AFTER `authenticate` middleware.
 */
export function requirePermission(permissionKey: string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'مطلوب تسجيل الدخول' },
      })
      return
    }

    try {
      const authUser = await loadUserWithPermissions(req.user.sub)

      if (!authUser.isActive) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'الحساب معطّل' },
        })
        return
      }

      if (!authUser.permissions.includes(permissionKey)) {
        res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'ليس لديك صلاحية للقيام بهذا الإجراء',
          },
        })
        return
      }

      // Attach the full auth user for downstream handlers (avoids re-fetching)
      ;(req as Request & { authUser: typeof authUser }).authUser = authUser
      next()
    } catch {
      res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'تعذر التحقق من الصلاحيات' },
      })
    }
  }
}
