/**
 * GATE 4.2 — Batch 1: Financial / Transaction Integrity
 *
 * F-007: Damage collection missing active-shift enforcement
 *
 * Regression tests confirming that collectCharge() now enforces an active
 * cashier shift before proceeding, consistent with ALL other financial operations
 * (startRental, returnRental, cancelRental, createSale, cancelSale, recordExpense,
 * payRecord).
 *
 * F-005: BLOCKED — Owner decision required. See GATE_4_2_BATCH_1_REPORT.md.
 *
 * Test rules:
 * - Uses koshk_skate_test database ONLY
 * - No mocking of business logic
 * - All fixtures are cleaned up in afterAll in correct FK order
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
import { inspections } from '../db/schema/inspections.js'
import { damageReports } from '../db/schema/damages.js'
import {
  paymentMethods,
  treasuryMovements,
  rentalPayments,
} from '../db/schema/payments.js'
import { cashierShifts } from '../db/schema/treasury.js'
import { collectCharge } from '../modules/damage/damage.service.js'
import { BusinessRuleError } from '../utils/errors.js'

const ADMIN_EMAIL    = process.env.SEED_ADMIN_EMAIL    ?? 'admin@koshkskate.com'
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'Koshk@12345'

describe('Gate 4.2 Batch 1 — F-007: Damage Collection Active-Shift Enforcement', () => {
  let adminToken: string
  let adminId: number
  let defaultPaymentMethodId: number
  let shiftId: number | null = null

  let testSkateId: number
  let testCustomerId: number
  let testRentalId: number
  let testInspectionId: number
  let testDamageReportId: number
  let noShiftUserId: number | null = null

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

    const existingShifts = await db
      .select()
      .from(cashierShifts)
      .where(and(eq(cashierShifts.cashierId, adminId), eq(cashierShifts.status, 'active')))
      .limit(1)
    if (existingShifts.length === 0) {
      const [res] = await db.insert(cashierShifts).values({
        cashierId: adminId,
        openingBalance: '0',
        status: 'active',
      })
      shiftId = res.insertId
    }

    const pm = await db.query.paymentMethods.findFirst({
      where: eq(paymentMethods.isActive, true),
    })
    if (!pm) throw new Error('No active payment method found in test database')
    defaultPaymentMethodId = pm.id

    const skateRes = await request(app)
      .post('/api/v1/skates')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        skateCode: `G42-F007-SK-${Date.now()}`,
        type: 'inline',
        size: '42',
        status: 'available',
        priceMode: 'standard',
      })
    if (skateRes.status !== 201) throw new Error(`Skate creation failed: ${JSON.stringify(skateRes.body)}`)
    testSkateId = skateRes.body.data.id

    const ts = Date.now().toString()
    const custRes = await request(app)
      .post('/api/v1/customers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'G42 F007 Customer',
        nationalId: `8${ts.slice(-13)}`,
        phone: `011${ts.slice(-8)}`,
        trustLevel: 'new',
      })
    if (custRes.status !== 201) throw new Error(`Customer creation failed: ${JSON.stringify(custRes.body)}`)
    testCustomerId = custRes.body.data.id

    const rentalRes = await request(app)
      .post('/api/v1/rentals')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        skateId: testSkateId,
        customerId: testCustomerId,
        durationMinutes: 60,
        payments: [{ paymentMethodId: defaultPaymentMethodId, amount: 120 }],
      })
    if (rentalRes.status !== 201) throw new Error(`Rental creation failed: ${JSON.stringify(rentalRes.body)}`)
    testRentalId = rentalRes.body.data.id

    const [insRes] = await db.insert(inspections).values({
      rentalId: testRentalId,
      skateId: testSkateId,
      inspectedBy: adminId,
      wheelsCondition: 'damaged',
      maintenanceRequired: false,
    })
    testInspectionId = insRes.insertId

    const dmgRes = await request(app)
      .post('/api/v1/damages')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        skateId: testSkateId,
        rentalId: testRentalId,
        inspectionId: testInspectionId,
        customerId: testCustomerId,
        damageType: 'wheel',
        severity: 'minor',
        description: 'Gate 4.2 F-007 regression test damage',
        customerCharge: 100,
        maintenanceRequired: false,
      })
    if (dmgRes.status !== 201) throw new Error(`Damage report creation failed: ${JSON.stringify(dmgRes.body)}`)
    testDamageReportId = dmgRes.body.data.id

    const [noShiftRes] = await db.insert(users).values({
      name: 'NoShift G42 User',
      email: `noshiftg42.${ts}@koshk.test`,
      passwordHash: 'dummy-not-used',
      isActive: true,
    })
    noShiftUserId = noShiftRes.insertId
  })

  afterAll(async () => {
    await db.execute(sql`DELETE FROM treasury_movements WHERE reference_id = ${testDamageReportId} AND reference_type = 'damage_charge_payment'`).catch(() => {})
    await db.execute(sql`DELETE FROM treasury_movements WHERE reference_id = ${testRentalId} AND reference_type IN ('rental_payment', 'rental_refund')`).catch(() => {})
    await db.delete(rentalPayments).where(eq(rentalPayments.rentalId, testRentalId)).catch(() => {})
    if (testDamageReportId) await db.delete(damageReports).where(eq(damageReports.id, testDamageReportId)).catch(() => {})
    if (testInspectionId) await db.delete(inspections).where(eq(inspections.id, testInspectionId)).catch(() => {})
    if (testRentalId) await db.delete(rentals).where(eq(rentals.id, testRentalId)).catch(() => {})
    if (testCustomerId) await db.delete(customers).where(eq(customers.id, testCustomerId)).catch(() => {})
    if (testSkateId) await db.delete(skates).where(eq(skates.id, testSkateId)).catch(() => {})
    if (noShiftUserId) await db.delete(users).where(eq(users.id, noShiftUserId)).catch(() => {})
    if (shiftId !== null) await db.delete(cashierShifts).where(eq(cashierShifts.id, shiftId)).catch(() => {})
  })

  it('TC-F007-01: collectCharge() with no active shift throws NO_ACTIVE_SHIFT, no treasury movement created', async () => {
    await expect(
      collectCharge(testDamageReportId, noShiftUserId!, {
        payments: [{ paymentMethodId: defaultPaymentMethodId, amount: 100 }],
      })
    ).rejects.toMatchObject({ code: 'NO_ACTIVE_SHIFT' })

    const [tmRows] = await pool.execute<any[]>(
      'SELECT COUNT(*) AS cnt FROM treasury_movements WHERE reference_id = ? AND reference_type = ?',
      [testDamageReportId, 'damage_charge_payment']
    )
    expect(Number(tmRows[0].cnt)).toBe(0)

    const [dr] = await db
      .select({ status: damageReports.status, chargeCollected: damageReports.chargeCollected })
      .from(damageReports)
      .where(eq(damageReports.id, testDamageReportId))
      .limit(1)
    expect(dr.status).toBe('pending')
    expect(parseFloat(String(dr.chargeCollected))).toBe(0)
  })

  it('TC-F007-02: collectCharge() with active shift succeeds; treasury_movements.shift_id is NOT NULL', async () => {
    const res = await request(app)
      .post(`/api/v1/damages/${testDamageReportId}/pay`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        payments: [{ paymentMethodId: defaultPaymentMethodId, amount: 100 }],
      })
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)

    const [dr] = await db
      .select({ status: damageReports.status, chargeCollected: damageReports.chargeCollected })
      .from(damageReports)
      .where(eq(damageReports.id, testDamageReportId))
      .limit(1)
    expect(dr.status).toBe('paid')
    expect(parseFloat(String(dr.chargeCollected))).toBe(100)

    // Core F-007 assertion: shift_id must NOT be null in the treasury movement
    const [tmRows] = await pool.execute<any[]>(
      'SELECT shift_id FROM treasury_movements WHERE reference_id = ? AND reference_type = ?',
      [testDamageReportId, 'damage_charge_payment']
    )
    expect(tmRows.length).toBeGreaterThan(0)
    for (const row of tmRows) {
      expect(row.shift_id).not.toBeNull()
      expect(typeof row.shift_id).toBe('number')
    }
  })

  it('TC-F007-03: Re-collecting an already-paid damage report returns 422 ALREADY_PAID', async () => {
    const res = await request(app)
      .post(`/api/v1/damages/${testDamageReportId}/pay`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        payments: [{ paymentMethodId: defaultPaymentMethodId, amount: 100 }],
      })
    expect(res.status).toBe(422)
    expect(res.body.error?.code).toBe('ALREADY_PAID')
  })
})
