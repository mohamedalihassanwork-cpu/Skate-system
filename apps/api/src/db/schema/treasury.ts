import {
  mysqlTable,
  varchar,
  int,
  timestamp,
  decimal,
  mysqlEnum,
  uniqueIndex,
  type AnyMySqlColumn,
} from 'drizzle-orm/mysql-core'
import { treasuryAccounts } from './payments'
import { treasuryAssignments } from './subtreasury'
import { sql } from 'drizzle-orm'
import { users } from './users'

export const cashierShifts = mysqlTable('cashier_shifts', {
  id: int('id').primaryKey().autoincrement(),
  cashierId: int('cashier_id').notNull().references(() => users.id),
  openedAt: timestamp('opened_at').notNull().defaultNow(),
  closedAt: timestamp('closed_at'),
  treasuryAccountId: int('treasury_account_id').references(():AnyMySqlColumn => treasuryAccounts.id),
  assignmentId: int('assignment_id').references(():AnyMySqlColumn => treasuryAssignments.id),
  businessDate: varchar('business_date', { length: 10 }),
  openingLedgerBalance: decimal('opening_ledger_balance', { precision: 12, scale: 2 }),
  expectedLedgerBalance: decimal('expected_ledger_balance', { precision: 12, scale: 2 }),
  closedBy: int('closed_by').references(() => users.id),
  declaredAmount: decimal('declared_amount', { precision: 12, scale: 2 }),
  activeCashierId: int('active_cashier_id').generatedAlwaysAs(sql`CASE WHEN status = 'active' AND treasury_account_id IS NOT NULL THEN cashier_id ELSE NULL END`, { mode: 'stored' }),
  openingBalance: decimal('opening_balance', { precision: 12, scale: 2 }).notNull(),
  expectedBalance: decimal('expected_balance', { precision: 12, scale: 2 }), // updated at closing
  actualBalance: decimal('actual_balance', { precision: 12, scale: 2 }),
  difference: decimal('difference', { precision: 12, scale: 2 }),
  status: mysqlEnum('status', ['active', 'closed']).notNull().default('active'),
  notes: varchar('notes', { length: 1000 }),
}, t => ({ active: uniqueIndex('cashier_shift_managed_active_unique').on(t.activeCashierId) }))

export const expenses = mysqlTable('expenses', {
  id: int('id').primaryKey().autoincrement(),
  categoryId: int('category_id'), // optional category lookup if needed later
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  description: varchar('description', { length: 500 }).notNull(),
  cashierId: int('cashier_id').notNull().references(() => users.id),
  shiftId: int('shift_id').notNull().references(() => cashierShifts.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})
