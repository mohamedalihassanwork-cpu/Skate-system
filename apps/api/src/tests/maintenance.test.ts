import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { db } from '../db/connection'
import { maintenanceRecords, maintenanceParts, skates, users, auditLogs } from '../db/schema'
import { maintenanceService } from '../modules/maintenance/maintenance.service'
import { eq, inArray } from 'drizzle-orm'
import { AppError, BusinessRuleError } from '../utils/errors'

describe('Maintenance Service', () => {
  let adminId: number
  let skateId1: number
  let skateId2: number

  beforeAll(async () => {
    const ts = Date.now()
    // create a test admin user
    const [userRes] = await db.insert(users).values({
      name: 'Maintenance Tester',
      email: `maint.test.${ts}@koshk.com`,
      passwordHash: 'dummy',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    })
    adminId = userRes.insertId

    // create test skates
    const [skateRes1] = await db.insert(skates).values({
      skateCode: `M-TST1-${ts}`,
      qrCode: `M-TST1-${ts}`,
      barcode: `M-TST1-${ts}`,
      size: '42',
      type: 'Inline',
      status: 'maintenance',
      condition: 'good',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    })
    skateId1 = skateRes1.insertId

    const [skateRes2] = await db.insert(skates).values({
      skateCode: `M-TST2-${ts}`,
      qrCode: `M-TST2-${ts}`,
      barcode: `M-TST2-${ts}`,
      size: '42',
      type: 'Inline',
      status: 'available',
      condition: 'good',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    })
    skateId2 = skateRes2.insertId
  })

  afterAll(async () => {
    // cleanup — all deletes scoped to this test's own IDs so they never
    // affect records created by other test files (maintenance-payments.test.ts).
    // Previously: db.delete(maintenanceRecords) had NO WHERE clause — it deleted
    // every row in the table, causing TC-MAINT-PAY-06 to fail when maintenance.test.ts
    // ran before maintenance-payments.test.ts (Gate 4.2 intermittent regression).
    await db.delete(auditLogs).where(eq(auditLogs.userId, adminId))
    // Scope to records created by this test's user only
    const ourRecords = await db
      .select({ id: maintenanceRecords.id })
      .from(maintenanceRecords)
      .where(eq(maintenanceRecords.createdBy, adminId))
    if (ourRecords.length) {
      const ids = ourRecords.map(r => r.id)
      await db.delete(maintenanceParts).where(inArray(maintenanceParts.maintenanceId, ids)).catch(() => {})
    }
    await db.delete(maintenanceRecords).where(eq(maintenanceRecords.createdBy, adminId))
    await db.delete(skates).where(eq(skates.id, skateId1))
    await db.delete(skates).where(eq(skates.id, skateId2))
    await db.delete(users).where(eq(users.id, adminId))
  })

  it('should create a maintenance record and ensure skate is maintenance', async () => {
    const recordId = await maintenanceService.createRecord({
      skateId: skateId2,
      problemDescription: 'Wheels need replacement'
    }, adminId)

    expect(recordId).toBeGreaterThan(0)
    
    const record = await maintenanceService.getRecord(recordId)
    expect(record.status).toBe('pending')
    expect(record.problemDescription).toBe('Wheels need replacement')

    // Skate should be transitioned to maintenance
    const [skate] = await db.select().from(skates).where(eq(skates.id, skateId2))
    expect(skate.status).toBe('maintenance')
  })

  it('should add a part and auto transition to in_progress', async () => {
    // Create new record
    const recordId = await maintenanceService.createRecord({
      skateId: skateId1,
      problemDescription: 'Broken bearing'
    }, adminId)

    await maintenanceService.addPart(recordId, {
      partName: 'Bearing',
      quantity: 2,
      unitCost: 20
    })

    const record = await maintenanceService.getRecord(recordId)
    expect(record.status).toBe('in_progress')
    expect(record.partsCost).toBe('40.00')
    expect(record.totalCost).toBe('40.00')
    expect(record.parts.length).toBe(1)
    expect(record.parts[0].partName).toBe('Bearing')
  })

  it('should update labor cost correctly', async () => {
    // Create new record
    const recordId = await maintenanceService.createRecord({
      skateId: skateId1,
      problemDescription: 'Strap replacement'
    }, adminId)

    await maintenanceService.updateRecord(recordId, {
      laborCost: 30,
      repairDescription: 'Replaced strap'
    })

    const record = await maintenanceService.getRecord(recordId)
    expect(record.laborCost).toBe('30.00')
    expect(record.totalCost).toBe('30.00')
    expect(record.repairDescription).toBe('Replaced strap')
  })

  it('should complete maintenance and set skate to available', async () => {
    const recordId = await maintenanceService.createRecord({
      skateId: skateId1,
      problemDescription: 'Test completion'
    }, adminId)

    await maintenanceService.completeRecord(recordId, adminId, {
      repairDescription: 'All done'
    })

    const record = await maintenanceService.getRecord(recordId)
    expect(record.status).toBe('completed')

    // Skate must be available
    const [skate] = await db.select().from(skates).where(eq(skates.id, skateId1))
    expect(skate.status).toBe('available')
  })

  it('should prevent completion if repair description is missing', async () => {
    const recordId = await maintenanceService.createRecord({
      skateId: skateId1,
      problemDescription: 'No repair desc'
    }, adminId)

    await expect(maintenanceService.completeRecord(recordId, adminId, {}))
      .rejects
      .toThrow('يجب إدخال وصف الإصلاح')
  })
})
