import {
  mysqlTable,
  varchar,
  int,
  timestamp,
  decimal,
  boolean,
  mysqlEnum,
} from 'drizzle-orm/mysql-core'
import { users } from './users'
import { rentals } from './rentals'
import { cashierShifts } from './treasury'

export const treasuryAccounts = mysqlTable('treasury_accounts', {
  id: int('id').primaryKey().autoincrement(),
  name: varchar('name', { length: 255 }).notNull(),
  nameAr: varchar('name_ar', { length: 255 }).notNull(),
  isActive: boolean('is_active').notNull().default(true),
  isCashDrawer: boolean('is_cash_drawer').notNull().default(false),
  balance: decimal('balance', { precision: 12, scale: 2 }).notNull().default('0.00'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
})

export const paymentMethods = mysqlTable('payment_methods', {
  id: int('id').primaryKey().autoincrement(),
  name: varchar('name', { length: 255 }).notNull(),
  nameAr: varchar('name_ar', { length: 255 }).notNull(),
  isActive: boolean('is_active').notNull().default(true),
  treasuryAccountId: int('treasury_account_id')
    .notNull()
    .references(() => treasuryAccounts.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
})

export const rentalPayments = mysqlTable('rental_payments', {
  id: int('id').primaryKey().autoincrement(),
  rentalId: int('rental_id')
    .notNull()
    .references(() => rentals.id),
  // Optional: link payment to a specific rental item (set at finalization)
  rentalItemId: int('rental_item_id'),
  paymentMethodId: int('payment_method_id')
    .notNull()
    .references(() => paymentMethods.id),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  paymentType: mysqlEnum('payment_type', ['rental', 'late_fee', 'damage_charge']).notNull().default('rental'),
  cashierId: int('cashier_id')
    .notNull()
    .references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const treasuryMovements = mysqlTable('treasury_movements', {
  id: int('id').primaryKey().autoincrement(),
  treasuryAccountId: int('treasury_account_id')
    .notNull()
    .references(() => treasuryAccounts.id),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  type: mysqlEnum('type', ['in', 'out']).notNull(),
  referenceType: mysqlEnum('reference_type', ['rental_payment', 'rental_refund', 'late_fee_payment', 'damage_charge_payment', 'expense', 'sale_payment', 'sale_refund', 'maintenance_payment', 'other']).notNull(),
  referenceId: int('reference_id'),
  cashierId: int('cashier_id')
    .notNull()
    .references(() => users.id),
  shiftId: int('shift_id').references(() => cashierShifts.id),
  notes: varchar('notes', { length: 1000 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})
