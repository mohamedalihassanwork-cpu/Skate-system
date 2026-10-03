/**
 * GATE 5.1 — G5-F-008: Invoice Endpoint Tests
 *
 * Covers:
 *   - GET /api/v1/invoices/rental/:id
 *   - GET /api/v1/invoices/sale/:id
 *
 * Test plan:
 *   - Authentication: unauthenticated requests rejected (401)
 *   - Authorization: wrong-permission user rejected (403)
 *   - Valid invoice: returns 200 with correct structure
 *   - Data correctness: all required fields present with correct values
 *   - Not found: unknown ID returns 404
 *   - Sequence mapping: invoiceNumber corresponds to the underlying transaction
 *   - No financial mutation: GET does not create payments or treasury movements
 *
 * Permissions used:
 *   - GET /invoices/rental/:id requires `rentals.view`
 *   - GET /invoices/sale/:id requires `sales.view`
 *   (verified in invoices.routes.ts lines 16 and 39)
 *
 * Test isolation:
 *   - All fixtures are created fresh with timestamp-unique codes
 *   - afterAll cleans up in FK-safe order, scoped to this test's IDs only
 *   - No global DELETE operations
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import app from '../app.js'
import { db, pool } from '../db/connection.js'
import {
  users,
  roles,
  userRoles,
} from '../db/schema/users.js'
import { skates } from '../db/schema/skates.js'
import { customers } from '../db/schema/customers.js'
import { rentals } from '../db/schema/rentals.js'
import { sales, saleItems, salePayments } from '../db/schema/sales.js'
import {
  rentalPayments,
  paymentMethods,
  treasuryMovements,
  treasuryAccounts,
} from '../db/schema/payments.js'
import { cashierShifts } from '../db/schema/treasury.js'
import { productCategories, products } from '../db/schema/products.js'
import { sequences } from '../db/schema/sequences.js'
import { eq, and, count as drizzleCount } from 'drizzle-orm'
import { sql } from 'drizzle-orm'
import bcrypt from 'bcryptjs'

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? 'admin@koshkskate.com'
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'Koshk@12345'

describe('Gate 5.1 — G5-F-008: Invoice Endpoint Tests', () => {
  let adminToken: string
  let adminId: number
  let noPermToken: string
  let noPermUserId: number

  // Rental invoice fixtures
  let rentalSkateId: number
  let rentalCustomerId: number
  let rentalId: number
  let rentalPaymentMethodId: number
  let rentalTreasuryAccountId: number
  let rentalShiftId: number
  let rentalInvoiceNumber: string
  let rentalPaymentId: number
  let rentalTreasuryMovId: number

  // Sale invoice fixtures
  let saleProductCategoryId: number
  let saleProductId: number
  let saleId: number
  let salePaymentMethodId: number
  let saleTreasuryAccountId: number
  let saleShiftId: number | null = null
  let saleInvoiceNumber: string

  const ts = Date.now()

  beforeAll(async () => {
    // ── Admin login ──────────────────────────────────────────────────────────
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
    if (loginRes.status !== 200) {
      throw new Error(`Admin login failed: ${JSON.stringify(loginRes.body)}`)
    }
    adminToken = loginRes.body.data.accessToken

    const adminUser = await db.query.users.findFirst({ where: eq(users.email, ADMIN_EMAIL) })
    adminId = adminUser!.id

    // ── User without permissions (no role) ───────────────────────────────────
    const hash = await bcrypt.hash('TestPass123!', 12)
    const [noPermRes] = await db.insert(users).values({
      name: 'NoPermInvoice User',
      email: `noperm.inv.${ts}@koshk.test`,
      passwordHash: hash,
      isActive: true,
    })
    noPermUserId = noPermRes.insertId

    const noPermLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: `noperm.inv.${ts}@koshk.test`, password: 'TestPass123!' })
    noPermToken = noPermLogin.body.data.accessToken

    // ── Ensure admin has an active shift ─────────────────────────────────────
    const existingShift = await db
      .select()
      .from(cashierShifts)
      .where(and(eq(cashierShifts.cashierId, adminId), eq(cashierShifts.status, 'active')))
      .limit(1)

    if (!existingShift.length) {
      const [shiftRes] = await db.insert(cashierShifts).values({
        cashierId: adminId,
        openingBalance: '0',
        status: 'active',
      })
      rentalShiftId = shiftRes.insertId
    } else {
      rentalShiftId = existingShift[0].id
    }
    saleShiftId = rentalShiftId  // reuse same shift

    // ────────────────────────────────────────────────────────────────────────
    // RENTAL INVOICE FIXTURES
    // ────────────────────────────────────────────────────────────────────────

    // Treasury account + payment method for rental
    const [rentTAccRes] = await db.insert(treasuryAccounts).values({
      name: `G51 Rental Treasury ${ts}`,
      nameAr: `خزينة إيجار اختبار ${ts}`,
      isActive: true,
      balance: '10000',
    })
    rentalTreasuryAccountId = rentTAccRes.insertId

    const [rentPmRes] = await db.insert(paymentMethods).values({
      name: `G51 Rental Cash ${ts}`,
      nameAr: `كاش إيجار اختبار ${ts}`,
      type: 'cash',
      treasuryAccountId: rentalTreasuryAccountId,
      isActive: true,
      isDefault: false,
    })
    rentalPaymentMethodId = rentPmRes.insertId

    // Skate
    const [skateRes] = await db.insert(skates).values({
      skateCode: `G51-INV-SK-${ts}`,
      qrCode: `G51-INV-SK-${ts}`,
      barcode: `G51-INV-SK-${ts}`,
      size: '42',
      status: 'available',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    rentalSkateId = skateRes.insertId

    // Customer
    const [custRes] = await db.insert(customers).values({
      name: `InvoiceTestCust ${ts}`,
      phone: `099${ts.toString().slice(-8)}`,
      isActive: true,
      registrationDate: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    rentalCustomerId = custRes.insertId

    // Generate invoice number via sequence
    await db.execute(
      sql`INSERT INTO sequences (name, value) VALUES ('invoice_number', 1)
          ON DUPLICATE KEY UPDATE value = value + 1`
    )
    const [seqRows] = await db.execute(
      sql`SELECT value FROM sequences WHERE name = 'invoice_number'`
    ) as any
    const invNum = `INV-${seqRows[0].value.toString().padStart(6, '0')}`
    rentalInvoiceNumber = invNum

    // Rental code
    const rentalCode = `RN-G51-${ts}`

    // Insert rental with invoiceNumber
    const [rentRes] = await db.insert(rentals).values({
      rentalCode,
      invoiceNumber: invNum,
      skateId: rentalSkateId,
      customerId: rentalCustomerId,
      cashierId: adminId,
      shiftId: rentalShiftId,
      durationMinutes: 60,
      pricePerHour: '120.00',
      rentalAmount: '120.00',
      startedAt: new Date(),
      expectedEndAt: new Date(Date.now() + 3_600_000),
      status: 'active',
    })
    rentalId = rentRes.insertId

    // Mark skate as rented
    await db
      .update(skates)
      .set({ status: 'rented', updatedAt: new Date() })
      .where(eq(skates.id, rentalSkateId))

    // Rental payment
    const [rpRes] = await db.insert(rentalPayments).values({
      rentalId,
      paymentMethodId: rentalPaymentMethodId,
      amount: '120.00',
      paymentType: 'rental',
      cashierId: adminId,
      createdAt: new Date(),
    })
    rentalPaymentId = rpRes.insertId

    // Treasury movement for rental payment
    const [tmRes] = await db.insert(treasuryMovements).values({
      treasuryAccountId: rentalTreasuryAccountId,
      amount: '120.00',
      type: 'in',
      referenceType: 'rental_payment',
      referenceId: rentalId,
      cashierId: adminId,
      shiftId: rentalShiftId,
      notes: `G51 Invoice test rental ${rentalId}`,
    })
    rentalTreasuryMovId = tmRes.insertId

    // Update treasury balance
    await db.execute(
      sql`UPDATE treasury_accounts SET balance = balance + 120.00 WHERE id = ${rentalTreasuryAccountId}`
    )

    // ────────────────────────────────────────────────────────────────────────
    // SALE INVOICE FIXTURES
    // ────────────────────────────────────────────────────────────────────────

    // Treasury account + payment method for sale (can reuse the same ones)
    const [saleTAccRes] = await db.insert(treasuryAccounts).values({
      name: `G51 Sale Treasury ${ts}`,
      nameAr: `خزينة مبيعات اختبار ${ts}`,
      isActive: true,
      balance: '5000',
    })
    saleTreasuryAccountId = saleTAccRes.insertId

    const [salePmRes] = await db.insert(paymentMethods).values({
      name: `G51 Sale Cash ${ts}`,
      nameAr: `كاش مبيعات اختبار ${ts}`,
      type: 'cash',
      treasuryAccountId: saleTreasuryAccountId,
      isActive: true,
      isDefault: false,
    })
    salePaymentMethodId = salePmRes.insertId

    // Product category + product
    const [catRes] = await db.insert(productCategories).values({
      name: `G51Cat ${ts}`,
      nameAr: `فئة اختبار ${ts}`,
      isActive: true,
    })
    saleProductCategoryId = catRes.insertId

    const [prodRes] = await db.insert(products).values({
      name: `G51Product ${ts}`,
      nameAr: `منتج اختبار ${ts}`,
      categoryId: saleProductCategoryId,
      price: '50.00',
      stockQuantity: 100,
      isActive: true,
    })
    saleProductId = prodRes.insertId

    // Generate sale invoice number
    await db.execute(
      sql`INSERT INTO sequences (name, value) VALUES ('invoice_number', 1)
          ON DUPLICATE KEY UPDATE value = value + 1`
    )
    const [seqRows2] = await db.execute(
      sql`SELECT value FROM sequences WHERE name = 'invoice_number'`
    ) as any
    const saleInvNum = `INV-${seqRows2[0].value.toString().padStart(6, '0')}`
    saleInvoiceNumber = saleInvNum

    const saleCode = `SA-G51-${ts}`

    const [saleRes] = await db.insert(sales).values({
      saleCode,
      invoiceNumber: saleInvNum,
      cashierId: adminId,
      customerId: rentalCustomerId,
      shiftId: rentalShiftId,
      totalAmount: '100.00',
      status: 'completed',
    })
    saleId = saleRes.insertId

    // Sale item (2 units × 50 EGP = 100)
    await db.insert(saleItems).values({
      saleId,
      productId: saleProductId,
      quantity: 2,
      unitPrice: '50.00',
      totalPrice: '100.00',
    })

    // Sale payment
    await db.insert(salePayments).values({
      saleId,
      paymentMethodId: salePaymentMethodId,
      amount: '100.00',
      treasuryAccountId: saleTreasuryAccountId,
      createdAt: new Date(),
    })

  })

  afterAll(async () => {
    // Clean up in FK-safe order, scoped to this test's IDs only
    // Sale cleanup
    await db.execute(sql`DELETE FROM treasury_movements WHERE treasury_account_id = ${saleTreasuryAccountId}`).catch(() => {})
    await db.execute(sql`DELETE FROM treasury_movements WHERE treasury_account_id = ${rentalTreasuryAccountId}`).catch(() => {})
    await db.execute(sql`DELETE FROM sale_payments WHERE sale_id = ${saleId}`).catch(() => {})
    await db.execute(sql`DELETE FROM sale_items WHERE sale_id = ${saleId}`).catch(() => {})
    await db.delete(sales).where(eq(sales.id, saleId)).catch(() => {})
    await db.delete(products).where(eq(products.id, saleProductId)).catch(() => {})
    await db.delete(productCategories).where(eq(productCategories.id, saleProductCategoryId)).catch(() => {})
    await db.delete(paymentMethods).where(eq(paymentMethods.id, salePaymentMethodId)).catch(() => {})
    await db.delete(treasuryAccounts).where(eq(treasuryAccounts.id, saleTreasuryAccountId)).catch(() => {})

    // Rental cleanup
    await db.delete(rentalPayments).where(eq(rentalPayments.rentalId, rentalId)).catch(() => {})
    await db.delete(rentals).where(eq(rentals.id, rentalId)).catch(() => {})
    await db.delete(customers).where(eq(customers.id, rentalCustomerId)).catch(() => {})
    await db.update(skates).set({ status: 'available', updatedAt: new Date() }).where(eq(skates.id, rentalSkateId)).catch(() => {})
    await db.delete(skates).where(eq(skates.id, rentalSkateId)).catch(() => {})
    await db.delete(paymentMethods).where(eq(paymentMethods.id, rentalPaymentMethodId)).catch(() => {})
    await db.delete(treasuryAccounts).where(eq(treasuryAccounts.id, rentalTreasuryAccountId)).catch(() => {})

    // No-perm user cleanup
    await db.delete(users).where(eq(users.id, noPermUserId)).catch(() => {})

    // Clean up shift only if we created it (not if we reused an existing one)
    // We track this by checking if we opened a new shift in beforeAll
    // (We only delete the shift if rentalShiftId matches what we inserted,
    //  and it belongs to the admin — but we reused the existing shift if present,
    //  so we do NOT delete it to avoid breaking other tests that rely on it)
    // No shift deletion — we either reused existing or the test DB manages it.
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // RENTAL INVOICE TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('GET /api/v1/invoices/rental/:id', () => {
    // ── Authentication ───────────────────────────────────────────────────────
    it('TC-INV-R-01: returns 401 for unauthenticated request', async () => {
      const res = await request(app).get(`/api/v1/invoices/rental/${rentalId}`)
      expect(res.status).toBe(401)
      expect(res.body.success).toBe(false)
    })

    // ── Authorization ────────────────────────────────────────────────────────
    it('TC-INV-R-02: returns 403 for a user without rentals.view permission', async () => {
      const res = await request(app)
        .get(`/api/v1/invoices/rental/${rentalId}`)
        .set('Authorization', `Bearer ${noPermToken}`)
      expect(res.status).toBe(403)
      expect(res.body.success).toBe(false)
    })

    // ── Valid invoice ────────────────────────────────────────────────────────
    it('TC-INV-R-03: returns 200 with correct invoice structure for a valid rental', async () => {
      const res = await request(app)
        .get(`/api/v1/invoices/rental/${rentalId}`)
        .set('Authorization', `Bearer ${adminToken}`)

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data).toBeDefined()
    })

    // ── Data correctness ─────────────────────────────────────────────────────
    it('TC-INV-R-04: invoice contains correct type, invoiceNumber, and transactionCode', async () => {
      const res = await request(app)
        .get(`/api/v1/invoices/rental/${rentalId}`)
        .set('Authorization', `Bearer ${adminToken}`)

      expect(res.status).toBe(200)
      const d = res.body.data
      expect(d.type).toBe('RENTAL')
      expect(d.invoiceNumber).toBe(rentalInvoiceNumber)
      // transactionCode is the rental_code field
      expect(typeof d.transactionCode).toBe('string')
      expect(d.transactionCode).toMatch(/RN-/)
    })

    it('TC-INV-R-05: rental invoice contains cashier name and customer name', async () => {
      const res = await request(app)
        .get(`/api/v1/invoices/rental/${rentalId}`)
        .set('Authorization', `Bearer ${adminToken}`)

      const d = res.body.data
      expect(typeof d.cashierName).toBe('string')
      expect(d.cashierName.length).toBeGreaterThan(0)
      expect(typeof d.customerName).toBe('string')
      expect(d.customerName.length).toBeGreaterThan(0)
    })

    it('TC-INV-R-06: rental invoice contains duration, rental amount, and total', async () => {
      const res = await request(app)
        .get(`/api/v1/invoices/rental/${rentalId}`)
        .set('Authorization', `Bearer ${adminToken}`)

      const d = res.body.data
      expect(d.durationMinutes).toBe(60)
      expect(d.rentalAmount).toBe(120)
      expect(d.total).toBe(120) // no late fee or damage in this fixture
    })

    it('TC-INV-R-07: rental invoice payments array matches fixture payment', async () => {
      const res = await request(app)
        .get(`/api/v1/invoices/rental/${rentalId}`)
        .set('Authorization', `Bearer ${adminToken}`)

      const d = res.body.data
      expect(Array.isArray(d.payments)).toBe(true)
      expect(d.payments.length).toBeGreaterThan(0)
      const totalPaid = d.payments.reduce((s: number, p: any) => s + p.amount, 0)
      expect(totalPaid).toBe(120)
    })

    // ── Not found ────────────────────────────────────────────────────────────
    it('TC-INV-R-08: returns 404 for a non-existent rental ID', async () => {
      const res = await request(app)
        .get('/api/v1/invoices/rental/9999999')
        .set('Authorization', `Bearer ${adminToken}`)

      expect(res.status).toBe(404)
      expect(res.body.success).toBe(false)
    })

    // ── Sequence / invoice mapping ────────────────────────────────────────────
    it('TC-INV-R-09: invoice number matches the invoice_number stored on the rental record', async () => {
      const [rental] = await db.select().from(rentals).where(eq(rentals.id, rentalId)).limit(1)
      const res = await request(app)
        .get(`/api/v1/invoices/rental/${rentalId}`)
        .set('Authorization', `Bearer ${adminToken}`)

      expect(res.body.data.invoiceNumber).toBe(rental.invoiceNumber)
    })

    // ── No financial mutation ─────────────────────────────────────────────────
    it('TC-INV-R-10: GET request does not create new payments or treasury movements', async () => {
      // Capture counts before
      const [countBefore] = await db
        .select({ cnt: drizzleCount() })
        .from(rentalPayments)
        .where(eq(rentalPayments.rentalId, rentalId))

      const [tmBefore] = await db
        .select({ cnt: drizzleCount() })
        .from(treasuryMovements)
        .where(eq(treasuryMovements.referenceId, rentalId))

      // Execute GET
      await request(app)
        .get(`/api/v1/invoices/rental/${rentalId}`)
        .set('Authorization', `Bearer ${adminToken}`)

      // Capture counts after
      const [countAfter] = await db
        .select({ cnt: drizzleCount() })
        .from(rentalPayments)
        .where(eq(rentalPayments.rentalId, rentalId))

      const [tmAfter] = await db
        .select({ cnt: drizzleCount() })
        .from(treasuryMovements)
        .where(eq(treasuryMovements.referenceId, rentalId))

      expect(Number(countAfter.cnt)).toBe(Number(countBefore.cnt))
      expect(Number(tmAfter.cnt)).toBe(Number(tmBefore.cnt))
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // SALE INVOICE TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('GET /api/v1/invoices/sale/:id', () => {
    // ── Authentication ───────────────────────────────────────────────────────
    it('TC-INV-S-01: returns 401 for unauthenticated request', async () => {
      const res = await request(app).get(`/api/v1/invoices/sale/${saleId}`)
      expect(res.status).toBe(401)
      expect(res.body.success).toBe(false)
    })

    // ── Authorization ────────────────────────────────────────────────────────
    it('TC-INV-S-02: returns 403 for a user without sales.view permission', async () => {
      const res = await request(app)
        .get(`/api/v1/invoices/sale/${saleId}`)
        .set('Authorization', `Bearer ${noPermToken}`)
      expect(res.status).toBe(403)
      expect(res.body.success).toBe(false)
    })

    // ── Valid invoice ────────────────────────────────────────────────────────
    it('TC-INV-S-03: returns 200 with correct invoice structure for a valid sale', async () => {
      const res = await request(app)
        .get(`/api/v1/invoices/sale/${saleId}`)
        .set('Authorization', `Bearer ${adminToken}`)

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data).toBeDefined()
    })

    // ── Data correctness ─────────────────────────────────────────────────────
    it('TC-INV-S-04: sale invoice contains correct type, invoiceNumber, and transactionCode', async () => {
      const res = await request(app)
        .get(`/api/v1/invoices/sale/${saleId}`)
        .set('Authorization', `Bearer ${adminToken}`)

      const d = res.body.data
      expect(d.type).toBe('SALE')
      expect(d.invoiceNumber).toBe(saleInvoiceNumber)
      expect(typeof d.transactionCode).toBe('string')
      expect(d.transactionCode).toMatch(/SA-/)
    })

    it('TC-INV-S-05: sale invoice contains cashier name and customer name', async () => {
      const res = await request(app)
        .get(`/api/v1/invoices/sale/${saleId}`)
        .set('Authorization', `Bearer ${adminToken}`)

      const d = res.body.data
      expect(typeof d.cashierName).toBe('string')
      expect(d.cashierName.length).toBeGreaterThan(0)
      expect(typeof d.customerName).toBe('string')
    })

    it('TC-INV-S-06: sale invoice contains items array with correct quantity and prices', async () => {
      const res = await request(app)
        .get(`/api/v1/invoices/sale/${saleId}`)
        .set('Authorization', `Bearer ${adminToken}`)

      const d = res.body.data
      expect(Array.isArray(d.items)).toBe(true)
      expect(d.items.length).toBe(1)
      const item = d.items[0]
      expect(item.quantity).toBe(2)
      expect(item.unitPrice).toBe(50)
      expect(item.totalPrice).toBe(100)
    })

    it('TC-INV-S-07: sale invoice total matches the sum of items', async () => {
      const res = await request(app)
        .get(`/api/v1/invoices/sale/${saleId}`)
        .set('Authorization', `Bearer ${adminToken}`)

      const d = res.body.data
      const itemsTotal = d.items.reduce((s: number, i: any) => s + i.totalPrice, 0)
      expect(d.total).toBe(itemsTotal)
    })

    it('TC-INV-S-08: sale invoice payments array matches fixture payment', async () => {
      const res = await request(app)
        .get(`/api/v1/invoices/sale/${saleId}`)
        .set('Authorization', `Bearer ${adminToken}`)

      const d = res.body.data
      expect(Array.isArray(d.payments)).toBe(true)
      expect(d.payments.length).toBeGreaterThan(0)
      const totalPaid = d.payments.reduce((s: number, p: any) => s + p.amount, 0)
      expect(totalPaid).toBe(100)
    })

    // ── Not found ────────────────────────────────────────────────────────────
    it('TC-INV-S-09: returns 404 for a non-existent sale ID', async () => {
      const res = await request(app)
        .get('/api/v1/invoices/sale/9999999')
        .set('Authorization', `Bearer ${adminToken}`)

      expect(res.status).toBe(404)
      expect(res.body.success).toBe(false)
    })

    // ── Sequence / invoice mapping ────────────────────────────────────────────
    it('TC-INV-S-10: invoice number matches the invoice_number stored on the sale record', async () => {
      const [sale] = await db.select().from(sales).where(eq(sales.id, saleId)).limit(1)
      const res = await request(app)
        .get(`/api/v1/invoices/sale/${saleId}`)
        .set('Authorization', `Bearer ${adminToken}`)

      expect(res.body.data.invoiceNumber).toBe(sale.invoiceNumber)
    })

    // ── No financial mutation ─────────────────────────────────────────────────
    it('TC-INV-S-11: GET request does not create or modify sale records or payments', async () => {
      const [saleBefore] = await db.select().from(sales).where(eq(sales.id, saleId)).limit(1)
      const paysBefore = await db
        .select()
        .from(salePayments)
        .where(eq(salePayments.saleId, saleId))

      // Execute GET
      await request(app)
        .get(`/api/v1/invoices/sale/${saleId}`)
        .set('Authorization', `Bearer ${adminToken}`)

      const [saleAfter] = await db.select().from(sales).where(eq(sales.id, saleId)).limit(1)
      const paysAfter = await db
        .select()
        .from(salePayments)
        .where(eq(salePayments.saleId, saleId))

      expect(saleAfter.totalAmount).toBe(saleBefore.totalAmount)
      expect(saleAfter.status).toBe(saleBefore.status)
      expect(paysAfter.length).toBe(paysBefore.length)
    })
  })
})
