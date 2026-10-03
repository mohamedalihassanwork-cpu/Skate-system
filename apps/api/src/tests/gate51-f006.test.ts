/**
 * GATE 5.1 — F-006: Double Maintenance Record Risk — Regression Test
 *
 * Invariant under test:
 *   A single logical maintenance event (identified by a damageReportId or
 *   inspectionId) MUST NOT create more than one maintenance_records row.
 *
 * Root cause addressed:
 *   maintenanceService.createRecord() previously had no check for an
 *   existing record linked to the same damageReportId or inspectionId.
 *   damage.service.createDamageReport() auto-creates a record when
 *   maintenanceRequired=true. A subsequent manual call to POST /maintenance
 *   for the same damage/inspection would insert a second row.
 *
 * Fix applied (Gate 5.1):
 *   createRecord() now queries for an existing record by damageReportId
 *   (or inspectionId) inside the same transaction before inserting, and
 *   throws DUPLICATE_MAINTENANCE_RECORD if one already exists.
 *
 * Test isolation:
 *   - All fixtures created with unique timestamps.
 *   - afterAll cleans up in FK-safe order, scoped to this test's IDs only.
 *   - No global DELETE operations.
 *   - inspections requires a valid rental_id (NOT NULL in DB); a minimal
 *     rental is created via pool.execute to satisfy the FK.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { db, pool } from '../db/connection'
import {
  maintenanceRecords,
  maintenanceParts,
  skates,
  users,
  auditLogs,
} from '../db/schema'
import { damageReports } from '../db/schema/damages'
import { inspections } from '../db/schema/inspections'
import { rentals } from '../db/schema/rentals'
import { customers } from '../db/schema/customers'
import { maintenanceService } from '../modules/maintenance/maintenance.service'
import { eq, inArray } from 'drizzle-orm'
import { BusinessRuleError } from '../utils/errors'

describe('Gate 5.1 — F-006: Duplicate Maintenance Record Prevention', () => {
  let adminId: number
  let customerId: number     // needed for rentals.customer_id FK
  let skateId1: number
  let skateId2: number
  let skateId3: number
  let rentalSkateId: number // dedicated skate for the inspection rental fixture
  let rentalId: number      // minimal rental to satisfy inspections.rental_id FK
  let damageReportId: number
  let inspectionId: number

  beforeAll(async () => {
    const ts = Date.now()

    // ── Test user ─────────────────────────────────────────────────────────────
    const [userRes] = await db.insert(users).values({
      name: 'F006 Tester',
      email: `f006.test.${ts}@koshk.com`,
      passwordHash: 'dummy',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    adminId = userRes.insertId

    // ── Minimal customer for rentals.customer_id FK ───────────────────────────
    const [custRes] = await db.insert(customers).values({
      name: `F006 Customer ${ts}`,
      phone: `099${ts.toString().slice(-8)}`,
      isActive: true,
      registrationDate: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    customerId = custRes.insertId

    // ── Skates for maintenance tests ──────────────────────────────────────────
    const [skate1Res] = await db.insert(skates).values({
      skateCode: `F006-SK1-${ts}`,
      qrCode: `F006-SK1-${ts}`,
      barcode: `F006-SK1-${ts}`,
      size: '42',
      status: 'maintenance',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    skateId1 = skate1Res.insertId

    const [skate2Res] = await db.insert(skates).values({
      skateCode: `F006-SK2-${ts}`,
      qrCode: `F006-SK2-${ts}`,
      barcode: `F006-SK2-${ts}`,
      size: '42',
      status: 'maintenance',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    skateId2 = skate2Res.insertId

    const [skate3Res] = await db.insert(skates).values({
      skateCode: `F006-SK3-${ts}`,
      qrCode: `F006-SK3-${ts}`,
      barcode: `F006-SK3-${ts}`,
      size: '42',
      status: 'maintenance',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    skateId3 = skate3Res.insertId

    // ── Rental skate — must be 'rented' status ───────────────────────────────
    const [rentSkateRes] = await db.insert(skates).values({
      skateCode: `F006-RENTS-${ts}`,
      qrCode: `F006-RENTS-${ts}`,
      barcode: `F006-RENTS-${ts}`,
      size: '40',
      status: 'rented',           // already "in use" — rental is backdated
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    rentalSkateId = rentSkateRes.insertId

    // ── All FK-constrained fixture inserts via raw SQL ────────────────────────
    // damageReports has: rental_id NOT NULL, inspection_id NOT NULL, customer_id NOT NULL
    // inspections has: rental_id NOT NULL
    // We thread through: rental → inspection → damage_report
    //
    // IMPORTANT: The rental code MUST match /^RN-\d{5,}$/ format.
    // rentals.test.ts TC-RENT-17/18 asserts that ALL rental codes in the DB
    // match this pattern. We use the same insertId-based approach as the real
    // service: insert with temp placeholder, get insertId, update code.
    const connection = await pool.getConnection()
    try {
      // 1. Rental — insert with temp placeholder code, update after getting insertId
      const [rentRes] = await connection.execute<any>(
        `INSERT INTO rentals
           (rental_code, skate_id, customer_id, cashier_id, duration_minutes, price_per_hour,
            rental_amount, started_at, expected_end_at, status, created_at, updated_at)
         VALUES ('RN-TEMP', ?, ?, ?, 60, '120.00', '120.00', NOW(), DATE_ADD(NOW(), INTERVAL 1 HOUR),
                 'active', NOW(), NOW())`,
        [rentalSkateId, customerId, adminId]
      )
      rentalId = rentRes.insertId
      // Conform to DEC-062: RN-NNNNN format using insertId
      const conformantCode = `RN-${rentalId.toString().padStart(5, '0')}`
      await connection.execute(
        'UPDATE rentals SET rental_code = ? WHERE id = ?',
        [conformantCode, rentalId]
      )

      // 2. Inspection (needs rental_id)
      const [insRes] = await connection.execute<any>(
        `INSERT INTO inspections
           (rental_id, skate_id, inspected_by, maintenance_required, wheels_condition, created_at)
         VALUES (?, ?, ?, 1, 'damaged', NOW())`,
        [rentalId, skateId2, adminId]
      )
      inspectionId = insRes.insertId

      // 3. Damage report (needs rental_id, inspection_id, customer_id)
      const [dmgRes] = await connection.execute<any>(
        `INSERT INTO damage_reports
           (skate_id, rental_id, inspection_id, customer_id, reported_by,
            damage_type, severity, description, customer_charge,
            maintenance_required, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 'wheel', 'minor', 'F-006 test damage', 0,
                 1, 'pending', NOW(), NOW())`,
        [skateId1, rentalId, inspectionId, customerId, adminId]
      )
      damageReportId = dmgRes.insertId
    } finally {
      connection.release()
    }

  })

  afterAll(async () => {
    // Scoped cleanup — only remove records created by this test
    await db.delete(auditLogs).where(eq(auditLogs.userId, adminId)).catch(() => {})

    const ourRecords = await db
      .select({ id: maintenanceRecords.id })
      .from(maintenanceRecords)
      .where(eq(maintenanceRecords.createdBy, adminId))
    if (ourRecords.length > 0) {
      const ids = ourRecords.map(r => r.id)
      await db.delete(maintenanceParts).where(inArray(maintenanceParts.maintenanceId, ids)).catch(() => {})
    }
    await db.delete(maintenanceRecords).where(eq(maintenanceRecords.createdBy, adminId)).catch(() => {})
    // damageReports BEFORE inspections — damage_reports.inspection_id FK references inspections.id
    await db.delete(damageReports).where(eq(damageReports.id, damageReportId)).catch(() => {})
    await db.delete(inspections).where(eq(inspections.id, inspectionId)).catch(() => {})
    await db.delete(rentals).where(eq(rentals.id, rentalId)).catch(() => {})
    await db.delete(skates).where(eq(skates.id, skateId1)).catch(() => {})
    await db.delete(skates).where(eq(skates.id, skateId2)).catch(() => {})
    await db.delete(skates).where(eq(skates.id, skateId3)).catch(() => {})
    await db.delete(skates).where(eq(skates.id, rentalSkateId)).catch(() => {})
    await db.delete(customers).where(eq(customers.id, customerId)).catch(() => {})
    await db.delete(users).where(eq(users.id, adminId)).catch(() => {})
  })

  // ─────────────────────────────────────────────────────────────────────────
  // TC-F006-01: First creation with a damageReportId succeeds
  // ─────────────────────────────────────────────────────────────────────────
  it('TC-F006-01: First maintenance record for a damageReportId is created successfully', async () => {
    const recordId = await maintenanceService.createRecord(
      {
        skateId: skateId1,
        damageReportId,
        problemDescription: 'Wheels need replacement (damage)',
      },
      adminId
    )

    expect(recordId).toBeGreaterThan(0)

    const record = await maintenanceService.getRecord(recordId)
    expect(record.damageReportId).toBe(damageReportId)
    expect(record.status).toBe('pending')

    // Exactly one record must exist for this damageReportId
    const rows = await db
      .select()
      .from(maintenanceRecords)
      .where(eq(maintenanceRecords.damageReportId, damageReportId))
    expect(rows.length).toBe(1)
  })

  // ─────────────────────────────────────────────────────────────────────────
  // TC-F006-02: Second attempt with the same damageReportId is rejected.
  // This is the core F-006 regression test.
  // ─────────────────────────────────────────────────────────────────────────
  it('TC-F006-02: Second maintenance record for the same damageReportId is rejected with DUPLICATE_MAINTENANCE_RECORD', async () => {
    // TC-F006-01 already created a record for damageReportId.
    // Attempting again must throw.
    await expect(
      maintenanceService.createRecord(
        {
          skateId: skateId1,
          damageReportId,
          problemDescription: 'Attempting duplicate maintenance creation',
        },
        adminId
      )
    ).rejects.toMatchObject({ code: 'DUPLICATE_MAINTENANCE_RECORD' })

    // Verify exactly ONE record still exists — no duplicate was inserted
    const rows = await db
      .select()
      .from(maintenanceRecords)
      .where(eq(maintenanceRecords.damageReportId, damageReportId))
    expect(rows.length).toBe(1)
  })

  // ─────────────────────────────────────────────────────────────────────────
  // TC-F006-03: First creation with an inspectionId succeeds
  // ─────────────────────────────────────────────────────────────────────────
  it('TC-F006-03: First maintenance record for an inspectionId is created successfully', async () => {
    const recordId = await maintenanceService.createRecord(
      {
        skateId: skateId2,
        inspectionId,
        problemDescription: 'Bearing damage from inspection',
      },
      adminId
    )

    expect(recordId).toBeGreaterThan(0)

    const record = await maintenanceService.getRecord(recordId)
    expect(record.inspectionId).toBe(inspectionId)
    expect(record.status).toBe('pending')

    const rows = await db
      .select()
      .from(maintenanceRecords)
      .where(eq(maintenanceRecords.inspectionId, inspectionId))
    expect(rows.length).toBe(1)
  })

  // ─────────────────────────────────────────────────────────────────────────
  // TC-F006-04: Second attempt with the same inspectionId is rejected
  // ─────────────────────────────────────────────────────────────────────────
  it('TC-F006-04: Second maintenance record for the same inspectionId is rejected with DUPLICATE_MAINTENANCE_RECORD', async () => {
    await expect(
      maintenanceService.createRecord(
        {
          skateId: skateId2,
          inspectionId,
          problemDescription: 'Attempting duplicate via inspectionId',
        },
        adminId
      )
    ).rejects.toMatchObject({ code: 'DUPLICATE_MAINTENANCE_RECORD' })

    const rows = await db
      .select()
      .from(maintenanceRecords)
      .where(eq(maintenanceRecords.inspectionId, inspectionId))
    expect(rows.length).toBe(1)
  })

  // ─────────────────────────────────────────────────────────────────────────
  // TC-F006-05: Creation WITHOUT damageReportId or inspectionId still works.
  // Manual maintenance records (no damage/inspection reference) are unaffected.
  // ─────────────────────────────────────────────────────────────────────────
  it('TC-F006-05: Manual maintenance record (no damageReportId, no inspectionId) is created without restriction', async () => {
    const recordId = await maintenanceService.createRecord(
      {
        skateId: skateId3,
        problemDescription: 'Manual maintenance — no damage reference',
      },
      adminId
    )

    expect(recordId).toBeGreaterThan(0)

    const record = await maintenanceService.getRecord(recordId)
    expect(record.status).toBe('pending')
    expect(record.damageReportId).toBeNull()
    expect(record.inspectionId).toBeNull()
  })

  // ─────────────────────────────────────────────────────────────────────────
  // TC-F006-06: Side-effect verification — complete maintenance record still
  // sets skate to available. Proves the F-006 guard does not regress existing
  // completion workflow.
  // ─────────────────────────────────────────────────────────────────────────
  it('TC-F006-06: Normal complete maintenance record still sets skate to available', async () => {
    const ts2 = Date.now()
    const [freshSkate] = await db.insert(skates).values({
      skateCode: `F006-SIDE-${ts2}`,
      qrCode: `F006-SIDE-${ts2}`,
      barcode: `F006-SIDE-${ts2}`,
      size: '40',
      status: 'maintenance',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    const freshSkateId = freshSkate.insertId

    try {
      const recordId = await maintenanceService.createRecord(
        { skateId: freshSkateId, problemDescription: 'Side-effect test' },
        adminId
      )

      await maintenanceService.completeRecord(recordId, adminId, {
        repairDescription: 'Side-effect repair complete',
      })

      const record = await maintenanceService.getRecord(recordId)
      expect(record.status).toBe('completed')

      const [skate] = await db.select().from(skates).where(eq(skates.id, freshSkateId))
      expect(skate.status).toBe('available')
    } finally {
      await db
        .delete(maintenanceRecords)
        .where(eq(maintenanceRecords.skateId, freshSkateId))
        .catch(() => {})
      await db.delete(skates).where(eq(skates.id, freshSkateId)).catch(() => {})
    }
  })
})
