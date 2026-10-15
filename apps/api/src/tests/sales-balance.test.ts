import { randomUUID } from 'node:crypto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { and, eq, inArray } from 'drizzle-orm'
import { db, pool } from '../db/connection.js'
import { users } from '../db/schema/users.js'
import { auditLogs } from '../db/schema/audit.js'
import { cashierShifts } from '../db/schema/treasury.js'
import { paymentMethods, treasuryAccounts, treasuryMovements } from '../db/schema/payments.js'
import { productCategories, products } from '../db/schema/products.js'
import { saleItems, salePayments, sales } from '../db/schema/sales.js'
import { SalesService } from '../modules/sales/sales.service.js'
import type { CreateSaleDTO } from '../modules/sales/sales.types.js'

// CR-TREASURY-AVAILABLE-2026-10-15: exercise real transactions and DECIMAL balances.
// Every fixture and cleanup operation is scoped to this test's generated IDs.
describe('Sales treasury balance integrity', () => {
  let cashierId: number | undefined
  let shiftId: number | undefined
  let categoryId: number | undefined
  let accountId: number
  let accountIds: number[]
  let methodIds: number[]
  let productIds: number[]

  beforeEach(async () => {
    cashierId = undefined
    shiftId = undefined
    categoryId = undefined
    accountIds = []
    methodIds = []
    productIds = []
    const [databaseRows] = await pool.query<any[]>('SELECT DATABASE() AS dbName')
    expect(databaseRows[0].dbName).toBe('koshk_skate_test')

    const token = randomUUID()
    const [user] = await db.insert(users).values({
      name: 'Sales balance regression', email: 'sales-balance-' + token + '@test.invalid',
      passwordHash: 'test-only', isActive: true,
    })
    cashierId = user.insertId
    const [shift] = await db.insert(cashierShifts).values({ cashierId, openingBalance: '0.00', status: 'active' })
    shiftId = shift.insertId
    const [account] = await db.insert(treasuryAccounts).values({
      name: 'Sales balance ' + token, nameAr: 'اختبار رصيد المبيعات', balance: '0.00', isActive: true,
    })
    accountId = account.insertId
    accountIds.push(accountId)
    for (let index = 0; index < 2; index++) {
      const [method] = await db.insert(paymentMethods).values({
        name: 'Sales balance method ' + token + '-' + index,
        nameAr: 'طريقة دفع اختبار', treasuryAccountId: accountId, isActive: true,
      })
      methodIds.push(method.insertId)
    }
    const [category] = await db.insert(productCategories).values({ name: 'Sales balance ' + token, nameAr: 'اختبار' })
    categoryId = category.insertId
    for (const price of ['10.20', '20.30']) {
      const [product] = await db.insert(products).values({
        name: 'Sales balance product ' + token + '-' + price, nameAr: 'منتج اختبار',
        categoryId, price, stockQuantity: 10, isActive: true,
      })
      productIds.push(product.insertId)
    }
  })

  afterEach(async () => {
    vi.restoreAllMocks()
    if (cashierId !== undefined) {
      const ownSales = await db.select({ id: sales.id }).from(sales).where(eq(sales.cashierId, cashierId))
      const saleIds = ownSales.map(sale => sale.id)
      await db.delete(treasuryMovements).where(eq(treasuryMovements.cashierId, cashierId))
      if (saleIds.length) {
        await db.delete(salePayments).where(inArray(salePayments.saleId, saleIds))
        await db.delete(saleItems).where(inArray(saleItems.saleId, saleIds))
        await db.delete(sales).where(inArray(sales.id, saleIds))
      }
      await db.delete(auditLogs).where(eq(auditLogs.userId, cashierId))
    }
    if (productIds.length) await db.delete(products).where(inArray(products.id, productIds))
    if (categoryId !== undefined) await db.delete(productCategories).where(eq(productCategories.id, categoryId))
    if (methodIds.length) await db.delete(paymentMethods).where(inArray(paymentMethods.id, methodIds))
    if (accountIds.length) await db.delete(treasuryAccounts).where(inArray(treasuryAccounts.id, accountIds))
    if (shiftId !== undefined) await db.delete(cashierShifts).where(eq(cashierShifts.id, shiftId))
    if (cashierId !== undefined) await db.delete(users).where(eq(users.id, cashierId))
  })

  function saleInput(index: number): CreateSaleDTO {
    return {
      cashierId: cashierId!, items: [{ productId: productIds[index], quantity: 1 }],
      // The service must derive the account from the method, not trust this input.
      payments: [{ paymentMethodId: methodIds[index], treasuryAccountId: 0, amount: index === 0 ? 10.20 : 20.30 }],
    }
  }

  async function assertAccountBalance(expected: string) {
    const [account] = await db.select().from(treasuryAccounts).where(eq(treasuryAccounts.id, accountId))
    const [totals] = await pool.execute<any[]>(
      "SELECT CAST(COALESCE(SUM(CASE WHEN type = 'in' THEN amount ELSE -amount END), 0) AS DECIMAL(12,2)) AS balance FROM treasury_movements WHERE treasury_account_id = ?",
      [accountId],
    )
    expect(totals[0].balance).toBe(expected)
    expect(account.balance).toBe(expected)
  }

  async function movements() {
    return db.select().from(treasuryMovements).where(eq(treasuryMovements.cashierId, cashierId!))
  }

  async function audits() {
    return db.select().from(auditLogs).where(eq(auditLogs.userId, cashierId!))
  }

  // Both transactions read the same REPEATABLE READ snapshot before either writes.
  // Commit the first writer before releasing the second: deterministic stale-read
  // reproduction without sleeps, lock-order deadlocks or a mocked database engine.
  async function overlapSnapshots<T>(first: () => Promise<T>, second: () => Promise<T>): Promise<T[]> {
    const originalTransaction = db.transaction.bind(db)
    let entered = 0
    let readCount = 0
    let releaseSnapshots!: () => void
    let releaseFirstCommit!: () => void
    const snapshotsReady = new Promise<void>(resolve => { releaseSnapshots = resolve })
    const firstCommitted = new Promise<void>(resolve => { releaseFirstCommit = resolve })
    const safetyTimeout = setTimeout(() => { releaseSnapshots(); releaseFirstCommit() }, 5000)
    const spy = vi.spyOn(db, 'transaction').mockImplementation(async (callback: any, config?: any) => {
      const order = entered++
      try {
        return await originalTransaction(async tx => {
          await tx.select({ balance: treasuryAccounts.balance }).from(treasuryAccounts).where(eq(treasuryAccounts.id, accountId))
          if (++readCount === 2) releaseSnapshots()
          await snapshotsReady
          if (order === 1) await firstCommitted
          return callback(tx)
        }, { ...config, isolationLevel: 'repeatable read' })
      } finally {
        if (order === 0) releaseFirstCommit()
      }
    })
    try {
      const results = await Promise.allSettled([first(), second()])
      expect(readCount).toBe(2)
      return results.map(result => {
        if (result.status === 'rejected') throw result.reason
        return result.value
      })
    } finally {
      clearTimeout(safetyTimeout)
      spy.mockRestore()
    }
  }

  function failAfterFinancialWrites() {
    const originalTransaction = db.transaction.bind(db)
    const error = new Error('Injected failure after financial transaction writes')
    vi.spyOn(db, 'transaction').mockImplementation(async (callback: any, config?: any) =>
      originalTransaction(async tx => {
        await callback(tx)
        // Simulates a transaction failure after account/movement/audit writes.
        // It does not alter the application's existing audit-failure policy.
        throw error
      }, config),
    )
    return error
  }

  it('preserves both concurrent sale collections into a shared account with source and audit records', async () => {
    const created = await overlapSnapshots(
      () => SalesService.createSale(saleInput(0)),
      () => SalesService.createSale(saleInput(1)),
    )
    await assertAccountBalance('30.50')
    const posted = await movements()
    expect(posted).toHaveLength(2)
    expect(posted.map(movement => movement.amount).sort()).toEqual(['10.20', '20.30'])
    for (const sale of created) {
      expect(posted).toEqual(expect.arrayContaining([expect.objectContaining({
        referenceId: sale.id, referenceType: 'sale_payment', type: 'in', treasuryAccountId: accountId, shiftId,
      })]))
      expect(sale.payments![0].treasuryAccountId).toBe(accountId)
      expect(await audits()).toEqual(expect.arrayContaining([expect.objectContaining({
        action: 'CREATE_SALE', entityType: 'SALE', entityId: String(sale.id),
      })]))
    }
  })

  it('preserves both concurrent refunds without discarding the original collections', async () => {
    const first = await SalesService.createSale(saleInput(0))
    const second = await SalesService.createSale(saleInput(1))
    await overlapSnapshots(
      () => SalesService.cancelSale(first.id, cashierId!),
      () => SalesService.cancelSale(second.id, cashierId!),
    )
    await assertAccountBalance('0.00')
    const posted = await movements()
    expect(posted).toHaveLength(4)
    expect(posted.filter(row => row.referenceType === 'sale_payment')).toHaveLength(2)
    for (const sale of [first, second]) {
      expect(posted).toEqual(expect.arrayContaining([expect.objectContaining({
        referenceId: sale.id, referenceType: 'sale_refund', type: 'out', treasuryAccountId: accountId, shiftId,
      })]))
      expect((await SalesService.getSale(sale.id))!.status).toBe('cancelled')
      expect(await audits()).toEqual(expect.arrayContaining([
        expect.objectContaining({ action: 'CANCEL_SALE', entityId: String(sale.id) }),
        expect.objectContaining({ action: 'REFUND_SALE', entityId: String(sale.id) }),
      ]))
    }
    const restoredProducts = await db.select().from(products).where(inArray(products.id, productIds))
    expect(restoredProducts.map(product => product.stockQuantity)).toEqual([10, 10])
    await expect(SalesService.cancelSale(first.id, cashierId!)).rejects.toMatchObject({ code: 'ALREADY_CANCELLED' })
    expect(await movements()).toHaveLength(4)
    await assertAccountBalance('0.00')
  })

  it('adds split components sharing one account and refunds their original account after a method remap', async () => {
    const input = saleInput(0)
    input.payments = [
      { paymentMethodId: methodIds[0], treasuryAccountId: 0, amount: 2.10 },
      { paymentMethodId: methodIds[1], treasuryAccountId: 0, amount: 3.20 },
      { paymentMethodId: methodIds[0], treasuryAccountId: 0, amount: 4.90 },
    ]
    const sale = await SalesService.createSale(input)
    await assertAccountBalance('10.20')
    expect(sale.payments).toHaveLength(3)
    const [replacement] = await db.insert(treasuryAccounts).values({
      name: 'Replacement ' + randomUUID(), nameAr: 'حساب بديل للاختبار', balance: '0.00',
    })
    accountIds.push(replacement.insertId)
    await db.update(paymentMethods).set({ treasuryAccountId: replacement.insertId }).where(inArray(paymentMethods.id, methodIds))
    await SalesService.cancelSale(sale.id, cashierId!)
    await assertAccountBalance('0.00')
    const posted = await movements()
    expect(posted).toHaveLength(6)
    expect(posted.every(movement => movement.treasuryAccountId === accountId)).toBe(true)
    const [untouched] = await db.select().from(treasuryAccounts).where(eq(treasuryAccounts.id, replacement.insertId))
    expect(untouched.balance).toBe('0.00')
  })

  it('rolls back collection, account balance, stock, payment and audit when the transaction fails', async () => {
    const error = failAfterFinancialWrites()
    await expect(SalesService.createSale(saleInput(0))).rejects.toThrow(error)
    await assertAccountBalance('0.00')
    expect(await movements()).toHaveLength(0)
    expect(await audits()).toHaveLength(0)
    expect(await db.select().from(sales).where(eq(sales.cashierId, cashierId!))).toHaveLength(0)
    expect(await db.select().from(salePayments).where(eq(salePayments.treasuryAccountId, accountId))).toHaveLength(0)
    expect(await db.select().from(saleItems).where(eq(saleItems.productId, productIds[0]))).toHaveLength(0)
    const [product] = await db.select().from(products).where(eq(products.id, productIds[0]))
    expect(product.stockQuantity).toBe(10)
  })

  it('rolls back a failed refund while retaining the completed sale and original collection', async () => {
    const sale = await SalesService.createSale(saleInput(0))
    const error = failAfterFinancialWrites()
    await expect(SalesService.cancelSale(sale.id, cashierId!)).rejects.toThrow(error)
    await assertAccountBalance('10.20')
    expect(await movements()).toEqual([expect.objectContaining({ referenceType: 'sale_payment', referenceId: sale.id, amount: '10.20' })])
    expect(await audits()).toEqual([expect.objectContaining({ action: 'CREATE_SALE', entityId: String(sale.id) })])
    expect((await SalesService.getSale(sale.id))!.status).toBe('completed')
    expect(await db.select().from(salePayments).where(and(eq(salePayments.saleId, sale.id), eq(salePayments.treasuryAccountId, accountId)))).toHaveLength(1)
    const [product] = await db.select().from(products).where(eq(products.id, productIds[0]))
    expect(product.stockQuantity).toBe(9)
  })
})
