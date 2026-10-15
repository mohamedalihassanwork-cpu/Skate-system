/**
 * KOSHK SKATE ERP — Payments Service
 * Phase 06 — Payments & Treasury
 */

import { eq, sql } from 'drizzle-orm'
import { db } from '../../db/connection'
import { paymentMethods, treasuryAccounts } from '../../db/schema/payments'
import type { PaymentMethodDTO, TreasuryAccountDTO, TreasurySummaryDTO } from './payments.types'

export async function listActivePaymentMethods(): Promise<PaymentMethodDTO[]> {
  const rows = await db
    .select()
    .from(paymentMethods)
    .where(eq(paymentMethods.isActive, true))

  return rows.map(r => ({
    id: r.id,
    name: r.name,
    nameAr: r.nameAr,
    isActive: r.isActive,
    treasuryAccountId: r.treasuryAccountId,
  }))
}

export async function listTreasuryAccounts(): Promise<TreasuryAccountDTO[]> {
  const rows = await db
    .select()
    .from(treasuryAccounts)

  return rows.map(r => ({
    id: r.id,
    name: r.name,
    nameAr: r.nameAr,
    isActive: r.isActive,
    balance: parseFloat(String(r.balance)),
  }))
}

function toPiastres(value: string): bigint {
  const match = /^(-?)(\d+)(?:\.(\d{1,2}))?$/.exec(value)
  if (!match) throw new Error('Invalid treasury decimal')
  const amount = BigInt(match[2]) * 100n + BigInt((match[3] ?? '').padEnd(2, '0'))
  return match[1] ? -amount : amount
}

function fromPiastres(value: bigint): string {
  const absolute = value < 0n ? -value : value
  return `${value < 0n ? '-' : ''}${absolute / 100n}.${String(absolute % 100n).padStart(2, '0')}`
}

export async function getTreasurySummary(): Promise<TreasurySummaryDTO> {
  // One InnoDB consistent read: accounts, cached balances and committed ledger
  // totals cannot come from different snapshots. No source-status or method join:
  // cancelled sources retain both collection and refund; shared methods count once.
  const [result] = await db.execute(sql`
    SELECT a.id, a.name, a.name_ar AS nameAr,
           a.is_active AS isActive, a.is_cash_drawer AS isCashDrawer,
           CAST(a.balance AS CHAR) AS storedBalance,
           CAST(COALESCE(m.net_amount, 0.00) AS CHAR) AS balance,
           COALESCE(m.movement_count, 0) AS movementCount
    FROM treasury_accounts a
    LEFT JOIN (
      SELECT treasury_account_id,
             SUM(CASE WHEN type = 'in' THEN amount ELSE -amount END) AS net_amount,
             COUNT(*) AS movement_count
      FROM treasury_movements
      GROUP BY treasury_account_id
    ) m ON m.treasury_account_id = a.id
    ORDER BY a.id
  `)
  const rows = result as unknown as Array<{
    id: number; name: string; nameAr: string; isActive: number; isCashDrawer: number
    storedBalance: string; balance: string; movementCount: number
  }>
  let cash = 0n
  let nonCash = 0n
  const accounts = rows.map(row => {
    const balance = toPiastres(row.balance)
    const stored = toPiastres(row.storedBalance)
    if (row.isCashDrawer) cash += balance
    else nonCash += balance
    return {
      id: row.id, name: row.name, nameAr: row.nameAr,
      isActive: Boolean(row.isActive), isCashDrawer: Boolean(row.isCashDrawer),
      balance: fromPiastres(balance), storedBalance: fromPiastres(stored),
      difference: fromPiastres(stored - balance), movementCount: Number(row.movementCount),
    }
  })
  return {
    asOf: new Date().toISOString(),
    currency: 'EGP',
    totalBalance: fromPiastres(cash + nonCash),
    cashBalance: fromPiastres(cash),
    nonCashBalance: fromPiastres(nonCash),
    hasDiscrepancies: accounts.some(account => account.difference !== '0.00'),
    accounts,
  }
}
