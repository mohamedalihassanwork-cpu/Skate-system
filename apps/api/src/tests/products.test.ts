import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import app from '../app.js'
import { db } from '../db/connection.js'
import { users, userRoles, roles } from '../db/schema/index.js'
import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'
import { productCategories, products } from '../db/schema/products.js'

async function loginAdmin(): Promise<string> {
  const res = await request(app).post('/api/v1/auth/login').send({ email: 'admin@koshkskate.com', password: process.env.SEED_ADMIN_PASSWORD ?? 'Koshk@12345' })
  return res.body.data.accessToken
}

async function loginCashier(): Promise<string> {
  const res = await request(app).post('/api/v1/auth/login').send({ email: 'productcashier@test.com', password: 'password' })
  return res.body.data.accessToken
}

describe('Products API', () => {
  let adminToken: string
  let cashierToken: string
  let categoryId: number
  let productId: number

  beforeAll(async () => {
    // Ensure Cashier user exists with Cashier role
    const existing = await db.select().from(users).where(eq(users.email, 'productcashier@test.com')).limit(1)
    if (!existing.length) {
      const [res] = await db.insert(users).values({
        name: 'Product Cashier',
        email: 'productcashier@test.com',
        passwordHash: await bcrypt.hash('password', 12),
        isActive: true,
      })
      const cashierRole = await db.select().from(roles).where(eq(roles.name, 'Cashier')).limit(1)
      await db.insert(userRoles).values({ userId: res.insertId, roleId: cashierRole[0].id })
    }

    adminToken = await loginAdmin()
    cashierToken = await loginCashier()
  })

  afterAll(async () => {
    // Use ID-based cleanup (not name pattern) to avoid cross-test FK conflicts.
    if (productId) {
      const { saleItems } = await import('../db/schema/sales.js')
      await db.delete(saleItems).where(eq(saleItems.productId, productId)).catch(() => {})
      await db.delete(products).where(eq(products.id, productId)).catch(() => {})
    }
    if (categoryId) {
      await db.delete(products).where(eq(products.categoryId, categoryId)).catch(() => {})
      await db.delete(productCategories).where(eq(productCategories.id, categoryId)).catch(() => {})
    }
  })

  it('Admin can create a category', async () => {
    const res = await request(app)
      .post('/api/v1/products/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Spare Parts Test',
        nameAr: 'قطع غيار تست'
      })
    
    if (res.status !== 201) {
      console.log('Category creation failed:', res.body)
    }
    expect(res.status).toBe(201)
    expect(res.body.success).toBe(true)
    categoryId = res.body.data.id
  })

  it('Admin can create a product', async () => {
    const res = await request(app)
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Wheel 80mm Test',
        nameAr: 'عجلة 80 مم تست',
        categoryId,
        price: 150,
        stockQuantity: 10
      })
    
    expect(res.status).toBe(201)
    expect(res.body.success).toBe(true)
    productId = res.body.data.id
  })

  it('Cashier cannot create a product', async () => {
    const res = await request(app)
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${cashierToken}`)
      .send({
        name: 'Bearing Test',
        nameAr: 'رمان بلي تست',
        categoryId,
        price: 50,
        stockQuantity: 20
      })
    
    expect(res.status).toBe(403)
  })

  it('Cashier can view products', async () => {
    const res = await request(app)
      .get('/api/v1/products')
      .set('Authorization', `Bearer ${cashierToken}`)
    
    if (res.status !== 200) {
      console.log('Cashier view products failed:', res.body)
    }
    expect(res.status).toBe(200)
    expect(res.body.data.length).toBeGreaterThan(0)
  })

  it('Admin can adjust stock quantity', async () => {
    const res = await request(app)
      .put(`/api/v1/products/${productId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        stockQuantity: 15
      })
    
    if (res.status !== 200) {
      console.log('Admin adjust stock failed:', res.body)
    }
    expect(res.status).toBe(200)
    expect(res.body.data.stockQuantity).toBe(15)
  })

  it('Cannot set negative stock quantity', async () => {
    const res = await request(app)
      .put(`/api/v1/products/${productId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        stockQuantity: -5
      })
    
    expect(res.status).toBe(422)
    expect(res.body.error.code).toBe('STOCK_CANNOT_BE_NEGATIVE')
  })
})
