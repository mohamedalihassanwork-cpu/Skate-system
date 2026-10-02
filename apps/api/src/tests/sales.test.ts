import { describe, it, expect, beforeAll } from 'vitest'
import request from 'supertest'
import app from '../app.js'
import { db } from '../db/connection.js'
import { users, userRoles, roles } from '../db/schema/index.js'
import { treasuryMovements, paymentMethods } from '../db/schema/payments.js'
import { eq, desc } from 'drizzle-orm'
import { sales, saleItems, salePayments } from '../db/schema/sales.js'
import { cashierShifts } from '../db/schema/treasury.js'
import { sql, and } from 'drizzle-orm'
import { productCategories, products } from '../db/schema/products.js'
import bcrypt from 'bcryptjs'

async function loginAdmin(): Promise<string> {
  const res = await request(app).post('/api/v1/auth/login').send({ email: 'admin@koshkskate.com', password: process.env.SEED_ADMIN_PASSWORD ?? 'Koshk@12345' })
  return res.body.data.accessToken
}

async function loginCashier(): Promise<string> {
  const res = await request(app).post('/api/v1/auth/login').send({ email: 'salescashier@test.com', password: 'password' })
  return res.body.data.accessToken
}

describe('Sales API', () => {
  let adminToken: string
  let cashierToken: string
  let categoryId: number
  let productId: number
  let paymentMethodId: number
  let treasuryAccountId: number
  let saleId: number

  beforeAll(async () => {
    // Ensure Cashier user exists with Cashier role
    const existing = await db.select().from(users).where(eq(users.email, 'salescashier@test.com')).limit(1)
    if (!existing.length) {
      const [r] = await db.insert(users).values({
        name: 'Sales Cashier',
        email: 'salescashier@test.com',
        passwordHash: await bcrypt.hash('password', 12),
        isActive: true,
      })
      const cashierRole = await db.select().from(roles).where(eq(roles.name, 'Cashier')).limit(1)
      await db.insert(userRoles).values({ userId: r.insertId, roleId: cashierRole[0].id })
    }

    adminToken = await loginAdmin()
    cashierToken = await loginCashier()
    
    // Setup Category & Product
    const catRes = await request(app).post('/api/v1/products/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Accessories Test', nameAr: 'إكسسوارات تست' })
    categoryId = catRes.body.data.id

    const prodRes = await request(app).post('/api/v1/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Helmet Test', nameAr: 'خوذة تست', categoryId, price: 200, stockQuantity: 5 })
    productId = prodRes.body.data.id

    // Setup Treasury/Payment Method (from seed)
    const pmRes = await db.select().from(paymentMethods).limit(1)
    paymentMethodId = pmRes[0].id
    treasuryAccountId = pmRes[0].treasuryAccountId

    // --- Ensure Active Shifts ---
    const adminUserRes = await db.select().from(users).where(eq(users.email, 'admin@koshkskate.com'))
    const cashierUserRes = await db.select().from(users).where(eq(users.email, 'salescashier@test.com'))
    if (adminUserRes.length) {
      const existing = await db.select().from(cashierShifts).where(and(eq(cashierShifts.cashierId, adminUserRes[0].id), eq(cashierShifts.status, 'active'))).limit(1)
      if (!existing.length) {
        await db.insert(cashierShifts).values({ cashierId: adminUserRes[0].id, openingBalance: '0', status: 'active' })
      }
    }
    if (cashierUserRes.length) {
      const existing = await db.select().from(cashierShifts).where(and(eq(cashierShifts.cashierId, cashierUserRes[0].id), eq(cashierShifts.status, 'active'))).limit(1)
      if (!existing.length) {
        await db.insert(cashierShifts).values({ cashierId: cashierUserRes[0].id, openingBalance: '0', status: 'active' })
      }
    }
  })

  afterAll(async () => {
    // 1. Delete sale-specific rows (preserves FK order: payments → items → sales)
    if (saleId) {
      await db.delete(salePayments).where(eq(salePayments.saleId, saleId)).catch(() => {})
      await db.delete(saleItems).where(eq(saleItems.saleId, saleId)).catch(() => {})
      await db.delete(sales).where(eq(sales.id, saleId)).catch(() => {})
    }
    // 2. Delete test product by specific ID — purge any lingering sale_items first
    if (productId) {
      await db.delete(saleItems).where(eq(saleItems.productId, productId)).catch(() => {})
      await db.delete(products).where(eq(products.id, productId)).catch(() => {})
    }
    // 3. Delete test category by specific ID — purge any products still referencing it first
    if (categoryId) {
      await db.delete(products).where(eq(products.categoryId, categoryId)).catch(() => {})
      await db.delete(productCategories).where(eq(productCategories.id, categoryId)).catch(() => {})
    }
  })

  it('Creates a sale, deducts stock, and records treasury movement', async () => {
    const res = await request(app)
      .post('/api/v1/sales')
      .set('Authorization', `Bearer ${cashierToken}`)
      .send({
        items: [
          { productId, quantity: 2 }
        ],
        payments: [
          { paymentMethodId, treasuryAccountId, amount: 400 }
        ]
      })
    
    expect(res.status).toBe(201)
    expect(res.body.success).toBe(true)
    saleId = res.body.data.id
    expect(res.body.data.totalAmount).toBe(400)
    
    // Verify stock deducted
    const prodRes = await request(app).get(`/api/v1/products/${productId}`)
      .set('Authorization', `Bearer ${adminToken}`)
    expect(prodRes.body.data.stockQuantity).toBe(3) // 5 - 2


    // Verify treasury movement IN
    const movs = await db.select().from(treasuryMovements).where(eq(treasuryMovements.referenceId, saleId)).orderBy(desc(treasuryMovements.id))
    const salePaymentMovement = movs.find(m => m.referenceType === 'sale_payment')
    expect(salePaymentMovement).toBeDefined()
    expect(parseFloat(salePaymentMovement!.amount)).toBe(400)
    expect(salePaymentMovement!.type).toBe('in')
  })

  it('Fails to create sale if insufficient stock', async () => {
    const res = await request(app)
      .post('/api/v1/sales')
      .set('Authorization', `Bearer ${cashierToken}`)
      .send({
        items: [
          { productId, quantity: 10 } // Only 3 left
        ],
        payments: [
          { paymentMethodId, treasuryAccountId, amount: 2000 }
        ]
      })
    
    expect(res.status).toBe(422)
    expect(res.body.error.code).toBe('INSUFFICIENT_STOCK')
  })

  it('Fails to create sale if payment mismatch', async () => {
    const res = await request(app)
      .post('/api/v1/sales')
      .set('Authorization', `Bearer ${cashierToken}`)
      .send({
        items: [
          { productId, quantity: 1 } // Price = 200
        ],
        payments: [
          { paymentMethodId, treasuryAccountId, amount: 150 } // Mismatch!
        ]
      })
    
    expect(res.status).toBe(422)
    expect(res.body.error.code).toBe('PAYMENT_MISMATCH')
  })

  it('Cashier cannot cancel a sale', async () => {
    const res = await request(app)
      .post(`/api/v1/sales/${saleId}/cancel`)
      .set('Authorization', `Bearer ${cashierToken}`)
    
    expect(res.status).toBe(403)
  })

  it('Admin can cancel a sale, restores stock and refunds treasury', async () => {
    const res = await request(app)
      .post(`/api/v1/sales/${saleId}/cancel`)
      .set('Authorization', `Bearer ${adminToken}`)
    
    expect(res.status).toBe(200)
    expect(res.body.data.status).toBe('cancelled')

    // Verify stock restored
    const prodRes = await request(app).get(`/api/v1/products/${productId}`)
      .set('Authorization', `Bearer ${adminToken}`)
    expect(prodRes.body.data.stockQuantity).toBe(5) // 3 + 2

    // Verify treasury movement OUT
    const movs = await db.select().from(treasuryMovements).where(eq(treasuryMovements.referenceId, saleId)).orderBy(desc(treasuryMovements.id))
    const refundMovement = movs.find(m => m.referenceType === 'sale_refund')
    expect(refundMovement).toBeDefined()
    expect(parseFloat(refundMovement!.amount)).toBe(400)
    expect(refundMovement!.type).toBe('out')
  })

  it('Cannot cancel an already cancelled sale', async () => {
    const res = await request(app)
      .post(`/api/v1/sales/${saleId}/cancel`)
      .set('Authorization', `Bearer ${adminToken}`)
    
    expect(res.status).toBe(409)
    expect(res.body.error.code).toBe('ALREADY_CANCELLED')
  })

  it('Explicit: Fails to create sale if cashier shift is missing (HTTP 422)', async () => {
    // 1. Temporarily close/remove the cashier shift
    const cashierUserRes = await db.select().from(users).where(eq(users.email, 'salescashier@test.com'))
    const cashierId = cashierUserRes[0].id
    await db.update(cashierShifts).set({ status: 'closed' }).where(eq(cashierShifts.cashierId, cashierId))

    // 2. Attempt a sale
    const res = await request(app)
      .post('/api/v1/sales')
      .set('Authorization', `Bearer ${cashierToken}`)
      .send({
        items: [
          { productId, quantity: 1 }
        ],
        payments: [
          { paymentMethodId, treasuryAccountId, amount: 200 }
        ]
      })
    
    // 3. Assert HTTP 422
    expect(res.status).toBe(422)
    expect(res.body.error.code).toBe('NO_ACTIVE_SHIFT')

    // 4. Restore shift so tearDown doesn't break if it expects one
    await db.update(cashierShifts).set({ status: 'active' }).where(eq(cashierShifts.cashierId, cashierId))
  })
})
