/**
 * KOSHK SKATE ERP — Rate Limiter Middleware
 * Phase 02 — Authentication & Permissions
 *
 * DEC-027: Login endpoint limited to 10 attempts per minute per IP.
 * In-memory store is appropriate for single-server Hostinger deployment.
 * If architecture moves to multi-server, replace with Redis store.
 */

import rateLimit from 'express-rate-limit'

/**
 * loginLimiter — apply only to POST /api/v1/auth/login
 * 10 requests per minute per IP.
 */
export const loginLimiter = rateLimit({
  windowMs: 60 * 1000,     // 1 minute
  max: 10,                  // max 10 attempts per window
  standardHeaders: true,    // include RateLimit-* headers in response
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'محاولات تسجيل دخول كثيرة. حاول مرة أخرى بعد دقيقة.',
    },
  },
  skip: (req) => {
    // Allow unlimited in test environment
    return process.env.NODE_ENV === 'test'
  },
})
