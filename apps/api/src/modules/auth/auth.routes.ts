/**
 * KOSHK SKATE ERP — Auth Routes
 * Phase 02 — Authentication & Permissions
 *
 * Routes:
 *   POST /api/v1/auth/login    — issue access token + refresh token (HttpOnly cookie)
 *   POST /api/v1/auth/refresh  — rotate refresh token, issue new access token
 *   POST /api/v1/auth/logout   — delete refresh token from DB + clear cookie
 *   GET  /api/v1/auth/me       — return current user (requires access token)
 *
 * Security:
 *   - DEC-025: Refresh token sent as HttpOnly cookie with restricted path
 *   - DEC-027: Login rate-limited 10 req/min/IP
 *   - DEC-028: Separate JWT secrets
 *   - SECURITY_ARCHITECTURE: Login events audited inline
 */

import { Router, type Request, type Response, type NextFunction } from 'express'
import { loginLimiter } from '../../middleware/rateLimiter.js'
import { authenticate } from '../../middleware/auth.js'
import * as authService from './auth.service.js'

const router = Router()

// ---------------------------------------------------------------------------
// Cookie helpers
// ---------------------------------------------------------------------------

/** Name of the HttpOnly refresh token cookie (DEC-025) */
const REFRESH_COOKIE_NAME = 'koshk_refresh_token'

/** Cookie options for the refresh token */
function refreshCookieOptions(maxAgeMs: number) {
  const isProduction = process.env.NODE_ENV === 'production'
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: (isProduction ? 'strict' : 'lax') as 'strict' | 'lax',
    path: '/api/v1/auth',   // cookie only sent to auth endpoints
    maxAge: maxAgeMs,
  }
}

const REFRESH_TTL_DAYS = parseInt(process.env.JWT_REFRESH_EXPIRES_DAYS ?? '7', 10)
const REFRESH_TTL_MS = REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000

// ---------------------------------------------------------------------------
// POST /api/v1/auth/login
// ---------------------------------------------------------------------------

router.post('/login', loginLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { accessToken, rawRefreshToken, user } = await authService.login(req.body)

    res.cookie(REFRESH_COOKIE_NAME, rawRefreshToken, refreshCookieOptions(REFRESH_TTL_MS))

    res.status(200).json({
      success: true,
      data: {
        accessToken,
        user,
      },
    })
  } catch (err) {
    next(err)
  }
})

// ---------------------------------------------------------------------------
// POST /api/v1/auth/refresh
// ---------------------------------------------------------------------------

router.post('/refresh', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rawRefreshToken: string | undefined = req.cookies?.[REFRESH_COOKIE_NAME]

    if (!rawRefreshToken) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'رمز التحديث غير موجود' },
      })
      return
    }

    const { accessToken, rawRefreshToken: newRefreshToken } = await authService.refresh(rawRefreshToken)

    // Rotate cookie
    res.cookie(REFRESH_COOKIE_NAME, newRefreshToken, refreshCookieOptions(REFRESH_TTL_MS))

    res.status(200).json({
      success: true,
      data: { accessToken },
    })
  } catch (err) {
    next(err)
  }
})

// ---------------------------------------------------------------------------
// POST /api/v1/auth/logout
// ---------------------------------------------------------------------------

router.post('/logout', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rawRefreshToken: string | undefined = req.cookies?.[REFRESH_COOKIE_NAME]
    await authService.logout(rawRefreshToken)

    // Clear the cookie
    res.clearCookie(REFRESH_COOKIE_NAME, { path: '/api/v1/auth' })

    res.status(200).json({
      success: true,
      data: { message: 'تم تسجيل الخروج بنجاح' },
    })
  } catch (err) {
    next(err)
  }
})

// ---------------------------------------------------------------------------
// GET /api/v1/auth/me  — requires valid access token
// ---------------------------------------------------------------------------

router.get('/me', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await authService.loadUserWithPermissions(req.user!.sub)

    res.status(200).json({
      success: true,
      data: { user },
    })
  } catch (err) {
    next(err)
  }
})

export default router
