import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { db } from '../../src/db/connection'
import { reservations } from '../../src/db/schema/reservations'
import { customers } from '../../src/db/schema/customers'
import { skates } from '../../src/db/schema/skates'
import { users } from '../../src/db/schema/users'
import { createReservation, listReservations, cancelReservation, getReservation, updateReservation, lazyExpireReservations } from '../../src/modules/reservations/reservations.service'
import { startRental } from '../../src/modules/rentals/rentals.service'
import { paymentMethods, treasuryAccounts } from '../../src/db/schema/payments'
import { cashierShifts } from '../../src/db/schema/treasury'
import { eq, and } from 'drizzle-orm'
import { BusinessRuleError } from '../../src/utils/errors'

describe('Reservations Service', () => {
  let customerId: number
  let skateId: number
  let userId: number
  let paymentMethodId: number

  beforeEach(async () => {
    // Only delete reservations created by this test file to prevent concurrency issues
    // Wait, the variables aren't initialized yet here. We'll do it after they are created!
    // But we need a clean slate. Let's delete by a unique mark, or just trust the new skate/customer isolation.
    
    // Seed user
    const [u] = await db.insert(users).values({
      name: 'Test Admin',
      email: `admin_${Date.now()}@test.com`,
      passwordHash: 'hash',
      isActive: true,
    })
    userId = u.insertId

    // Seed customer
    const [c] = await db.insert(customers).values({
      name: 'Test Customer',
      phone: '0100000000',
      isActive: true,
      registrationDate: new Date(),
    })
    customerId = c.insertId

    // Seed skate
    const [s] = await db.insert(skates).values({
      skateCode: `SK-${Date.now()}`,
      size: '42',
      status: 'available',
    })
    skateId = s.insertId

    // Seed payment method for rentals
    const [t] = await db.insert(treasuryAccounts).values({
      name: `Cash ${Date.now()}`,
      nameAr: `Cash ${Date.now()}`
    })
    const [pm] = await db.insert(paymentMethods).values({
      name: `Cash ${Date.now()}`,
      nameAr: `Cash ${Date.now()}`,
      treasuryAccountId: t.insertId
    })
    paymentMethodId = pm.insertId

    // Ensure active shift
    const existing = await db.select().from(cashierShifts).where(and(eq(cashierShifts.cashierId, userId), eq(cashierShifts.status, 'active'))).limit(1)
    if (!existing.length) {
      await db.insert(cashierShifts).values({ cashierId: userId, openingBalance: '0', status: 'active' })
    }
  })

  afterEach(async () => {
    if (skateId) await db.delete(reservations).where(eq(reservations.skateId, skateId)).catch(() => {})
  })

  it('creates a reservation successfully', async () => {
    const from = new Date()
    from.setDate(from.getDate() + 1)
    const until = new Date()
    until.setDate(until.getDate() + 2)

    const res = await createReservation(userId, {
      customerId,
      skateId,
      reservedFrom: from.toISOString(),
      reservedUntil: until.toISOString(),
      notes: 'Test note',
    })

    expect(res.id).toBeDefined()
    expect(res.status).toBe('confirmed')
    expect(res.skate.id).toBe(skateId)
    expect(res.customer.id).toBe(customerId)
  })

  it('prevents overlapping reservations for the same skate', async () => {
    const from = new Date()
    from.setDate(from.getDate() + 1)
    const until = new Date()
    until.setDate(until.getDate() + 2)

    await createReservation(userId, {
      customerId,
      skateId,
      reservedFrom: from.toISOString(),
      reservedUntil: until.toISOString(),
    })

    await expect(
      createReservation(userId, {
        customerId,
        skateId,
        reservedFrom: from.toISOString(),
        reservedUntil: until.toISOString(),
      })
    ).rejects.toThrow('يوجد تعارض في مواعيد الحجز لهذه الزلاجة')
  })

  it('allows reservation creation if previous reservation is cancelled', async () => {
    const from = new Date()
    from.setDate(from.getDate() + 1)
    const until = new Date()
    until.setDate(until.getDate() + 2)

    const first = await createReservation(userId, {
      customerId,
      skateId,
      reservedFrom: from.toISOString(),
      reservedUntil: until.toISOString(),
    })

    await cancelReservation(first.id, userId)

    // Should succeed now
    const second = await createReservation(userId, {
      customerId,
      skateId,
      reservedFrom: from.toISOString(),
      reservedUntil: until.toISOString(),
    })

    expect(second.id).toBeDefined()
  })

  it('lazy-expires reservations that have passed their reservedUntil time', async () => {
    const from = new Date()
    from.setDate(from.getDate() - 2)
    const until = new Date()
    until.setDate(until.getDate() - 1)

    // manually insert a stale confirmed reservation
    const [res] = await db.insert(reservations).values({
      customerId,
      skateId,
      reservedFrom: from,
      reservedUntil: until,
      status: 'confirmed',
      createdBy: userId,
    })

    await listReservations({}) // this triggers lazyExpireReservations

    const [updated] = await db.select().from(reservations).where(eq(reservations.id, res.insertId))
    expect(updated.status).toBe('cancelled')
  })

  it('fulfills reservation when a rental is started for it', async () => {
    const from = new Date()
    from.setMinutes(from.getMinutes() - 10) // started 10 mins ago
    const until = new Date()
    until.setMinutes(until.getMinutes() + 10) // active for 10 more mins

    const [res] = await db.insert(reservations).values({
      customerId,
      skateId,
      reservedFrom: from,
      reservedUntil: until,
      status: 'confirmed',
      createdBy: userId,
    })

    const resId = res.insertId

    const rental = await startRental(userId, {
      customerId,
      skateId,
      durationMinutes: 60,
      payments: [{ paymentMethodId, amount: 120 }], // using default 120 rate
      reservationId: resId,
    })

    expect(rental.id).toBeDefined()

    const updatedRes = await getReservation(resId)
    expect(updatedRes.status).toBe('fulfilled')
  })

  it('prevents another user from renting a currently reserved skate', async () => {
    const from = new Date()
    from.setMinutes(from.getMinutes() - 10) // started 10 mins ago
    const until = new Date()
    until.setMinutes(until.getMinutes() + 10) // active for 10 more mins

    await db.insert(reservations).values({
      customerId,
      skateId,
      reservedFrom: from,
      reservedUntil: until,
      status: 'confirmed',
      createdBy: userId,
    })

    // Try to rent without the reservationId
    await expect(
      startRental(userId, {
        customerId,
        skateId,
        durationMinutes: 60,
        payments: [{ paymentMethodId, amount: 120 }],
      })
    ).rejects.toThrow('الزلاجة محجوزة حاليا ولا يمكن استئجارها')
  })
})
