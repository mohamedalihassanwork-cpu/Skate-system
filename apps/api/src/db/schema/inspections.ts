import {
  mysqlTable,
  varchar,
  int,
  timestamp,
  decimal,
  text,
  boolean,
  mysqlEnum,
} from 'drizzle-orm/mysql-core'
import { users } from './users'
import { rentals } from './rentals'
import { skates } from './skates'

export const lateFeeRecords = mysqlTable('late_fee_records', {
  id: int('id').primaryKey().autoincrement(),
  rentalId: int('rental_id')
    .notNull()
    .references(() => rentals.id),
  // Per-item late fee tracking (multi-skate redesign)
  rentalItemId: int('rental_item_id'),
  lateMinutes: int('late_minutes').notNull(),
  calculatedFee: decimal('calculated_fee', { precision: 10, scale: 2 }).notNull(),
  collectedFee: decimal('collected_fee', { precision: 10, scale: 2 }).notNull().default('0.00'),
  waivedFee: decimal('waived_fee', { precision: 10, scale: 2 }).notNull().default('0.00'),
  waivedBy: int('waived_by').references(() => users.id),
  waiverReason: text('waiver_reason'),
  waivedAt: timestamp('waived_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const inspections = mysqlTable('inspections', {
  id: int('id').primaryKey().autoincrement(),
  rentalId: int('rental_id').references(() => rentals.id),
  // Link to the specific rental item being inspected (new multi-skate model)
  rentalItemId: int('rental_item_id'),
  skateId: int('skate_id')
    .notNull()
    .references(() => skates.id),
  inspectedBy: int('inspected_by')
    .notNull()
    .references(() => users.id),
  wheelsCondition: mysqlEnum('wheels_condition', ['good', 'minor_damage', 'damaged', 'broken']).notNull().default('good'),
  brakeCondition: mysqlEnum('brake_condition', ['good', 'minor_damage', 'damaged', 'broken']).notNull().default('good'),
  strapCondition: mysqlEnum('strap_condition', ['good', 'minor_damage', 'damaged', 'broken']).notNull().default('good'),
  bearingsCondition: mysqlEnum('bearings_condition', ['good', 'minor_damage', 'damaged', 'broken']).notNull().default('good'),
  bodyCondition: mysqlEnum('body_condition', ['good', 'minor_damage', 'damaged', 'broken']).notNull().default('good'),
  otherNotes: text('other_notes'),
  maintenanceRequired: boolean('maintenance_required').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})
