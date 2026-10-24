import { randomUUID } from 'node:crypto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import jwt from 'jsonwebtoken'
import supertest from 'supertest'
import app from '../app.js'
import env from '../config/env.js'
import { pool } from '../db/connection.js'
import { createReservation, cancelReservation, getReservation, updateReservation } from '../modules/reservations/reservations.service.js'
import { startRental, getRental, returnRentalItem, finalizeRental, extendRentalItem } from '../modules/rentals/rentals.service.js'
import { query } from '../modules/treasury/treasury-posting.js'

// Real InnoDB integration tests, serialized with other database suites.
// Cleanup removes only generated fixtures and restores treasury configuration.
describe('Reservation execution and rental lifecycle', () => {
  let config: any
  let ids: { users: number[]; customers: number[]; skates: number[]; accounts: number[]; assignments: number[]; shifts: number[]; methods: number[]; roles: number[] }
  let actor: number, otherActor: number, customer: number, otherCustomer: number
  let skate: number, extraSkate: number, drawer: number, main: number, card: number
  let cashMethod: number, cardMethod: number
  const q = (sql: string, params: any[] = []) => query(pool, sql, params)
  const placeholders = (values: number[]) => values.map(() => '?').join(',')
  const instant = () => new Date(Math.floor(Date.now() / 1000) * 1000)
  const minutesAfter = (start: Date, minutes: number) => new Date(start.getTime() + minutes * 60_000)
  const healthyReturn = { inspection: {
    wheelsCondition: 'good', brakeCondition: 'good', strapCondition: 'good',
    bearingsCondition: 'good', bodyCondition: 'good', maintenanceRequired: false,
  } } as const

  async function insert(table: keyof typeof ids, sql: string, params: any[] = []) {
    const result = await q(sql, params)
    ids[table].push(result.insertId)
    return result.insertId as number
  }

  // Already-booked arrivals and legacy-invalid windows are fixture rows, so
  // tests can check execution without relaxing future-booking creation rules.
  async function booked(fromMinutes = -15, untilMinutes = 45, skateId = skate, status = 'confirmed') {
    const now = instant(), from = minutesAfter(now, fromMinutes), until = minutesAfter(now, untilMinutes)
    const result = await q(
      'INSERT INTO reservations(customer_id,skate_id,reserved_from,reserved_until,status,created_by) VALUES(?,?,?,?,?,?)',
      [customer, skateId, from, until, status, actor],
    )
    return { id: result.insertId as number, from, until }
  }
  const execute = (reservationId: number, overrides: Record<string, unknown> = {}, cashier = actor) =>
    startRental(cashier, { customerId: customer, skateIds: [skate], reservationId, ...overrides })

  async function expectNoCollections() {
    expect(await q('SELECT id FROM rental_payments WHERE cashier_id IN (?,?)', [actor, otherActor])).toHaveLength(0)
    expect(await q('SELECT id FROM treasury_movements WHERE cashier_id IN (?,?)', [actor, otherActor])).toHaveLength(0)
    const accounts = await q(`SELECT balance FROM treasury_accounts WHERE id IN (${placeholders(ids.accounts)})`, ids.accounts)
    expect(accounts.every((row: any) => row.balance === '0.00')).toBe(true)
  }
  async function expectUnconsumed(id: number) {
    expect((await q('SELECT status FROM reservations WHERE id=?', [id]))[0].status).toBe('confirmed')
    expect(await q('SELECT id FROM rentals WHERE reservation_id=?', [id])).toHaveLength(0)
    expect((await q('SELECT status FROM skates WHERE id=?', [skate]))[0].status).toBe('available')
    await expectNoCollections()
  }

  // Pause/fail just the start audit boundary. All SQL and transaction locks
  // still use real connections; no database or repository behavior is mocked.
  function interceptExecutionAudit(handler: () => Promise<void>, observeStatement?: (statement: string, params?: any[]) => void) {
    const originalGetConnection = pool.getConnection.bind(pool)
    vi.spyOn(pool, 'getConnection').mockImplementation(async () => {
      const connection = await originalGetConnection()
      return new Proxy(connection, {
        get(target, property) {
          if (property === 'execute') {
            return async (statement: string, params?: any[]) => {
              if (statement.includes('INSERT INTO audit_logs') && statement.includes("'START_RENTAL'") && params?.[0] === actor) await handler()
              const pending = target.execute(statement, params)
              // Observe after mysql2 has issued the real query, including a
              // competing FOR UPDATE that is waiting for the paused start.
              observeStatement?.(statement, params)
              return pending
            }
          }
          const value = Reflect.get(target, property)
          return typeof value === 'function' ? value.bind(target) : value
        },
      })
    })
  }

  beforeEach(async () => {
    expect(env.NODE_ENV).toBe('test')
    expect(env.DB_NAME).toBe('koshk_skate_test')
    expect((await q('SELECT DATABASE() AS name'))[0].name).toBe('koshk_skate_test')
    ids = { users: [], customers: [], skates: [], accounts: [], assignments: [], shifts: [], methods: [], roles: [] }
    ;[config] = await q('SELECT * FROM treasury_configuration WHERE id=1')
    if (!config) throw new Error('Apply the checked treasury and reservation-link migrations before this suite')
    for (const label of ['A', 'B']) {
      await insert('users', 'INSERT INTO users(name,email,password_hash,is_active) VALUES(?,?,?,1)',
        [`Reservation ${label}`, `reservation-${randomUUID()}@test.invalid`, 'test-only'])
      await insert('customers', 'INSERT INTO customers(name,phone,registration_date,is_active) VALUES(?,?,CURRENT_DATE(),1)',
        [`Reservation customer ${label}`, '01000000000'])
    }
    ;[actor, otherActor] = ids.users
    ;[customer, otherCustomer] = ids.customers
    for (let i = 0; i < 2; i++) await insert('skates', "INSERT INTO skates(skate_code,size,status) VALUES(?,'42','available')", [`RS-${randomUUID()}`])
    ;[skate, extraSkate] = ids.skates
    for (const [isCash, role] of [[1, 'main'], [1, 'cashier'], [1, 'cashier'], [0, 'legacy']] as const) {
      await insert('accounts', 'INSERT INTO treasury_accounts(name,name_ar,is_cash_drawer,account_role) VALUES(?,?,?,?)',
        [`reservation-${randomUUID()}`, 'Reservation test account', isCash, role])
    }
    ;[main, drawer, , card] = ids.accounts
    for (const [cashier, account] of [[actor, drawer], [otherActor, ids.accounts[2]]]) {
      const assignment = await insert('assignments', 'INSERT INTO treasury_assignments(account_id,cashier_id,assigned_by) VALUES(?,?,?)', [account, cashier, actor])
      await insert('shifts', "INSERT INTO cashier_shifts(cashier_id,treasury_account_id,assignment_id,opening_balance,opening_ledger_balance,status,business_date) VALUES(?,?,?,0,0,'active',CURRENT_DATE())", [cashier, account, assignment])
    }
    for (const account of [main, card]) await insert('methods', 'INSERT INTO payment_methods(name,name_ar,treasury_account_id) VALUES(?,?,?)', [`reservation-${randomUUID()}`, 'Reservation test method', account])
    ;[cashMethod, cardMethod] = ids.methods
    await q('UPDATE treasury_configuration SET enabled=1,main_account_id=? WHERE id=1', [main])
  })

  afterEach(async () => {
    vi.restoreAllMocks()
    if (!ids) return
    if (config) await q('UPDATE treasury_configuration SET enabled=?,main_account_id=? WHERE id=1', [config.enabled, config.main_account_id])
    if (ids.users.length) {
      const own = placeholders(ids.users)
      // Find committed rentals even when a test failed before receiving a DTO.
      const rentalIds = (await q(`SELECT id FROM rentals WHERE cashier_id IN (${own})`, ids.users)).map((row: any) => row.id)
      await q(`DELETE FROM financial_operations WHERE actor_id IN (${own})`, ids.users)
      await q(`DELETE FROM treasury_movements WHERE cashier_id IN (${own})`, ids.users)
      await q(`DELETE FROM audit_logs WHERE user_id IN (${own})`, ids.users)
      await q(`DELETE FROM rental_payments WHERE cashier_id IN (${own})`, ids.users)
      if (rentalIds.length) {
        const ownRentals = placeholders(rentalIds)
        await q(`DELETE FROM late_fee_records WHERE rental_id IN (${ownRentals})`, rentalIds)
        await q(`UPDATE rental_items SET inspection_id=NULL WHERE rental_id IN (${ownRentals})`, rentalIds)
        await q(`DELETE FROM inspections WHERE rental_id IN (${ownRentals})`, rentalIds)
        await q(`DELETE e FROM rental_item_extensions e JOIN rental_items i ON i.id=e.rental_item_id WHERE i.rental_id IN (${ownRentals})`, rentalIds)
        await q(`DELETE FROM rental_items WHERE rental_id IN (${ownRentals})`, rentalIds)
        await q(`DELETE FROM rentals WHERE id IN (${ownRentals})`, rentalIds)
      }
      await q(`DELETE FROM reservations WHERE created_by IN (${own})`, ids.users)
      await q(`DELETE FROM user_roles WHERE user_id IN (${own})`, ids.users)
    }
    if (ids.roles.length) await q(`DELETE FROM role_permissions WHERE role_id IN (${placeholders(ids.roles)})`, ids.roles)
    for (const [table, values] of [
      ['payment_methods', ids.methods], ['cashier_shifts', ids.shifts], ['treasury_assignments', ids.assignments],
      ['treasury_accounts', ids.accounts], ['skates', ids.skates], ['customers', ids.customers], ['users', ids.users], ['roles', ids.roles],
    ] as const) {
      if (values.length) await q(`DELETE FROM ${table} WHERE id IN (${placeholders(values)})`, [...values])
    }
  })

  it('creates a booking, prevents overlap, and permits adjacent or cancelled windows', async () => {
    const from = minutesAfter(instant(), 120), until = minutesAfter(from, 60)
    const input = { customerId: customer, skateId: skate, reservedFrom: from.toISOString(), reservedUntil: until.toISOString(), notes: 'Booking context' }
    const first = await createReservation(actor, input)
    expect(first).toMatchObject({ status: 'confirmed', rentalId: null, skate: { id: skate }, customer: { id: customer }, notes: 'Booking context' })
    await expect(createReservation(actor, input)).rejects.toMatchObject({ code: 'RESERVATION_CONFLICT' })
    const adjacent = await createReservation(actor, { ...input, reservedFrom: until.toISOString(), reservedUntil: minutesAfter(until, 60).toISOString() })
    expect(adjacent.id).not.toBe(first.id)
    await cancelReservation(first.id, actor)
    expect((await createReservation(actor, input)).id).not.toBe(first.id)
  })

  it('derives the full booked duration for a late arrival and records actual start and reciprocal links', async () => {
    const booking = await booked()
    const before = Date.now(), rental = await execute(booking.id), after = Date.now()
    const item = rental.items[0], started = new Date(item.startedAt).getTime()
    expect(rental.reservationId).toBe(booking.id)
    expect(rental.items).toHaveLength(1)
    expect(item.expectedDurationMinutes).toBe(60)
    expect(started).toBeGreaterThanOrEqual(before - 1000)
    expect(started).toBeLessThanOrEqual(after)
    expect(started).toBeGreaterThan(booking.from.getTime())
    expect(new Date(item.expectedEndAt).getTime() - started).toBe(60 * 60_000)
    expect(new Date(item.expectedEndAt).getTime()).toBeGreaterThan(booking.until.getTime())
    expect(item.returnedAt).toBeNull()
    expect(item.actualAmount).toBeNull()
    expect(rental.totalAmount).toBeNull()
    expect(rental.invoiceNumber).toBeNull()
    expect(await getReservation(booking.id)).toMatchObject({ status: 'fulfilled', rentalId: rental.id, reservedFrom: booking.from.toISOString(), reservedUntil: booking.until.toISOString() })
    expect((await getRental(rental.id)).reservationId).toBe(booking.id)
    const [audit] = await q("SELECT new_value FROM audit_logs WHERE user_id=? AND action='START_RENTAL' AND entity_id=?", [actor, rental.id])
    const context = typeof audit.new_value === 'string' ? JSON.parse(audit.new_value) : audit.new_value
    expect(context).toMatchObject({ reservationId: booking.id, durationMinutes: 60, reservedFrom: booking.from.toISOString(), reservedUntil: booking.until.toISOString() })
    await expectNoCollections()
  })

  it('permits early execution and ignores client duration overrides for every selected item', async () => {
    const booking = await booked(120, 195)
    const rental = await execute(booking.id, { durationMinutes: 1, skateIds: [extraSkate, skate] })
    expect(rental.items).toHaveLength(2)
    for (const item of rental.items) {
      expect(item.expectedDurationMinutes).toBe(75)
      expect(new Date(item.startedAt).getTime()).toBeLessThan(booking.from.getTime())
      expect(new Date(item.expectedEndAt).getTime() - new Date(item.startedAt).getTime()).toBe(75 * 60_000)
    }
    expect(new Set(rental.items.map(item => item.startedAt)).size).toBe(1)
    await expectNoCollections()
  })

  it('executes a reservation over HTTP without duration and enforces authentication and database permissions', async () => {
    const booking = await booked()
    const permissionRows = await q("SELECT id, `key` FROM permissions WHERE `key` IN ('rentals.create','reservations.view')")
    expect(permissionRows.map((row: any) => row.key).sort()).toEqual(['rentals.create', 'reservations.view'])
    const role = await insert('roles', 'INSERT INTO roles(name,name_ar,is_system) VALUES(?,?,0)',
      [`reservation-${randomUUID()}`, 'Reservation execution test role'])
    for (const permission of permissionRows) {
      await q('INSERT INTO role_permissions(role_id,permission_id) VALUES(?,?)', [role, permission.id])
    }
    await q('INSERT INTO user_roles(user_id,role_id) VALUES(?,?)', [actor, role])
    const tokenFor = async (userId: number) => {
      const [user] = await q('SELECT email FROM users WHERE id=?', [userId])
      return jwt.sign({ sub: userId, email: user.email }, env.JWT_SECRET, { expiresIn: '5m' })
    }
    const actorToken = await tokenFor(actor), unauthorizedToken = await tokenFor(otherActor)
    const body = { customerId: customer, skateIds: [skate], reservationId: booking.id }
    const unauthenticated = await supertest(app).post('/api/v1/rentals').send(body)
    expect(unauthenticated.status).toBe(401)
    expect(unauthenticated.body.error.code).toBe('UNAUTHORIZED')
    const forbidden = await supertest(app).post('/api/v1/rentals').set('Authorization', `Bearer ${unauthorizedToken}`).send(body)
    expect(forbidden.status).toBe(403)
    expect(forbidden.body.error.code).toBe('FORBIDDEN')
    await expectUnconsumed(booking.id)

    const created = await supertest(app).post('/api/v1/rentals').set('Authorization', `Bearer ${actorToken}`).send(body)
    expect(created.status).toBe(201)
    expect(created.body.data).toMatchObject({ reservationId: booking.id, items: [{ expectedDurationMinutes: 60 }] })
    const loaded = await supertest(app).get(`/api/v1/reservations/${booking.id}`).set('Authorization', `Bearer ${actorToken}`)
    expect(loaded.status).toBe(200)
    expect(loaded.body).toMatchObject({ status: 'fulfilled', rentalId: created.body.data.id })
    await expectNoCollections()
  })

  it('enforces the reservation link foreign key and uniqueness while allowing multiple null links', async () => {
    const booking = await booked()
    const rental = await execute(booking.id)
    // Constraint-only fixture containers belong to this generated actor and
    // are cleaned up with its rentals; they do not exercise a production API.
    const insertLinkedFixture = (reservationId: number | null) => q(
      "INSERT INTO rentals(rental_code,customer_id,cashier_id,shift_id,started_at,status,reservation_id) VALUES(?,?,?,?,UTC_TIMESTAMP(),'cancelled',?)",
      [`RS-${randomUUID()}`, customer, actor, ids.shifts[0], reservationId],
    )
    await expect(insertLinkedFixture(booking.id)).rejects.toMatchObject({ code: 'ER_DUP_ENTRY' })
    const missing = await booked(120, 180, extraSkate)
    await q('DELETE FROM reservations WHERE id=?', [missing.id])
    await expect(insertLinkedFixture(missing.id)).rejects.toMatchObject({ code: 'ER_NO_REFERENCED_ROW_2' })
    await expect(q('DELETE FROM reservations WHERE id=?', [booking.id])).rejects.toMatchObject({ code: 'ER_ROW_IS_REFERENCED_2' })
    await insertLinkedFixture(null)
    await insertLinkedFixture(null)
    expect(await q('SELECT id FROM rentals WHERE cashier_id=? AND reservation_id IS NULL', [actor])).toHaveLength(2)
    expect(await q('SELECT id FROM rentals WHERE reservation_id=?', [booking.id])).toEqual([{ id: rental.id }])
    expect((await getReservation(booking.id)).rentalId).toBe(rental.id)
    await expectNoCollections()
  })

  it.each([
    ['different customer', () => ({ customerId: otherCustomer }), 'RESERVATION_MISMATCH'],
    ['omitted reserved skate', () => ({ skateIds: [extraSkate] }), 'RESERVATION_MISMATCH'],
    ['invalid reservation identifier', () => ({ reservationId: 0 }), 'VALIDATION_ERROR'],
  ] as const)('rejects %s without consuming the booking', async (_label, overrides, code) => {
    const booking = await booked()
    await expect(execute(booking.id, overrides())).rejects.toMatchObject({ code })
    await expectUnconsumed(booking.id)
  })

  it('rejects a missing booking without creating a rental', async () => {
    const booking = await booked()
    await q('DELETE FROM reservations WHERE id=?', [booking.id])
    await expect(execute(booking.id)).rejects.toMatchObject({ code: 'NOT_FOUND' })
    expect(await q('SELECT id FROM rentals WHERE cashier_id=?', [actor])).toHaveLength(0)
    await expectNoCollections()
  })

  it.each(['cancelled', 'fulfilled'] as const)('rejects a %s booking', async status => {
    const booking = await booked(-15, 45, skate, status)
    await expect(execute(booking.id)).rejects.toMatchObject({ code: 'RESERVATION_NOT_ACTIVE' })
    expect(await q('SELECT id FROM rentals WHERE reservation_id=?', [booking.id])).toHaveLength(0)
    expect((await q('SELECT status FROM reservations WHERE id=?', [booking.id]))[0].status).toBe(status)
  })

  it('rejects expired bookings at execution without relying on a prior list/read', async () => {
    const booking = await booked(-60, 0)
    await expect(execute(booking.id)).rejects.toMatchObject({ code: 'RESERVATION_EXPIRED' })
    await expectUnconsumed(booking.id)
  })

  it('lazy-expires ended UTC bookings while retaining a near-future booking on a local-time database server', async () => {
    const expired = await booked(-60, 0)
    const upcoming = await booked(5, 65, extraSkate)
    expect((await getReservation(expired.id)).status).toBe('cancelled')
    expect((await getReservation(upcoming.id)).status).toBe('confirmed')
    await expectNoCollections()
  })

  it.each([0, 60.5])('rejects a persisted booking duration of %s minutes without rounding', async duration => {
    const booking = await booked(120, 120 + duration)
    await expect(execute(booking.id, { durationMinutes: 60 })).rejects.toMatchObject({ code: 'RESERVATION_DURATION_INVALID' })
    await expectUnconsumed(booking.id)
  })

  it('preserves inactive-customer, unavailable-skate and active-shift requirements', async () => {
    const booking = await booked()
    await q('UPDATE customers SET is_active=0 WHERE id=?', [customer])
    await expect(execute(booking.id)).rejects.toMatchObject({ code: 'CUSTOMER_INACTIVE' })
    await q('UPDATE customers SET is_active=1 WHERE id=?', [customer])
    await q("UPDATE skates SET status='maintenance' WHERE id=?", [skate])
    await expect(execute(booking.id)).rejects.toMatchObject({ code: 'SKATE_NOT_AVAILABLE' })
    await q("UPDATE skates SET status='available' WHERE id=?", [skate])
    await q("UPDATE cashier_shifts SET status='closed',closed_at=UTC_TIMESTAMP() WHERE cashier_id=?", [actor])
    await expect(execute(booking.id)).rejects.toMatchObject({ code: 'NO_ACTIVE_SHIFT' })
    await expectUnconsumed(booking.id)
  })

  it('blocks shifted execution that overlaps the next booking even when booked windows are adjacent', async () => {
    const booking = await booked()
    await q('INSERT INTO reservations(customer_id,skate_id,reserved_from,reserved_until,status,created_by) VALUES(?,?,?,?,?,?)',
      [otherCustomer, skate, booking.until, minutesAfter(booking.until, 60), 'confirmed', actor])
    await expect(execute(booking.id)).rejects.toMatchObject({ code: 'SKATE_RESERVED' })
    await expectUnconsumed(booking.id)
  })

  it('checks reservations on additional skates and rolls back the whole multi-item start', async () => {
    const booking = await booked()
    await booked(-10, 30, extraSkate)
    await expect(execute(booking.id, { skateIds: [skate, extraSkate] })).rejects.toMatchObject({ code: 'SKATE_RESERVED' })
    await expectUnconsumed(booking.id)
    expect((await q('SELECT status FROM skates WHERE id=?', [extraSkate]))[0].status).toBe('available')
  })

  it('preserves walk-in duration validation and permits non-overlapping future reservations', async () => {
    await expect(startRental(actor, { customerId: customer, skateIds: [skate] })).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
    await expect(startRental(actor, { customerId: customer, skateIds: [skate], durationMinutes: 1.5 })).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
    await booked(120, 180)
    const walkin = await startRental(actor, { customerId: customer, skateIds: [extraSkate, skate], durationMinutes: 30 })
    expect(walkin.reservationId).toBeNull()
    expect(walkin.items.map(item => item.expectedDurationMinutes)).toEqual([30, 30])
    expect(walkin.items).toHaveLength(2)
    await expectNoCollections()
  })

  it('blocks a walk-in crossing an active reservation', async () => {
    await booked(15, 75)
    await expect(startRental(actor, { customerId: otherCustomer, skateIds: [skate], durationMinutes: 30 })).rejects.toMatchObject({ code: 'SKATE_RESERVED' })
    expect(await q('SELECT id FROM rentals WHERE cashier_id=?', [actor])).toHaveLength(0)
  })

  it('serializes duplicate execution by different cashiers into one linked rental and audit', async () => {
    const booking = await booked()
    const attempts = await Promise.allSettled([execute(booking.id), execute(booking.id, {}, otherActor)])
    expect(attempts.filter(result => result.status === 'fulfilled')).toHaveLength(1)
    expect(attempts.filter(result => result.status === 'rejected')).toHaveLength(1)
    const rentals = await q('SELECT id FROM rentals WHERE reservation_id=?', [booking.id])
    expect(rentals).toHaveLength(1)
    expect(await q("SELECT id FROM audit_logs WHERE action='START_RENTAL' AND entity_id=?", [rentals[0].id])).toHaveLength(1)
    expect((await q('SELECT status FROM reservations WHERE id=?', [booking.id]))[0].status).toBe('fulfilled')
    await expectNoCollections()
  })

  it('cannot reuse a fulfilled booking after its skate is returned and becomes available', async () => {
    const booking = await booked()
    const rental = await execute(booking.id)
    await returnRentalItem(rental.items[0].id, actor, healthyReturn)
    await expect(execute(booking.id)).rejects.toMatchObject({ code: 'RESERVATION_NOT_ACTIVE' })
    expect(await q('SELECT id FROM rentals WHERE reservation_id=?', [booking.id])).toHaveLength(1)
  })

  it.each(['edit', 'cancel', 'conflicting booking'] as const)('serializes in-flight execution against a concurrent %s', async operation => {
    const booking = await booked()
    let reached!: () => void, release!: () => void, observedLock!: () => void
    const boundary = new Promise<void>(resolve => { reached = resolve })
    const paused = new Promise<void>(resolve => { release = resolve })
    const competingLock = new Promise<void>(resolve => { observedLock = resolve })
    let watchCompeting = false, lockStatement: string | undefined
    interceptExecutionAudit(async () => { reached(); await paused }, (statement, params) => {
      if (!watchCompeting || !statement.includes('FOR UPDATE')) return
      const isContendedLock = operation === 'cancel'
        ? statement.includes('FROM reservations WHERE id = ?') && params?.[0] === booking.id
        : statement.includes('FROM skates WHERE id') && params?.includes(skate)
      if (isContendedLock) { lockStatement = statement; observedLock() }
    })
    let safety!: ReturnType<typeof setTimeout>
    const deadline = new Promise<never>((_resolve, reject) => {
      safety = setTimeout(() => reject(new Error('Concurrent operation did not issue its contended row lock before the deadline')), 5000)
    })
    const starting = execute(booking.id)
    let competing: Promise<unknown> | undefined
    try {
      await Promise.race([boundary, deadline, starting.then(() => { throw new Error('Execution did not reach the controlled audit boundary') })])
      watchCompeting = true
      if (operation === 'edit') {
        competing = updateReservation(booking.id, { notes: 'Concurrent edit must not overwrite fulfillment' })
      } else if (operation === 'cancel') {
        competing = cancelReservation(booking.id, otherActor)
      } else {
        competing = createReservation(otherActor, { customerId: otherCustomer, skateId: skate,
          reservedFrom: booking.until.toISOString(), reservedUntil: minutesAfter(booking.until, 60).toISOString() })
      }
      const outcome = Promise.allSettled([starting, competing])
      await Promise.race([competingLock, deadline, competing.then(
        () => { throw new Error('Concurrent operation completed without waiting for the contended row lock') },
        () => { throw new Error('Concurrent operation failed before issuing the contended row lock') },
      )])
      expect(lockStatement).toContain(operation === 'cancel' ? 'FROM reservations' : 'FROM skates')
      release()
      const [started, other] = await outcome
      expect(started.status).toBe('fulfilled')
      expect(other.status).toBe('rejected')
      if (other.status === 'rejected') expect(other.reason.code).toBe(operation === 'conflicting booking' ? 'RESERVATION_RENTAL_CONFLICT' : 'RESERVATION_NOT_ACTIVE')
      expect((await q('SELECT status,notes FROM reservations WHERE id=?', [booking.id]))[0]).toMatchObject({ status: 'fulfilled', notes: null })
      expect(await q('SELECT id FROM rentals WHERE reservation_id=?', [booking.id])).toHaveLength(1)
    } finally {
      release(); clearTimeout(safety)
      await Promise.allSettled([starting, ...(competing ? [competing] : [])])
    }
  })

  it('rolls back rental, items, fulfillment, skate state and link when the start audit fails', async () => {
    const booking = await booked()
    const failure = new Error('Injected rental start audit failure')
    interceptExecutionAudit(async () => { throw failure })
    await expect(execute(booking.id, { skateIds: [skate, extraSkate] })).rejects.toThrow(failure)
    await expectUnconsumed(booking.id)
    expect(await q('SELECT id FROM rental_items WHERE skate_id IN (?,?)', [skate, extraSkate])).toHaveLength(0)
    expect(await q("SELECT id FROM audit_logs WHERE user_id=? AND action='START_RENTAL'", [actor])).toHaveLength(0)
    expect((await q('SELECT status FROM skates WHERE id=?', [extraSkate]))[0].status).toBe('available')
  })

  it('uses current persisted times after editing and keeps the reserved-skate binding', async () => {
    const booking = await booked(120, 180)
    await updateReservation(booking.id, { reservedUntil: minutesAfter(booking.from, 90).toISOString(), skateId: extraSkate })
    await expect(execute(booking.id)).rejects.toMatchObject({ code: 'RESERVATION_MISMATCH' })
    const rental = await execute(booking.id, { skateIds: [extraSkate] })
    expect(rental.items[0]).toMatchObject({ expectedDurationMinutes: 90, skate: { id: extraSkate } })
  })

  it('blocks reservation creation/edit and rental extension into occupancy while allowing exact adjacency', async () => {
    const rental = await startRental(actor, { customerId: customer, skateIds: [skate], durationMinutes: 30 })
    const item = rental.items[0], end = new Date(item.expectedEndAt)
    const input = { customerId: otherCustomer, skateId: skate, reservedFrom: end.toISOString(), reservedUntil: minutesAfter(end, 60).toISOString() }
    // Prove active-rental protection separately, before an adjacent booking exists.
    await expect(createReservation(actor, { ...input, reservedFrom: minutesAfter(end, -10).toISOString() })).rejects.toMatchObject({ code: 'RESERVATION_RENTAL_CONFLICT' })
    const booking = await createReservation(otherActor, input)
    await expect(updateReservation(booking.id, { reservedFrom: minutesAfter(end, -10).toISOString() })).rejects.toMatchObject({ code: 'RESERVATION_RENTAL_CONFLICT' })
    await expect(extendRentalItem(item.id, actor, { extendByMinutes: 15 })).rejects.toMatchObject({ code: 'SKATE_RESERVED' })
    expect((await getRental(rental.id)).items[0].expectedDurationMinutes).toBe(30)
    expect(await q('SELECT id FROM rental_item_extensions WHERE rental_item_id=?', [item.id])).toHaveLength(0)
    await cancelReservation(booking.id, otherActor)
    expect((await extendRentalItem(item.id, actor, { extendByMinutes: 15 })).expectedDurationMinutes).toBe(45)
  })

  it('preserves independent partial returns and actual-duration final billing with split treasury collections', async () => {
    const booking = await booked()
    const rental = await execute(booking.id, { skateIds: [skate, extraSkate] })
    const first = rental.items.find(item => item.skate.id === skate)!
    const second = rental.items.find(item => item.skate.id === extraSkate)!
    // Shift generated actual-start fixtures to model elapsed use without
    // sleeping or mocking the service's authoritative return clock.
    await q('UPDATE rental_items SET started_at=DATE_SUB(UTC_TIMESTAMP(),INTERVAL 390 SECOND) WHERE id=?', [first.id])
    await q('UPDATE rental_items SET started_at=DATE_SUB(UTC_TIMESTAMP(),INTERVAL 690 SECOND) WHERE id=?', [second.id])
    const beforeReturn = Date.now()
    const firstReturn = await returnRentalItem(first.id, actor, healthyReturn)
    expect(firstReturn.isLastItem).toBe(false)
    expect(new Date(firstReturn.item.returnedAt!).getTime()).toBeGreaterThanOrEqual(beforeReturn - 1000)
    expect(firstReturn.item.actualDurationMinutes).toBe(7)
    expect(firstReturn.item.actualAmount).toBe(Math.round(first.pricePerHour * 7 / 60))
    expect(firstReturn.rental.items.find(item => item.id === second.id)?.status).toBe('active')
    expect((await q('SELECT status FROM skates WHERE id=?', [skate]))[0].status).toBe('available')
    expect((await q('SELECT status FROM skates WHERE id=?', [extraSkate]))[0].status).toBe('rented')
    await expect(finalizeRental(rental.id, actor, { payments: [{ paymentMethodId: cashMethod, amount: 1 }] })).rejects.toMatchObject({ code: 'RENTAL_HAS_ACTIVE_ITEMS' })
    await expectNoCollections()

    const secondReturn = await returnRentalItem(second.id, actor, healthyReturn)
    expect(secondReturn.isLastItem).toBe(true)
    expect(secondReturn.item.actualDurationMinutes).toBe(12)
    expect(secondReturn.item.actualAmount).toBe(Math.round(second.pricePerHour * 12 / 60))
    const frozen = (await getRental(rental.id)).items.find(item => item.id === first.id)!
    expect(frozen.returnedAt).toBe(firstReturn.item.returnedAt)
    expect(frozen.actualAmount).toBe(firstReturn.item.actualAmount)
    expect(frozen.expectedDurationMinutes).toBe(60)
    await expectNoCollections()

    const total = firstReturn.item.actualAmount! + secondReturn.item.actualAmount!
    const cashAmount = Math.floor(total / 2), cardAmount = total - cashAmount
    const complete = await finalizeRental(rental.id, actor, { payments: [
      { paymentMethodId: cashMethod, amount: cashAmount }, { paymentMethodId: cardMethod, amount: cardAmount },
    ] })
    expect(complete).toMatchObject({ status: 'completed', totalAmount: total, reservationId: booking.id })
    expect(complete.invoiceNumber).toBeTruthy()
    expect(complete.totalAmount).not.toBe(Math.round(first.pricePerHour) + Math.round(second.pricePerHour))
    const collections = await q('SELECT treasury_account_id,amount FROM rental_payments WHERE rental_id=? ORDER BY id', [rental.id])
    expect(collections).toEqual([{ treasury_account_id: drawer, amount: cashAmount.toFixed(2) }, { treasury_account_id: card, amount: cardAmount.toFixed(2) }])
    expect((await q('SELECT balance FROM treasury_accounts WHERE id=?', [drawer]))[0].balance).toBe(cashAmount.toFixed(2))
    expect((await q('SELECT balance FROM treasury_accounts WHERE id=?', [card]))[0].balance).toBe(cardAmount.toFixed(2))
    const [ledger] = await q("SELECT CAST(SUM(IF(type='in',amount,-amount)) AS DECIMAL(12,2)) AS total FROM treasury_movements WHERE cashier_id=?", [actor])
    expect(ledger.total).toBe(total.toFixed(2))
    expect(await getReservation(booking.id)).toMatchObject({ status: 'fulfilled', rentalId: rental.id, reservedFrom: booking.from.toISOString(), reservedUntil: booking.until.toISOString() })
  })
})
