/**
 * KOSHK SKATE ERP — Rental Items Schema
 * Phase 06 Redesign — Multi-Skate Rentals
 *
 * Table: rental_items
 *   Each row represents the independent rental lifecycle of one Skate
 *   within a Rental. A Rental (commercial transaction) contains 1..N
 *   Rental Items (per-skate operational + billing units).
 *
 * Design decisions (owner-approved prompt §4–§11):
 *   - A Rental is the commercial container.
 *   - A Rental Item is the billing unit — billed by ACTUAL duration.
 *   - returned_at is captured IMMEDIATELY on return initiation (§11).
 *   - actual_duration_minutes is computed at return from timestamps.
 *   - actual_amount is computed from actual_duration_minutes × price_per_hour / 60.
 *   - price_per_hour is a snapshot at Rental Item creation (DEC-065 preserved).
 *   - expected_end_at is the operational target — NOT the billing duration.
 *   - Extensions update expected_end_at; audit trail in rental_item_extensions.
 *   - Payment is deferred to Rental finalization (last item returned).
 *   - Server time is authoritative for all business timestamps (§12, §13).
 */

import {
  mysqlTable,
  int,
  decimal,
  datetime,
  mysqlEnum,
  index,
} from 'drizzle-orm/mysql-core'
import { sql } from 'drizzle-orm'
import { rentals } from './rentals'
import { skates } from './skates'

// ---------------------------------------------------------------------------
// Rental Item status values (persisted lifecycle)
// ---------------------------------------------------------------------------

export const RENTAL_ITEM_STATUSES = [
  'active',
  'returned',
  'cancelled',
] as const

export type RentalItemStatus = typeof RENTAL_ITEM_STATUSES[number]

// ---------------------------------------------------------------------------
// rental_items table
// ---------------------------------------------------------------------------

export const rentalItems = mysqlTable('rental_items', {
  id: int('id').primaryKey().autoincrement(),

  // FK to the parent Rental (commercial transaction container)
  rentalId: int('rental_id').notNull().references(() => rentals.id),

  // FK to the physical skate being rented in this item
  skateId: int('skate_id').notNull().references(() => skates.id),

  // Server-generated start time — same for all items in a Rental
  // Set by startRental() — NOT user-supplied (§12, §13)
  startedAt: datetime('started_at').notNull(),

  // Expected duration in minutes — operational target, NOT billing duration
  // Must be > 0 (DEC-069 preserved)
  expectedDurationMinutes: int('expected_duration_minutes').notNull(),

  // Computed: startedAt + expectedDurationMinutes — stored for query efficiency
  // Updated by extension operations
  expectedEndAt: datetime('expected_end_at').notNull(),

  // Server-captured return timestamp — frozen IMMEDIATELY on return initiation (§11)
  // NULL while item is active
  returnedAt: datetime('returned_at'),

  // Actual billable duration in minutes — computed at return from timestamps
  // actualDurationMinutes = CEIL(DATEDIFF seconds(returnedAt, startedAt) / 60)
  // NULL until returned
  actualDurationMinutes: int('actual_duration_minutes'),

  // Actual amount due for this item — computed at return from actualDurationMinutes
  // actualAmount = ROUND(pricePerHour × actualDurationMinutes / 60) — whole EGP
  // NULL until returned
  actualAmount: decimal('actual_amount', { precision: 10, scale: 2 }),

  // Historical snapshot of hourly rate at Rental Item creation (DEC-065 preserved)
  // Immutable after creation
  pricePerHour: decimal('price_per_hour', { precision: 10, scale: 2 }).notNull(),

  // FK to inspection record created at return (nullable until returned)
  // References inspections(id) — added as raw FK in migration to avoid circular import
  inspectionId: int('inspection_id'),

  // Rental Item lifecycle status
  status: mysqlEnum('status', RENTAL_ITEM_STATUSES).notNull().default('active'),

  createdAt: datetime('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: datetime('updated_at').notNull().default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
}, (table) => ({
  rentalIdIdx:    index('rental_items_rental_id_idx').on(table.rentalId),
  skateIdIdx:     index('rental_items_skate_id_idx').on(table.skateId),
  statusIdx:      index('rental_items_status_idx').on(table.status),
  expectedEndIdx: index('rental_items_expected_end_at_idx').on(table.expectedEndAt),
}))
