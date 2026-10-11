/**
 * KOSHK SKATE ERP — Rental Item Extensions Schema
 * Phase 06 Redesign — Multi-Skate Rentals
 *
 * Table: rental_item_extensions
 *   Immutable audit trail of every extension applied to a Rental Item.
 *   Extensions change the operational expected_end_at but do NOT finalize billing.
 *   Final billing always uses actual_duration_minutes at return time.
 *
 * Design decisions (§14 — Rental Extension):
 *   - Extensions are per Rental Item (one skate can be extended independently).
 *   - History is never overwritten — each extension creates a new row.
 *   - new_expected_end_at is the authoritative end after extension.
 *   - Server computes and persists new_expected_end_at (§26 — browser never calculates).
 */

import {
  mysqlTable,
  int,
  datetime,
  index,
} from 'drizzle-orm/mysql-core'
import { sql } from 'drizzle-orm'
import { rentalItems } from './rental_items'
import { users } from './users'

export const rentalItemExtensions = mysqlTable('rental_item_extensions', {
  id: int('id').primaryKey().autoincrement(),

  // FK to the Rental Item being extended
  rentalItemId: int('rental_item_id').notNull().references(() => rentalItems.id),

  // Minutes added in this extension operation (must be > 0)
  extendedByMinutes: int('extended_by_minutes').notNull(),

  // The expected_end_at value BEFORE this extension (for audit)
  previousExpectedEndAt: datetime('previous_expected_end_at').notNull(),

  // The new expected_end_at AFTER this extension (authoritative)
  newExpectedEndAt: datetime('new_expected_end_at').notNull(),

  // User (cashier) who performed the extension
  createdBy: int('created_by').notNull().references(() => users.id),

  createdAt: datetime('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  rentalItemIdIdx: index('extensions_rental_item_id_idx').on(table.rentalItemId),
}))
