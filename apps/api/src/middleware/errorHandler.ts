/**
 * KOSHK SKATE ERP — Global Error Handler Middleware
 * Phase 01 — Foundation
 *
 * This middleware is registered LAST in the Express app.
 * It catches all errors thrown anywhere in the request pipeline and
 * returns a structured JSON response.
 *
 * Response format:
 * {
 *   "success": false,
 *   "error": {
 *     "code": "NOT_FOUND",
 *     "message": "الزلاجة غير موجودة",
 *     "fields": { ... }  // only for ValidationError
 *   }
 * }
 */

import type { Request, Response, NextFunction } from 'express'
import { AppError, ValidationError } from '../utils/errors.js'
import env from '../config/env.js'

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // -------------------------------------------------------------------------
  // Operational errors (AppError subclasses) — expected, user-friendly
  // -------------------------------------------------------------------------
  if (err instanceof AppError) {
    const body: Record<string, unknown> = {
      success: false,
      error: {
        code: err.code,
        message: err.message,
      },
    }

    // Include field-level validation details
    if (err instanceof ValidationError && err.fields) {
      ;(body.error as Record<string, unknown>).fields = err.fields
    }

    res.status(err.statusCode).json(body)
    return
  }

  // -------------------------------------------------------------------------
  // Unknown / programming errors — log and return generic message
  // -------------------------------------------------------------------------
  console.error('[UNHANDLED ERROR]', err)

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'حدث خطأ داخلي في الخادم',
      // Only include stack trace in development
      ...(env.isDevelopment ? { stack: err.stack } : {}),
    },
  })
}
