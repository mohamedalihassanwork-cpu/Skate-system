import { mysqlTable, int, varchar, decimal, timestamp, boolean, mysqlEnum, json, uniqueIndex, index, type AnyMySqlColumn, foreignKey } from 'drizzle-orm/mysql-core'
import { users } from './users'
import { treasuryAccounts } from './payments'
import { cashierShifts } from './treasury'

export const treasuryConfiguration = mysqlTable('treasury_configuration', {
  id: int('id').primaryKey(),
  enabled: boolean('enabled').notNull().default(false),
  mainAccountId: int('main_account_id').references(() => treasuryAccounts.id),
  activatedBy: int('activated_by').references(() => users.id),
  activatedAt: timestamp('activated_at'),
})
export const treasuryAssignments = mysqlTable('treasury_assignments', {
  id: int('id').autoincrement().primaryKey(),
  accountId: int('account_id').notNull().references(() => treasuryAccounts.id),
  cashierId: int('cashier_id').notNull().references(() => users.id),
  isActive: boolean('is_active').notNull().default(true),
  assignedBy: int('assigned_by').notNull().references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, t => ({ account: uniqueIndex('treasury_assignment_account_unique').on(t.accountId), cashier: uniqueIndex('treasury_assignment_cashier_unique').on(t.cashierId) }))
export const treasuryFunding = mysqlTable('treasury_funding', {
  id: int('id').autoincrement().primaryKey(),
  assignmentId: int('assignment_id').notNull().references(() => treasuryAssignments.id),
  cashierId: int('cashier_id').notNull().references(() => users.id),
  sourceAccountId: int('source_account_id').notNull().references(() => treasuryAccounts.id),
  destinationAccountId: int('destination_account_id').notNull().references(() => treasuryAccounts.id),
  amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
  reason: varchar('reason', { length: 1000 }).notNull(),
  status: mysqlEnum('status', ['pending','accepted','cancelled']).notNull().default('pending'),
  createdBy: int('created_by').notNull().references(() => users.id),
  acceptedBy: int('accepted_by').references(() => users.id),
  acceptedAt: timestamp('accepted_at'),
  cancelledBy: int('cancelled_by').references(() => users.id),
  cancelledAt: timestamp('cancelled_at'),
  cancellationReason: varchar('cancellation_reason', { length: 1000 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, t => ({ cashier: index('treasury_funding_cashier_status').on(t.cashierId,t.status) }))
export const treasuryHandovers = mysqlTable('treasury_handovers', {
  id: int('id').autoincrement().primaryKey(),
  shiftId: int('shift_id').notNull().references(() => cashierShifts.id),
  attempt: int('attempt').notNull().default(1),
  replacesId: int('replaces_id').references(():AnyMySqlColumn => treasuryHandovers.id),
  accountId: int('account_id').notNull().references(() => treasuryAccounts.id),
  cashierId: int('cashier_id').notNull().references(() => users.id),
  expectedBalance: decimal('expected_balance',{precision:12,scale:2}).notNull(),
  expectedLedgerBalance: decimal('expected_ledger_balance',{precision:12,scale:2}).notNull(),
  actualBalance: decimal('actual_balance',{precision:12,scale:2}).notNull(),
  declaredAmount: decimal('declared_amount',{precision:12,scale:2}).notNull(),
  difference: decimal('difference',{precision:12,scale:2}).notNull(),
  reason: varchar('reason',{length:1000}).notNull(),
  status: mysqlEnum('status',['pending','rejected','confirmed','zero_acknowledged']).notNull().default('pending'),
  receivedAmount: decimal('received_amount',{precision:12,scale:2}),
  reviewedBy: int('reviewed_by').references(() => users.id),
  reviewedAt: timestamp('reviewed_at'),
  reviewReason: varchar('review_reason',{length:1000}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, t => ({ attempt: uniqueIndex('treasury_handover_shift_attempt').on(t.shiftId,t.attempt), queue: index('treasury_handover_status').on(t.status,t.createdAt) }))
export const treasuryTransfers = mysqlTable('treasury_transfers', {
  id: int('id').autoincrement().primaryKey(),
  sourceAccountId: int('source_account_id').notNull().references(() => treasuryAccounts.id),
  destinationAccountId: int('destination_account_id').notNull(),
  amount: decimal('amount',{precision:12,scale:2}).notNull(),
  kind: mysqlEnum('kind',['funding','handover']).notNull(),
  handoverId: int('handover_id').references(() => treasuryHandovers.id),
  fundingId: int('funding_id').references(() => treasuryFunding.id),
  confirmedBy: int('confirmed_by').notNull().references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, t => ({ destinationFk: foreignKey({name:'treasury_transfer_destination_fk',columns:[t.destinationAccountId],foreignColumns:[treasuryAccounts.id]}), handover:uniqueIndex('treasury_transfer_handover_unique').on(t.handoverId), funding:uniqueIndex('treasury_transfer_funding_unique').on(t.fundingId) }))
export const treasurySettlements = mysqlTable('treasury_settlements', {
  id: int('id').autoincrement().primaryKey(),
  shiftId: int('shift_id').notNull().references(() => cashierShifts.id),
  handoverId: int('handover_id').notNull().references(() => treasuryHandovers.id),
  transferId: int('transfer_id').references(() => treasuryTransfers.id),
  receivedAmount: decimal('received_amount',{precision:12,scale:2}).notNull(),
  adjustmentAmount: decimal('adjustment_amount',{precision:12,scale:2}).notNull(),
  confirmedBy: int('confirmed_by').notNull().references(() => users.id),
  varianceApprovedBy: int('variance_approved_by').references(() => users.id),
  reason: varchar('reason',{length:1000}).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, t => ({ shift:uniqueIndex('treasury_settlement_shift_unique').on(t.shiftId), handover:uniqueIndex('treasury_settlement_handover_unique').on(t.handoverId) }))
export const financialOperations = mysqlTable('financial_operations', {
  id:int('id').autoincrement().primaryKey(),
  actorId:int('actor_id').notNull().references(() => users.id),
  scope:varchar('scope',{length:64}).notNull(),
  operationKey:varchar('operation_key',{length:100}).notNull(),
  requestHash:varchar('request_hash',{length:64}).notNull(),
  result:json('result'),
  createdAt:timestamp('created_at').defaultNow().notNull(),
}, t => ({ key:uniqueIndex('financial_operation_key_unique').on(t.actorId,t.scope,t.operationKey) }))
