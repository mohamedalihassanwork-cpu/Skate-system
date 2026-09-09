/**
 * KOSHK SKATE ERP — JWT Authentication Middleware
 * Phase 02 — Authentication & Permissions
 *
 * Usage:
 *   router.get('/protected', authenticate, handler)
 *
 * What it does:
 *   1. Extracts the Bearer token from the Authorization header
 *   2. Verifies the JWT signature using JWT_SECRET
 *   3. Attaches `req.user` (TokenPayload) for downstream handlers
 *   4. Returns 401 if token is missing, invalid, or expired
 *
 * Rule 13: Permissions are enforced server-side. Frontend hiding is cosmetic only.
 */

import type { Request, Response, NextFunction } from 'express'
import { verifyAccessToken } from '../modules/auth/auth.service.js'
import type { TokenPayload } from '../modules/auth/auth.types.js'

// Augment Express Request to include the authenticated user payload
declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload
    }
  }
}

/**
 * authenticate — middleware that validates the JWT access token.
 * Attaches `req.user` on success; sends 401 on failure.
 */
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization']

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'مطلوب تسجيل الدخول للوصول إلى هذا المورد',
      },
    })
    return
  }

  const token = authHeader.slice(7) // strip "Bearer "

  try {
    const payload = verifyAccessToken(token)
    req.user = payload
    next()
  } catch {
    res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'رمز الوصول غير صالح أو منتهي الصلاحية',
      },
    })
  }
}
