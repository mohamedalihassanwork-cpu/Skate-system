/**
 * KOSHK SKATE ERP — Rentals Schema
 * Phase 06 Redesign — Multi-Skate Rentals
 *
 * Table: rentals
 *   The Rental is the COMMERCIAL TRANSACTION CONTAINER.
 *   It holds customer, cashier, and financial summary for the full transaction.
 *   Per-skate operational/billing data lives in rental_items.
 *
 * Design decisions (owner-approved redesign):
 *   - DEC-062: rental_code format: RN-NNNNN, sequential, UNIQUE, never reused
 *   - DEC-063: shift_id is nullable — FK to cashier_shifts
 *   - DEC-064: Persisted statuses: 'active', 'completed', 'cancelled'
 *              'returned' retired — replaced by 'completed' (all items returned + paid)
 *              Computed display states (normal/ending_soon/overdue) still NEVER stored
 *   - invoice_number: set ONLY when Rental is finalized (last item returned)
 *   - total_amount: sum of all rental_items.actual_amount, set at finalization
 *   - completed_at: server timestamp when final payment collected
 *
 * Historical immutability (DEC-003, DEC-065) preserved at rental_items level.
 *
 * MIGRATION NOTE: skate_id, duration_minutes, price_per_hour, rental_amount,
 *   expected_end_at, returned_at remain as nullable columns for migration safety.
 *   They will be populated from the historical data migration and kept for reference.
 *   New rentals do NOT use these columns — data lives in rental_items.
 */

import {
  mysqlTable,
  int,
  varchar,
  decimal,
  text,
  datetime,
  mysqlEnum,
  index,
} from 'drizzle-orm/mysql-core'
import { sql } from 'drizzle-orm'
import { skates } from './skates'
import { customers } from './customers'
import { users } from './users'
import { cashierShifts } from './treasury'
import { reservations } from './reservations'

// ---------------------------------------------------------------------------
// Rental status values (persisted lifecycle)
// ---------------------------------------------------------------------------

export const RENTAL_STATUSES = [
  'active',
  'completed',  // all items returned + final payment collected
  'cancelled',
  // 'returned' kept for migration compatibility — treated same as 'completed' in queries
  'returned',
] as const

export type RentalStatus = typeof RENTAL_STATUSES[number]

// ---------------------------------------------------------------------------
// Computed operational display states — DEC-064, DEC-066
// These are NEVER persisted. Server computes them per rental_item.
// ---------------------------------------------------------------------------

export const RENTAL_OPERATIONAL_STATUSES = [
  'normal',      // remaining_time > ending_soon threshold
  'ending_soon', // remaining_time <= threshold AND > 0
  'overdue',     // NOW() strictly greater than expected_end_at
] as const

export type RentalOperationalStatus = typeof RENTAL_OPERATIONAL_STATUSES[number]

// Ending Soon threshold in minutes — DEC-066
export const ENDING_SOON_THRESHOLD_MINUTES = 5

// ---------------------------------------------------------------------------
// rentals table
// ---------------------------------------------------------------------------

export const rentals = mysqlTable('rentals', {
  id: int('id').primaryKey().autoincrement(),

  // DEC-062 / DEC-070: Format RN-NNNNN, derived from insertId (PK), UNIQUE, never reused
  rentalCode: varchar('rental_code', { length: 50 }).notNull().unique(),

  // Invoice number — set ONLY at finalization (last item returned + payment collected)
  // NULL while Rental is active. Generated from sequences table.
  invoiceNumber: varchar('invoice_number', { length: 50 }).unique(),

  // One reservation may be executed once; walk-ins and historical rentals remain NULL.
  reservationId: int('reservation_id').unique().references(() => reservations.id),

  // LEGACY: skate_id kept nullable for historical data migration
  // New rentals: skate data lives in rental_items
  skateId: int('skate_id').references(() => skates.id),

  // FK to customers — customer must be active at rental creation
  customerId: int('customer_id').notNull().references(() => customers.id),

  // FK to users — the cashier who created the rental
  cashierId: int('cashier_id').notNull().references(() => users.id),

  // FK to cashier_shifts — nullable
  shiftId: int('shift_id').references(() => cashierShifts.id),

  // LEGACY columns kept nullable for historical data migration:
  durationMinutes: int('duration_minutes'),
  pricePerHour: decimal('price_per_hour', { precision: 10, scale: 2 }),
  rentalAmount: decimal('rental_amount', { precision: 10, scale: 2 }),
  expectedEndAt: datetime('expected_end_at'),
  returnedAt: datetime('returned_at'),

  // Server-generated start time — set at rental creation
  startedAt: datetime('started_at').notNull(),

  // Final total — SUM of all rental_items.actual_amount. NULL until finalized.
  totalAmount: decimal('total_amount', { precision: 10, scale: 2 }),

  // Timestamp when rental was finalized (payment collected)
  completedAt: datetime('completed_at'),

  // Persisted lifecycle status
  status: mysqlEnum('status', RENTAL_STATUSES).notNull().default('active'),

  notes: text('notes'),

  createdAt: datetime('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: datetime('updated_at').notNull().default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
}, (table) => ({
  legacySkateIdIdx: index('rentals_skate_id_idx').on(table.skateId),
  legacyExpectedEndIdx: index('rentals_expected_end_at_idx').on(table.expectedEndAt),
  customerIdIdx: index('rentals_customer_id_idx').on(table.customerId),
  cashierIdIdx:  index('rentals_cashier_id_idx').on(table.cashierId),
  statusIdx:     index('rentals_status_idx').on(table.status),
  startedAtIdx:  index('rentals_started_at_idx').on(table.startedAt),
}))
