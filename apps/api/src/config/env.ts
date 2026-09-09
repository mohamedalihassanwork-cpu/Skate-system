/**
 * KOSHK SKATE ERP — Environment Configuration
 * Phase 01 — Foundation
 *
 * All environment variables must be accessed via this module.
 * Never read process.env directly outside of this file.
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
export const env = {
  /** Application */
  NODE_ENV: optionalEnv('NODE_ENV', 'development'),
  PORT: parseInt(optionalEnv('PORT', '3001'), 10),

  /** Database (MySQL/MariaDB — DEC-015) */
  DB_HOST:     optionalEnv('DB_HOST', 'localhost'),
  DB_PORT:     parseInt(optionalEnv('DB_PORT', '3306'), 10),
  DB_NAME:     optionalEnv('DB_NAME', 'koshk_skate'),
  DB_USER:     optionalEnv('DB_USER', 'root'),
  DB_PASSWORD: optionalEnv('DB_PASSWORD', ''),

  /** Authentication — PENDING (Phase 02, UNK-004) */
  JWT_SECRET: optionalEnv('JWT_SECRET', 'CHANGE_ME_IN_PRODUCTION'),

  /** CORS */
  CORS_ORIGIN: optionalEnv('CORS_ORIGIN', 'http://localhost:5173'),

  get isProduction() {
    return this.NODE_ENV === 'production'
  },

  get isDevelopment() {
    return this.NODE_ENV === 'development'
  },
} as const

export default env
