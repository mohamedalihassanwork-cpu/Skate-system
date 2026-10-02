/**
 * GATE 4.1 — Critical Findings Remediation Regression Tests
 *
 * F-003: Invoice sequence concurrency — concurrent invoice generation must produce
 *        unique invoice numbers. Verified via LAST_INSERT_ID() fix.
 *
 * F-004: Returned rental cancellation — cancelRental() must reject returned rentals.
 *        Only active rentals can be cancelled.
 *
 * Test rules:
 * - Uses koshk_skate_test database ONLY
 * - No mocking of business logic
 * - All fixtures are cleaned up in afterAll
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import app from '../app.js'
import { db, pool } from '../db/connection.js'
import { eq, and } from 'drizzle-orm'
import { sql } from 'drizzle-orm'
import { users } from '../db/schema/users.js'
import { skates } from '../db/schema/skates.js'
import { customers } from '../db/schema/customers.js'
import { rentals } from '../db/schema/rentals.js'
import { paymentMethods, rentalPayments } from '../db/schema/payments.js'
import { cashierShifts } from '../db/schema/treasury.js'
import { sales, saleItems, salePayments } from '../db/schema/sales.js'
import { productCategories, products } from '../db/schema/products.js'

const ADMIN_EMAIL    = process.env.SEED_ADMIN_EMAIL    ?? 'admin@koshkskate.com'
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'Koshk@12345'

describe('Gate 4.1 Remediation Regression Tests', () => {
  let adminToken: string
  let adminId: number
  let defaultPaymentMethodId: number
  let shiftId: number | null = null

  const createdSkateIds: number[] = []
  const createdCustomerIds: number[] = []
  const createdRentalIds: number[] = []

  beforeAll(async () => {
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
    if (loginRes.status !== 200) {
      throw new Error(`Admin login failed: ${JSON.stringify(loginRes.body)}`)
    }
    adminToken = loginRes.body.data.accessToken

    const admin = await db.query.users.findFirst({ where: eq(users.email, ADMIN_EMAIL) })
    adminId = admin!.id

    const existing = await db.select().from(cashierShifts)
      .where(and(eq(cashierShifts.cashierId, adminId), eq(cashierShifts.status, 'active')))
      .limit(1)
    if (existing.length === 0) {
      const [res] = await db.insert(cashierShifts).values({
        cashierId: adminId,
        openingBalance: '0',
        status: 'active'
      })
      shiftId = res.insertId
    }

    const pm = await db.query.paymentMethods.findFirst({ where: eq(paymentMethods.isActive, true) })
    if (!pm) throw new Error('No active payment method found in test database')
    defaultPaymentMethodId = pm.id
  })

  afterAll(async () => {
    for (const rId of createdRentalIds) {
      await db.delete(rentalPayments).where(eq(rentalPayments.rentalId, rId)).catch(() => {})
      await db.execute(sql`DELETE FROM treasury_movements WHERE reference_id = ${rId} AND reference_type IN ('rental_payment','rental_refund')`).catch(() => {})
      await db.delete(rentals).where(eq(rentals.id, rId)).catch(() => {})
    }
    for (const sId of createdSkateIds) {
      await db.delete(skates).where(eq(skates.id, sId)).catch(() => {})
    }
    for (const cId of createdCustomerIds) {
      await db.delete(customers).where(eq(customers.id, cId)).catch(() => {})
    }
    if (shiftId !== null) {
      await db.delete(cashierShifts).where(eq(cashierShifts.id, shiftId)).catch(() => {})
    }
  })

  async function createTestSkate(suffix: string): Promise<number> {
    const res = await request(app)
      .post('/api/v1/skates')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ skateCode: `G41-${suffix}-${Date.now()}`, type: 'inline', size: '42', status: 'available', priceMode: 'standard' })
    if (res.status !== 201) throw new Error(`Skate failed: ${JSON.stringify(res.body)}`)
    const id = res.body.data.id
    createdSkateIds.push(id)
    return id
  }

  async function createTestCustomer(suffix: string): Promise<number> {
    const ts = Date.now().toString()
    const res = await request(app)
      .post('/api/v1/customers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: `G41 Customer ${suffix}`, nationalId: `90${ts.slice(-12)}`, phone: `010${ts.slice(-8)}`, trustLevel: 'new' })
    if (res.status !== 201) throw new Error(`Customer failed: ${JSON.stringify(res.body)}`)
    const id = res.body.data.id
    createdCustomerIds.push(id)
    return id
  }

  async function createTestRental(skateId: number, customerId: number): Promise<{ id: number; invoiceNumber: string }> {
    const res = await request(app)
      .post('/api/v1/rentals')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ skateId, customerId, durationMinutes: 60, payments: [{ paymentMethodId: defaultPaymentMethodId, amount: 120 }] })
    if (res.status !== 201) throw new Error(`Rental failed: ${JSON.stringify(res.body)}`)
    const id = res.body.data.id
    createdRentalIds.push(id)
    // invoiceNumber is stored in DB but not exposed in RentalDTO API response.
    // Read it directly from the DB — this is what we need to verify for concurrency correctness.
    const [row] = await db.select({ invoiceNumber: rentals.invoiceNumber }).from(rentals).where(eq(rentals.id, id)).limit(1)
    return { id, invoiceNumber: row?.invoiceNumber ?? '' }
  }

  // ── F-004 Tests ─────────────────────────────────────────────────────────

  describe('F-004: cancelRental business-rule enforcement', () => {
    it('TC-F004-01: Active rental can be cancelled (happy path preserved)', async () => {
      const skateId = await createTestSkate('F004A')
      const custId = await createTestCustomer('F004A')
      const { id: rentalId } = await createTestRental(skateId, custId)

      const before = await db.select().from(rentals).where(eq(rentals.id, rentalId)).limit(1)
      expect(before[0].status).toBe('active')

      const cancelRes = await request(app)
        .post(`/api/v1/rentals/${rentalId}/cancel`)
        .set('Authorization', `Bearer ${adminToken}`)
      expect(cancelRes.status).toBe(200)

      const after = await db.select().from(rentals).where(eq(rentals.id, rentalId)).limit(1)
      expect(after[0].status).toBe('cancelled')

      const skateAfter = await db.select().from(skates).where(eq(skates.id, skateId)).limit(1)
      expect(skateAfter[0].status).toBe('available')
    })

    it('TC-F004-02: Returned rental cannot be cancelled — returns 422 RENTAL_NOT_CANCELLABLE', async () => {
      const skateId = await createTestSkate('F004B')
      const custId = await createTestCustomer('F004B')
      const { id: rentalId } = await createTestRental(skateId, custId)

      // Force to returned
      await db.execute(sql`UPDATE rentals SET status = 'returned', returned_at = NOW() WHERE id = ${rentalId}`)
      await db.execute(sql`UPDATE skates SET status = 'available' WHERE id = ${skateId}`)

      const returned = await db.select().from(rentals).where(eq(rentals.id, rentalId)).limit(1)
      expect(returned[0].status).toBe('returned')

      const cancelRes = await request(app)
        .post(`/api/v1/rentals/${rentalId}/cancel`)
        .set('Authorization', `Bearer ${adminToken}`)
      expect(cancelRes.status).toBe(422)
      expect(cancelRes.body.error?.code).toBe('RENTAL_NOT_CANCELLABLE')

      // Status still returned
      const afterAttempt = await db.select().from(rentals).where(eq(rentals.id, rentalId)).limit(1)
      expect(afterAttempt[0].status).toBe('returned')

      // No refund treasury movement created
      const [refundRows] = await pool.execute<any[]>(
        'SELECT id FROM treasury_movements WHERE reference_id = ? AND reference_type = ?',
        [rentalId, 'rental_refund']
      )
      expect(refundRows.length).toBe(0)
    })

    it('TC-F004-03: Already-cancelled rental cannot be cancelled again — returns 422', async () => {
      const skateId = await createTestSkate('F004C')
      const custId = await createTestCustomer('F004C')
      const { id: rentalId } = await createTestRental(skateId, custId)

      const first = await request(app)
        .post(`/api/v1/rentals/${rentalId}/cancel`)
        .set('Authorization', `Bearer ${adminToken}`)
      expect(first.status).toBe(200)

      const second = await request(app)
        .post(`/api/v1/rentals/${rentalId}/cancel`)
        .set('Authorization', `Bearer ${adminToken}`)
      expect(second.status).toBe(422)
      expect(second.body.error?.code).toBe('RENTAL_NOT_CANCELLABLE')
    })

    it('TC-F004-04: Cancelling returned rental creates NO new treasury movements', async () => {
      const skateId = await createTestSkate('F004D')
      const custId = await createTestCustomer('F004D')
      const { id: rentalId } = await createTestRental(skateId, custId)

      const [beforeRows] = await pool.execute<any[]>(
        'SELECT COUNT(*) AS cnt FROM treasury_movements WHERE reference_id = ? AND reference_type IN (?, ?)',
        [rentalId, 'rental_payment', 'rental_refund']
      )
      const before = Number(beforeRows[0].cnt)

      await db.execute(sql`UPDATE rentals SET status = 'returned', returned_at = NOW() WHERE id = ${rentalId}`)
      await db.execute(sql`UPDATE skates SET status = 'available' WHERE id = ${skateId}`)

      const cancelRes = await request(app)
        .post(`/api/v1/rentals/${rentalId}/cancel`)
        .set('Authorization', `Bearer ${adminToken}`)
      expect(cancelRes.status).toBe(422)

      const [afterRows] = await pool.execute<any[]>(
        'SELECT COUNT(*) AS cnt FROM treasury_movements WHERE reference_id = ? AND reference_type IN (?, ?)',
        [rentalId, 'rental_payment', 'rental_refund']
      )
      const after = Number(afterRows[0].cnt)
      expect(after).toBe(before)
    })
  })

  // ── F-003 Tests ─────────────────────────────────────────────────────────

  describe('F-003: Invoice sequence uniqueness under concurrency', () => {
    it('TC-F003-01: Sequential rental invoice numbers are unique and increasing', async () => {
      const skateA = await createTestSkate('F003SA')
      const skateB = await createTestSkate('F003SB')
      const custA = await createTestCustomer('F003SA')
      const custB = await createTestCustomer('F003SB')

      const { invoiceNumber: inv1 } = await createTestRental(skateA, custA)
      const { invoiceNumber: inv2 } = await createTestRental(skateB, custB)

      expect(inv1).toMatch(/^INV-\d{6}$/)
      expect(inv2).toMatch(/^INV-\d{6}$/)
      expect(inv1).not.toBe(inv2)

      const num1 = parseInt(inv1.replace('INV-', ''), 10)
      const num2 = parseInt(inv2.replace('INV-', ''), 10)
      expect(num2).toBe(num1 + 1)
    })

    it('TC-F003-02: Concurrent rental creation produces unique invoice numbers', async () => {
      const CONCURRENCY = 5
      const skateIds: number[] = []
      const customerIds: number[] = []
      for (let i = 0; i < CONCURRENCY; i++) {
        skateIds.push(await createTestSkate(`F003C${i}`))
        customerIds.push(await createTestCustomer(`F003C${i}`))
      }

      // Fire all rental creation requests concurrently
      const results = await Promise.allSettled(
        skateIds.map((skateId, i) =>
          request(app)
            .post('/api/v1/rentals')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
              skateId,
              customerId: customerIds[i],
              durationMinutes: 60,
              payments: [{ paymentMethodId: defaultPaymentMethodId, amount: 120 }]
            })
        )
      )

      const successful = results
        .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled' && r.value.status === 201)
        .map(r => r.value.body.data)

      // Track rental IDs for cleanup
      const rentalIds: number[] = []
      for (const rental of successful) {
        if (rental?.id) {
          createdRentalIds.push(rental.id)
          rentalIds.push(rental.id)
        }
      }

      // All CONCURRENCY requests must have succeeded
      expect(successful.length).toBe(CONCURRENCY)

      // Fetch invoice numbers from DB — invoiceNumber is not in the API response,
      // but is stored in the rentals table. This is what we must verify for uniqueness.
      const dbRows = await db
        .select({ id: rentals.id, invoiceNumber: rentals.invoiceNumber })
        .from(rentals)
        .where(sql`id IN (${sql.join(rentalIds.map(id => sql`${id}`), sql`, `)})`)

      expect(dbRows.length).toBe(CONCURRENCY)

      const invoiceNumbers = dbRows.map(r => r.invoiceNumber!)
      for (const inv of invoiceNumbers) {
        expect(inv).toMatch(/^INV-\d{6}$/)
      }

      // THE core assertion: all invoice numbers are unique — no duplicates
      const uniqueSet = new Set(invoiceNumbers)
      expect(uniqueSet.size).toBe(CONCURRENCY)
    })

    it('TC-F003-03: Invoice number persisted in DB has correct INV-NNNNNN format', async () => {
      const skateId = await createTestSkate('F003DB')
      const custId = await createTestCustomer('F003DB')
      const { id: rentalId, invoiceNumber: dbInvoice } = await createTestRental(skateId, custId)

      // createTestRental already reads the invoice number from DB.
      // Verify the format is correct and non-empty.
      expect(dbInvoice).toBeTruthy()
      expect(dbInvoice).toMatch(/^INV-\d{6}$/)

      // Verify it's also actually in the DB at that rental ID
      const row = await db.select({ invoiceNumber: rentals.invoiceNumber })
        .from(rentals)
        .where(eq(rentals.id, rentalId))
        .limit(1)
      expect(row[0].invoiceNumber).toBe(dbInvoice)
    })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// F-003 (GATE 4.1.1) — Sales invoice concurrency
// Required: Gate 4.1 validated rental concurrency but had no sales equivalent.
// ─────────────────────────────────────────────────────────────────────────────

describe('Gate 4.1.1 — F-003 Sales Invoice Concurrency', () => {
  const ADMIN_EMAIL    = process.env.SEED_ADMIN_EMAIL    ?? 'admin@koshkskate.com'
  const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'Koshk@12345'

  let adminToken: string
  let adminId: number
  let defaultPaymentMethodId: number
  let defaultTreasuryAccountId: number
  let testCategoryId: number | null = null
  let testProductId: number | null = null
  let createdSaleIds: number[] = []

  beforeAll(async () => {
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
    if (loginRes.status !== 200) throw new Error(`Admin login failed: ${JSON.stringify(loginRes.body)}`)
    adminToken = loginRes.body.data.accessToken

    const admin = await db.query.users.findFirst({ where: eq(users.email, ADMIN_EMAIL) })
    adminId = admin!.id

    // Ensure active cashier shift for admin
    const existing = await db.select().from(cashierShifts)
      .where(and(eq(cashierShifts.cashierId, adminId), eq(cashierShifts.status, 'active')))
      .limit(1)
    if (existing.length === 0) {
      await db.insert(cashierShifts).values({ cashierId: adminId, openingBalance: '0', status: 'active' })
    }

    // Payment method
    const pm = await db.query.paymentMethods.findFirst({ where: eq(paymentMethods.isActive, true) })
    if (!pm) throw new Error('No active payment method')
    defaultPaymentMethodId = pm.id
    defaultTreasuryAccountId = pm.treasuryAccountId

    // Create product category
    const catRes = await request(app)
      .post('/api/v1/products/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'G411-Sales-Conc-Cat', nameAr: 'تست فئة' })
    if (catRes.status !== 201) throw new Error(`Category failed: ${JSON.stringify(catRes.body)}`)
    testCategoryId = catRes.body.data.id

    // Create product with enough stock for 5 concurrent single-unit sales
    const CONCURRENCY = 5
    const prodRes = await request(app)
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: `G411-SalesConc-Product-${Date.now()}`,
        nameAr: 'منتج تست',
        categoryId: testCategoryId,
        price: 100,
        stockQuantity: CONCURRENCY + 5  // buffer to prevent stock-exhaustion failures masking sequence bugs
      })
    if (prodRes.status !== 201) throw new Error(`Product failed: ${JSON.stringify(prodRes.body)}`)
    testProductId = prodRes.body.data.id
  })

  afterAll(async () => {
    // Delete treasury movements and payments by sale ID first
    for (const sId of createdSaleIds) {
      await db.execute(sql`DELETE FROM treasury_movements WHERE reference_id = ${sId} AND reference_type IN ('sale_payment','sale_refund')`).catch(() => {})
      await db.delete(salePayments).where(eq(salePayments.saleId, sId)).catch(() => {})
    }
    // Delete sale_items by product_id — this guarantees FK is cleared even if a sale
    // was cancelled or modified (which can cause per-sale-id deletes to silently fail).
    // Without this, orphaned sale_items block product deletion via FK constraint,
    // leaving the category in the DB and polluting subsequent test runs (Gate 4.1.2 fix).
    if (testProductId !== null) {
      await db.execute(sql`DELETE FROM sale_items WHERE product_id = ${testProductId}`).catch(() => {})
    }
    // Now delete the sales themselves
    for (const sId of createdSaleIds) {
      await db.delete(sales).where(eq(sales.id, sId)).catch(() => {})
    }
    // Product FK is now clear — delete product then category
    if (testProductId !== null) {
      await db.delete(products).where(eq(products.id, testProductId)).catch(() => {})
    }
    if (testCategoryId !== null) {
      await db.delete(productCategories).where(eq(productCategories.id, testCategoryId)).catch(() => {})
    }
  })

  it('TC-F003-SALES-01: Sequential sales produce unique, incrementing invoice numbers', async () => {
    const makeOneSale = async () => {
      const res = await request(app)
        .post('/api/v1/sales')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          items: [{ productId: testProductId, quantity: 1 }],
          payments: [{ paymentMethodId: defaultPaymentMethodId, treasuryAccountId: defaultTreasuryAccountId, amount: 100 }]
        })
      if (res.status !== 201) throw new Error(`Sale failed: ${JSON.stringify(res.body)}`)
      const id = res.body.data.id
      createdSaleIds.push(id)
      // invoiceNumber is not in SaleDTO — read from DB
      const [row] = await db.select({ invoiceNumber: sales.invoiceNumber }).from(sales).where(eq(sales.id, id)).limit(1)
      return { id, invoiceNumber: row?.invoiceNumber ?? '' }
    }

    const { invoiceNumber: inv1 } = await makeOneSale()
    const { invoiceNumber: inv2 } = await makeOneSale()

    expect(inv1).toMatch(/^INV-\d{6}$/)
    expect(inv2).toMatch(/^INV-\d{6}$/)
    expect(inv1).not.toBe(inv2)

    const num1 = parseInt(inv1.replace('INV-', ''), 10)
    const num2 = parseInt(inv2.replace('INV-', ''), 10)
    expect(num2).toBe(num1 + 1)
  })

  it('TC-F003-SALES-02: Concurrent sales produce unique invoice numbers', async () => {
    const CONCURRENCY = 5

    // Fire all sale creation requests concurrently
    const results = await Promise.allSettled(
      Array.from({ length: CONCURRENCY }, () =>
        request(app)
          .post('/api/v1/sales')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            items: [{ productId: testProductId, quantity: 1 }],
            payments: [{ paymentMethodId: defaultPaymentMethodId, treasuryAccountId: defaultTreasuryAccountId, amount: 100 }]
          })
      )
    )

    const successful = results
      .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled' && r.value.status === 201)
      .map(r => r.value.body.data)

    const saleIds: number[] = []
    for (const s of successful) {
      if (s?.id) {
        createdSaleIds.push(s.id)
        saleIds.push(s.id)
      }
    }

    // All CONCURRENCY requests must have succeeded
    expect(successful.length).toBe(CONCURRENCY)

    // Fetch invoice numbers from DB — not in SaleDTO API response
    const dbRows = await db
      .select({ id: sales.id, invoiceNumber: sales.invoiceNumber })
      .from(sales)
      .where(sql`id IN (${sql.join(saleIds.map(id => sql`${id}`), sql`, `)})`)

    expect(dbRows.length).toBe(CONCURRENCY)

    const invoiceNumbers = dbRows.map(r => r.invoiceNumber!)
    for (const inv of invoiceNumbers) {
      expect(inv).toMatch(/^INV-\d{6}$/)
    }

    // THE core assertion: all 5 invoice numbers are unique — no duplicates
    const uniqueSet = new Set(invoiceNumbers)
    expect(uniqueSet.size).toBe(CONCURRENCY)
  })

  it('TC-F003-SALES-03: Sales invoice format matches INV-NNNNNN pattern in DB', async () => {
    const res = await request(app)
      .post('/api/v1/sales')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        items: [{ productId: testProductId, quantity: 1 }],
        payments: [{ paymentMethodId: defaultPaymentMethodId, treasuryAccountId: defaultTreasuryAccountId, amount: 100 }]
      })
    expect(res.status).toBe(201)
    const saleId = res.body.data.id
    createdSaleIds.push(saleId)

    const [row] = await db.select({ invoiceNumber: sales.invoiceNumber }).from(sales).where(eq(sales.id, saleId)).limit(1)
    expect(row.invoiceNumber).toBeTruthy()
    expect(row.invoiceNumber).toMatch(/^INV-\d{6}$/)
  })

  it('TC-F003-MIXED-01: Mixed concurrent rental+sales creation produces no duplicate invoice numbers', async () => {
    // This test verifies the shared invoice_number sequence is session-safe
    // across BOTH modules running simultaneously.
    //
    // Limitation: This is an application-level HTTP concurrency test.
    // It does not simulate true InnoDB lock contention but does stress the
    // session-scoped LAST_INSERT_ID() guarantee under Node.js event-loop concurrency.

    // Need rental fixtures
    const makeSkate = async (suffix: string): Promise<number> => {
      const res = await request(app)
        .post('/api/v1/skates')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ skateCode: `G411-MIX-${suffix}-${Date.now()}`, type: 'inline', size: '42', status: 'available', priceMode: 'standard' })
      if (res.status !== 201) throw new Error(`Skate failed: ${JSON.stringify(res.body)}`)
      return res.body.data.id
    }
    const makeCustomer = async (suffix: string): Promise<number> => {
      const ts = Date.now().toString()
      const rand = Math.floor(Math.random() * 9000 + 1000).toString()
      // nationalId must be exactly 14 digits: '7' + last 9 ts digits + 4 rand digits = 14
      const nationalId = `7${ts.slice(-9)}${rand}`
      const res = await request(app)
        .post('/api/v1/customers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: `G411 Mix Cust ${suffix}`, nationalId, phone: `015${ts.slice(-7)}${suffix.slice(0,1)}`, trustLevel: 'new' })
      if (res.status !== 201) throw new Error(`Customer failed: ${JSON.stringify(res.body)}`)
      return res.body.data.id
    }

    const MIX_COUNT = 3 // 3 rentals + 3 sales = 6 concurrent invoice number requests

    // Create a dedicated product for this test with its own fresh stock — isolated from
    // testProductId which may have been partially consumed by prior tests in this suite.
    const mixProdRes = await request(app)
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: `G411-MixedConc-${Date.now()}`,
        nameAr: 'منتج مزيج',
        categoryId: testCategoryId,
        price: 100,
        stockQuantity: MIX_COUNT + 5
      })
    if (mixProdRes.status !== 201) throw new Error(`Mix product failed: ${JSON.stringify(mixProdRes.body)}`)
    const mixProductId = mixProdRes.body.data.id

    const skateIds = await Promise.all(Array.from({ length: MIX_COUNT }, (_, i) => makeSkate(`${i}`)))
    const customerIds = await Promise.all(Array.from({ length: MIX_COUNT }, (_, i) => makeCustomer(`${i}`)))

    const rentalRequests = skateIds.map((skateId, i) =>
      request(app)
        .post('/api/v1/rentals')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          skateId,
          customerId: customerIds[i],
          durationMinutes: 60,
          payments: [{ paymentMethodId: defaultPaymentMethodId, amount: 120 }]
        })
    )
    const saleRequests = Array.from({ length: MIX_COUNT }, () =>
      request(app)
        .post('/api/v1/sales')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          items: [{ productId: mixProductId, quantity: 1 }],
          payments: [{ paymentMethodId: defaultPaymentMethodId, treasuryAccountId: defaultTreasuryAccountId, amount: 100 }]
        })
    )

    // Fire all 6 concurrently
    const allResults = await Promise.allSettled([...rentalRequests, ...saleRequests])

    const successfulRentals = allResults.slice(0, MIX_COUNT)
      .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled' && r.value.status === 201)
    const successfulSales = allResults.slice(MIX_COUNT)
      .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled' && r.value.status === 201)

    expect(successfulRentals.length).toBe(MIX_COUNT)
    expect(successfulSales.length).toBe(MIX_COUNT)

    // Collect rental IDs for cleanup
    const rentalIds = successfulRentals.map(r => r.value.body.data.id as number)
    const saleIdsFromMix = successfulSales.map(r => r.value.body.data.id as number)
    for (const sId of saleIdsFromMix) createdSaleIds.push(sId)

    // Fetch invoice numbers from both tables
    const rentalRows = await db
      .select({ invoiceNumber: rentals.invoiceNumber })
      .from(rentals)
      .where(sql`id IN (${sql.join(rentalIds.map(id => sql`${id}`), sql`, `)})`)
    const saleRows = await db
      .select({ invoiceNumber: sales.invoiceNumber })
      .from(sales)
      .where(sql`id IN (${sql.join(saleIdsFromMix.map(id => sql`${id}`), sql`, `)})`)

    const allInvoiceNumbers = [
      ...rentalRows.map(r => r.invoiceNumber!),
      ...saleRows.map(r => r.invoiceNumber!)
    ]

    expect(allInvoiceNumbers.length).toBe(MIX_COUNT * 2)

    for (const inv of allInvoiceNumbers) {
      expect(inv).toMatch(/^INV-\d{6}$/)
    }

    // All 6 must be unique — the shared sequence must not have produced duplicates
    const uniqueSet = new Set(allInvoiceNumbers)
    expect(uniqueSet.size).toBe(MIX_COUNT * 2)

    // Cleanup rental fixtures
    for (const rId of rentalIds) {
      await db.execute(sql`DELETE FROM treasury_movements WHERE reference_id = ${rId} AND reference_type IN ('rental_payment','rental_refund')`).catch(() => {})
      await db.execute(sql`DELETE FROM rental_payments WHERE rental_id = ${rId}`).catch(() => {})
      await db.delete(rentals).where(eq(rentals.id, rId)).catch(() => {})
    }
    for (const sId of skateIds) await db.delete(skates).where(eq(skates.id, sId)).catch(() => {})
    for (const cId of customerIds) await db.delete(customers).where(eq(customers.id, cId)).catch(() => {})
    // Cleanup mix product (sale_items deleted via cascade-like delete order)
    await db.execute(sql`DELETE FROM sale_items WHERE product_id = ${mixProductId}`).catch(() => {})
    await db.delete(products).where(eq(products.id, mixProductId)).catch(() => {})
  })
})
