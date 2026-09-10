/**
 * KOSHK SKATE ERP — Phase 03 Skates Integration Tests
 *
 * Tests:
 *   TC-SK-01: Create skate with all fields including custom skate_code → 201
 *   TC-SK-02: Create skate without skate_code → system auto-generates SK-NNN → 201
 *   TC-SK-03: Create skate with duplicate skate_code → 409
 *   TC-SK-04: Create skate missing required field (size) → 400
 *   TC-SK-05: List skates → 200, returns array
 *   TC-SK-06: Get skate by ID → 200
 *   TC-SK-07: Get nonexistent skate ID → 404
 *   TC-SK-08: Update skate (size, notes) → 200
 *   TC-SK-09: Update skate status to maintenance → 200
 *   TC-SK-10: Update skate status = rented → 422 (business rule violation)
 *   TC-SK-11: Update skate status = reserved → 422 (business rule violation)
 *   TC-SK-12: List skates with status=available filter → 200, filtered
 *   TC-SK-13: Get skate history → 200, empty stub arrays
 *   TC-SK-14: Get available skates → 200
 *   TC-SK-15: Unauthenticated create → 401
 *   TC-SK-16: Create without skates.create permission (Cashier role) → 403
 *
 * Requires:
 *   - Local MySQL DB `koshk_skate` with seed data applied
 *   - `apps/api/.env` with valid credentials
 *   - Phase 03 migration applied (skates table exists)
 *
 * IMPORTANT: Tests use the real DB. They do NOT mock the DB or JWT.
 *   All test skates are cleaned up in afterAll.
 */

import 'dotenv/config'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import supertest from 'supertest'
import bcrypt from 'bcryptjs'
import { eq, like } from 'drizzle-orm'

import app from '../app.js'
import { db } from '../db/connection.js'
import { users, userRoles } from '../db/schema/index.js'
import { skates } from '../db/schema/skates.js'

const request = supertest(app)

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ADMIN_EMAIL    = process.env.SEED_ADMIN_EMAIL    ?? 'admin@koshkskate.com'
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'Koshk@12345'

// Unique code used across tests — prefix T99 to avoid collision with SK-NNN auto sequence
const TEST_SKATE_CODE   = 'T99-TEST-001'
const TEST_SKATE_CODE_2 = 'T99-TEST-002'
const CASHIER_EMAIL     = 'test.cashier.skates@koshkskate.com'

// ---------------------------------------------------------------------------
// State shared between tests
// ---------------------------------------------------------------------------

let adminToken: string
let createdSkateId: number
let autoGenSkateId: number
let cashierToken: string

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function loginAdmin(): Promise<string> {
  const res = await request
    .post('/api/v1/auth/login')
    .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
  return res.body.data.accessToken as string
}

async function loginCashier(): Promise<string> {
  const res = await request
    .post('/api/v1/auth/login')
    .send({ email: CASHIER_EMAIL, password: 'CashierSkates@99' })
  return res.body.data.accessToken as string
}

// ---------------------------------------------------------------------------
// Setup / Teardown
// ---------------------------------------------------------------------------

beforeAll(async () => {
  // Create a cashier test user (no skates.create permission)
  const existing = await db.select().from(users).where(eq(users.email, CASHIER_EMAIL)).limit(1)
  if (!existing.length) {
    await db.insert(users).values({
      name: 'كاشير اختبار زلاجات',
      email: CASHIER_EMAIL,
      passwordHash: await bcrypt.hash('CashierSkates@99', 12),
      isActive: true,
      // No role → no permissions → any requirePermission will fail with 403
    })
  }

  adminToken  = await loginAdmin()
  cashierToken = await loginCashier()

  // Clean up any leftover test skates from a previous run
  await db.delete(skates).where(like(skates.skateCode, 'T99-%'))
})

afterAll(async () => {
  // Remove test skates
  await db.delete(skates).where(like(skates.skateCode, 'T99-%'))

  // Remove auto-generated skates created in TC-SK-02 (identified by ID)
  if (autoGenSkateId) {
    await db.delete(skates).where(eq(skates.id, autoGenSkateId))
  }

  // Remove cashier test user
  const found = await db.select().from(users).where(eq(users.email, CASHIER_EMAIL)).limit(1)
  if (found.length) {
    await db.delete(userRoles).where(eq(userRoles.userId, found[0].id))
    await db.delete(users).where(eq(users.id, found[0].id))
  }
})

// ---------------------------------------------------------------------------
// TC-SK-01: Create skate with all fields including custom skate_code
// ---------------------------------------------------------------------------

