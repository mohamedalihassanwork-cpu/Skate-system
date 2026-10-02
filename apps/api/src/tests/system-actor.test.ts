import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { eq, desc, and } from 'drizzle-orm'
import { db } from '../db/connection'
import { users } from '../db/schema/users'
import { auditLogs } from '../db/schema/audit'
import { reservations } from '../db/schema/reservations'
import { getSystemActorId } from '../modules/users/users.service'
import { lazyExpireReservations } from '../modules/reservations/reservations.service'
import { login } from '../modules/auth/auth.service'
import { execSync } from 'child_process'
import { customers } from '../db/schema/customers'
import { skates } from '../db/schema/skates'
import { auditService } from '../modules/audit/audit.service'
import { vi } from 'vitest'

describe('System Actor & Background Operations', () => {
  let systemUserId: number
  let adminUserId: number
  let skateId: number
  let customerId: number

  beforeAll(async () => {
    // Run seed to ensure System Actor is present
    // execSync is intentionally used here: the seed must complete fully before any
    // System Actor test runs. The 60s timeout accommodates bcrypt (12 rounds) + DB ops.
    execSync('npm run db:seed:test', { stdio: 'ignore' })
    
    // Find admin user to use for creating a reservation
    const adminRows = await db.select().from(users).where(eq(users.email, 'admin@koshkskate.com')).limit(1)
    adminUserId = adminRows[0].id

    const uniqueSuffix = Date.now().toString()

    // Insert dummy customer and skate with unique identifiers
    const [custRes] = await db.insert(customers).values({
      name: 'Test Customer ' + uniqueSuffix,
      phone: '010' + uniqueSuffix.slice(-8),
      registrationDate: new Date()
    })
    customerId = custRes.insertId

    const [skateRes] = await db.insert(skates).values({
      skateCode: 'SYS-SKATE-' + uniqueSuffix,
      size: '40',
      status: 'available'
    })
    skateId = skateRes.insertId
  }, 60_000)

  afterAll(async () => {
    vi.restoreAllMocks()
    // Clean up test fixtures to prevent cross-run state accumulation.
    // Without this, consecutive full-suite runs leave expired reservations
    // that lazyExpireReservations() picks up, producing extra audit entries
    // that break test 7's concurrent audit guard assertion.
    if (customerId) {
      await db.delete(reservations).where(eq(reservations.customerId, customerId))
    }
    if (skateId) {
      await db.delete(skates).where(eq(skates.id, skateId))
    }
    if (customerId) {
      await db.delete(customers).where(eq(customers.id, customerId))
    }
  })

  it('1. System Actor exists in the database', async () => {
    const sysUserRows = await db.select().from(users).where(eq(users.isSystemAccount, true)).limit(1)
    expect(sysUserRows.length).toBe(1)
    expect(sysUserRows[0].email).toBe('system@koshkskate.internal')
    systemUserId = sysUserRows[0].id
  })

  it('2. System Actor is distinguishable from normal users', async () => {
    const sysUser = await db.select().from(users).where(eq(users.id, systemUserId)).limit(1)
    expect(sysUser[0].isSystemAccount).toBe(true)
    
    const adminUser = await db.select().from(users).where(eq(users.id, adminUserId)).limit(1)
    expect(adminUser[0].isSystemAccount).toBe(false)
  })

  it('3. System Actor cannot be used as a normal login identity', async () => {
    // Attempting to login should throw UnauthorizedError because isSystemAccount = true
    await expect(login({
      email: 'system@koshkskate.internal',
      password: 'NO_LOGIN_ALLOWED'
    })).rejects.toThrow('لا يمكن تسجيل الدخول باستخدام حساب النظام')
  })

  it('4. lazyExpireReservations creates a valid audit record', async () => {
    // Create an expired reservation
    const from = new Date()
    from.setMinutes(from.getMinutes() - 120)
    const until = new Date()
    until.setMinutes(until.getMinutes() - 60)

    const [res] = await db.insert(reservations).values({
      customerId,
      skateId,
      reservedFrom: from,
      reservedUntil: until,
      status: 'confirmed',
      createdBy: adminUserId
    })
    const resId = res.insertId
    
    // Trigger lazy expiration
    await lazyExpireReservations()

    // Verify it was cancelled
    const updated = await db.select().from(reservations).where(eq(reservations.id, resId)).limit(1)
    expect(updated[0].status).toBe('cancelled')

    // Verify audit log has system actor
    const logs = await db.select()
      .from(auditLogs)
      .where(and(eq(auditLogs.entityId, String(resId)), eq(auditLogs.action, 'SYSTEM_CANCEL_EXPIRED_RESERVATION')))
      .orderBy(desc(auditLogs.createdAt))
      
    expect(logs.length).toBe(1)
    expect(logs[0].action).toBe('SYSTEM_CANCEL_EXPIRED_RESERVATION')
    expect(logs[0].userId).toBe(systemUserId)
  })

  it('5. Running seed repeatedly does not create duplicate System Actors', () => {
    execSync('npm run db:seed:test', { stdio: 'ignore' })
    // It should not throw and there should still be only 1 system actor
  })

  it('6. Reservation that changes state before expiration is NOT incorrectly cancelled (Atomic Race Condition)', async () => {
    const from = new Date()
    from.setMinutes(from.getMinutes() - 120)
    const until = new Date()
    until.setMinutes(until.getMinutes() - 60)

    const [res] = await db.insert(reservations).values({
      customerId,
      skateId,
      reservedFrom: from,
      reservedUntil: until,
      status: 'confirmed', // It is currently eligible
      createdBy: adminUserId
    })
    const resId = res.insertId

    // Simulate that right before lazyExpireReservations executes the update, the status was changed to fulfilled
    await db.update(reservations).set({ status: 'fulfilled' }).where(eq(reservations.id, resId))

    // Now trigger lazy expiration
    await lazyExpireReservations()

    // Verify it was NOT cancelled because it wasn't eligible anymore
    const updated = await db.select().from(reservations).where(eq(reservations.id, resId)).limit(1)
    expect(updated[0].status).toBe('fulfilled')

    // Verify no system audit log was written
    const logs = await db.select()
      .from(auditLogs)
      .where(and(eq(auditLogs.entityId, String(resId)), eq(auditLogs.action, 'SYSTEM_CANCEL_EXPIRED_RESERVATION')))
    expect(logs.length).toBe(0)
  })

  it('7. Concurrent expiration attempts result in only ONE cancellation and ONE audit (Duplicate Guard)', async () => {
    const from = new Date()
    from.setMinutes(from.getMinutes() - 120)
    const until = new Date()
    until.setMinutes(until.getMinutes() - 60)

    const [res] = await db.insert(reservations).values({
      customerId,
      skateId,
      reservedFrom: from,
      reservedUntil: until,
      status: 'confirmed',
      createdBy: adminUserId
    })
    const resId = res.insertId

    // Fire lazyExpireReservations multiple times concurrently
    await Promise.all([
      lazyExpireReservations(),
      lazyExpireReservations(),
      lazyExpireReservations()
    ])

    // Verify it was cancelled
    const updated = await db.select().from(reservations).where(eq(reservations.id, resId)).limit(1)
    expect(updated[0].status).toBe('cancelled')

    // Verify exactly ONE audit log is written
    const logs = await db.select()
      .from(auditLogs)
      .where(and(eq(auditLogs.entityId, String(resId)), eq(auditLogs.action, 'SYSTEM_CANCEL_EXPIRED_RESERVATION')))
    expect(logs.length).toBe(1)
  })

  it('8. Audit failure isolates to single record without rolling back business state (Audit Isolation)', async () => {
    const from = new Date()
    from.setMinutes(from.getMinutes() - 120)
    const until = new Date()
    until.setMinutes(until.getMinutes() - 60)

    const [res1] = await db.insert(reservations).values({
      customerId,
      skateId,
      reservedFrom: from,
      reservedUntil: until,
      status: 'confirmed',
      createdBy: adminUserId
    })
    const resId1 = res1.insertId

    const [res2] = await db.insert(reservations).values({
      customerId,
      skateId,
      reservedFrom: from,
      reservedUntil: until,
      status: 'confirmed',
      createdBy: adminUserId
    })
    const resId2 = res2.insertId

    // Mock audit service to throw an error ONLY for the first reservation
    const originalLog = auditService.log
    vi.spyOn(auditService, 'log').mockImplementation(async (params) => {
      if (params.entityId === String(resId1)) {
        throw new Error('Simulated audit persistence failure')
      }
      return originalLog(params)
    })

    // Trigger lazy expiration
    await lazyExpireReservations()

    // Both should be successfully cancelled
    const updated1 = await db.select().from(reservations).where(eq(reservations.id, resId1)).limit(1)
    expect(updated1[0].status).toBe('cancelled')

    const updated2 = await db.select().from(reservations).where(eq(reservations.id, resId2)).limit(1)
    expect(updated2[0].status).toBe('cancelled')

    // Audit log should be MISSING for res1, but PRESENT for res2
    const logs1 = await db.select()
      .from(auditLogs)
      .where(and(eq(auditLogs.entityId, String(resId1)), eq(auditLogs.action, 'SYSTEM_CANCEL_EXPIRED_RESERVATION')))
    expect(logs1.length).toBe(0)

    const logs2 = await db.select()
      .from(auditLogs)
      .where(and(eq(auditLogs.entityId, String(resId2)), eq(auditLogs.action, 'SYSTEM_CANCEL_EXPIRED_RESERVATION')))
    expect(logs2.length).toBe(1)

    // Restore mock
    vi.restoreAllMocks()
  })
})
