/**
 * KOSHK SKATE ERP — Refresh Tokens Schema
 * Phase 02 — Authentication & Permissions
 *
 * Table: refresh_tokens
 *
 * Design decisions:
 *   - DEC-024: Refresh tokens are single-use with rotation.
 *     On each refresh, the old token is deleted and a new one is issued.
 *   - DEC-025: Stored as HttpOnly cookie on client AND tracked here server-side.
 *   - Revocation: delete the row. Used for forced logout (e.g., shift close).
 *   - Expiry column allows background cleanup of expired tokens.
 */

import { mysqlTable, int, varchar, datetime } from 'drizzle-orm/mysql-core'
import { sql } from 'drizzle-orm'
import { users } from './users'

// ---------------------------------------------------------------------------
// refresh_tokens
// ---------------------------------------------------------------------------
export const refreshTokens = mysqlTable('refresh_tokens', {
  id: int('id').primaryKey().autoincrement(),
  userId: int('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  /** Hashed token value stored in DB — raw value is sent only to client via cookie */
  tokenHash: varchar('token_hash', { length: 255 }).notNull().unique(),
  expiresAt: datetime('expires_at').notNull(),
  createdAt: datetime('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
})
