/**
 * KOSHK SKATE ERP — Skates Schema
 * Phase 03 — Skates / Asset Management
 *
 * Table: skates
 *   Every skate is an individual physical asset with a unique identifier.
 *   Not interchangeable inventory — each row is one physical skate.
 *
 * Design decisions:
 *   - DEC-009: No hard delete — soft-disable via is_active
 *   - DEC-030: skate_code is optional input; auto-generated as SK-NNN if omitted
 *   - DEC-031: Status transitions enforced at service layer (rented/reserved blocked from admin)
 *   - DEC-032: qr_code and barcode auto-set to skate_code at creation; user-editable
 *   - DEC-033: type is free-text VARCHAR(50) — no hardcoded values in Phase 03
 *
 * Status enum (6 values — business spec §8):
 *   available   — ready for rental
 *   rented      — in active rental (set by Rental workflow only — Phase 05)
 *   reserved    — reserved (set by Reservation workflow only — Phase 10)
 *   maintenance — under maintenance
 *   damaged     — damaged
 *   lost        — lost
 *
 * Condition enum (3 values):
 *   good | fair | poor
 *
 * TD-002: DEC-007 (maintenance→available requires completed maintenance record)
 *   is deferred to Phase 09 (Maintenance workflow). In Phase 03, admin can set
 *   maintenance→available directly without a maintenance record check.
 */

import {
  mysqlTable,
  int,
  varchar,
  boolean,
  date,
  decimal,
  text,
  mysqlEnum,
  datetime,
} from 'drizzle-orm/mysql-core'
import { sql } from 'drizzle-orm'

// ---------------------------------------------------------------------------
// Status values — must match business spec §8 exactly
// ---------------------------------------------------------------------------

export const SKATE_STATUSES = [
  'available',
  'rented',
  'reserved',
  'maintenance',
  'damaged',
  'lost',
] as const

export type SkateStatus = typeof SKATE_STATUSES[number]

// Statuses that can ONLY be set by business workflows (NOT by admin API — DEC-031)
export const WORKFLOW_ONLY_STATUSES: SkateStatus[] = ['rented', 'reserved']

// ---------------------------------------------------------------------------
// Condition values
// ---------------------------------------------------------------------------

export const SKATE_CONDITIONS = ['good', 'fair', 'poor'] as const
export type SkateCondition = typeof SKATE_CONDITIONS[number]

// ---------------------------------------------------------------------------
// skates table
// ---------------------------------------------------------------------------

export const skates = mysqlTable('skates', {
  id:           int('id').primaryKey().autoincrement(),

  // DEC-030: optional input; auto-generated as SK-NNN if omitted. Never reused.
  skateCode:    varchar('skate_code', { length: 50 }).notNull().unique(),

  // DEC-032: auto-set to skate_code at creation; user-editable
  qrCode:       varchar('qr_code', { length: 255 }),
  barcode:      varchar('barcode', { length: 255 }),

  // Physical attributes
  size:         varchar('size', { length: 20 }).notNull(),

  // DEC-033: free-text — no hardcoded values in Phase 03; Settings-driven in future
  type:         varchar('type', { length: 50 }),

  // DEC-031: status transitions enforced at service layer
  status:       mysqlEnum('status', SKATE_STATUSES).notNull().default('available'),

  condition:    mysqlEnum('condition', SKATE_CONDITIONS).notNull().default('good'),

  purchaseDate: date('purchase_date'),
  purchaseCost: decimal('purchase_cost', { precision: 10, scale: 2 }),

  notes:        text('notes'),

  // DEC-009: soft disable — no hard delete
  isActive:     boolean('is_active').notNull().default(true),

  createdAt:    datetime('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt:    datetime('updated_at').notNull().default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
})
