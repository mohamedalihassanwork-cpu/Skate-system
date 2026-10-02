/**
 * Gate 4.2 Batch 2 — Regression Tests
 *
 * F-010: Reservation cancellation TOCTOU / concurrency safety
 * F-012: Sale code uniqueness / concurrency guarantee
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { db } from '../db/connection'
import { reservations } from '../db/schema/reservations'
import { auditLogs } from '../db/schema/audit'
import { customers } from '../db/schema/customers'
import { skates } from '../db/schema/skates'
import { users } from '../db/schema/users'
import { sales, saleItems, salePayments } from '../db/schema/sales'
import { products, productCategories } from '../db/schema/products'
import { paymentMethods, treasuryAccounts, treasuryMovements } from '../db/schema/payments'
import { cashierShifts } from '../db/schema/treasury'
import {
  cancelReservation,
  createReservation,
} from '../modules/reservations/reservations.service'
import { SalesService } from '../modules/sales/sales.service'
import { eq, and, count, inArray, sql } from 'drizzle-orm'
import { BusinessRuleError, NotFoundError } from '../utils/errors'

// ---------------------------------------------------------------------------
// Shared test fixtures
// ---------------------------------------------------------------------------
let userId: number
let customerId: number
let skateId: number
let shiftId: number
let paymentMethodId: number
let treasuryAccountId: number
let categoryId: number

const createdReservationIds: number[] = []
const createdSaleIds: number[] = []
const createdProductIds: number[] = []

const TS = Date.now()

beforeAll(async () => {
  const [u] = await db.insert(users).values({
    name: `Batch2-User-${TS}`,
    email: `batch2.${TS}@koshk.com`,
    passwordHash: 'dummy',
    isActive: true,
  })
  userId = u.insertId

  const [c] = await db.insert(customers).values({
    name: `Batch2-Customer-${TS}`,
    phone: `01099${TS.toString().slice(-6)}`,
    isActive: true,
    registrationDate: new Date(),
  })
  customerId = c.insertId

  const [s] = await db.insert(skates).values({
    skateCode: `B2-${TS}`,
    qrCode: `B2-${TS}`,
    barcode: `B2-${TS}`,
    size: '42',
    type: 'Inline',
    status: 'available',
    condition: 'good',
    isActive: true,
  })
  skateId = s.insertId

  const [ta] = await db.insert(treasuryAccounts).values({
    name: `B2-Cash-${TS}`,
    nameAr: `B2-Cash-${TS}`,
    balance: '10000',
  })
  treasuryAccountId = ta.insertId

  const [pm] = await db.insert(paymentMethods).values({
    name: `B2-Cash-${TS}`,
    nameAr: `B2-Cash-${TS}`,
    treasuryAccountId,
    isActive: true,
  })
  paymentMethodId = pm.insertId

  const [sh] = await db.insert(cashierShifts).values({
    cashierId: userId,
    openingBalance: '0',
    status: 'active',
  })
  shiftId = sh.insertId

  const [cat] = await db.insert(productCategories).values({
    name: `B2-Cat-${TS}`,
    nameAr: `B2-Cat-${TS}`,
  })
  categoryId = cat.insertId
})

afterAll(async () => {
  if (createdSaleIds.length) {
    await db.delete(treasuryMovements)
      .where(and(
        inArray(treasuryMovements.referenceId, createdSaleIds),
        eq(treasuryMovements.referenceType, 'sale_payment')
      )).catch(() => {})
    await db.delete(salePayments).where(inArray(salePayments.saleId, createdSaleIds)).catch(() => {})
    await db.delete(saleItems).where(inArray(saleItems.saleId, createdSaleIds)).catch(() => {})
    await db.delete(sales).where(inArray(sales.id, createdSaleIds)).catch(() => {})
  }
  if (createdProductIds.length) {
    await db.delete(products).where(inArray(products.id, createdProductIds)).catch(() => {})
  }
  if (createdReservationIds.length) {
    await db.delete(reservations).where(inArray(reservations.id, createdReservationIds)).catch(() => {})
  }
  await db.delete(auditLogs).where(eq(auditLogs.userId, userId)).catch(() => {})
  await db.delete(cashierShifts).where(eq(cashierShifts.id, shiftId)).catch(() => {})
  await db.delete(paymentMethods).where(eq(paymentMethods.id, paymentMethodId)).catch(() => {})
  await db.delete(treasuryAccounts).where(eq(treasuryAccounts.id, treasuryAccountId)).catch(() => {})
  await db.delete(productCategories).where(eq(productCategories.id, categoryId)).catch(() => {})
  await db.delete(customers).where(eq(customers.id, customerId)).catch(() => {})
  await db.delete(skates).where(eq(skates.id, skateId)).catch(() => {})
  await db.delete(users).where(eq(users.id, userId)).catch(() => {})
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function makeConfirmedReservation(offsetDays = 1): Promise<number> {
  const from = new Date()
  from.setDate(from.getDate() + offsetDays)
  const until = new Date()
  until.setDate(until.getDate() + offsetDays + 1)

  const res = await createReservation(userId, {
    customerId,
    skateId,
    reservedFrom: from.toISOString(),
    reservedUntil: until.toISOString(),
  })
  createdReservationIds.push(res.id)
  return res.id
}

async function makeProduct(stock: number): Promise<number> {
  const [p] = await db.insert(products).values({
    name: `Prod-B2-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    nameAr: `منتج-${Date.now()}`,
    categoryId,
    price: '50.00',
    stockQuantity: stock,
    isActive: true,
  })
  createdProductIds.push(p.insertId)
  return p.insertId
}

function makeSalePayload(productId: number) {
  return {
    cashierId: userId,
    items: [{ productId, quantity: 1 }],
    payments: [{ paymentMethodId, amount: 50, treasuryAccountId }],
  }
}

// ===========================================================================
// F-010 — Reservation Cancellation Concurrency Safety
// ===========================================================================

describe('Gate 4.2 Batch 2 — F-010: Reservation cancellation TOCTOU', () => {

  it('TC-F010-01: confirmed reservation can be cancelled', async () => {
    const resId = await makeConfirmedReservation(10)

    const result = await cancelReservation(resId, userId)

    expect(result.status).toBe('cancelled')
    const [row] = await db.select({ status: reservations.status })
      .from(reservations).where(eq(reservations.id, resId))
    expect(row.status).toBe('cancelled')
  })

  it('TC-F010-02: already-cancelled reservation throws RESERVATION_NOT_ACTIVE', async () => {
    const resId = await makeConfirmedReservation(20)
    const [allRes] = await db.execute(sql`SELECT id, status FROM reservations WHERE id = ${resId}`)
    console.log('TC-F010-02 Debug - Reservation just created:', allRes)
    await cancelReservation(resId, userId)

    await expect(cancelReservation(resId, userId))
      .rejects
      .toSatisfy((e: any) =>
        e instanceof BusinessRuleError && e.code === 'RESERVATION_NOT_ACTIVE'
      )
  })

  it('TC-F010-03: fulfilled reservation throws RESERVATION_NOT_ACTIVE', async () => {
    const from = new Date()
    from.setDate(from.getDate() + 30)
    const until = new Date()
    until.setDate(until.getDate() + 31)
    const [r] = await db.insert(reservations).values({
      customerId,
      skateId,
      reservedFrom: from,
      reservedUntil: until,
      status: 'fulfilled',
      createdBy: userId,
    })
    createdReservationIds.push(r.insertId)

    await expect(cancelReservation(r.insertId, userId))
      .rejects
      .toSatisfy((e: any) =>
        e instanceof BusinessRuleError && e.code === 'RESERVATION_NOT_ACTIVE'
      )
  })

  it('TC-F010-04: non-existent reservation throws NotFoundError', async () => {
    await expect(cancelReservation(999999999, userId))
      .rejects
      .toBeInstanceOf(NotFoundError)
  })

  it('TC-F010-05: concurrent cancellation — exactly ONE succeeds, rest throw RESERVATION_NOT_ACTIVE', async () => {
    const resId = await makeConfirmedReservation(40)

    const CONCURRENT = 5
    const results = await Promise.allSettled(
      Array.from({ length: CONCURRENT }, () => cancelReservation(resId, userId))
    )

    const succeeded = results.filter(r => r.status === 'fulfilled')
    const rejected = results.filter(r => r.status === 'rejected')

    expect(succeeded).toHaveLength(1)
    expect(rejected).toHaveLength(CONCURRENT - 1)

    for (const r of rejected) {
      const err = (r as PromiseRejectedResult).reason
      expect(err).toBeInstanceOf(BusinessRuleError)
      expect(err.code).toBe('RESERVATION_NOT_ACTIVE')
    }

    const [row] = await db.select({ status: reservations.status })
      .from(reservations).where(eq(reservations.id, resId))
    expect(row.status).toBe('cancelled')
  })

  it('TC-F010-06: concurrent cancellation leaves exactly ONE audit log entry — no duplicates', async () => {
    const resId = await makeConfirmedReservation(50)

    const CONCURRENT = 5
    await Promise.allSettled(
      Array.from({ length: CONCURRENT }, () => cancelReservation(resId, userId))
    )

    const logs = await db.select().from(auditLogs).where(
      and(
        eq(auditLogs.action, 'CANCEL_RESERVATION'),
        eq(auditLogs.entityId, String(resId))
      )
    )
    expect(logs).toHaveLength(1)
  })
})

// ===========================================================================
// F-012 — Sale Code Uniqueness / Concurrency Guarantee
// ===========================================================================

describe('Gate 4.2 Batch 2 — F-012: Sale code uniqueness guarantee', () => {

  it('TC-F012-01: normal sale generates saleCode in SAL-{timestamp}{random} format', async () => {
    const productId = await makeProduct(10)

    const sale = await SalesService.createSale(makeSalePayload(productId))
    createdSaleIds.push(sale.id)

    // SAL- + 13-digit timestamp + 5-digit random = 22 chars total
    expect(sale.saleCode).toMatch(/^SAL-\d{18}$/)
    expect(sale.id).toBeGreaterThan(0)
  })

  it('TC-F012-02: 5 concurrent sales all produce distinct persisted saleCodes', async () => {
    // Use separate products per sale to avoid stock-deduction serialization
    const productIds = await Promise.all([
      makeProduct(5),
      makeProduct(5),
      makeProduct(5),
      makeProduct(5),
      makeProduct(5),
    ])

    const CONCURRENT = 5
    const results = await Promise.allSettled(
      productIds.map(pid => SalesService.createSale(makeSalePayload(pid)))
    )

    const succeeded = results.filter(r => r.status === 'fulfilled')
    expect(succeeded).toHaveLength(CONCURRENT)

    const saleIds = succeeded.map(r => (r as PromiseFulfilledResult<any>).value.id)
    const saleCodes = succeeded.map(r => (r as PromiseFulfilledResult<any>).value.saleCode)
    createdSaleIds.push(...saleIds)

    // All saleCodes are distinct in application layer
    const uniqueAppCodes = new Set(saleCodes)
    expect(uniqueAppCodes.size).toBe(CONCURRENT)

    // All saleCodes are distinct at DB level
    const dbRows = await db.select({ id: sales.id, saleCode: sales.saleCode })
      .from(sales)
      .where(inArray(sales.id, saleIds))
    expect(dbRows).toHaveLength(CONCURRENT)
    const dbCodes = new Set(dbRows.map(r => r.saleCode))
    expect(dbCodes.size).toBe(CONCURRENT)
  })

  it('TC-F012-03: failed sale (empty cart) leaves no partial state in sales / treasury_movements', async () => {
    // Scope counts to this test's cashierId to avoid false positives from
    // treasury movements committed by other test files between the two SELECTs.
    const [countBefore] = await db.select({ n: count() }).from(sales)
      .where(eq(sales.cashierId, userId))
    const [tmBefore] = await db.select({ n: count() }).from(treasuryMovements)
      .where(and(
        eq(treasuryMovements.cashierId, userId),
        eq(treasuryMovements.referenceType, 'sale_payment')
      ))

    await expect(
      SalesService.createSale({
        cashierId: userId,
        items: [],
        payments: [{ paymentMethodId, amount: 50, treasuryAccountId }],
      })
    ).rejects.toSatisfy((e: any) =>
      e instanceof BusinessRuleError && e.code === 'CART_EMPTY'
    )

    const [countAfter] = await db.select({ n: count() }).from(sales)
      .where(eq(sales.cashierId, userId))
    const [tmAfter] = await db.select({ n: count() }).from(treasuryMovements)
      .where(and(
        eq(treasuryMovements.cashierId, userId),
        eq(treasuryMovements.referenceType, 'sale_payment')
      ))

    expect(Number(countAfter.n)).toBe(Number(countBefore.n))
    expect(Number(tmAfter.n)).toBe(Number(tmBefore.n))
  })
})
