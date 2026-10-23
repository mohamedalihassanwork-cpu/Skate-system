import { randomUUID } from 'node:crypto'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import jwt from 'jsonwebtoken'
import app from '../app.js'
import env from '../config/env.js'
import { db, pool } from '../db/connection.js'
import { users, userRoles, roles, auditLogs } from '../db/schema/index.js'
import { treasuryMovements, paymentMethods, treasuryAccounts } from '../db/schema/payments.js'
import { eq, desc, inArray, sql } from 'drizzle-orm'
import { sales, saleItems, salePayments } from '../db/schema/sales.js'
import { cashierShifts } from '../db/schema/treasury.js'
import { productCategories, products } from '../db/schema/products.js'

// Legacy-mode API regression. Every user, shift, account and source belongs to
// this run; no seeded user's shift status or historical rows are modified.
describe('Sales API', () => {
  let adminToken: string
  let cashierToken: string
  let categoryId: number
  let productId: number
  let paymentMethodId: number
  let treasuryAccountId: number
  let saleId: number
  let cashierShiftId: number
  const userIds: number[] = []
  const shiftIds: number[] = []
  const stamp = randomUUID()

  async function makeActor(roleName: string) {
    const [role] = await db.select().from(roles).where(eq(roles.name, roleName))
    if (!role) throw new Error(`Seeded ${roleName} role is required`)
    const email = `sales-api-${roleName.toLowerCase()}-${stamp}@test.invalid`
    const [created] = await db.insert(users).values({ name: 'Sales API test', email, passwordHash: 'test-only', isActive: true })
    userIds.push(created.insertId)
    await db.insert(userRoles).values({ userId: created.insertId, roleId: role.id })
    const [shift] = await db.insert(cashierShifts).values({ cashierId: created.insertId, openingBalance: '0.00', status: 'active' })
    shiftIds.push(shift.insertId)
    return { shiftId: shift.insertId, token: jwt.sign({ sub: created.insertId, email }, env.JWT_SECRET, { expiresIn: '10m' }) }
  }

  beforeAll(async () => {
    expect(env.NODE_ENV).toBe('test')
    expect(env.DB_NAME).toBe('koshk_skate_test')
    const [databaseRows] = await pool.query<any[]>('SELECT DATABASE() AS name')
    expect(databaseRows[0].name).toBe('koshk_skate_test')
    const [config] = await pool.query<any[]>('SELECT enabled FROM treasury_configuration WHERE id=1')
    expect(config[0]?.enabled, 'This suite covers pre-cutover compatibility').toBe(0)

    adminToken = (await makeActor('Administrator')).token
    const cashier = await makeActor('Cashier')
    cashierToken = cashier.token
    cashierShiftId = cashier.shiftId

    const [account] = await db.insert(treasuryAccounts).values({ name: `Sales API ${stamp}`, nameAr: 'Sales API account', balance: '0.00', isCashDrawer: true, isActive: true })
    treasuryAccountId = account.insertId
    const [method] = await db.insert(paymentMethods).values({ name: `Sales API ${stamp}`, nameAr: 'Sales API method', treasuryAccountId, isActive: true })
    paymentMethodId = method.insertId

    const catRes = await request(app).post('/api/v1/products/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: `Sales API ${stamp}`, nameAr: 'Sales API category' })
    expect(catRes.status, JSON.stringify(catRes.body)).toBe(201)
    categoryId = catRes.body.data.id
    const prodRes = await request(app).post('/api/v1/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: `Sales API ${stamp}`, nameAr: 'Sales API product', categoryId, price: 200, stockQuantity: 5 })
    expect(prodRes.status, JSON.stringify(prodRes.body)).toBe(201)
    productId = prodRes.body.data.id
  })

  afterAll(async () => {
    if (userIds.length) {
      const ownSales = await db.select({ id: sales.id }).from(sales).where(inArray(sales.cashierId, userIds))
      const saleIds = ownSales.map(sale => sale.id)
      await db.delete(treasuryMovements).where(inArray(treasuryMovements.cashierId, userIds))
      if (saleIds.length) {
        await db.delete(salePayments).where(inArray(salePayments.saleId, saleIds))
        await db.delete(saleItems).where(inArray(saleItems.saleId, saleIds))
        await db.delete(sales).where(inArray(sales.id, saleIds))
      }
      await db.delete(auditLogs).where(inArray(auditLogs.userId, userIds))
      await db.execute(sql`DELETE FROM financial_operations WHERE actor_id IN (${sql.join(userIds.map(id => sql`${id}`), sql`, `)})`)
    }
    if (productId) await db.delete(products).where(eq(products.id, productId))
    if (categoryId) await db.delete(productCategories).where(eq(productCategories.id, categoryId))
    if (paymentMethodId) await db.delete(paymentMethods).where(eq(paymentMethods.id, paymentMethodId))
    if (treasuryAccountId) await db.delete(treasuryAccounts).where(eq(treasuryAccounts.id, treasuryAccountId))
    if (shiftIds.length) await db.delete(cashierShifts).where(inArray(cashierShifts.id, shiftIds))
    if (userIds.length) {
      await db.delete(userRoles).where(inArray(userRoles.userId, userIds))
      await db.delete(users).where(inArray(users.id, userIds))
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
    
    expect(res.status, JSON.stringify(res.body)).toBe(201)
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
    await db.update(cashierShifts).set({ status: 'closed' }).where(eq(cashierShifts.id, cashierShiftId))

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
    await db.update(cashierShifts).set({ status: 'active' }).where(eq(cashierShifts.id, cashierShiftId))
  })
})