describe('TC-SK-01: Create skate with custom skate_code', () => {
  it('returns 201 and created skate with correct fields', async () => {
    const res = await request
      .post('/api/v1/skates')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        skateCode:    TEST_SKATE_CODE,
        size:         '42',
        type:         'تزلج فني',
        status:       'available',
        condition:    'good',
        purchaseDate: '2026-01-15',
        purchaseCost: 350.00,
        notes:        'زلاجة تجريبية',
      })

    expect(res.status).toBe(201)
    expect(res.body.success).toBe(true)
    expect(res.body.data.skateCode).toBe(TEST_SKATE_CODE)
    expect(res.body.data.size).toBe('42')
    expect(res.body.data.status).toBe('available')
    expect(res.body.data.condition).toBe('good')
    expect(res.body.data.isActive).toBe(true)
    // DEC-032: qr_code and barcode auto-set to skate_code
    expect(res.body.data.qrCode).toBe(TEST_SKATE_CODE)
    expect(res.body.data.barcode).toBe(TEST_SKATE_CODE)

    createdSkateId = res.body.data.id
    expect(createdSkateId).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// TC-SK-02: Create skate without skate_code → system auto-generates SK-NNN
// ---------------------------------------------------------------------------

describe('TC-SK-02: Create skate without skate_code — auto-generation', () => {
  it('returns 201 and auto-generated skate_code matching SK-NNN pattern', async () => {
    const res = await request
      .post('/api/v1/skates')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        size:      '38',
        condition: 'fair',
      })

    expect(res.status).toBe(201)
    expect(res.body.success).toBe(true)

    const code = res.body.data.skateCode as string
    expect(code).toBeDefined()
    // Must match SK-NNN format (3-digit zero-padded)
    expect(code).toMatch(/^SK-\d{3}$/)

    // DEC-032: qr_code and barcode auto-set to generated skate_code
    expect(res.body.data.qrCode).toBe(code)
    expect(res.body.data.barcode).toBe(code)

    autoGenSkateId = res.body.data.id
    expect(autoGenSkateId).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// TC-SK-03: Create skate with duplicate skate_code → 409
// ---------------------------------------------------------------------------

describe('TC-SK-03: Duplicate skate_code', () => {
  it('returns 409 when skate_code already exists', async () => {
    const res = await request
      .post('/api/v1/skates')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        skateCode: TEST_SKATE_CODE,   // same as TC-SK-01
        size:      '42',
      })

    expect(res.status).toBe(409)
    expect(res.body.success).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// TC-SK-04: Create skate missing required field (size) → 400
// ---------------------------------------------------------------------------

describe('TC-SK-04: Missing required field', () => {
  it('returns 400 when size is missing', async () => {
    const res = await request
      .post('/api/v1/skates')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        skateCode: TEST_SKATE_CODE_2,
        // size intentionally omitted
      })

    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// TC-SK-05: List skates → 200, returns paginated array
// ---------------------------------------------------------------------------

describe('TC-SK-05: List skates', () => {
  it('returns 200 with data array and pagination', async () => {
    const res = await request
      .get('/api/v1/skates')
      .set('Authorization', `Bearer ${adminToken}`)

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(Array.isArray(res.body.data)).toBe(true)
    expect(res.body.pagination).toBeDefined()
    expect(typeof res.body.pagination.total).toBe('number')
    expect(res.body.pagination.total).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// TC-SK-06: Get skate by ID → 200
// ---------------------------------------------------------------------------

describe('TC-SK-06: Get skate by ID', () => {
  it('returns 200 with skate data', async () => {
    const res = await request
      .get(`/api/v1/skates/${createdSkateId}`)
      .set('Authorization', `Bearer ${adminToken}`)

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.id).toBe(createdSkateId)
    expect(res.body.data.skateCode).toBe(TEST_SKATE_CODE)
  })
})

// ---------------------------------------------------------------------------
// TC-SK-07: Get nonexistent skate ID → 404
// ---------------------------------------------------------------------------

describe('TC-SK-07: Get nonexistent skate', () => {
  it('returns 404', async () => {
    const res = await request
      .get('/api/v1/skates/999999')
      .set('Authorization', `Bearer ${adminToken}`)

    expect(res.status).toBe(404)
    expect(res.body.success).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// TC-SK-08: Update skate — change size and notes → 200
// ---------------------------------------------------------------------------

describe('TC-SK-08: Update skate', () => {
  it('returns 200 with updated fields', async () => {
    const res = await request
      .put(`/api/v1/skates/${createdSkateId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        size:  '43',
        notes: 'تم التحديث في الاختبار',
      })

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.size).toBe('43')
    expect(res.body.data.notes).toBe('تم التحديث في الاختبار')
    expect(res.body.data.skateCode).toBe(TEST_SKATE_CODE) // unchanged
  })
})

// ---------------------------------------------------------------------------
// TC-SK-09: Update skate status to maintenance → 200
// ---------------------------------------------------------------------------

describe('TC-SK-09: Update status to maintenance', () => {
  it('returns 200 with updated status', async () => {
    const res = await request
      .put(`/api/v1/skates/${createdSkateId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'maintenance' })

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.status).toBe('maintenance')
  })
})

// ---------------------------------------------------------------------------
// TC-SK-10: Update skate status = rented → 422 (business rule violation)
// DEC-031: rented is controlled by Rental workflow only
// ---------------------------------------------------------------------------

describe('TC-SK-10: Block setting status=rented via admin API', () => {
  it('returns 422 SKATE_STATUS_NOT_ALLOWED', async () => {
    const res = await request
      .put(`/api/v1/skates/${createdSkateId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'rented' })

    expect(res.status).toBe(422)
    expect(res.body.success).toBe(false)
    expect(res.body.error?.code).toBe('SKATE_STATUS_NOT_ALLOWED')
  })
})

// ---------------------------------------------------------------------------
// TC-SK-11: Update skate status = reserved → 422 (business rule violation)
// DEC-031: reserved is controlled by Reservation workflow only
// ---------------------------------------------------------------------------

describe('TC-SK-11: Block setting status=reserved via admin API', () => {
  it('returns 422 SKATE_STATUS_NOT_ALLOWED', async () => {
    const res = await request
      .put(`/api/v1/skates/${createdSkateId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'reserved' })

    expect(res.status).toBe(422)
    expect(res.body.success).toBe(false)
    expect(res.body.error?.code).toBe('SKATE_STATUS_NOT_ALLOWED')
  })
})

// ---------------------------------------------------------------------------
// TC-SK-12: List skates with status=available filter
// ---------------------------------------------------------------------------

describe('TC-SK-12: List skates filtered by status=available', () => {
  it('returns 200 and only available skates', async () => {
    const res = await request
      .get('/api/v1/skates?status=available')
      .set('Authorization', `Bearer ${adminToken}`)

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(Array.isArray(res.body.data)).toBe(true)
    // Every returned skate must have status=available
    for (const skate of res.body.data) {
      expect(skate.status).toBe('available')
    }
  })
})

// ---------------------------------------------------------------------------
// TC-SK-13: Get skate history → 200 with empty stub arrays
// ---------------------------------------------------------------------------

describe('TC-SK-13: Get skate history (stub)', () => {
  it('returns 200 with skate and empty arrays for future modules', async () => {
    const res = await request
      .get(`/api/v1/skates/${createdSkateId}/history`)
      .set('Authorization', `Bearer ${adminToken}`)

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.skate).toBeDefined()
    expect(res.body.data.skate.id).toBe(createdSkateId)
    expect(Array.isArray(res.body.data.rentals)).toBe(true)
    expect(Array.isArray(res.body.data.inspections)).toBe(true)
    expect(Array.isArray(res.body.data.damageReports)).toBe(true)
    expect(Array.isArray(res.body.data.maintenanceRecords)).toBe(true)
    expect(res.body.data.rentals.length).toBe(0)
    expect(res.body.data.maintenanceRecords.length).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// TC-SK-14: Get available skates endpoint
// ---------------------------------------------------------------------------

describe('TC-SK-14: Get available skates', () => {
  it('returns 200 with array of available skates', async () => {
    const res = await request
      .get('/api/v1/skates/available')
      .set('Authorization', `Bearer ${adminToken}`)

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(Array.isArray(res.body.data)).toBe(true)
    // The auto-generated skate from TC-SK-02 should be in available list
    const codes = res.body.data.map((s: any) => s.skateCode)
    expect(codes.some((c: string) => /^SK-\d{3}$/.test(c))).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// TC-SK-15: Unauthenticated create → 401
// ---------------------------------------------------------------------------

describe('TC-SK-15: Unauthenticated create', () => {
  it('returns 401 when no token provided', async () => {
    const res = await request
      .post('/api/v1/skates')
      .send({ skateCode: 'T99-NOAUTH', size: '40' })
    // No Authorization header

    expect(res.status).toBe(401)
    expect(res.body.success).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// TC-SK-16: Create without skates.create permission → 403
// ---------------------------------------------------------------------------

describe('TC-SK-16: Insufficient permission (Cashier role)', () => {
  it('returns 403 when user lacks skates.create permission', async () => {
    const res = await request
      .post('/api/v1/skates')
      .set('Authorization', `Bearer ${cashierToken}`)
      .send({ skateCode: 'T99-NOPERM', size: '40' })

    expect(res.status).toBe(403)
    expect(res.body.success).toBe(false)
  })
})
