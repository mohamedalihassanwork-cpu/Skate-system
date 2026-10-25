import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import request from 'supertest'
import jwt from 'jsonwebtoken'
import app from '../app.js'
import env from '../config/env.js'
import { pool } from '../db/connection.js'

type FixtureValue = string | number | boolean | Date | null

// Real test-DB reads with generated fixtures only. No seed, configuration,
// historical-row changes or schema changes. Run serially with other DB suites.
describe('Reports data and authorization regressions', () => {
  const prefix = `rep-${randomUUID()}`
  const period = { startDate: '2003-06-14', endDate: '2003-06-15', page: 1, limit: 100 }
  const eventTime = '2003-06-14 10:00:00'
  const refundTime = '2003-06-15 10:00:00'
  const ids = new Map<string, number[]>()
  const endpoints = ['overview', 'operating-financial', 'revenue', 'expenses', 'rentals', 'late', 'damages', 'maintenance', 'customers', 'cashiers', 'skate-performance']
  let viewer: number, actor: number, refundActor: number, deniedToken: string, viewerToken: string
  let customer: number, account: number, shift: number, refundShift: number
  let multi: number, legacy: number, active: number, cancelled: number
  let itemA: number, itemB: number, pendingItem: number, activeItem: number
  let damage: number, pendingMaintenance: number
  let skateA: number, skateB: number, skateC: number, unusedSkate: number
  let currentBaseline: { activeRentals: number; lateRentals: number; activeMaintenance: number }
  let rankingSpender: number, rankingFrequent: number

  async function rows(statement: string, values: FixtureValue[] = []): Promise<any[]> {
    const [result] = await pool.execute(statement, values)
    return result as any[]
  }
  async function insert(table: string, values: Record<string, FixtureValue>): Promise<number> {
    const columns = Object.keys(values)
    const [result] = await pool.execute(
      `INSERT INTO ${table} (${columns.join(',')}) VALUES (${columns.map(() => '?').join(',')})`,
      Object.values(values),
    )
    const id = (result as { insertId: number }).insertId
    ids.set(table, [...(ids.get(table) ?? []), id])
    return id
  }
  async function makeUser(label: string) {
    const email = `${prefix}-${label}@test.invalid`
    const id = await insert('users', { name: `${prefix}-${label}`, email, password_hash: 'report-test-only', is_active: 1 })
    return { id, token: jwt.sign({ sub: id, email }, env.JWT_SECRET, { expiresIn: '15m' }) }
  }
  async function makeRental(options: Record<string, FixtureValue> = {}) {
    return insert('rentals', {
      rental_code: `${prefix}-${randomUUID().slice(0, 8)}`.slice(0, 50), customer_id: customer,
      cashier_id: actor, shift_id: shift, started_at: eventTime, status: 'completed', created_at: eventTime,
      ...options,
    })
  }
  async function makeItem(rentalId: number, skateId: number, options: Record<string, FixtureValue> = {}) {
    return insert('rental_items', {
      rental_id: rentalId, skate_id: skateId, started_at: eventTime,
      expected_duration_minutes: 30, expected_end_at: '2003-06-14 10:30:00', price_per_hour: '120.00',
      status: 'returned', returned_at: '2003-06-14 10:45:00', actual_duration_minutes: 45, actual_amount: '90.00',
      ...options,
    })
  }
  async function movement(referenceType: string, amount: string, options: Record<string, FixtureValue> = {}) {
    const outward = ['expense', 'maintenance_payment', 'rental_refund', 'sale_refund'].includes(referenceType)
    return insert('treasury_movements', {
      treasury_account_id: account, cashier_id: actor, shift_id: shift, reference_type: referenceType,
      amount, type: outward ? 'out' : 'in', created_at: eventTime, ...options,
    })
  }
  async function report(name: string, filters: Record<string, unknown> = {}) {
    const response = await request(app).get(`/api/v1/reports/${name}`).query({ ...period, ...filters })
      .set('Authorization', `Bearer ${viewerToken}`)
    expect(response.status, `${name}: ${JSON.stringify(response.body)}`).toBe(200)
    expect(response.body.success).toBe(true)
    return response.body.data
  }

  beforeAll(async () => {
    expect(env.NODE_ENV).toBe('test')
    expect(env.DB_NAME).toBe('koshk_skate_test')
    expect((await rows('SELECT DATABASE() AS name'))[0].name).toBe('koshk_skate_test')
    for (const [table, dateColumn] of [['treasury_movements', 'created_at'], ['rentals', 'started_at'], ['damage_reports', 'created_at'], ['maintenance_records', 'created_at']]) {
      const existing = await rows(`SELECT COUNT(*) AS count FROM ${table} WHERE ${dateColumn}>=? AND ${dateColumn}<?`, ['2003-06-13 21:00:00', '2003-06-15 21:00:00'])
      expect(Number(existing[0].count), `Dedicated report fixture period must be empty in ${table}`).toBe(0)
    }
    const permission = (await rows("SELECT id FROM permissions WHERE `key`='reports.view'"))[0]
    if (!permission) throw new Error('The checked test schema must include reports.view')
    const role = await insert('roles', { name: prefix, name_ar: 'صلاحية اختبار التقارير', is_system: 0 })
    const viewerUser = await makeUser('viewer')
    viewer = viewerUser.id; viewerToken = viewerUser.token
    await pool.execute('INSERT INTO role_permissions(role_id,permission_id) VALUES(?,?)', [role, permission.id])
    await pool.execute('INSERT INTO user_roles(user_id,role_id) VALUES(?,?)', [viewer, role])
    currentBaseline = await report('overview')
    const actingUser = await makeUser('cashier')
    actor = actingUser.id; deniedToken = actingUser.token
    refundActor = (await makeUser('refund-cashier')).id
    account = await insert('treasury_accounts', { name: prefix, name_ar: 'خزينة اختبار التقارير', balance: '1534.00', is_cash_drawer: 1 })
    shift = await insert('cashier_shifts', { cashier_id: actor, opened_at: eventTime, opening_balance: '0.00', difference: '-5.00', status: 'closed' })
    refundShift = await insert('cashier_shifts', { cashier_id: refundActor, opened_at: eventTime, opening_balance: '0.00', difference: '2.00', status: 'closed' })
    customer = await insert('customers', { name: `${prefix}-customer`, phone: '01000000000', registration_date: '2003-06-14' })
    for (const [label, size] of [['A', '42'], ['B', '43'], ['C', '44'], ['unused', '45']]) {
      await insert('skates', { skate_code: `${prefix}-${label}`.slice(0, 50), size, type: 'inline', status: 'available' })
    }
    ;[skateA, skateB, skateC, unusedSkate] = ids.get('skates')!
    // Deliberately contradictory header: current items must take precedence.
    multi = await makeRental({ skate_id: skateC, duration_minutes: 999, rental_amount: '999.00', total_amount: '240.00', completed_at: '2003-06-14 11:15:00' })
    itemA = await makeItem(multi, skateA)
    itemB = await makeItem(multi, skateB, { expected_duration_minutes: 60, expected_end_at: '2003-06-14 11:00:00', returned_at: '2003-06-14 11:15:00', actual_duration_minutes: 75, actual_amount: '150.00' })
    legacy = await makeRental({ skate_id: skateA, duration_minutes: 30, rental_amount: '60.00', price_per_hour: '120.00', expected_end_at: '2003-06-14 10:30:00', returned_at: '2003-06-14 10:35:00', status: 'returned' })
    active = await makeRental({ status: 'active' })
    pendingItem = await makeItem(active, skateB, { expected_duration_minutes: 10, expected_end_at: '2003-06-14 10:10:00', returned_at: '2003-06-14 10:15:00', actual_duration_minutes: 15, actual_amount: '30.00' })
    activeItem = await makeItem(active, skateA, { status: 'active', expected_duration_minutes: 15, expected_end_at: '2003-06-14 10:15:00', returned_at: null, actual_duration_minutes: null, actual_amount: null })
    cancelled = await makeRental({ status: 'cancelled', skate_id: skateC, duration_minutes: 30, rental_amount: '0.00' })
    const oldRental = await makeRental({ started_at: '1999-01-01 12:00:00', skate_id: skateA, duration_minutes: 5, rental_amount: '10.00' })
    for (const [rentalId, itemId, calculated, collected, waived] of [
      [multi, itemA, '30.00', '20.00', '10.00'], [multi, itemB, '50.00', '50.00', '0.00'],
      [active, pendingItem, '10.00', '7.00', '3.00'], [legacy, null, '8.00', '5.00', '3.00'],
    ]) {
      await insert('late_fee_records', { rental_id: rentalId, rental_item_id: itemId, late_minutes: rentalId === legacy || rentalId === active ? 5 : 15, calculated_fee: calculated, collected_fee: collected, waived_fee: waived, waived_by: Number(waived) ? refundActor : null, waived_at: Number(waived) ? eventTime : null, created_at: eventTime })
    }
    const inspection = await insert('inspections', { rental_id: multi, rental_item_id: itemA, skate_id: skateA, inspected_by: actor, created_at: eventTime })
    damage = await insert('damage_reports', { rental_id: multi, inspection_id: inspection, skate_id: skateA, customer_id: customer, reported_by: actor, damage_type: 'wheel', severity: 'minor', description: `${prefix}-wheel`, customer_charge: '30.00', charge_collected: '20.00', charge_waived: '5.00', waived_by: refundActor, status: 'partially_paid', created_at: eventTime })
    const repair = await insert('maintenance_records', { skate_id: skateA, damage_report_id: damage, created_by: actor, completed_by: actor, problem_description: `${prefix}-repair`, total_cost: '40.00', status: 'completed', payment_status: 'paid', started_at: eventTime, completed_at: '2003-06-14 11:00:00', created_at: eventTime, updated_at: eventTime })
    await insert('maintenance_records', { skate_id: skateA, damage_report_id: damage, created_by: actor, problem_description: `${prefix}-external`, total_cost: '10.00', status: 'completed', payment_status: 'paid_external', started_at: eventTime, completed_at: '2003-06-14 10:30:00', created_at: eventTime, updated_at: eventTime })
    pendingMaintenance = await insert('maintenance_records', { skate_id: skateC, created_by: actor, problem_description: `${prefix}-pending`, total_cost: '0.00', status: 'pending', created_at: eventTime, updated_at: eventTime })
    await insert('maintenance_records', { skate_id: skateB, created_by: actor, problem_description: `${prefix}-legacy`, total_cost: '100.00', status: 'completed', payment_status: 'legacy', started_at: eventTime, completed_at: '2003-06-14 11:00:00', created_at: eventTime, updated_at: eventTime })
    const namedExpense = await insert('expenses', { category_id: 1, amount: '25.00', description: prefix, cashier_id: actor, shift_id: shift, created_at: eventTime })
    const unclassified = await insert('expenses', { amount: '5.00', description: prefix, cashier_id: actor, shift_id: shift, created_at: eventTime })
    // A source without a movement must not inflate recorded expense categories.
    await insert('expenses', { category_id: 2, amount: '999.00', description: prefix, cashier_id: actor, shift_id: shift, created_at: eventTime })
    const identifiedSale = await insert('sales', { sale_code: `${prefix}-sale`.slice(0, 50), customer_id: customer, cashier_id: actor, shift_id: shift, total_amount: '40.00', created_at: eventTime })
    const anonymousSale = await insert('sales', { sale_code: `${prefix}-anon`.slice(0, 50), cashier_id: actor, shift_id: shift, total_amount: '60.00', created_at: eventTime })
    for (const [referenceId, amount] of [[multi, '240.00'], [legacy, '60.00'], [oldRental, '10.00']]) await movement('rental_payment', String(amount), { reference_id: referenceId })
    await movement('late_fee_payment', '70.00', { reference_id: multi })
    await movement('late_fee_payment', '5.00', { reference_id: legacy })
    await movement('damage_charge_payment', '20.00', { reference_id: damage })
    await movement('sale_payment', '40.00', { reference_id: identifiedSale })
    await movement('sale_payment', '60.00', { reference_id: anonymousSale })
    await movement('rental_refund', '20.00', { reference_id: legacy, cashier_id: refundActor, shift_id: refundShift, created_at: refundTime })
    await movement('sale_refund', '10.00', { reference_id: identifiedSale, cashier_id: refundActor, shift_id: refundShift, created_at: refundTime })
    await movement('expense', '25.00', { reference_id: namedExpense })
    await movement('expense', '5.00', { reference_id: unclassified })
    await movement('expense', '7.00', { reference_id: 2147483647 })
    await movement('maintenance_payment', '40.00', { reference_id: repair })
    await movement('treasury_transfer', '1000.00')
    await movement('treasury_transfer', '1000.00', { type: 'out' })
    await movement('treasury_variance', '500.00')
    await movement('other', '600.00')
    // Inclusive Cairo midnight and exclusive next-day Cairo midnight.
    await movement('sale_payment', '11.00', { created_at: '2003-06-13 21:00:00' })
    await movement('sale_payment', '12.00', { created_at: '2003-06-13 20:59:59' })
    await movement('sale_payment', '13.00', { created_at: '2003-06-15 21:00:00' })
    // Separate date/account fixtures make frequency and spending disagree
    // without changing the financial expectations for the main period.
    const rankingTime = '2003-07-01 10:00:00'
    const rankingAccount = await insert('treasury_accounts', { name: `${prefix}-ranking`, name_ar: 'خزينة اختبار الترتيب', balance: '610.00' })
    rankingSpender = await insert('customers', { name: `${prefix}-ranking-spender`, phone: '01000000001', registration_date: '2003-07-01' })
    rankingFrequent = await insert('customers', { name: `${prefix}-ranking-frequent`, phone: '01000000002', registration_date: '2003-07-01' })
    for (let index = 0; index < 2; index++) {
      await makeRental({ customer_id: rankingFrequent, started_at: rankingTime, created_at: rankingTime, skate_id: skateA, duration_minutes: 15, rental_amount: '30.00', expected_end_at: '2003-07-01 10:15:00', returned_at: '2003-07-01 10:15:00' })
    }
    for (const [rankingCustomer, amount, code] of [[rankingSpender, '600.00', 'rank-high'], [rankingFrequent, '10.00', 'rank-low']] as const) {
      const sale = await insert('sales', { sale_code: `${prefix}-${code}`.slice(0, 50), customer_id: rankingCustomer, cashier_id: actor, shift_id: shift, total_amount: amount, created_at: rankingTime })
      await movement('sale_payment', amount, { reference_id: sale, treasury_account_id: rankingAccount, created_at: rankingTime })
    }
    // Finalization rounds the commercial late total, without allocating rounded
    // pennies to individual fee records. The report must expose both values.
    const fractionalTime = '2003-08-13 10:00:00'
    const fractionalRental = await makeRental({ started_at: fractionalTime, created_at: fractionalTime })
    for (const skateId of [skateA,skateB]) {
      const item = await makeItem(fractionalRental,skateId,{ started_at:fractionalTime, expected_duration_minutes:1, expected_end_at:'2003-08-13 10:01:00', returned_at:'2003-08-13 10:02:00', actual_duration_minutes:2, actual_amount:'4.00' })
      await insert('late_fee_records',{ rental_id:fractionalRental,rental_item_id:item,late_minutes:1,calculated_fee:'0.75',collected_fee:'0.75',waived_fee:'0.00',created_at:fractionalTime })
    }
    const fractionalAccount=await insert('treasury_accounts',{ name:`${prefix}-fractional`,name_ar:'اختبار التقريب',balance:'2.00' })
    await movement('late_fee_payment','2.00',{ reference_id:fractionalRental,treasury_account_id:fractionalAccount,created_at:fractionalTime })
  }, 30000)

  afterAll(async () => {
    // Fixed dependency order, exact generated IDs; partial setup is safe too.
    for (const role of ids.get('roles') ?? []) {
      await pool.execute('DELETE FROM user_roles WHERE role_id=?', [role])
      await pool.execute('DELETE FROM role_permissions WHERE role_id=?', [role])
    }
    for (const table of ['treasury_movements', 'expenses', 'maintenance_records', 'damage_reports', 'late_fee_records', 'inspections', 'rental_items', 'rentals', 'sales', 'cashier_shifts', 'treasury_accounts', 'skates', 'customers', 'users', 'roles']) {
      const ownIds = ids.get(table) ?? []
      if (ownIds.length) await pool.execute(`DELETE FROM ${table} WHERE id IN (${ownIds.map(() => '?').join(',')})`, ownIds)
    }
  }, 30000)

  it.each(endpoints)('requires authentication and reports.view for %s', async name => {
    const unauthenticated = await request(app).get(`/api/v1/reports/${name}`).query(period)
    expect(unauthenticated.status).toBe(401)
    const forbidden = await request(app).get(`/api/v1/reports/${name}`).query(period).set('Authorization', `Bearer ${deniedToken}`)
    expect(forbidden.status).toBe(403)
  })

  it('reconciles refunds, refund-only chart days and operating expense whitelists', async () => {
    const overview = await report('overview')
    const financial = await report('operating-financial')
    const revenue = await report('revenue')
    const expense = await report('expenses')
    expect(overview.totalRevenue).toBe(486)
    expect(overview.totalExpenses).toBe(77)
    expect(financial).toMatchObject({ rentalRevenue: 310, lateFees: 75, damageCharges: 20, salesRevenue: 111, refunds: 30, totalRevenue: 486, totalExpenses: 77, operatingResult: 409 })
    expect(revenue.totalRevenue).toBe(486)
    expect(revenue.chartData).toEqual([{ date: '2003-06-14', value: 516 }, { date: '2003-06-15', value: -30 }])
    expect(revenue.chartData.reduce((total: number, point: any) => total + point.value, 0)).toBe(revenue.totalRevenue)
    expect(expense.totalExpenses).toBe(77)
    expect(expense.chartData.reduce((total: number, point: any) => total + point.value, 0)).toBe(77)
    expect(expense.byCategory.reduce((total: number, entry: any) => total + entry.total, 0)).toBe(77)
    expect(expense.byCategory).toContainEqual({ category: 'الصيانة', total: 40 })
    expect(expense.byCategory).toContainEqual({ category: 'فئة رقم 1', total: 25 })
    expect(expense.byCategory).toContainEqual({ category: 'غير مصنف', total: 12 })
    expect(financial.expensesByCategory).toEqual(expense.byCategory)
    expect(financial.revenueByCategory.reduce((total: number, entry: any) => total + entry.total, 0)).toBe(486)
    expect(expense.byCategory.every((entry: any) => typeof entry.category === 'string' && !/^\d+$/.test(entry.category))).toBe(true)
  })

  it('preserves commercial cancelled activity counts and uses item overdue state', async () => {
    const overview = await report('overview')
    expect(overview.totalRentals).toBe(4)
    expect(overview.activeRentals).toBe(currentBaseline.activeRentals + 1)
    expect(overview.lateRentals).toBe(currentBaseline.lateRentals + 1)
    expect(overview.activeMaintenance).toBe(currentBaseline.activeMaintenance + 1)
  })

  it('uses per-item billed values with historical fallback exactly once', async () => {
    const rental = await report('rentals', { search: prefix })
    expect(rental.meta).toMatchObject({ total: 6, page: 1, limit: 100, totalPages: 1 })
    expect(rental.summary).toMatchObject({ totalRentals: 4, totalItems: 6, totalAmount: 330 })
    const completedItems = rental.data.filter((row: any) => row.id === multi)
    expect(completedItems).toHaveLength(2)
    expect(completedItems.find((row: any) => row.skateCode === `${prefix}-A`)).toMatchObject({
      expectedDuration: 30, duration: 45, amount: 90, rentalStatus: 'completed', status: 'returned',
      actualReturnTime: '2003-06-14T10:45:00.000Z', cashierName: `${prefix}-cashier`,
    })
    expect(completedItems.find((row: any) => row.skateCode === `${prefix}-B`)).toMatchObject({ expectedDuration: 60, duration: 75, amount: 150 })
    expect(rental.data.find((row: any) => row.id === legacy)).toMatchObject({ skateCode: `${prefix}-A`, expectedDuration: 30, duration: 35, amount: 60, actualReturnTime: '2003-06-14T10:35:00.000Z' })
    expect(rental.data.find((row: any) => row.id === active && row.status === 'active')).toMatchObject({ duration: null, amount: null, actualReturnTime: null })
    expect(rental.data.filter((row: any) => row.id === cancelled)).toHaveLength(1)
    expect(new Set(rental.data.map((row: any) => row.rowId)).size).toBe(6)
  })

  it('applies combined item filters before summary, count and deterministic pagination', async () => {
    const filters = { customer: `${prefix}-customer`, cashier: `${prefix}-cashier`, skate: `${prefix}-B`, size: '43', status: 'returned', limit: 1 }
    const first = await report('rentals', { ...filters, page: 1 })
    const second = await report('rentals', { ...filters, page: 2 })
    expect(first.meta).toEqual({ total: 2, page: 1, limit: 1, totalPages: 2 })
    expect(second.meta).toEqual({ total: 2, page: 2, limit: 1, totalPages: 2 })
    expect(first.summary).toMatchObject({ totalRentals: 2, totalItems: 2, totalAmount: 180 })
    expect(second.summary).toEqual(first.summary)
    expect(first.data).toHaveLength(1)
    expect(second.data).toHaveLength(1)
    expect(first.data[0].rowId).not.toBe(second.data[0].rowId)
    expect((await report('rentals', { ...filters, page: 1 })).data).toEqual(first.data)
    const expectedDuration = await report('rentals', { search: prefix, duration: 60 })
    expect(expectedDuration.meta.total).toBe(1)
    expect(expectedDuration.data[0]).toMatchObject({ amount: 150, expectedDuration: 60 })
    const current = await report('rentals', { search: prefix, rentalStatus: 'active' })
    expect(current.meta.total).toBe(2)
    const empty = await report('rentals', { search: `${prefix}-absent` })
    expect(empty.data).toEqual([])
    expect(empty.meta.total).toBe(0)
    expect(empty.summary).toMatchObject({ totalRentals: 0, totalItems: 0, totalAmount: 0 })
  })

  it('distinguishes item late records, completed cash collections and pending finalization', async () => {
    const late = await report('late', { search: prefix })
    expect(late.meta.total).toBe(4)
    expect(late.summary).toMatchObject({ totalLateRentals: 3, calculatedLateFees: 98, collectedLateFees: 75, waivedLateFees: 16, pendingLateFees: 7 })
    expect(late.summary.waiverRate).toBeCloseTo(16 / 98 * 100, 2)
    expect(late.data.filter((row: any) => row.rentalId === multi)).toHaveLength(2)
    expect(late.data.find((row: any) => row.rentalId === active)).toMatchObject({ skateCode: `${prefix}-B`, lateFee: 10, collectedFee: 0, waivedFee: 3, pendingFee: 7 })
    expect(late.data.find((row: any) => row.rentalId === legacy)).toMatchObject({ skateCode: `${prefix}-A`, lateFee: 8, collectedFee: 5, waivedFee: 3, pendingFee: 0 })
    expect(late.byCashier.reduce((total: number, entry: any) => total + entry.collectedFees, 0)).toBe(75)
  })

  it('separates fractional recorded fee settlements from actual rounded commercial cash once', async () => {
    const late = await report('late',{ startDate:'2003-08-13',endDate:'2003-08-13',search:prefix })
    expect(late.meta.total).toBe(2)
    expect(late.summary).toMatchObject({ calculatedLateFees:1.5,collectedLateFees:1.5,pendingLateFees:0,actualCollectedLateFees:2 })
    expect(late.data.map((row:any)=>row.collectedFee)).toEqual([0.75,0.75])
    expect(late.byCashier[0].collectedFees).toBe(1.5)
  })

  it('keeps damage charge, collection, waiver, outstanding and linked repair costs separate', async () => {
    const damageReport = await report('damages', { search: prefix, status: 'partially_paid' })
    expect(damageReport.meta.total).toBe(1)
    expect(damageReport.data[0]).toMatchObject({ id: damage, chargeAmount: 30, chargeCollected: 20, chargeWaived: 5, outstandingCharge: 5, repairCost: 50, damageType: 'wheel', status: 'partially_paid' })
    expect(damageReport.summary).toMatchObject({ totalDamages: 1, totalCharges: 30, totalCollected: 20, totalWaived: 5, totalOutstanding: 5, totalRepairCost: 50 })
    expect(damageReport.byType).toContainEqual({ type: 'wheel', count: 1, chargeAmount: 30, repairCost: 50 })
    expect((await report('damages', { search: prefix, status: 'paid' })).meta.total).toBe(0)
  })

  it('includes created pending maintenance without start dates and excludes external costs from cash expenses', async () => {
    const maintenance = await report('maintenance', { search: prefix })
    expect(maintenance.meta.total).toBe(4)
    expect(maintenance.summary).toMatchObject({ totalMaintenance: 4, totalCost: 150, averageCost: 37.5, completedCount: 3, averageCompletedMinutes: 50 })
    expect(maintenance.data.find((row: any) => row.id === pendingMaintenance)).toMatchObject({ startedAt: null, completedAt: null, elapsedMinutes: null, paymentStatus: 'unpaid', status: 'pending' })
    expect(maintenance.data.filter((row: any) => row.paymentStatus === 'paid_external')).toHaveLength(1)
    const pending = await report('maintenance', { search: prefix, status: 'pending' })
    expect(pending.meta.total).toBe(1)
    expect(pending.summary).toMatchObject({ totalMaintenance: 1, totalCost: 0, averageCost: 0, completedCount: 0, averageCompletedMinutes: null })
    expect((await report('expenses')).totalExpenses).toBe(77)
  })

  it('attributes customer net spending by payment date without anonymous sales or item count multiplication', async () => {
    const customers = await report('customers', { search: `${prefix}-customer` })
    expect(customers.meta.total).toBe(1)
    expect(customers.data[0]).toMatchObject({ id: customer, rentalsCount: 4, totalSpent: 415, lateReturns: 3, damages: 1 })
    expect(customers.summary).toMatchObject({ totalCustomers: 1, totalRentals: 4, totalSpent: 415, lateReturns: 3, damages: 1 })
  })

  it('attributes refunds and ledger maintenance expenses to the performing cashier with signed differences', async () => {
    const cashiers = await report('cashiers', { search: prefix })
    expect(cashiers.meta.total).toBe(2)
    expect(cashiers.data.find((row: any) => row.id === actor)).toMatchObject({ rentalsCount: 4, revenue: 516, lateFees: 75, waivedFees: 0, expenses: 77, shiftDifference: -5 })
    expect(cashiers.data.find((row: any) => row.id === refundActor)).toMatchObject({ rentalsCount: 0, revenue: -30, lateFees: 0, waivedFees: 16, expenses: 0, shiftDifference: 2 })
    expect(cashiers.summary).toMatchObject({ totalCashiers: 2, totalRentals: 4, revenue: 486, lateFees: 75, waivedFees: 16, expenses: 77, shiftDifference: -3 })
    const expenses = await report('expenses')
    expect(expenses.byUser.reduce((total: number, entry: any) => total + entry.total, 0)).toBe(77)
    expect(expenses.byAccount.reduce((total: number, entry: any) => total + entry.total, 0)).toBe(77)
  })

  it('uses actual per-skate usage and billing while retaining unused skates', async () => {
    const skates = await report('skate-performance', { search: prefix })
    expect(skates.meta.total).toBe(4)
    expect(skates.data.find((row: any) => row.id === skateA)).toMatchObject({ rentalsCount: 3, rentalRevenue: 150, usageMinutes: 80, maintenanceCount: 2, maintenanceCost: 50, damageCount: 1, customerCharges: 30, collectedDamageCharges: 20 })
    expect(skates.data.find((row: any) => row.id === skateB)).toMatchObject({ rentalsCount: 2, rentalRevenue: 180, usageMinutes: 90, maintenanceCount: 1, maintenanceCost: 100 })
    expect(skates.data.find((row: any) => row.id === skateC)).toMatchObject({ rentalsCount: 1, rentalRevenue: 0, usageMinutes: 0 })
    expect(skates.data.find((row: any) => row.id === unusedSkate)).toMatchObject({ rentalsCount: 0, rentalRevenue: 0, usageMinutes: 0, maintenanceCount: 0, damageCount: 0 })
    expect(skates.summary).toMatchObject({ totalSkates: 4, rentalsCount: 6, rentalRevenue: 330, usageMinutes: 170 })
  })

  it('ranks customers by spending or commercial frequency before pagination with matching summaries', async () => {
    const filters = { startDate: '2003-07-01', endDate: '2003-07-01', search: `${prefix}-ranking`, limit: 1 }
    const spending = await report('customers', { ...filters, sort: 'spending' })
    const frequent = await report('customers', { ...filters, sort: 'frequency' })
    const nextFrequent = await report('customers', { ...filters, sort: 'frequency', page: 2 })
    expect(spending.data[0]).toMatchObject({ id: rankingSpender, totalSpent: 600, rentalsCount: 0 })
    expect(frequent.data[0]).toMatchObject({ id: rankingFrequent, totalSpent: 10, rentalsCount: 2 })
    expect(nextFrequent.data[0].id).toBe(rankingSpender)
    expect(frequent.meta).toEqual({ total: 2, page: 1, limit: 1, totalPages: 2 })
    expect(frequent.summary).toMatchObject({ totalCustomers: 2, totalRentals: 2, totalSpent: 610 })
    expect(spending.summary).toEqual(frequent.summary)
    expect(nextFrequent.summary).toEqual(frequent.summary)
  })

  it.each(['most-used', 'least-used', 'maintenance', 'damages'])('orders all matching skates by %s before pagination', async sort => {
    const full = await report('skate-performance', { search: prefix, sort })
    const first = await report('skate-performance', { search: prefix, sort, limit: 1 })
    expect(first.meta).toEqual({ total: 4, page: 1, limit: 1, totalPages: 4 })
    expect(first.summary).toEqual(full.summary)
    expect(first.data[0].id).toBe(sort === 'least-used' ? unusedSkate : skateA)
    expect(first.data[0]).toEqual(full.data[0])
    expect(full.summary).toMatchObject({ totalSkates: 4, unusedSkates: 1, rentalRevenue: 330 })
  })

  it('normalizes reversed dates to the identical applied report and respects Cairo midnight', async () => {
    const normal = await report('revenue')
    const reversed = await report('revenue', { startDate: period.endDate, endDate: period.startDate })
    expect(reversed).toEqual(normal)
    const refundOnly = await report('revenue', { startDate: '2003-06-15', endDate: '2003-06-15' })
    expect(refundOnly.totalRevenue).toBe(-30)
    expect(refundOnly.chartData).toEqual([{ date: '2003-06-15', value: -30 }])
    const loss = await report('operating-financial', { startDate: '2003-06-15', endDate: '2003-06-15' })
    expect(loss).toMatchObject({ totalRevenue: -30, operatingResult: -30 })
    const leapDay = await report('revenue', { startDate: '2004-02-29', endDate: '2004-02-29' })
    expect(leapDay.totalRevenue).toBe(0)
    expect(leapDay.chartData).toEqual([])
  })

  it.each([
    { startDate: undefined }, { endDate: undefined }, { startDate: '2003-02-29' },
    { startDate: '2003-02-30' }, { startDate: '2003-13-01' }, { startDate: '0000-01-01' },
    { startDate: '2003-6-14' }, { startDate: ['2003-06-14', '2003-06-15'] },
    { endDate: { date: '2003-06-15' } }, { page: '-1' }, { page: '0' }, { page: '1.5' },
    { page: '2x' }, { page: '99999999999999999999' }, { page: ['1', '2'] }, { limit: '-1' }, { limit: '0' }, { limit: '1.5' },
    { limit: 'garbage' }, { limit: '101' }, { limit: ['10', '20'] }, { duration: '1.5' },
    { search: ['first', 'second'] }, { status: ['returned', 'active'] }, { status: 'inspected' }, { customer: { name: prefix } },
  ])('rejects invalid scalar dates and integer parameters: %j', async invalid => {
    const response = await request(app).get('/api/v1/reports/rentals').query({ ...period, ...invalid })
      .set('Authorization', `Bearer ${viewerToken}`)
    expect(response.status).toBe(400)
    expect(response.body.success).toBe(false)
    expect(response.body.error.code).toBe('VALIDATION_ERROR')
  })

  it('leaves every generated source and financial row unchanged across all report reads', async () => {
    async function snapshot() {
      const data: Record<string, any[]> = {}
      for (const [table, ownIds] of ids) {
        data[table] = await rows(`SELECT * FROM ${table} WHERE id IN (${ownIds.map(() => '?').join(',')}) ORDER BY id`, ownIds)
      }
      return data
    }
    const before = await snapshot()
    const [ledger] = await rows("SELECT a.balance,(SELECT SUM(CASE WHEN m.type='in' THEN m.amount ELSE -m.amount END) FROM treasury_movements m WHERE m.treasury_account_id=a.id) AS recorded FROM treasury_accounts a WHERE a.id=?", [account])
    expect(Number(ledger.balance)).toBe(Number(ledger.recorded))
    for (const endpoint of endpoints) await report(endpoint, { search: prefix })
    expect(await snapshot()).toEqual(before)
  })
})
