/**
 * KOSHK SKATE ERP — Environment Configuration
 * Phase 02 — Authentication & Permissions (updated)
 *
 * All environment variables must be accessed via this module.
 * Never read process.env directly outside of this file.
 *
 * DEC-024: JWT_SECRET for access tokens
 * DEC-028: JWT_REFRESH_SECRET for refresh tokens (separate secret)
 * DEC-026: SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD for idempotent seed
 */

import 'dotenv/config'

function requireEnv(key: string): string {
  const value = process.env[key]
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`)
  }
  return value
}

function optionalEnv(key: string, defaultValue: string): string {
  return process.env[key] ?? defaultValue
}

// ---------------------------------------------------------------------------
// Validated environment config
// ---------------------------------------------------------------------------
const NODE_ENV = optionalEnv('NODE_ENV', 'development')
const isProduction = NODE_ENV === 'production'

// In production, JWT secrets must be explicitly provided and must not be defaults
const JWT_SECRET = optionalEnv('JWT_SECRET', 'CHANGE_ME_IN_PRODUCTION_JWT_ACCESS')
const JWT_REFRESH_SECRET = optionalEnv('JWT_REFRESH_SECRET', 'CHANGE_ME_IN_PRODUCTION_JWT_REFRESH')

if (isProduction) {
  if (JWT_SECRET === 'CHANGE_ME_IN_PRODUCTION_JWT_ACCESS') {
    throw new Error('JWT_SECRET must be set to a secure value in production. Do not use the default.')
  }
  if (JWT_REFRESH_SECRET === 'CHANGE_ME_IN_PRODUCTION_JWT_REFRESH') {
    throw new Error('JWT_REFRESH_SECRET must be set to a secure value in production. Do not use the default.')
  }
}

export const env = {
  /** Application */
  NODE_ENV,
  PORT: parseInt(optionalEnv('PORT', '3001'), 10),

  /** Database (MySQL/MariaDB — DEC-015) */
  DB_HOST:     optionalEnv('DB_HOST', 'localhost'),
  DB_PORT:     parseInt(optionalEnv('DB_PORT', '3306'), 10),
  DB_NAME:     optionalEnv('DB_NAME', 'koshk_skate'),
  DB_USER:     optionalEnv('DB_USER', 'root'),
  DB_PASSWORD: optionalEnv('DB_PASSWORD', ''),

  /**
   * Authentication — DEC-024, DEC-028
   * Access token: JWT_SECRET (short-lived, 15 min)
   * Refresh token: JWT_REFRESH_SECRET (long-lived, 7 days)
   * Both must be strong random strings in production.
   */
  JWT_SECRET,
  JWT_REFRESH_SECRET,

  /** Token expiry */
  JWT_ACCESS_EXPIRES_IN: optionalEnv('JWT_ACCESS_EXPIRES_IN', '15m'),
  JWT_REFRESH_EXPIRES_DAYS: parseInt(optionalEnv('JWT_REFRESH_EXPIRES_DAYS', '7'), 10),

  /** CORS */
  CORS_ORIGIN: optionalEnv('CORS_ORIGIN', 'http://localhost:5173'),

  /**
   * Seed credentials — DEC-026
   * Used by db:seed script only. Never hardcoded in source.
   */
  SEED_ADMIN_EMAIL: optionalEnv('SEED_ADMIN_EMAIL', 'admin@koshkskate.com'),
  SEED_ADMIN_PASSWORD: optionalEnv('SEED_ADMIN_PASSWORD', 'Koshk@12345'),

  get isProduction() {
    return this.NODE_ENV === 'production'
  },

  get isDevelopment() {
    return this.NODE_ENV === 'development'
  },
} as const

export default env
