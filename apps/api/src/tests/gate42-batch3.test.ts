import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import request from 'supertest'
import app from '../app.js'
import { db } from '../db/connection.js'
import { users, roles, userRoles } from '../db/schema/users.js'
import { cashierShifts } from '../db/schema/treasury.js'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { settingsService } from '../modules/settings/settings.service.js'
import { SalesService } from '../modules/sales/sales.service.js'
import { products, productCategories } from '../db/schema/products.js'
import { treasuryAccounts, paymentMethods, treasuryMovements } from '../db/schema/payments.js'
import { sales, saleItems, salePayments } from '../db/schema/sales.js'
import { auditLogs } from '../db/schema/audit.js'

describe('Gate 4.2 Batch 3 Validation', () => {
  let adminToken: string
  let cashierToken: string
  let noPermToken: string
  let adminId: number
  let cashierId: number
  let noPermId: number

  let productId: number
  let categoryId: number
  let treasuryAccountId: number
  let paymentMethodId: number

  const TS = Date.now()

  beforeAll(async () => {
    const passwordHash = await bcrypt.hash('password', 12)

    // Admin
    const [a] = await db.insert(users).values({ name: `Admin-${TS}`, email: `a${TS}@test.com`, passwordHash, isActive: true })
    adminId = a.insertId
    const adminRole = await db.select().from(roles).where(eq(roles.name, 'Administrator')).limit(1)
    await db.insert(userRoles).values({ userId: adminId, roleId: adminRole[0].id })

    // Cashier
    const [c] = await db.insert(users).values({ name: `Cashier-${TS}`, email: `c${TS}@test.com`, passwordHash, isActive: true })
    cashierId = c.insertId
    const cashierRole = await db.select().from(roles).where(eq(roles.name, 'Cashier')).limit(1)
    await db.insert(userRoles).values({ userId: cashierId, roleId: cashierRole[0].id })

    // No Perm User
    const [n] = await db.insert(users).values({ name: `NoPerm-${TS}`, email: `n${TS}@test.com`, passwordHash, isActive: true })
    noPermId = n.insertId
    
    // Login
    const r1 = await request(app).post('/api/v1/auth/login').send({ email: `a${TS}@test.com`, password: 'password' })
    adminToken = r1.body.data.accessToken

    const r2 = await request(app).post('/api/v1/auth/login').send({ email: `c${TS}@test.com`, password: 'password' })
    cashierToken = r2.body.data.accessToken

    const r3 = await request(app).post('/api/v1/auth/login').send({ email: `n${TS}@test.com`, password: 'password' })
    noPermToken = r3.body.data.accessToken

    // Setup for F-012
    const [cat] = await db.insert(productCategories).values({ name: `B3Cat-${TS}`, nameAr: `B3Cat-${TS}` })
    categoryId = cat.insertId

    const [prod] = await db.insert(products).values({ name: `B3Prod-${TS}`, nameAr: `B3Prod-${TS}`, categoryId, price: '100', stockQuantity: 10, isActive: true })
    productId = prod.insertId

    const [ta] = await db.insert(treasuryAccounts).values({ name: `B3Cash-${TS}`, nameAr: `B3Cash-${TS}`, balance: '0' })
    treasuryAccountId = ta.insertId

    const [pm] = await db.insert(paymentMethods).values({ name: `B3Cash-${TS}`, nameAr: `B3Cash-${TS}`, treasuryAccountId, isActive: true })
    paymentMethodId = pm.insertId

    await db.insert(cashierShifts).values({ cashierId: adminId, openingBalance: '0', status: 'active' })
  })

  afterAll(async () => {
    // Cleanup F-012 stuff
    await db.delete(treasuryMovements).where(eq(treasuryMovements.cashierId, adminId)).catch(() => {})
    await db.delete(salePayments).catch(() => {})
    await db.delete(saleItems).catch(() => {})
    await db.delete(sales).where(eq(sales.cashierId, adminId)).catch(() => {})
    
    await db.delete(products).where(eq(products.id, productId)).catch(() => {})
    await db.delete(productCategories).where(eq(productCategories.id, categoryId)).catch(() => {})
    await db.delete(paymentMethods).where(eq(paymentMethods.id, paymentMethodId)).catch(() => {})
    await db.delete(treasuryAccounts).where(eq(treasuryAccounts.id, treasuryAccountId)).catch(() => {})

    await db.delete(cashierShifts).where(eq(cashierShifts.cashierId, adminId)).catch(() => {})
    await db.delete(cashierShifts).where(eq(cashierShifts.cashierId, cashierId)).catch(() => {})
    await db.delete(cashierShifts).where(eq(cashierShifts.cashierId, noPermId)).catch(() => {})

    await db.delete(userRoles).where(eq(userRoles.userId, adminId)).catch(() => {})
    await db.delete(userRoles).where(eq(userRoles.userId, cashierId)).catch(() => {})
    
    await db.delete(auditLogs).where(eq(auditLogs.userId, adminId)).catch(() => {})
    await db.delete(auditLogs).where(eq(auditLogs.userId, cashierId)).catch(() => {})

    await db.delete(users).where(eq(users.id, adminId)).catch(() => {})
    await db.delete(users).where(eq(users.id, cashierId)).catch(() => {})
    await db.delete(users).where(eq(users.id, noPermId)).catch(() => {})
  })

  describe('F-012: Verify Collision Retry Branch', () => {
    it('forces ER_DUP_ENTRY and successfully retries', async () => {
      let callCount = 0
      
      // We will mock `db.transaction` temporarily to force the error on the first attempt
      const originalTransaction = db.transaction.bind(db)
      
      vi.spyOn(db, 'transaction').mockImplementation(async (cb: any) => {
        callCount++
        if (callCount === 1) {
          // Force a fake ER_DUP_ENTRY error on the first transaction attempt
          const error: any = new Error("Duplicate entry 'SAL-123' for key 'sales_sale_code_unique'")
          error.errno = 1062 // MYSQL_ERR_DUPLICATE_ENTRY
          error.sqlMessage = "Duplicate entry 'SAL-123' for key 'sales_sale_code_unique'"
          throw error
        }
        // Let the second attempt succeed
        return await originalTransaction(cb)
      })

      const salePayload = {
        cashierId: adminId,
        items: [{ productId, quantity: 1 }],
        payments: [{ paymentMethodId, treasuryAccountId, amount: 100 }]
      }

      const sale = await SalesService.createSale(salePayload)
      
      expect(callCount).toBe(2) // Proves retry happened
      expect(sale.totalAmount).toBe(100)
      
      const items = await db.select().from(saleItems).where(eq(saleItems.saleId, sale.id))
      expect(items.length).toBe(1)
      
      const payments = await db.select().from(salePayments).where(eq(salePayments.saleId, sale.id))
      expect(payments.length).toBe(1)
      
      // Cleanup the spy
      vi.restoreAllMocks()
    })
  })

  describe('F-013: Shift Permissions Validation', () => {
    it('allows authorized user (Admin) to open a shift', async () => {
      // First close active shift if any
      await db.update(cashierShifts).set({ status: 'closed' }).where(eq(cashierShifts.cashierId, adminId))
      
      const res = await request(app).post('/api/v1/shifts/open')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ openingBalance: 100 })
      
      expect(res.status).toBe(201)
    })

    it('denies unauthorized user from opening a shift', async () => {
      const res = await request(app).post('/api/v1/shifts/open')
        .set('Authorization', `Bearer ${noPermToken}`)
        .send({ openingBalance: 100 })
      
      expect(res.status).toBe(403)
      expect(res.body.error.code).toBe('FORBIDDEN')
    })
  })

  describe('F-017: Settings PATCH Validation', () => {
    it('accepts valid known settings', async () => {
      const res = await request(app).patch('/api/v1/settings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ print_invoices_enabled: false })
      
      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)

      // Restore setting
      await request(app).patch('/api/v1/settings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ print_invoices_enabled: true })
    })

    it('rejects unknown setting keys', async () => {
      const res = await request(app).patch('/api/v1/settings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ some_invalid_key: 10 })
      
      expect(res.status).toBe(400)
      expect(res.body.error.code).toBe('VALIDATION_ERROR')
    })

    it('rejects invalid data types for settings', async () => {
      const res = await request(app).patch('/api/v1/settings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ rental_hourly_rate: 'string' }) // Should be number
      
      expect(res.status).toBe(400)
      expect(res.body.error.code).toBe('VALIDATION_ERROR')
    })
  })

  describe('F-018: API Error Response Formatting', () => {
    it('Validation error correctly formatted', async () => {
      const res = await request(app).post('/api/v1/shifts/open')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ openingBalance: -50 }) // Invalid
      
      expect(res.status).toBe(400)
      expect(res.body.success).toBe(false)
      expect(res.body.error.code).toBe('VALIDATION_ERROR')
    })

    it('Authentication error correctly formatted', async () => {
      const res = await request(app).post('/api/v1/shifts/open')
      expect(res.status).toBe(401)
      expect(res.body.success).toBe(false)
      expect(res.body.error.code).toBe('UNAUTHORIZED')
    })

    it('Authorization error correctly formatted', async () => {
      const res = await request(app).get('/api/v1/shifts') // Requires shifts.view
        .set('Authorization', `Bearer ${noPermToken}`)
      
      expect(res.status).toBe(403)
      expect(res.body.success).toBe(false)
      expect(res.body.error.code).toBe('FORBIDDEN')
    })
    
    it('Not Found error correctly formatted (Products)', async () => {
      const res = await request(app).get('/api/v1/products/99999')
        .set('Authorization', `Bearer ${adminToken}`)
      
      expect(res.status).toBe(404)
      expect(res.body.success).toBe(false)
      expect(res.body.error.code).toBe('NOT_FOUND')
    })
  })

  describe('F-019: Maintenance Validation Error', () => {
    it('returns ValidationError instead of 500 when paymentMethodId is missing', async () => {
      const res = await request(app).post('/api/v1/maintenance/99999/pay')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({}) // Missing paymentMethodId
      
      expect(res.status).toBe(400)
      expect(res.body.success).toBe(false)
      expect(res.body.error.code).toBe('VALIDATION_ERROR')
      expect(res.body.error.message).toBe('paymentMethodId is required')
    })
  })
})
