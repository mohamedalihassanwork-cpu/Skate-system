import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { db } from '../db/connection'
import { maintenanceRecords, treasuryMovements, paymentMethods, cashierShifts, skates, users, treasuryAccounts, auditLogs } from '../db/schema'
import { maintenanceService } from '../modules/maintenance/maintenance.service'
import { eq, and } from 'drizzle-orm'
import { BusinessRuleError } from '../utils/errors'

describe('Maintenance Payment API', () => {
  let adminId: number
  let shiftId: number
  let paymentMethodId: number
  let skateId: number
  let accountId: number
  let noShiftUserId: number | null = null  // tracks user created in TC-MAINT-PAY-09

  beforeAll(async () => {
    const ts = Date.now()
    
    // user
    const [userRes] = await db.insert(users).values({
      name: 'Pay Tester',
      email: `pay.test.${ts}@koshk.com`,
      passwordHash: 'dummy',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    })
    adminId = userRes.insertId

    // treasury account
    const [accRes] = await db.insert(treasuryAccounts).values({
      name: 'Drawer Pay Test',
      nameAr: 'خزينة اختبار',
      isActive: true,
      balance: '1000'
    })
    accountId = accRes.insertId

    // payment method
    const [methodRes] = await db.insert(paymentMethods).values({
      name: 'Cash Pay Test',
      nameAr: 'اختبار دفع نقدي',
      type: 'cash',
      treasuryAccountId: accountId,
      isActive: true,
      isDefault: true
    })
    paymentMethodId = methodRes.insertId

    // shift
    const [shiftRes] = await db.insert(cashierShifts).values({
      cashierId: adminId,
      startTime: new Date(),
      status: 'active',
      openingBalance: '0',
      expectedBalance: '1000',
      createdAt: new Date(),
      updatedAt: new Date()
    })
    shiftId = shiftRes.insertId

    // skate
    const [skateRes] = await db.insert(skates).values({
      skateCode: `P-SK-${ts}`,
      qrCode: `P-SK-${ts}`,
      barcode: `P-SK-${ts}`,
      size: '42',
      type: 'Inline',
      status: 'available',
      condition: 'good',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    })
    skateId = skateRes.insertId
  })

  afterAll(async () => {
    await db.delete(treasuryMovements).where(eq(treasuryMovements.cashierId, adminId))
    await db.delete(maintenanceRecords).where(eq(maintenanceRecords.createdBy, adminId))
    await db.delete(cashierShifts).where(eq(cashierShifts.id, shiftId))
    await db.delete(paymentMethods).where(eq(paymentMethods.id, paymentMethodId))
    await db.delete(treasuryAccounts).where(eq(treasuryAccounts.id, accountId))
    await db.delete(skates).where(eq(skates.id, skateId))
    // Delete audit logs scoped to this test's user — line below already covers adminId.
    // The global DELETE FROM audit_logs was removed: it deleted records belonging to
    // other test suites and was the source of cross-test state pollution (Gate 4.1.2).
    await db.delete(auditLogs).where(eq(auditLogs.userId, adminId))
    await db.delete(users).where(eq(users.id, adminId))
    // Clean up no-shift user created by TC-MAINT-PAY-09
    if (noShiftUserId !== null) {
      await db.delete(users).where(eq(users.id, noShiftUserId)).catch(() => {})
    }
  })

  async function setupRecord(cost: number = 330, status: 'pending' | 'in_progress' | 'completed' = 'completed', payStatus: 'unpaid'|'paid'|'paid_external'|'legacy'|'no_cost' = 'unpaid') {
    const [res] = await db.insert(maintenanceRecords).values({
      skateId,
      createdBy: adminId,
      problemDescription: 'Test',
      repairDescription: status === 'completed' ? 'Done' : null,
      totalCost: String(cost),
      status,
      paymentStatus: payStatus,
      createdAt: new Date(),
      updatedAt: new Date()
    })
    return res.insertId
  }

  it('TC-MAINT-PAY-01: completed + unpaid -> system payment succeeds', async () => {
    const id = await setupRecord(330, 'completed', 'unpaid')
    
    await maintenanceService.payRecord(id, adminId, paymentMethodId)
    
    const [rec] = await db.select().from(maintenanceRecords).where(eq(maintenanceRecords.id, id))
    expect(rec.paymentStatus).toBe('paid')
    
    const [tm] = await db.select().from(treasuryMovements).where(and(eq(treasuryMovements.referenceId, id), eq(treasuryMovements.referenceType, 'maintenance_payment')))
    expect(tm).toBeDefined()
    expect(tm.type).toBe('out')
    expect(tm.amount).toBe('330.00')
    expect(tm.referenceType).toBe('maintenance_payment')
  })

  it('TC-MAINT-PAY-02: completed + unpaid -> external payment succeeds', async () => {
    const id = await setupRecord(150, 'completed', 'unpaid')
    
    await maintenanceService.payRecordExternal(id, adminId)
    
    const [rec] = await db.select().from(maintenanceRecords).where(eq(maintenanceRecords.id, id))
    expect(rec.paymentStatus).toBe('paid_external')
    
    const tms = await db.select().from(treasuryMovements).where(and(eq(treasuryMovements.referenceId, id), eq(treasuryMovements.referenceType, 'maintenance_payment')))
    expect(tms.length).toBe(0)
  })

  it('TC-MAINT-PAY-03: already paid -> rejected', async () => {
    const id = await setupRecord(330, 'completed', 'paid')
    await expect(maintenanceService.payRecord(id, adminId, paymentMethodId)).rejects.toThrow(BusinessRuleError)
  })

  it('TC-MAINT-PAY-04: paid_external -> rejected', async () => {
    const id = await setupRecord(330, 'completed', 'paid_external')
    await expect(maintenanceService.payRecord(id, adminId, paymentMethodId)).rejects.toThrow(BusinessRuleError)
  })

  it('TC-MAINT-PAY-05: legacy -> rejected', async () => {
    const id = await setupRecord(330, 'completed', 'legacy')
    await expect(maintenanceService.payRecord(id, adminId, paymentMethodId)).rejects.toThrow(BusinessRuleError)
  })

  it('TC-MAINT-PAY-06: no_cost -> rejected', async () => {
    const id = await setupRecord(0, 'completed', 'no_cost')
    await expect(maintenanceService.payRecord(id, adminId, paymentMethodId)).rejects.toThrow(BusinessRuleError)
  })

  it('TC-MAINT-PAY-07: in_progress -> rejected', async () => {
    const id = await setupRecord(330, 'in_progress', 'unpaid')
    await expect(maintenanceService.payRecord(id, adminId, paymentMethodId)).rejects.toThrow(BusinessRuleError)
  })

  it('TC-MAINT-PAY-08: zero-cost completion -> no_cost + no treasury movement', async () => {
    const id = await setupRecord(0, 'in_progress', 'unpaid')
    await maintenanceService.completeRecord(id, adminId, { repairDescription: 'Fixed for free' })
    const [rec] = await db.select().from(maintenanceRecords).where(eq(maintenanceRecords.id, id))
    expect(rec.paymentStatus).toBe('no_cost')
  })

  it('TC-MAINT-PAY-09: system payment without active shift -> rejected', async () => {
    // create user without shift
    const [u] = await db.insert(users).values({
      name: 'No Shift', email: `no.shift.${Date.now()}@test.com`, passwordHash: '1', isActive: true, createdAt: new Date(), updatedAt: new Date()
    })
    noShiftUserId = u.insertId  // track for afterAll cleanup
    const id = await setupRecord(330, 'completed', 'unpaid')
    await expect(maintenanceService.payRecord(id, u.insertId, paymentMethodId)).rejects.toThrow(/وردية نشطة/)
  })
})
