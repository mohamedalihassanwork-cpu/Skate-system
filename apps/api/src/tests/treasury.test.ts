/**
 * Treasury — recorded available balance (CR-TREASURY-AVAILABLE-2026-10-15).
 * Integration tests use only koshk_skate_test and dedicated source fixtures.
 * Run serially: existing suites share the test database.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import request from 'supertest'
import jwt from 'jsonwebtoken'
import { and, eq, inArray, sql } from 'drizzle-orm'
import app from '../app.js'
import env from '../config/env.js'
import { db } from '../db/connection.js'
import { users, roles, permissions, userRoles, rolePermissions } from '../db/schema/users.js'
import { treasuryAccounts, treasuryMovements, paymentMethods, rentalPayments } from '../db/schema/payments.js'
import { cashierShifts, expenses } from '../db/schema/treasury.js'
import { sales, saleItems, salePayments } from '../db/schema/sales.js'
import { products, productCategories } from '../db/schema/products.js'
import { customers } from '../db/schema/customers.js'
import { skates } from '../db/schema/skates.js'
import { rentals } from '../db/schema/rentals.js'
import { rentalItems } from '../db/schema/rental_items.js'
import { inspections, lateFeeRecords } from '../db/schema/inspections.js'
import { maintenanceRecords } from '../db/schema/maintenance.js'
import { auditLogs } from '../db/schema/audit.js'
import { SalesService } from '../modules/sales/sales.service.js'
import { startRental, returnRentalItem, finalizeRental } from '../modules/rentals/rentals.service.js'
import { maintenanceService } from '../modules/maintenance/maintenance.service.js'
import { recordExpense } from '../modules/expenses/expenses.service.js'

type AccountSummary = {
  id: number; name: string; nameAr: string; isActive: boolean; isCashDrawer: boolean
  balance: string; storedBalance: string; difference: string; movementCount: number
}
type Summary = {
  asOf: string; currency: 'EGP'; totalBalance: string; cashBalance: string
  nonCashBalance: string; hasDiscrepancies: boolean; accounts: AccountSummary[]
}

const endpoint = '/api/v1/payments/treasury-summary'
const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
const accountIds: number[] = [], methodIds: number[] = [], userIds: number[] = []
const productIds: number[] = [], rentalIds: number[] = [], skateIds: number[] = []
const customerIds: number[] = [], maintenanceIds: number[] = [], saleIds: number[] = []
const recordedExpenses: { id: number; accountId: number; amount: string }[] = []
let actorId: number, viewerId: number, roleId: number, shiftId: number, categoryId: number
let viewerToken: string, actorToken: string

// Integer cents keep assertions independent of binary floating-point arithmetic.
function cents(value: string): bigint {
  expect(value).toMatch(/^-?\d+\.\d{2}$/)
  return BigInt(value.replace('.', ''))
}
function account(summary: Summary, id: number): AccountSummary {
  const row = summary.accounts.find(entry => entry.id === id)
  expect(row, `Treasury account ${id} is included`).toBeDefined()
  return row!
}
async function summary(): Promise<Summary> {
  const res = await request(app).get(endpoint).set('Authorization', `Bearer ${viewerToken}`)
  expect(res.status, JSON.stringify(res.body)).toBe(200)
  expect(res.body.success).toBe(true)
  return res.body.data as Summary
}
function expectDelta(before: Summary, after: Summary, amount: bigint) {
  expect(cents(after.totalBalance) - cents(before.totalBalance)).toBe(amount)
}
async function makeUser(label: string) {
  const email = `treasury-${label}-${stamp}@example.test`
  const [created] = await db.insert(users).values({ name: label, email, passwordHash: 'isolated-test-user', isActive: true })
  userIds.push(created.insertId)
  return { id: created.insertId, token: jwt.sign({ sub: created.insertId, email }, env.JWT_SECRET, { expiresIn: '10m' }) }
}
async function makeAccount(options: { balance?: string; cash?: boolean; active?: boolean } = {}) {
  const [created] = await db.insert(treasuryAccounts).values({
    name: `Treasury-${stamp}-${accountIds.length}`, nameAr: 'حساب اختبار الخزينة',
    balance: options.balance ?? '0.00', isCashDrawer: options.cash ?? false, isActive: options.active ?? true,
  })
  accountIds.push(created.insertId)
  return created.insertId
}
async function makeMethod(accountId: number, active = true) {
  const [created] = await db.insert(paymentMethods).values({
    name: `Treasury-method-${stamp}-${methodIds.length}`, nameAr: 'وسيلة اختبار',
    treasuryAccountId: accountId, isActive: active,
  })
  methodIds.push(created.insertId)
  return created.insertId
}
async function addMovement(accountId: number, type: 'in' | 'out', amount: string,
  referenceType: typeof treasuryMovements.$inferInsert.referenceType = 'other') {
  await db.insert(treasuryMovements).values({ treasuryAccountId: accountId, type, amount,
    referenceType, referenceId: actorId, cashierId: actorId, shiftId, notes: 'Isolated Treasury summary fixture' })
}
async function makeProduct(price = '10.00') {
  const [created] = await db.insert(products).values({ name: `Treasury-product-${stamp}-${productIds.length}`,
    nameAr: 'منتج اختبار', categoryId, price, stockQuantity: 10, isActive: true })
  productIds.push(created.insertId)
  return created.insertId
}
async function makeSkate() {
  const [created] = await db.insert(skates).values({ skateCode: `TR-${stamp}-${skateIds.length}`,
    size: '42', status: 'available', isActive: true })
  skateIds.push(created.insertId)
  return created.insertId
}
async function makeMaintenance(cost: string, status: 'in_progress' | 'completed' = 'completed') {
  const skateId = await makeSkate()
  const [created] = await db.insert(maintenanceRecords).values({ skateId, createdBy: actorId,
    problemDescription: 'Treasury test repair', totalCost: cost, status, paymentStatus: 'unpaid',
    createdAt: new Date(), updatedAt: new Date() })
  maintenanceIds.push(created.insertId)
  return created.insertId
}

beforeAll(async () => {
  // Defense in depth: never exercise financial writes against development/demo data.
  expect(env.NODE_ENV).toBe('test')
  expect(env.DB_NAME).toBe('koshk_skate_test')
  const [permission] = await db.select().from(permissions).where(eq(permissions.key, 'treasury.view'))
  if (!permission) throw new Error('Seeded treasury.view permission is required in the test database')
  const [role] = await db.insert(roles).values({ name: `Treasury-view-${stamp}`, nameAr: 'عرض الخزينة للاختبار' })
  roleId = role.insertId
  await db.insert(rolePermissions).values({ roleId, permissionId: permission.id })
  const viewer = await makeUser('viewer')
  viewerId = viewer.id; viewerToken = viewer.token
  await db.insert(userRoles).values({ roleId, userId: viewerId })
  const actor = await makeUser('actor')
  actorId = actor.id; actorToken = actor.token
  const [shift] = await db.insert(cashierShifts).values({ cashierId: actorId, openingBalance: '125.00', status: 'active' })
  shiftId = shift.insertId
  const [category] = await db.insert(productCategories).values({ name: `Treasury-${stamp}`, nameAr: 'اختبارات الخزينة' })
  categoryId = category.insertId
})

afterAll(async () => {
  // Restore only the recorded expense's effect on the pre-existing cash drawer.
  // No stored balance reset or global table cleanup is permitted here.
  for (const expense of recordedExpenses) {
    await db.transaction(async tx => {
      await tx.delete(treasuryMovements).where(and(eq(treasuryMovements.referenceType, 'expense'),
        eq(treasuryMovements.referenceId, expense.id), eq(treasuryMovements.cashierId, actorId)))
      await tx.delete(expenses).where(eq(expenses.id, expense.id))
      await tx.execute(sql`UPDATE treasury_accounts SET balance = balance + ${expense.amount} WHERE id = ${expense.accountId}`)
    })
  }
  if (actorId) await db.delete(treasuryMovements).where(eq(treasuryMovements.cashierId, actorId))
  if (rentalIds.length) {
    await db.delete(rentalPayments).where(inArray(rentalPayments.rentalId, rentalIds))
    await db.delete(lateFeeRecords).where(inArray(lateFeeRecords.rentalId, rentalIds))
    await db.update(rentalItems).set({ inspectionId: null }).where(inArray(rentalItems.rentalId, rentalIds))
    await db.delete(inspections).where(inArray(inspections.rentalId, rentalIds))
    await db.delete(rentalItems).where(inArray(rentalItems.rentalId, rentalIds))
    await db.delete(rentals).where(inArray(rentals.id, rentalIds))
  }
  if (saleIds.length) {
    await db.delete(salePayments).where(inArray(salePayments.saleId, saleIds))
    await db.delete(saleItems).where(inArray(saleItems.saleId, saleIds))
    await db.delete(sales).where(inArray(sales.id, saleIds))
  }
  if (maintenanceIds.length) await db.delete(maintenanceRecords).where(inArray(maintenanceRecords.id, maintenanceIds))
  if (methodIds.length) await db.delete(paymentMethods).where(inArray(paymentMethods.id, methodIds))
  if (accountIds.length) await db.delete(treasuryAccounts).where(inArray(treasuryAccounts.id, accountIds))
  if (productIds.length) await db.delete(products).where(inArray(products.id, productIds))
  if (categoryId) await db.delete(productCategories).where(eq(productCategories.id, categoryId))
  if (skateIds.length) await db.delete(skates).where(inArray(skates.id, skateIds))
  if (customerIds.length) await db.delete(customers).where(inArray(customers.id, customerIds))
  if (shiftId) await db.delete(cashierShifts).where(eq(cashierShifts.id, shiftId))
  if (userIds.length) {
    await db.delete(auditLogs).where(inArray(auditLogs.userId, userIds))
    await db.delete(userRoles).where(inArray(userRoles.userId, userIds))
    await db.delete(users).where(inArray(users.id, userIds))
  }
  if (roleId) {
    await db.delete(rolePermissions).where(eq(rolePermissions.roleId, roleId))
    await db.delete(roles).where(eq(roles.id, roleId))
  }
})

describe('Treasury summary authorization and read contract', () => {
  it('rejects an unauthenticated request with 401', async () => {
    const res = await request(app).get(endpoint)
    expect(res.status).toBe(401)
  })

  it('rejects an authenticated user lacking treasury.view with 403', async () => {
    const res = await request(app).get(endpoint).set('Authorization', `Bearer ${actorToken}`)
    expect(res.status).toBe(403)
  })

  it('allows a view-only user without an active shift and returns coherent decimal totals', async () => {
    const shifts = await db.select().from(cashierShifts).where(eq(cashierShifts.cashierId, viewerId))
    expect(shifts).toHaveLength(0)
    const result = await summary()
    expect(result.currency).toBe('EGP')
    expect(new Date(result.asOf).toISOString()).toBe(result.asOf)
    expect(Math.abs(Date.now() - new Date(result.asOf).getTime())).toBeLessThan(60_000)
    expect(cents(result.totalBalance)).toBe(result.accounts.reduce((sum, row) => sum + cents(row.balance), 0n))
    expect(cents(result.cashBalance)).toBe(result.accounts.filter(row => row.isCashDrawer).reduce((sum, row) => sum + cents(row.balance), 0n))
    expect(cents(result.nonCashBalance)).toBe(result.accounts.filter(row => !row.isCashDrawer).reduce((sum, row) => sum + cents(row.balance), 0n))
    expect(cents(result.cashBalance) + cents(result.nonCashBalance)).toBe(cents(result.totalBalance))
    expect(result.hasDiscrepancies).toBe(result.accounts.some(row => cents(row.difference) !== 0n))
    for (const row of result.accounts) {
      expect(cents(row.difference)).toBe(cents(row.storedBalance) - cents(row.balance))
      expect(Number.isInteger(row.movementCount)).toBe(true)
      expect(row.movementCount).toBeGreaterThanOrEqual(0)
    }
    // treasury.view does not silently grant the separate payment-method permission.
    const methods = await request(app).get('/api/v1/payments/methods').set('Authorization', `Bearer ${viewerToken}`)
    expect(methods.status).toBe(403)
  })
})

describe('Treasury signed movement aggregation', () => {
  it('includes accounts with no movements as zero without treating stored balances as collected funds', async () => {
    const before = await summary()
    const emptyId = await makeAccount()
    const storedOnlyId = await makeAccount({ balance: '900.25', cash: true })
    const after = await summary()
    expect(account(after, emptyId)).toMatchObject({ balance: '0.00', storedBalance: '0.00', difference: '0.00', movementCount: 0 })
    expect(account(after, storedOnlyId)).toMatchObject({ balance: '0.00', storedBalance: '900.25', difference: '900.25', movementCount: 0 })
    expect(after.hasDiscrepancies).toBe(true)
    expectDelta(before, after, 0n)
  })

  it('preserves cents, negative balances, and multiple methods mapped to one account', async () => {
    const id = await makeAccount({ balance: '4.00', cash: true })
    await makeMethod(id); await makeMethod(id); await makeMethod(id)
    const before = await summary()
    await addMovement(id, 'in', '0.10', 'rental_payment')
    await addMovement(id, 'in', '0.20', 'sale_payment')
    await addMovement(id, 'out', '0.31', 'expense')
    const after = await summary()
    expect(account(after, id)).toMatchObject({ balance: '-0.01', storedBalance: '4.00', difference: '4.01', movementCount: 3 })
    expectDelta(before, after, -1n)
    expect(cents(after.cashBalance) - cents(before.cashBalance)).toBe(-1n)
  })

  it('sums maximum-size movement amounts without truncating to a movement column or losing cents', async () => {
    const id = await makeAccount()
    const before = await summary()
    await addMovement(id, 'in', '99999999.99')
    await addMovement(id, 'in', '99999999.99')
    await addMovement(id, 'in', '0.01')
    const after = await summary()
    expect(account(after, id).balance).toBe('199999999.99')
    expectDelta(before, after, 19999999999n)
  })

  it('retains inactive-account funds and classifies non-cash using the existing drawer flag', async () => {
    const id = await makeAccount({ active: false, balance: '12.00' })
    const before = await summary()
    await addMovement(id, 'in', '12.34')
    await addMovement(id, 'out', '0.34')
    const after = await summary()
    expect(account(after, id)).toMatchObject({ isActive: false, isCashDrawer: false, balance: '12.00', difference: '0.00' })
    expectDelta(before, after, 1200n)
    expect(cents(after.nonCashBalance) - cents(before.nonCashBalance)).toBe(1200n)
  })

  it('nets an equal internal pair to zero across the whole Treasury', async () => {
    const cashId = await makeAccount({ cash: true }), nonCashId = await makeAccount()
    await addMovement(cashId, 'in', '50.00')
    const before = await summary()
    // Synthetic ledger representation only: this does not assert that a transfer API exists.
    await db.transaction(async tx => {
      await tx.insert(treasuryMovements).values([
        { treasuryAccountId: cashId, type: 'out', amount: '25.75', referenceType: 'other', referenceId: actorId, cashierId: actorId, shiftId },
        { treasuryAccountId: nonCashId, type: 'in', amount: '25.75', referenceType: 'other', referenceId: actorId, cashierId: actorId, shiftId },
      ])
    })
    const after = await summary()
    expect(account(after, cashId).balance).toBe('24.25')
    expect(account(after, nonCashId).balance).toBe('25.75')
    expectDelta(before, after, 0n)
    expect(cents(after.cashBalance) - cents(before.cashBalance)).toBe(-2575n)
    expect(cents(after.nonCashBalance) - cents(before.nonCashBalance)).toBe(2575n)
  })

  it('does not mutate stored balances, movements, or cashier shift records when read', async () => {
    const id = await makeAccount({ balance: '3.00' })
    await addMovement(id, 'in', '1.00')
    const beforeAccounts = await db.select().from(treasuryAccounts).where(eq(treasuryAccounts.id, id))
    const beforeMovements = await db.select().from(treasuryMovements).where(eq(treasuryMovements.treasuryAccountId, id))
    const beforeShifts = await db.select().from(cashierShifts).where(eq(cashierShifts.id, shiftId))
    await summary(); await summary()
    expect(await db.select().from(treasuryAccounts).where(eq(treasuryAccounts.id, id))).toEqual(beforeAccounts)
    expect(await db.select().from(treasuryMovements).where(eq(treasuryMovements.treasuryAccountId, id))).toEqual(beforeMovements)
    expect(await db.select().from(cashierShifts).where(eq(cashierShifts.id, shiftId))).toEqual(beforeShifts)
  })
})

describe('Treasury reflects committed source transactions', () => {
  it('counts split sale collections once per account and cancellation refunds reverse the total', async () => {
    const cashId = await makeAccount({ cash: true }), nonCashId = await makeAccount()
    const cashMethod1 = await makeMethod(cashId), cashMethod2 = await makeMethod(cashId), nonCashMethod = await makeMethod(nonCashId)
    const productId = await makeProduct()
    const before = await summary()
    const sale = await SalesService.createSale({ cashierId: actorId, items: [{ productId, quantity: 1 }], payments: [
      { paymentMethodId: cashMethod1, treasuryAccountId: cashId, amount: 1.10 },
      { paymentMethodId: cashMethod2, treasuryAccountId: cashId, amount: 2.20 },
      { paymentMethodId: nonCashMethod, treasuryAccountId: nonCashId, amount: 6.70 },
    ] })
    saleIds.push(sale.id)
    const collected = await summary()
    expectDelta(before, collected, 1000n)
    expect(account(collected, cashId)).toMatchObject({ balance: '3.30', storedBalance: '3.30', difference: '0.00', movementCount: 2 })
    expect(account(collected, nonCashId)).toMatchObject({ balance: '6.70', storedBalance: '6.70', difference: '0.00', movementCount: 1 })
    expect(await db.select().from(salePayments).where(eq(salePayments.saleId, sale.id))).toHaveLength(3)
    const linked = await db.select().from(treasuryMovements).where(and(eq(treasuryMovements.cashierId, actorId),
      eq(treasuryMovements.referenceType, 'sale_payment'), eq(treasuryMovements.referenceId, sale.id)))
    expect(linked).toHaveLength(3)
    expect(linked.every(row => row.shiftId === shiftId)).toBe(true)
    await SalesService.cancelSale(sale.id, actorId)
    const refunded = await summary()
    expectDelta(before, refunded, 0n)
    expect(account(refunded, cashId)).toMatchObject({ balance: '0.00', storedBalance: '0.00', difference: '0.00', movementCount: 4 })
    expect(account(refunded, nonCashId)).toMatchObject({ balance: '0.00', storedBalance: '0.00', difference: '0.00', movementCount: 2 })
    const logs = await db.select().from(auditLogs).where(and(eq(auditLogs.userId, actorId), eq(auditLogs.entityType, 'SALE'), eq(auditLogs.entityId, String(sale.id))))
    expect(logs.map(row => row.action)).toEqual(expect.arrayContaining(['CREATE_SALE', 'CANCEL_SALE', 'REFUND_SALE']))
    await expect(SalesService.cancelSale(sale.id, actorId)).rejects.toThrow()
    expectDelta(refunded, await summary(), 0n)
  })

  it('leaves stock and Treasury unchanged when a sale fails before completion', async () => {
    const id = await makeAccount(), methodId = await makeMethod(id), productId = await makeProduct()
    const before = await summary()
    await expect(SalesService.createSale({ cashierId: actorId, items: [{ productId, quantity: 1 }],
      payments: [{ paymentMethodId: methodId, treasuryAccountId: id, amount: 9 }] })).rejects.toThrow()
    const after = await summary()
    expectDelta(before, after, 0n)
    expect(account(after, id)).toMatchObject({ balance: '0.00', storedBalance: '0.00', movementCount: 0 })
    const [product] = await db.select().from(products).where(eq(products.id, productId))
    expect(product.stockQuantity).toBe(10)
  })

  it('excludes rental start and returned-but-unpaid charges, rolls back partial collection, then counts finalization once', async () => {
    const cashId = await makeAccount({ cash: true }), nonCashId = await makeAccount()
    const cashMethod = await makeMethod(cashId), inactiveMethod = await makeMethod(nonCashId, false), nonCashMethod = await makeMethod(nonCashId)
    const skateId = await makeSkate()
    const [customer] = await db.insert(customers).values({ name: `Treasury-customer-${stamp}`, phone: '01000000000', isActive: true, registrationDate: new Date() })
    customerIds.push(customer.insertId)
    const before = await summary()
    const rental = await startRental(actorId, { customerId: customer.insertId, skateIds: [skateId], durationMinutes: 60 })
    rentalIds.push(rental.id)
    expect(rental.invoiceNumber).toBeNull()
    expectDelta(before, await summary(), 0n)
    // Only this synthetic item is aged, so the real return service computes a nonzero bill.
    await db.update(rentalItems).set({ startedAt: new Date(Date.now() - 30 * 60_000), expectedEndAt: new Date(Date.now() + 30 * 60_000) }).where(eq(rentalItems.id, rental.items[0].id))
    const returned = await returnRentalItem(rental.items[0].id, actorId, { inspection: {
      wheelsCondition: 'good', brakeCondition: 'good', strapCondition: 'good', bearingsCondition: 'good',
      bodyCondition: 'good', maintenanceRequired: false,
    } })
    const due = returned.item.actualAmount!
    expect(due).toBeGreaterThan(0)
    expectDelta(before, await summary(), 0n)
    // First component is inserted before the second inactive method fails. All effects must roll back.
    await expect(finalizeRental(rental.id, actorId, { payments: [
      { paymentMethodId: cashMethod, amount: due / 2 }, { paymentMethodId: inactiveMethod, amount: due / 2 },
    ] })).rejects.toThrow()
    const failed = await summary()
    expectDelta(before, failed, 0n)
    expect(account(failed, cashId)).toMatchObject({ balance: '0.00', storedBalance: '0.00', movementCount: 0 })
    expect(await db.select().from(rentalPayments).where(eq(rentalPayments.rentalId, rental.id))).toHaveLength(0)
    const [unpaid] = await db.select().from(rentals).where(eq(rentals.id, rental.id))
    expect(unpaid.status).toBe('active'); expect(unpaid.invoiceNumber).toBeNull()
    const finalized = await finalizeRental(rental.id, actorId, { payments: [
      { paymentMethodId: cashMethod, amount: due / 2 }, { paymentMethodId: nonCashMethod, amount: due / 2 },
    ] })
    expect(finalized.status).toBe('completed'); expect(finalized.invoiceNumber).toBeTruthy()
    const after = await summary()
    expectDelta(before, after, cents(due.toFixed(2)))
    expect(account(after, cashId)).toMatchObject({ balance: (due / 2).toFixed(2), difference: '0.00' })
    expect(account(after, nonCashId)).toMatchObject({ balance: (due / 2).toFixed(2), difference: '0.00' })
    const linked = await db.select().from(treasuryMovements).where(and(eq(treasuryMovements.cashierId, actorId),
      eq(treasuryMovements.referenceType, 'rental_payment'), eq(treasuryMovements.referenceId, rental.id)))
    expect(linked).toHaveLength(2)
    expect(linked.every(row => row.shiftId === shiftId)).toBe(true)
    await expect(finalizeRental(rental.id, actorId, { payments: [{ paymentMethodId: cashMethod, amount: due }] })).rejects.toThrow()
    expectDelta(after, await summary(), 0n)
  })

  it('excludes unpaid and external maintenance while completed system payments reduce the mapped balance once', async () => {
    const id = await makeAccount(), methodId = await makeMethod(id)
    const before = await summary()
    const unpaidId = await makeMaintenance('25.50')
    const unfinishedId = await makeMaintenance('10.00', 'in_progress')
    const externalId = await makeMaintenance('15.00')
    expectDelta(before, await summary(), 0n)
    await expect(maintenanceService.payRecord(unfinishedId, actorId, methodId)).rejects.toThrow()
    await maintenanceService.payRecordExternal(externalId, actorId)
    expectDelta(before, await summary(), 0n)
    await maintenanceService.payRecord(unpaidId, actorId, methodId)
    const after = await summary()
    expectDelta(before, after, -2550n)
    expect(account(after, id)).toMatchObject({ balance: '-25.50', storedBalance: '-25.50', difference: '0.00', movementCount: 1 })
    const linked = await db.select().from(treasuryMovements).where(and(eq(treasuryMovements.referenceType, 'maintenance_payment'),
      eq(treasuryMovements.referenceId, unpaidId), eq(treasuryMovements.cashierId, actorId)))
    expect(linked).toHaveLength(1); expect(linked[0].shiftId).toBe(shiftId)
    await expect(maintenanceService.payRecord(unpaidId, actorId, methodId)).rejects.toThrow()
    expectDelta(after, await summary(), 0n)
    const zeroId = await makeMaintenance('0.00', 'in_progress')
    await maintenanceService.completeRecord(zeroId, actorId, { repairDescription: 'Free repair fixture' })
    expectDelta(after, await summary(), 0n)
  })

  it('deducts a completed expense from the existing cash drawer with source and audit links', async () => {
    const [drawerRows] = await db.execute(sql`SELECT id FROM treasury_accounts WHERE is_cash_drawer = true LIMIT 1`)
    const drawer = (drawerRows as unknown as { id: number }[])[0]
    expect(drawer).toBeDefined()
    const before = await summary()
    const beforeShift = await db.select().from(cashierShifts).where(eq(cashierShifts.id, shiftId))
    const expense = await recordExpense(actorId, { amount: 7.35, description: `Treasury expense ${stamp}` })
    recordedExpenses.push({ id: expense.id, accountId: drawer.id, amount: '7.35' })
    const after = await summary()
    expectDelta(before, after, -735n)
    expect(cents(account(after, drawer.id).balance) - cents(account(before, drawer.id).balance)).toBe(-735n)
    expect(cents(account(after, drawer.id).storedBalance) - cents(account(before, drawer.id).storedBalance)).toBe(-735n)
    const [movement] = await db.select().from(treasuryMovements).where(and(eq(treasuryMovements.referenceType, 'expense'),
      eq(treasuryMovements.referenceId, expense.id), eq(treasuryMovements.cashierId, actorId)))
    expect(movement).toMatchObject({ treasuryAccountId: drawer.id, type: 'out', amount: '7.35', shiftId })
    const logs = await db.select().from(auditLogs).where(and(eq(auditLogs.userId, actorId), eq(auditLogs.action, 'CREATE_EXPENSE'), eq(auditLogs.entityId, String(expense.id))))
    expect(logs).toHaveLength(1)
    expect(await db.select().from(cashierShifts).where(eq(cashierShifts.id, shiftId))).toEqual(beforeShift)
  })
})
