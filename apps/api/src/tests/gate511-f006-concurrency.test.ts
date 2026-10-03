/**
 * GATE 5.1.1 — F-006: Concurrency Safety Regression Tests
 *
 * Invariant: Two concurrent calls to POST /api/v1/maintenance with the
 * same damageReportId (or inspectionId) MUST result in exactly ONE
 * maintenance_record row. The losing request must receive 422
 * DUPLICATE_MAINTENANCE_RECORD.
 *
 * Root cause of the original vulnerability (pre-fix):
 *   The duplicate-check SELECT inside db.transaction() read a consistent
 *   snapshot (REPEATABLE-READ default). Both concurrent transactions saw
 *   0 rows, passed the guard, and both inserted — producing a duplicate.
 *
 * Fix applied (Gate 5.1.1):
 *   Both duplicate-check SELECTs now use .for('update'). This acquires a
 *   next-key lock on the damageReportId / inspectionId index range.
 *   The second concurrent transaction blocks until the first commits, then
 *   re-reads with the lock held, finds the existing row, and throws
 *   DUPLICATE_MAINTENANCE_RECORD.
 *
 * Concurrency technique:
 *   Promise.allSettled() with supertest HTTP requests — the same pattern
 *   used by TC-F003-02 (invoice concurrency) in gate41-remediation.test.ts.
 *   This fires genuinely concurrent database transactions without artificial
 *   sleeps, relying on the event loop and connection pool to interleave them.
 *
 * DB invariant asserted:
 *   COUNT(*) of maintenance_records WHERE damage_report_id = X equals 1
 *   COUNT(*) of maintenance_records WHERE inspection_id = Y equals 1
 *
 * Test isolation:
 *   All fixtures created with unique timestamps.
 *   afterAll cleans in FK-safe order scoped to this test's IDs only.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import app from '../app.js'
import { db, pool } from '../db/connection.js'
import { users } from '../db/schema/users.js'
import { skates } from '../db/schema/skates.js'
import { customers } from '../db/schema/customers.js'
import { rentals } from '../db/schema/rentals.js'
import { maintenanceRecords, maintenanceParts } from '../db/schema/maintenance.js'
import { damageReports } from '../db/schema/damages.js'
import { inspections } from '../db/schema/inspections.js'
import { eq, and, sql } from 'drizzle-orm'
import bcrypt from 'bcryptjs'

const ADMIN_EMAIL    = process.env.SEED_ADMIN_EMAIL    ?? 'admin@koshkskate.com'
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'Koshk@12345'

describe('Gate 5.1.1 — F-006: Concurrency Safety', () => {
  let adminToken: string
  let adminId: number

  // Fixture IDs scoped to this test
  const skateIds: number[] = []
  const rentalIds: number[] = []
  let customerId: number
  let damageReportId: number
  let inspectionId: number

  const ts = Date.now()

  beforeAll(async () => {
    // Admin login
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
    if (loginRes.status !== 200) throw new Error(`Admin login failed: ${JSON.stringify(loginRes.body)}`)
    adminToken = loginRes.body.data.accessToken
    const adminUser = await db.query.users.findFirst({ where: eq(users.email, ADMIN_EMAIL) })
    adminId = adminUser!.id

    // ── Shared customer ───────────────────────────────────────────────────────
    const [custRes] = await db.insert(customers).values({
      name: `F006Conc ${ts}`,
      phone: `099${ts.toString().slice(-8)}`,
      isActive: true,
      registrationDate: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    customerId = custRes.insertId

    // ── Two skates: one for damageReport test, one for inspection test ────────
    const conn = await pool.getConnection()
    try {
      for (const suffix of ['DMG', 'INS']) {
        const [skRes] = await conn.execute<any>(
          `INSERT INTO skates (skate_code, qr_code, barcode, size, status, is_active, created_at, updated_at)
           VALUES (?, ?, ?, '42', 'rented', 1, NOW(), NOW())`,
          [`F006C-${suffix}-${ts}`, `F006C-${suffix}-${ts}`, `F006C-${suffix}-${ts}`]
        )
        skateIds.push(skRes.insertId)

        // Minimal rental for FK chain
        const [rentRes] = await conn.execute<any>(
          `INSERT INTO rentals (rental_code, skate_id, customer_id, cashier_id, duration_minutes,
             price_per_hour, rental_amount, started_at, expected_end_at, status, created_at, updated_at)
           VALUES ('RN-TEMP-${suffix}', ?, ?, ?, 60, '120.00', '120.00', NOW(),
                   DATE_ADD(NOW(), INTERVAL 1 HOUR), 'active', NOW(), NOW())`,
          [skRes.insertId, customerId, adminId]
        )
        const rentalId = rentRes.insertId
        // Conform to DEC-062 format
        await conn.execute('UPDATE rentals SET rental_code = ? WHERE id = ?', [
          `RN-${rentalId.toString().padStart(5, '0')}`,
          rentalId,
        ])
        rentalIds.push(rentalId)
      }

      // Damage report linked to skate 0 / rental 0
      const [insRes0] = await conn.execute<any>(
        `INSERT INTO inspections (rental_id, skate_id, inspected_by, maintenance_required, wheels_condition, created_at)
         VALUES (?, ?, ?, 0, 'good', NOW())`,
        [rentalIds[0], skateIds[0], adminId]
      )
      const dmgInspId = insRes0.insertId

      const [dmgRes] = await conn.execute<any>(
        `INSERT INTO damage_reports (skate_id, rental_id, inspection_id, customer_id, reported_by,
           damage_type, severity, description, customer_charge, maintenance_required, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 'wheel', 'minor', 'F006 concurrency test', 0, 1, 'pending', NOW(), NOW())`,
        [skateIds[0], rentalIds[0], dmgInspId, customerId, adminId]
      )
      damageReportId = dmgRes.insertId

      // Inspection linked to skate 1 / rental 1 (for inspectionId test)
      const [insRes1] = await conn.execute<any>(
        `INSERT INTO inspections (rental_id, skate_id, inspected_by, maintenance_required, wheels_condition, created_at)
         VALUES (?, ?, ?, 1, 'damaged', NOW())`,
        [rentalIds[1], skateIds[1], adminId]
      )
      inspectionId = insRes1.insertId
    } finally {
      conn.release()
    }

    // Put skates into maintenance status so createRecord doesn't fail skate-status check
    for (const id of skateIds) {
      await db.execute(sql`UPDATE skates SET status = 'maintenance', updated_at = NOW() WHERE id = ${id}`)
    }
  })

  afterAll(async () => {
    // FK-safe order, scoped to this test's IDs only
    await db.execute(sql`DELETE FROM maintenance_parts WHERE maintenance_id IN (SELECT id FROM maintenance_records WHERE damage_report_id = ${damageReportId} OR inspection_id = ${inspectionId})`).catch(() => {})
    await db.execute(sql`DELETE FROM maintenance_records WHERE damage_report_id = ${damageReportId}`).catch(() => {})
    await db.execute(sql`DELETE FROM maintenance_records WHERE inspection_id = ${inspectionId}`).catch(() => {})
    await db.execute(sql`DELETE FROM damage_reports WHERE id = ${damageReportId}`).catch(() => {})
    await db.execute(sql`DELETE FROM inspections WHERE rental_id IN (${rentalIds[0]}, ${rentalIds[1]})`).catch(() => {})
    for (const id of rentalIds) {
      await db.execute(sql`DELETE FROM rentals WHERE id = ${id}`).catch(() => {})
    }
    for (const id of skateIds) {
      await db.execute(sql`UPDATE skates SET status = 'available', updated_at = NOW() WHERE id = ${id}`).catch(() => {})
      await db.execute(sql`DELETE FROM skates WHERE id = ${id}`).catch(() => {})
    }
    await db.execute(sql`DELETE FROM customers WHERE id = ${customerId}`).catch(() => {})
  })

  // ══════════════════════════════════════════════════════════════════════════
  // TC-F006-CONC-01: Concurrent creation by damageReportId
  // ══════════════════════════════════════════════════════════════════════════
  it('TC-F006-CONC-01: Concurrent POST /maintenance with same damageReportId produces exactly 1 record', async () => {
    const CONCURRENCY = 5

    // Fire CONCURRENCY simultaneous requests for the same damageReportId
    const results = await Promise.allSettled(
      Array.from({ length: CONCURRENCY }, () =>
        request(app)
          .post('/api/v1/maintenance')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            skateId: skateIds[0],
            damageReportId,
            problemDescription: 'Concurrent damage record attempt',
          })
      )
    )

    const statuses = results.map(r =>
      r.status === 'fulfilled' ? r.value.status : 'rejected'
    )

    // Exactly 1 request must have succeeded (201)
    const successCount = statuses.filter(s => s === 201).length
    expect(successCount).toBe(1)

    // All others must have received 422 DUPLICATE_MAINTENANCE_RECORD
    const duplicateCount = statuses.filter(s => s === 422).length
    expect(duplicateCount).toBe(CONCURRENCY - 1)

    // Verify 422 responses carry the correct error code
    const failedResults = results.filter(
      r => r.status === 'fulfilled' && r.value.status === 422
    ) as PromiseFulfilledResult<any>[]
    for (const r of failedResults) {
      expect(r.value.body.error?.code).toBe('DUPLICATE_MAINTENANCE_RECORD')
    }

    // DB INVARIANT: exactly 1 maintenance_record for this damageReportId
    const [rows] = await pool.execute<any[]>(
      'SELECT id FROM maintenance_records WHERE damage_report_id = ?',
      [damageReportId]
    )
    expect(rows.length).toBe(1)
  })

  // ══════════════════════════════════════════════════════════════════════════
  // TC-F006-CONC-02: Concurrent creation by inspectionId
  // ══════════════════════════════════════════════════════════════════════════
  it('TC-F006-CONC-02: Concurrent POST /maintenance with same inspectionId produces exactly 1 record', async () => {
    const CONCURRENCY = 5

    const results = await Promise.allSettled(
      Array.from({ length: CONCURRENCY }, () =>
        request(app)
          .post('/api/v1/maintenance')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            skateId: skateIds[1],
            inspectionId,
            problemDescription: 'Concurrent inspection record attempt',
          })
      )
    )

    const statuses = results.map(r =>
      r.status === 'fulfilled' ? r.value.status : 'rejected'
    )

    const successCount = statuses.filter(s => s === 201).length
    expect(successCount).toBe(1)

    const duplicateCount = statuses.filter(s => s === 422).length
    expect(duplicateCount).toBe(CONCURRENCY - 1)

    const failedResults = results.filter(
      r => r.status === 'fulfilled' && r.value.status === 422
    ) as PromiseFulfilledResult<any>[]
    for (const r of failedResults) {
      expect(r.value.body.error?.code).toBe('DUPLICATE_MAINTENANCE_RECORD')
    }

    // DB INVARIANT: exactly 1 maintenance_record for this inspectionId
    const [rows] = await pool.execute<any[]>(
      'SELECT id FROM maintenance_records WHERE inspection_id = ?',
      [inspectionId]
    )
    expect(rows.length).toBe(1)
  })

  // ══════════════════════════════════════════════════════════════════════════
  // TC-F006-CONC-03: No skate state pollution — skate remains 'maintenance'
  // after all concurrent attempts regardless of how many succeeded
  // ══════════════════════════════════════════════════════════════════════════
  it('TC-F006-CONC-03: Skate status is maintenance after concurrent attempts — no state thrashing', async () => {
    for (const id of skateIds) {
      const [rows] = await pool.execute<any[]>(
        'SELECT status FROM skates WHERE id = ?', [id]
      )
      // Skate should remain in maintenance (set by the single winning insert)
      expect(rows[0].status).toBe('maintenance')
    }
  })
})
