/**
 * KOSHK SKATE ERP — Custom Error Classes
 * Phase 01 — Foundation
 *
 * All application errors extend AppError so the global error handler
 * can distinguish operational errors from unexpected bugs.
 *
 * Usage:
 *   throw new NotFoundError('الزلاجة غير موجودة')
 *   throw new ForbiddenError('لا تملك صلاحية إجراء هذه العملية')
 */

// ---------------------------------------------------------------------------
// Base error — all application errors extend this
// ---------------------------------------------------------------------------

export class AppError extends Error {
  public readonly statusCode: number
  public readonly code: string
  public readonly isOperational: boolean

  constructor(message: string, statusCode: number, code: string) {
    super(message)
    this.name = this.constructor.name
    this.statusCode = statusCode
    this.code = code
    this.isOperational = true // distinguishes from programming errors

    // Maintains proper stack trace in V8
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor)
    }
  }
}

// ---------------------------------------------------------------------------
// HTTP 400 — Validation / Bad Input
// ---------------------------------------------------------------------------

export class ValidationError extends AppError {
  public readonly fields?: Record<string, string>

  constructor(message: string, fields?: Record<string, string>) {
    super(message, 400, 'VALIDATION_ERROR')
    this.fields = fields
  }
}

// ---------------------------------------------------------------------------
// HTTP 401 — Not authenticated
// ---------------------------------------------------------------------------

export class AuthenticationError extends AppError {
  constructor(message = 'يجب تسجيل الدخول أولاً') {
    super(message, 401, 'AUTHENTICATION_REQUIRED')
  }
}

/** Alias for AuthenticationError — used in auth module for 401 responses */
export class UnauthorizedError extends AppError {
  constructor(message = 'غير مصرح') {
    super(message, 401, 'UNAUTHORIZED')
  }
}


// ---------------------------------------------------------------------------
// HTTP 403 — Authenticated but not authorized
// ---------------------------------------------------------------------------

export class ForbiddenError extends AppError {
  constructor(message = 'لا تملك صلاحية إجراء هذه العملية') {
    super(message, 403, 'FORBIDDEN')
  }
}

// ---------------------------------------------------------------------------
// HTTP 404 — Resource not found
// ---------------------------------------------------------------------------

export class NotFoundError extends AppError {
  constructor(message = 'المورد المطلوب غير موجود') {
    super(message, 404, 'NOT_FOUND')
  }
}

// ---------------------------------------------------------------------------
// HTTP 409 — Conflict (e.g., double-rental attempt, duplicate)
// ---------------------------------------------------------------------------

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, 'CONFLICT')
  }
}

// ---------------------------------------------------------------------------
// HTTP 422 — Business rule violation
// ---------------------------------------------------------------------------

export class BusinessRuleError extends AppError {
  constructor(message: string, code = 'BUSINESS_RULE_VIOLATION') {
    super(message, 422, code)
  }
}

// ---------------------------------------------------------------------------
// HTTP 500 — Unexpected server error (not operational)
// ---------------------------------------------------------------------------

export class InternalError extends AppError {
  constructor(message = 'حدث خطأ داخلي في الخادم') {
    super(message, 500, 'INTERNAL_ERROR')
  }
}
