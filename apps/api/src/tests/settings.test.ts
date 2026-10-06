/**
 * KOSHK SKATE ERP — Settings Backend Tests
 * Phase 05.5 — Settings Administration
 *
 * Covers:
 *   - GET /api/v1/settings  (authentication, all 5 keys returned)
 *   - PATCH /api/v1/settings authorization (401, 403, 200)
 *   - PATCH validation: unknown key, wrong type, non-object body
 *   - PATCH business-rule validation: hourly_rate, late_fee, duration_options
 *   - PATCH behavior: each setting updates, omitted settings unchanged
 *   - Audit: actual change produces audit entry; unchanged value does not
 *
 * Does NOT duplicate existing F-017 cases in gate42-batch3.test.ts.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import app from '../app.js'
import { db } from '../db/connection.js'
import { users, roles, userRoles } from '../db/schema/users.js'
import { settings } from '../db/schema/settings.js'
import { auditLogs } from '../db/schema/audit.js'
import { eq, and } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { settingsService } from '../modules/settings/settings.service.js'

// ---------------------------------------------------------------------------
// Test state
// ---------------------------------------------------------------------------

const TS = Date.now()

let adminToken: string
let cashierToken: string
let adminId: number
let cashierId: number

// Store the original settings values so we restore them after the suite
let originalSettings: Record<string, any> = {}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function loginAs(email: string): Promise<string> {
  const res = await request(app)
    .post('/api/v1/auth/login')
    .send({ email, password: 'password' })
  return res.body.data.accessToken
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeAll(async () => {
  const passwordHash = await bcrypt.hash('password', 12)

  // Admin user
  const [a] = await db.insert(users).values({
    name: `SettingsAdmin-${TS}`,
    email: `settings-admin-${TS}@test.com`,
    passwordHash,
    isActive: true,
  })
  adminId = a.insertId
  const adminRole = await db.select().from(roles).where(eq(roles.name, 'Administrator')).limit(1)
  await db.insert(userRoles).values({ userId: adminId, roleId: adminRole[0].id })

  // Cashier user (has no settings.manage)
  const [c] = await db.insert(users).values({
    name: `SettingsCashier-${TS}`,
    email: `settings-cashier-${TS}@test.com`,
    passwordHash,
    isActive: true,
  })
  cashierId = c.insertId
  const cashierRole = await db.select().from(roles).where(eq(roles.name, 'Cashier')).limit(1)
  await db.insert(userRoles).values({ userId: cashierId, roleId: cashierRole[0].id })

  adminToken = await loginAs(`settings-admin-${TS}@test.com`)
  cashierToken = await loginAs(`settings-cashier-${TS}@test.com`)

  // Snapshot current settings for restore
  originalSettings = await settingsService.getAll()
})

afterAll(async () => {
  // Restore original settings
  if (Object.keys(originalSettings).length > 0) {
    await settingsService.update(originalSettings, adminId).catch(() => {})
  }

  // Clean up audit entries created by this test suite
  await db.delete(auditLogs).where(eq(auditLogs.userId, adminId)).catch(() => {})

  // Clean up test users
  await db.delete(userRoles).where(eq(userRoles.userId, adminId)).catch(() => {})
  await db.delete(userRoles).where(eq(userRoles.userId, cashierId)).catch(() => {})
  await db.delete(users).where(eq(users.id, adminId)).catch(() => {})
  await db.delete(users).where(eq(users.id, cashierId)).catch(() => {})
})

// ---------------------------------------------------------------------------
// GET /api/v1/settings
// ---------------------------------------------------------------------------

describe('GET /api/v1/settings', () => {
  it('returns 401 when unauthenticated', async () => {
    const res = await request(app).get('/api/v1/settings')
    expect(res.status).toBe(401)
    expect(res.body.success).toBe(false)
    expect(res.body.error.code).toBe('UNAUTHORIZED')
  })

  it('returns all 5 settings for any authenticated user', async () => {
    const res = await request(app)
      .get('/api/v1/settings')
      .set('Authorization', `Bearer ${adminToken}`)
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    const data = res.body.data
    expect(data).toHaveProperty('rental_hourly_rate')
    expect(data).toHaveProperty('rental_duration_options')
    expect(data).toHaveProperty('late_fee_per_minute')
    expect(data).toHaveProperty('print_invoices_enabled')
    expect(data).toHaveProperty('notification_sound_enabled')
  })

  it('returns all 5 settings for Cashier (no settings.manage needed for GET)', async () => {
    const res = await request(app)
      .get('/api/v1/settings')
      .set('Authorization', `Bearer ${cashierToken}`)
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(Object.keys(res.body.data).length).toBeGreaterThanOrEqual(5)
  })

  it('returns rental_hourly_rate as a number', async () => {
    const res = await request(app)
      .get('/api/v1/settings')
      .set('Authorization', `Bearer ${adminToken}`)
    expect(typeof res.body.data.rental_hourly_rate).toBe('number')
  })

  it('returns rental_duration_options as an array', async () => {
    const res = await request(app)
      .get('/api/v1/settings')
      .set('Authorization', `Bearer ${adminToken}`)
    expect(Array.isArray(res.body.data.rental_duration_options)).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// PATCH /api/v1/settings — Authorization
// ---------------------------------------------------------------------------

describe('PATCH /api/v1/settings — authorization', () => {
  it('returns 401 when unauthenticated', async () => {
    const res = await request(app)
      .patch('/api/v1/settings')
      .send({ print_invoices_enabled: false })
    expect(res.status).toBe(401)
    expect(res.body.error.code).toBe('UNAUTHORIZED')
  })

  it('returns 403 when Cashier (no settings.manage) tries to update', async () => {
    const res = await request(app)
      .patch('/api/v1/settings')
      .set('Authorization', `Bearer ${cashierToken}`)
      .send({ print_invoices_enabled: false })
    expect(res.status).toBe(403)
    expect(res.body.error.code).toBe('FORBIDDEN')
  })

  it('returns 200 when Administrator updates a valid setting', async () => {
    const res = await request(app)
      .patch('/api/v1/settings')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ notification_sound_enabled: false })
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// PATCH /api/v1/settings — Input validation (existing + new)
// ---------------------------------------------------------------------------

describe('PATCH /api/v1/settings — input validation', () => {
  it('rejects non-object body', async () => {
    const res = await request(app)
      .patch('/api/v1/settings')
      .set('Authorization', `Bearer ${adminToken}`)
      .send([1, 2, 3])
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
  })

  it('rejects unknown setting key', async () => {
    const res = await request(app)
      .patch('/api/v1/settings')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ unknown_key: 'value' })
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
  })

  it('rejects wrong type for rental_hourly_rate (string instead of number)', async () => {
    const res = await request(app)
      .patch('/api/v1/settings')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ rental_hourly_rate: 'not-a-number' })
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
  })

  it('rejects wrong type for rental_duration_options (non-array)', async () => {
    const res = await request(app)
      .patch('/api/v1/settings')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ rental_duration_options: 30 })
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
  })

  it('rejects wrong type for print_invoices_enabled (non-boolean)', async () => {
    const res = await request(app)
      .patch('/api/v1/settings')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ print_invoices_enabled: 'yes' })
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
  })
})

// ---------------------------------------------------------------------------
// PATCH /api/v1/settings — Business-rule validation (SETT-003, SETT-004)
// ---------------------------------------------------------------------------

describe('PATCH /api/v1/settings — business-rule validation', () => {
  // rental_hourly_rate
  it('rejects rental_hourly_rate = 0', async () => {
    const res = await request(app)
      .patch('/api/v1/settings')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ rental_hourly_rate: 0 })
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
  })

  it('rejects rental_hourly_rate < 0', async () => {
    const res = await request(app)
      .patch('/api/v1/settings')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ rental_hourly_rate: -50 })
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
  })

  it('accepts rental_hourly_rate > 0', async () => {
    const res = await request(app)
      .patch('/api/v1/settings')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ rental_hourly_rate: 120 })
    expect(res.status).toBe(200)
    expect(res.body.data.rental_hourly_rate).toBe(120)
  })

  // late_fee_per_minute
  it('rejects late_fee_per_minute < 0', async () => {
    const res = await request(app)
      .patch('/api/v1/settings')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ late_fee_per_minute: -1 })
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
  })

  it('accepts late_fee_per_minute = 0 (SETT-004: zero = no late fee is valid)', async () => {
    const res = await request(app)
      .patch('/api/v1/settings')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ late_fee_per_minute: 0 })
    expect(res.status).toBe(200)
    expect(res.body.data.late_fee_per_minute).toBe(0)
  })

  it('accepts late_fee_per_minute > 0', async () => {
    const res = await request(app)
      .patch('/api/v1/settings')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ late_fee_per_minute: 2 })
    expect(res.status).toBe(200)
    expect(res.body.data.late_fee_per_minute).toBe(2)
  })

  // rental_duration_options — SETT-003
  it('rejects empty duration array', async () => {
    const res = await request(app)
      .patch('/api/v1/settings')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ rental_duration_options: [] })
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
  })

  it('rejects duration array with non-positive integer (0)', async () => {
    const res = await request(app)
      .patch('/api/v1/settings')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ rental_duration_options: [15, 0, 30] })
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
  })

  it('rejects duration array with negative integer', async () => {
    const res = await request(app)
      .patch('/api/v1/settings')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ rental_duration_options: [-15, 30] })
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
  })

  it('rejects duration array with decimal value', async () => {
    const res = await request(app)
      .patch('/api/v1/settings')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ rental_duration_options: [15.5, 30] })
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
  })

  it('rejects duration array with duplicates', async () => {
    const res = await request(app)
      .patch('/api/v1/settings')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ rental_duration_options: [15, 15, 30] })
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
  })

  it('rejects duration array not in ascending order', async () => {
    const res = await request(app)
      .patch('/api/v1/settings')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ rental_duration_options: [30, 15, 45] })
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
  })

  it('accepts valid duration array (positive integers, unique, ascending)', async () => {
    const res = await request(app)
      .patch('/api/v1/settings')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ rental_duration_options: [15, 30, 45, 60, 90] })
    expect(res.status).toBe(200)
    expect(res.body.data.rental_duration_options).toEqual([15, 30, 45, 60, 90])
  })
})

// ---------------------------------------------------------------------------
// PATCH /api/v1/settings — Update behavior
// ---------------------------------------------------------------------------

describe('PATCH /api/v1/settings — update behavior', () => {
  it('updates only supplied settings; omitted settings remain unchanged', async () => {
    // Get current state
    const before = await settingsService.getAll()

    // Update only notification_sound_enabled
    const newVal = !before.notification_sound_enabled
    const res = await request(app)
      .patch('/api/v1/settings')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ notification_sound_enabled: newVal })

    expect(res.status).toBe(200)
    const data = res.body.data

    // Updated setting reflects new value
    expect(data.notification_sound_enabled).toBe(newVal)

    // Omitted settings are unchanged
    expect(data.rental_hourly_rate).toBe(before.rental_hourly_rate)
    expect(data.late_fee_per_minute).toBe(before.late_fee_per_minute)
    expect(data.print_invoices_enabled).toBe(before.print_invoices_enabled)
    expect(JSON.stringify(data.rental_duration_options))
      .toBe(JSON.stringify(before.rental_duration_options))
  })

  it('persists updated value — subsequent GET returns new value', async () => {
    await request(app)
      .patch('/api/v1/settings')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ print_invoices_enabled: false })

    const res = await request(app)
      .get('/api/v1/settings')
      .set('Authorization', `Bearer ${adminToken}`)

    expect(res.body.data.print_invoices_enabled).toBe(false)
  })

  it('can update multiple settings in a single PATCH', async () => {
    const res = await request(app)
      .patch('/api/v1/settings')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        rental_hourly_rate: 150,
        late_fee_per_minute: 3,
        print_invoices_enabled: true,
      })
    expect(res.status).toBe(200)
    expect(res.body.data.rental_hourly_rate).toBe(150)
    expect(res.body.data.late_fee_per_minute).toBe(3)
    expect(res.body.data.print_invoices_enabled).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Audit behavior
// ---------------------------------------------------------------------------

describe('PATCH /api/v1/settings — audit behavior', () => {
  it('creates an audit entry when a setting actually changes', async () => {
    // Ensure known state
    const before = await settingsService.getAll()
    const newRate = before.rental_hourly_rate === 100 ? 120 : 100

    await request(app)
      .patch('/api/v1/settings')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ rental_hourly_rate: newRate })

    const auditEntry = await db
      .select()
      .from(auditLogs)
      .where(and(
        eq(auditLogs.userId, adminId),
        eq(auditLogs.action, 'UPDATE_SETTINGS'),
        eq(auditLogs.entityId, 'rental_hourly_rate')
      ))
      .limit(1)

    expect(auditEntry.length).toBe(1)
  })

  it('does NOT create an audit entry when rental_duration_options is set to the same value (RISK-003 fix)', async () => {
    // Get current duration options
    const current = await settingsService.getAll()
    const currentDurations: number[] = current.rental_duration_options

    // Delete any prior audit entries for this key for our admin user
    await db
      .delete(auditLogs)
      .where(and(
        eq(auditLogs.userId, adminId),
        eq(auditLogs.action, 'UPDATE_SETTINGS'),
        eq(auditLogs.entityId, 'rental_duration_options')
      ))
      .catch(() => {})

    // PATCH with the exact same value
    await request(app)
      .patch('/api/v1/settings')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ rental_duration_options: currentDurations })

    // No audit entry should be created for semantically unchanged value
    const auditEntry = await db
      .select()
      .from(auditLogs)
      .where(and(
        eq(auditLogs.userId, adminId),
        eq(auditLogs.action, 'UPDATE_SETTINGS'),
        eq(auditLogs.entityId, 'rental_duration_options')
      ))
      .limit(1)

    expect(auditEntry.length).toBe(0)
  })
})
