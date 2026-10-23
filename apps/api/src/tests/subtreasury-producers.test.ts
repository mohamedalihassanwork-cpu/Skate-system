import { randomUUID } from 'node:crypto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { pool } from '../db/connection.js'
import env from '../config/env.js'
import { SalesService } from '../modules/sales/sales.service.js'
import { recordExpense, listExpenses } from '../modules/expenses/expenses.service.js'
import { finalizeRental, startRental, returnRentalItem, extendRentalItem, cancelRental } from '../modules/rentals/rentals.service.js'
import { closeShift } from '../modules/shifts/shifts.service.js'
import { collectCharge } from '../modules/damage/damage.service.js'
import { maintenanceService } from '../modules/maintenance/maintenance.service.js'
import * as finance from '../modules/treasury/treasury-posting.js'
import { getOverviewReport, getOperatingFinancialReport } from '../modules/reports/reports.service.js'

// Real InnoDB tests. Run serially with other database suites. Only generated
// fixtures are deleted; the pre-existing configuration is restored exactly.
describe('Managed subtreasury financial producers', () => {
  let config: any
  let ids: { users: number[]; accounts: number[]; assignments: number[]; shifts: number[]; methods: number[]; products: number[]; categories: number[]; skates: number[]; customers: number[]; rentals: number[] }
  let a: number, b: number, drawerA: number, drawerB: number, main: number, card: number
  let cashMethod: number, cardMethod: number, product: number, shiftA: number, shiftB: number
  const q = (statement: string, params: any[] = []) => finance.query(pool, statement, params)
  const placeholders = (values: number[]) => values.map(() => '?').join(',')
  async function settled<T>(pending: Promise<T>[]): Promise<T[]> {
    const results = await Promise.allSettled(pending)
    const failure = results.find(result => result.status === 'rejected')
    if (failure?.status === 'rejected') throw failure.reason
    return results.map(result => (result as PromiseFulfilledResult<T>).value)
  }
  async function insert(table: keyof typeof ids, statement: string, params: any[] = []) {
    const result = await q(statement, params)
    ids[table].push(result.insertId)
    return result.insertId as number
  }
  async function makeAccount(cash: boolean, role = 'legacy') {
    return insert('accounts', 'INSERT INTO treasury_accounts(name,name_ar,is_cash_drawer,account_role) VALUES(?,?,?,?)',
      [`producer-${randomUUID()}`, 'Producer test account', cash, role])
  }
  async function balance(accountId: number) {
    const [row] = await q('SELECT balance FROM treasury_accounts WHERE id=?', [accountId])
    const [ledger] = await q("SELECT CAST(COALESCE(SUM(IF(type='in',amount,-amount)),0) AS DECIMAL(12,2)) AS balance FROM treasury_movements WHERE treasury_account_id=?", [accountId])
    expect(row.balance).toBe(ledger.balance)
    return row.balance as string
  }
  async function fund(accountId: number, amount: string, actor = a) {
    // Synthetic initial-funds fixture; deliberately not a production funding API.
    await q("INSERT INTO treasury_movements(treasury_account_id,amount,type,reference_type,reference_id,cashier_id,cash_snapshot) VALUES(?,?,'in','other',?,?,1)", [accountId, amount, actor, actor])
    await q('UPDATE treasury_accounts SET balance=balance+? WHERE id=?', [amount, accountId])
  }
  function saleInput(actor = a, operationKey = randomUUID()) {
    return { operationKey, cashierId: actor, items: [{ productId: product, quantity: 1 }],
      payments: [{ paymentMethodId: cashMethod, amount: 10, treasuryAccountId: main }] }
  }
  const healthyReturn = { inspection: {
    wheelsCondition: 'good', brakeCondition: 'good', strapCondition: 'good',
    bearingsCondition: 'good', bodyCondition: 'good', maintenanceRequired: false,
  } } as const
  async function liveRentalFixture() {
    const customerId = await insert('customers', 'INSERT INTO customers(name,phone,registration_date) VALUES(?,?,CURRENT_DATE())', ['Producer lifecycle customer', '01000000000'])
    const skateId = await insert('skates', "INSERT INTO skates(skate_code,size,status) VALUES(?,'42','available')", [`PR-${randomUUID()}`])
    const rental = await startRental(a, { customerId, skateIds: [skateId], durationMinutes: 60 })
    ids.rentals.push(rental.id)
    return rental
  }
  async function rentalFixture(actual = '10.00') {
    const customerId = await insert('customers', 'INSERT INTO customers(name,phone,registration_date) VALUES(?,?,CURRENT_DATE())', ['Producer customer', '01000000000'])
    const skateId = await insert('skates', "INSERT INTO skates(skate_code,size,status) VALUES(?,'42','available')", [`PR-${randomUUID()}`])
    const rentalId = await insert('rentals', "INSERT INTO rentals(rental_code,customer_id,cashier_id,shift_id,started_at,status) VALUES(?,?,?,?,UTC_TIMESTAMP(),'active')", [`PR-${randomUUID()}`, customerId, a, shiftA])
    const item = await q("INSERT INTO rental_items(rental_id,skate_id,started_at,expected_duration_minutes,expected_end_at,returned_at,actual_duration_minutes,actual_amount,price_per_hour,status) VALUES(?,?,UTC_TIMESTAMP(),5,UTC_TIMESTAMP(),UTC_TIMESTAMP(),5,?,120,'returned')", [rentalId, skateId, actual])
    const inspection = await q('INSERT INTO inspections(rental_id,rental_item_id,skate_id,inspected_by) VALUES(?,?,?,?)', [rentalId, item.insertId, skateId, a])
    return { rentalId, skateId, customerId, itemId: item.insertId as number, inspectionId: inspection.insertId as number }
  }

  beforeEach(async () => {
    expect(env.NODE_ENV).toBe('test')
    expect(env.DB_NAME).toBe('koshk_skate_test')
    expect((await q('SELECT DATABASE() AS name'))[0].name).toBe('koshk_skate_test')
    ids = { users: [], accounts: [], assignments: [], shifts: [], methods: [], products: [], categories: [], skates: [], customers: [], rentals: [] }
    ;[config] = await q('SELECT * FROM treasury_configuration WHERE id=1')
    if (!config) throw new Error('Run the checked subtreasury migration before this suite')
    for (const label of ['A', 'B']) await insert('users', 'INSERT INTO users(name,email,password_hash,is_active) VALUES(?,?,?,1)', [label, `producer-${randomUUID()}@test.invalid`, 'test-only'])
    ;[a, b] = ids.users
    main = await makeAccount(true, 'main')
    card = await makeAccount(false)
    drawerA = await makeAccount(true, 'cashier')
    drawerB = await makeAccount(true, 'cashier')
    for (const [actor, account] of [[a, drawerA], [b, drawerB]]) {
      const assignment = await insert('assignments', 'INSERT INTO treasury_assignments(account_id,cashier_id,assigned_by) VALUES(?,?,?)', [account, actor, a])
      await insert('shifts', "INSERT INTO cashier_shifts(cashier_id,treasury_account_id,assignment_id,opening_balance,opening_ledger_balance,status,business_date) VALUES(?,?,?,0,0,'active','2026-10-16')", [actor, account, assignment])
    }
    ;[shiftA, shiftB] = ids.shifts
    for (const account of [main, card]) await insert('methods', 'INSERT INTO payment_methods(name,name_ar,treasury_account_id) VALUES(?,?,?)', [`method-${randomUUID()}`, 'Producer method', account])
    ;[cashMethod, cardMethod] = ids.methods
    const category = await insert('categories', 'INSERT INTO product_categories(name,name_ar) VALUES(?,?)', [`category-${randomUUID()}`, 'Producer category'])
    product = await insert('products', 'INSERT INTO products(name,name_ar,category_id,price,stock_quantity) VALUES(?,?,?,10,100)', [`product-${randomUUID()}`, 'Producer product', category])
    await q('UPDATE treasury_configuration SET enabled=1,main_account_id=? WHERE id=1', [main])
  })

  afterEach(async () => {
    vi.restoreAllMocks()
    if (!ids) return
    if (config) await q('UPDATE treasury_configuration SET enabled=?,main_account_id=? WHERE id=1', [config.enabled, config.main_account_id])
    const own = placeholders(ids.users)
    if (ids.users.length) {
      await q(`DELETE FROM financial_operations WHERE actor_id IN (${own})`, ids.users)
      await q(`DELETE FROM treasury_handovers WHERE cashier_id IN (${own})`, ids.users)
      await q(`DELETE FROM treasury_movements WHERE cashier_id IN (${own})`, ids.users)
      await q(`DELETE FROM audit_logs WHERE user_id IN (${own})`, ids.users)
      await q(`DELETE sp FROM sale_payments sp JOIN sales s ON s.id=sp.sale_id WHERE s.cashier_id IN (${own})`, ids.users)
      await q(`DELETE si FROM sale_items si JOIN sales s ON s.id=si.sale_id WHERE s.cashier_id IN (${own})`, ids.users)
      await q(`DELETE FROM sales WHERE cashier_id IN (${own})`, ids.users)
      await q(`DELETE FROM expenses WHERE cashier_id IN (${own})`, ids.users)
      await q(`DELETE FROM damage_reports WHERE reported_by IN (${own})`, ids.users)
      await q(`DELETE FROM rental_payments WHERE cashier_id IN (${own})`, ids.users)
      await q(`DELETE FROM maintenance_records WHERE created_by IN (${own})`, ids.users)
      if (ids.rentals.length) {
        const rentalWhere = placeholders(ids.rentals)
        await q(`DELETE FROM late_fee_records WHERE rental_id IN (${rentalWhere})`, ids.rentals)
        await q(`UPDATE rental_items SET inspection_id=NULL WHERE rental_id IN (${rentalWhere})`, ids.rentals)
        await q(`DELETE FROM inspections WHERE rental_id IN (${rentalWhere})`, ids.rentals)
        await q(`DELETE re FROM rental_item_extensions re JOIN rental_items ri ON ri.id=re.rental_item_id WHERE ri.rental_id IN (${rentalWhere})`, ids.rentals)
        await q(`DELETE FROM rental_items WHERE rental_id IN (${rentalWhere})`, ids.rentals)
        await q(`DELETE FROM rentals WHERE id IN (${rentalWhere})`, ids.rentals)
      }
    }
    for (const [table, values] of [['products', ids.products], ['product_categories', ids.categories], ['payment_methods', ids.methods], ['cashier_shifts', ids.shifts], ['treasury_assignments', ids.assignments], ['treasury_accounts', ids.accounts], ['skates', ids.skates], ['customers', ids.customers], ['users', ids.users]] as const) {
      if (values.length) await q(`DELETE FROM ${table} WHERE id IN (${placeholders(values)})`, [...values])
    }
  })

  it('routes cash to each acting drawer and preserves distinct electronic accounts and component snapshots', async () => {
    const first = saleInput()
    first.payments = [{ paymentMethodId: cashMethod, amount: 4, treasuryAccountId: drawerB }, { paymentMethodId: cardMethod, amount: 6, treasuryAccountId: drawerB }]
    const second = saleInput(b)
    const [saleA, saleB] = await settled([SalesService.createSale(first), SalesService.createSale(second)])
    expect(await balance(drawerA)).toBe('4.00')
    expect(await balance(drawerB)).toBe('10.00')
    expect(await balance(card)).toBe('6.00')
    expect(await balance(main)).toBe('0.00')
    expect(saleA.payments!.map(p => p.treasuryAccountId)).toEqual([drawerA, card])
    expect(saleB.payments![0].treasuryAccountId).toBe(drawerB)
  })

  it('replays concurrent sale retries once and rejects reuse with a changed payload', async () => {
    const input = saleInput()
    const [first, retry] = await settled([SalesService.createSale(input), SalesService.createSale(input)])
    expect(retry.id).toBe(first.id)
    expect(await balance(drawerA)).toBe('10.00')
    expect((await q('SELECT stock_quantity AS stock FROM products WHERE id=?', [product]))[0].stock).toBe(99)
    await expect(SalesService.createSale({ ...input, notes: 'different operation' })).rejects.toMatchObject({ code: 'CONFLICT' })
    expect((await q('SELECT id FROM sales WHERE cashier_id=?', [a]))).toHaveLength(1)
  })

  it('commits different operation keys from the same cashier without lost collections or lock upgrades', async () => {
    const created = await settled([SalesService.createSale(saleInput()), SalesService.createSale(saleInput())])
    expect(new Set(created.map(sale => sale.id)).size).toBe(2)
    expect(await balance(drawerA)).toBe('20.00')
    expect((await q('SELECT stock_quantity AS stock FROM products WHERE id=?', [product]))[0].stock).toBe(98)
    expect(await q('SELECT id FROM financial_operations WHERE actor_id=?', [a])).toHaveLength(2)
    expect(await q("SELECT id FROM audit_logs WHERE user_id=? AND action='CREATE_SALE'", [a])).toHaveLength(2)
  })

  it('allows committed sale replay after closing but prevents new sale posting into that session', async () => {
    const input = saleInput(), sale = await SalesService.createSale(input)
    await q("UPDATE cashier_shifts SET status='closed',closed_at=UTC_TIMESTAMP() WHERE id=?", [shiftA])
    expect((await SalesService.createSale(input)).id).toBe(sale.id)
    await expect(SalesService.createSale(saleInput())).rejects.toMatchObject({ code: 'NO_ACTIVE_SHIFT' })
    expect(await balance(drawerA)).toBe('10.00')
  })

  it('serializes closing behind an in-flight sale and snapshots its committed cash exactly once', async () => {
    let releaseSource!: () => void, sourceReached!: () => void, closeReached!: () => void
    const paused = new Promise<void>(resolve => { releaseSource = resolve })
    const posted = new Promise<void>(resolve => { sourceReached = resolve })
    const closing = new Promise<void>(resolve => { closeReached = resolve })
    const originalAudit = finance.strictAudit, originalQuery = finance.query
    vi.spyOn(finance, 'strictAudit').mockImplementation(async (tx, entry) => {
      await originalAudit(tx, entry)
      if (entry.action === 'CREATE_SALE' && entry.userId === a) { sourceReached(); await paused }
    })
    vi.spyOn(finance, 'query').mockImplementation(async (tx, statement, params) => {
      if (statement === 'SELECT id FROM users WHERE id=? FOR UPDATE' && params?.[0] === a) closeReached()
      return originalQuery(tx, statement, params)
    })
    const safety = setTimeout(releaseSource, 4000)
    const sale = SalesService.createSale(saleInput())
    let closed: ReturnType<typeof closeShift> | undefined
    try {
      await Promise.race([posted, sale.then(() => { throw new Error('Sale did not reach the controlled audit boundary') })])
      closed = closeShift(shiftA, { actualBalance: '10.00', declaredAmount: '10.00', operationKey: randomUUID() }, a)
      await Promise.race([closing, closed.then(() => { throw new Error('Close did not reach the controlled user lock') })])
      releaseSource()
      const [sold, result] = await Promise.all([sale, closed])
      expect(sold.status).toBe('completed')
      expect(result.expectedBalance).toBe(10)
      expect(result.expectedLedgerBalance).toBe('10.00')
      expect(result.difference).toBe(0)
      expect(await balance(drawerA)).toBe('10.00')
      expect(await balance(main)).toBe('0.00')
      expect((await q('SELECT status,declared_amount FROM treasury_handovers WHERE shift_id=?', [shiftA]))[0]).toMatchObject({ status: 'pending', declared_amount: '10.00' })
    } finally {
      releaseSource(); clearTimeout(safety)
      await Promise.allSettled([sale, ...(closed ? [closed] : [])])
    }
  })

  it('refunds cash from the performing cashier and electronics from their original account after a method remap', async () => {
    const input = saleInput()
    input.payments = [{ paymentMethodId: cashMethod, amount: 4, treasuryAccountId: 0 }, { paymentMethodId: cardMethod, amount: 6, treasuryAccountId: 0 }]
    const sale = await SalesService.createSale(input)
    await fund(drawerB, '20.00')
    await q('UPDATE payment_methods SET treasury_account_id=? WHERE id=?', [main, cardMethod])
    await SalesService.cancelSale(sale.id, b)
    expect(await balance(drawerA)).toBe('4.00')
    expect(await balance(drawerB)).toBe('16.00')
    expect(await balance(card)).toBe('0.00')
    const refunds = await q("SELECT treasury_account_id AS account,shift_id AS shift,notes FROM treasury_movements WHERE reference_type='sale_refund' AND reference_id=?", [sale.id])
    expect(refunds.map((r: any) => r.account)).toEqual([drawerB, card])
    expect(refunds.every((r: any) => r.shift === shiftB)).toBe(true)
    expect(refunds[0].notes).toContain(`original account ${drawerA}`)
  })

  it('rolls back an unfunded cash refund without falling back to the original drawer or main', async () => {
    const sale = await SalesService.createSale(saleInput())
    await fund(main, '500.00')
    await expect(SalesService.cancelSale(sale.id, b)).rejects.toMatchObject({ code: 'INSUFFICIENT_TREASURY_FUNDS' })
    expect((await SalesService.getSale(sale.id))!.status).toBe('completed')
    expect(await balance(drawerA)).toBe('10.00')
    expect(await balance(drawerB)).toBe('0.00')
    expect(await balance(main)).toBe('500.00')
    expect((await q('SELECT stock_quantity AS stock FROM products WHERE id=?', [product]))[0].stock).toBe(99)
  })

  it('uses the current drawer for a legacy sale whose original cash account was global', async () => {
    await fund(main, '10.00')
    await fund(drawerB, '20.00')
    const sale = await q("INSERT INTO sales(sale_code,cashier_id,total_amount,status) VALUES(?,?,10,'completed')", [`legacy-${randomUUID()}`, a])
    await q('INSERT INTO sale_payments(sale_id,payment_method_id,amount,treasury_account_id) VALUES(?,?,10,?)', [sale.insertId, cashMethod, main])
    await SalesService.cancelSale(sale.insertId, b)
    expect(await balance(main)).toBe('10.00')
    expect(await balance(drawerB)).toBe('10.00')
    expect((await q("SELECT treasury_account_id AS account FROM treasury_movements WHERE reference_type='sale_refund' AND reference_id=?", [sale.insertId]))[0].account).toBe(drawerB)
  })

  it('posts an expense once, isolates own history and prevents unfunded spending', async () => {
    await fund(drawerA, '15.00')
    const input = { operationKey: randomUUID(), amount: 5, description: 'Producer expense' }
    const [one, two] = await settled([recordExpense(a, input), recordExpense(a, input)])
    expect(one.id).toBe(two.id)
    expect(await balance(drawerA)).toBe('10.00')
    expect(await listExpenses(b, ['expenses.view'])).toEqual([])
    expect((await listExpenses(b, ['expenses.view_all'])).some(row => row.id === one.id)).toBe(true)
    await expect(listExpenses(b, [])).rejects.toMatchObject({ code: 'FORBIDDEN' })
    await expect(recordExpense(b, { ...input, operationKey: randomUUID() })).rejects.toMatchObject({ code: 'INSUFFICIENT_TREASURY_FUNDS' })
    expect(await balance(main)).toBe('0.00')
  })

  it('supports rental start, extension, return and unpaid cancellation without recording collections', async () => {
    const rented = await liveRentalFixture()
    expect(rented.shiftId).toBe(shiftA)
    expect(rented.invoiceNumber).toBeNull()
    const item = rented.items[0]
    expect((await q('SELECT status FROM skates WHERE id=?', [item.skate.id]))[0].status).toBe('rented')
    const extended = await extendRentalItem(item.id, a, { extendByMinutes: 15 })
    expect(extended.expectedDurationMinutes).toBe(75)
    expect(new Date(extended.expectedEndAt).getTime() - new Date(item.expectedEndAt).getTime()).toBe(15 * 60_000)
    expect(extended.pricePerHour).toBe(item.pricePerHour)
    const returned = await returnRentalItem(item.id, a, healthyReturn)
    expect(returned.item.status).toBe('returned')
    expect(returned.rental.status).toBe('active')
    expect(returned.rental.invoiceNumber).toBeNull()
    expect(returned.item.inspectionId).toBeTruthy()
    expect((await q('SELECT status FROM skates WHERE id=?', [item.skate.id]))[0].status).toBe('available')

    const unpaid = await liveRentalFixture()
    const cancelled = await cancelRental(unpaid.id, a)
    expect(cancelled.status).toBe('cancelled')
    expect(cancelled.items[0].status).toBe('cancelled')
    expect(cancelled.invoiceNumber).toBeNull()
    expect((await q('SELECT status FROM skates WHERE id=?', [unpaid.items[0].skate.id]))[0].status).toBe('available')
    expect(await q('SELECT id FROM rental_payments WHERE cashier_id=?', [a])).toHaveLength(0)
    expect(await q('SELECT id FROM treasury_movements WHERE cashier_id=?', [a])).toHaveLength(0)
    expect(await balance(drawerA)).toBe('0.00')
    expect(await balance(main)).toBe('0.00')
    const actions = await q('SELECT action FROM audit_logs WHERE user_id=?', [a])
    expect(actions.map((row: any) => row.action)).toEqual(expect.arrayContaining(['START_RENTAL', 'EXTEND_RENTAL_ITEM', 'RETURN_RENTAL_ITEM', 'CANCEL_RENTAL']))
  })

  it('denies rental start, return, extension and unpaid cancellation after the assigned session closes', async () => {
    const rented = await liveRentalFixture()
    const item = rented.items[0]
    const unusedSkate = await insert('skates', "INSERT INTO skates(skate_code,size,status) VALUES(?,'42','available')", [`PR-${randomUUID()}`])
    const before = (await q('SELECT * FROM rental_items WHERE id=?', [item.id]))[0]
    const closed = await closeShift(shiftA, { actualBalance: '0.00', declaredAmount: '0.00', operationKey: randomUUID() }, a)
    expect(closed.status).toBe('closed')
    await expect(startRental(a, { customerId: rented.customer.id, skateIds: [unusedSkate], durationMinutes: 60 })).rejects.toMatchObject({ code: 'NO_ACTIVE_SHIFT' })
    await expect(returnRentalItem(item.id, a, healthyReturn)).rejects.toMatchObject({ code: 'NO_ACTIVE_SHIFT' })
    await expect(extendRentalItem(item.id, a, { extendByMinutes: 15 })).rejects.toMatchObject({ code: 'NO_ACTIVE_SHIFT' })
    await expect(cancelRental(rented.id, a)).rejects.toMatchObject({ code: 'NO_ACTIVE_SHIFT' })
    expect((await q('SELECT * FROM rental_items WHERE id=?', [item.id]))[0]).toEqual(before)
    expect(await q('SELECT id FROM rentals WHERE cashier_id=?', [a])).toHaveLength(1)
    expect((await q('SELECT status FROM rentals WHERE id=?', [rented.id]))[0].status).toBe('active')
    expect((await q('SELECT status FROM skates WHERE id=?', [unusedSkate]))[0].status).toBe('available')
    expect((await q('SELECT status FROM skates WHERE id=?', [item.skate.id]))[0].status).toBe('rented')
    expect(await q('SELECT id FROM rental_item_extensions WHERE rental_item_id=?', [item.id])).toHaveLength(0)
    expect(await q('SELECT id FROM inspections WHERE rental_item_id=?', [item.id])).toHaveLength(0)
    expect(await q('SELECT id FROM rental_payments WHERE cashier_id=?', [a])).toHaveLength(0)
    expect(await q('SELECT id FROM treasury_movements WHERE cashier_id=?', [a])).toHaveLength(0)
    expect(await balance(drawerA)).toBe('0.00')
  })

  it('routes rental finalization split components and keeps account snapshots', async () => {
    const f = await rentalFixture()
    await q('INSERT INTO late_fee_records(rental_id,rental_item_id,late_minutes,calculated_fee,collected_fee) VALUES(?,?,1,2,2)', [f.rentalId, f.itemId])
    await finalizeRental(f.rentalId, b, { payments: [{ paymentMethodId: cashMethod, amount: 5 }, { paymentMethodId: cardMethod, amount: 7 }] })
    expect(await balance(drawerA)).toBe('0.00')
    expect(await balance(drawerB)).toBe('5.00')
    expect(await balance(card)).toBe('7.00')
    const paid = await q('SELECT treasury_account_id AS account,amount,payment_type FROM rental_payments WHERE rental_id=? ORDER BY id', [f.rentalId])
    expect(paid.map((p: any) => p.account)).toEqual([drawerB, drawerB, card])
    expect(paid.map((p: any) => p.amount)).toEqual(['3.00', '2.00', '7.00'])
    await expect(finalizeRental(f.rentalId, b, { payments: [{ paymentMethodId: cashMethod, amount: 12 }] })).rejects.toMatchObject({ code: 'RENTAL_ALREADY_COMPLETED' })
  })

  it('commits concurrent rental and sale collections without cross-module lock conflicts', async () => {
    const f = await rentalFixture()
    const [rental, sale] = await Promise.all([
      finalizeRental(f.rentalId, a, { payments: [{ paymentMethodId: cashMethod, amount: 10 }] }),
      SalesService.createSale(saleInput(b)),
    ])
    expect(rental.status).toBe('completed')
    expect(sale.status).toBe('completed')
    expect(await balance(drawerA)).toBe('10.00')
    expect(await balance(drawerB)).toBe('10.00')
    const rentalInvoice = (await q('SELECT invoice_number AS invoice FROM rentals WHERE id=?', [f.rentalId]))[0].invoice
    const saleInvoice = (await q('SELECT invoice_number AS invoice FROM sales WHERE id=?', [sale.id]))[0].invoice
    expect(rentalInvoice).not.toBe(saleInvoice)
  })

  it('replays a partial damage collection without charging the remaining balance again', async () => {
    const f = await rentalFixture()
    const damage = await q("INSERT INTO damage_reports(skate_id,rental_id,inspection_id,customer_id,reported_by,damage_type,severity,description,customer_charge) VALUES(?,?,?,?,?,'other','minor','Producer damage',100)", [f.skateId, f.rentalId, f.inspectionId, f.customerId, a])
    const input = { operationKey: randomUUID(), payments: [{ paymentMethodId: cashMethod, amount: 20 }] }
    await collectCharge(damage.insertId, a, input)
    await collectCharge(damage.insertId, a, input)
    expect(await balance(drawerA)).toBe('20.00')
    expect((await q('SELECT charge_collected AS amount,status FROM damage_reports WHERE id=?', [damage.insertId]))[0]).toMatchObject({ amount: '20.00', status: 'partially_paid' })
    expect(await q("SELECT id FROM rental_payments WHERE rental_id=? AND payment_type='damage_charge'", [f.rentalId])).toHaveLength(1)
    await expect(collectCharge(damage.insertId, a, { ...input, payments: [{ paymentMethodId: cashMethod, amount: 25 }] })).rejects.toMatchObject({ code: 'CONFLICT' })
  })

  it('debits maintenance cash once from the performing drawer and preserves its state guard', async () => {
    const f = await rentalFixture()
    const maintenance = await q("INSERT INTO maintenance_records(skate_id,created_by,problem_description,total_cost,status,payment_status,created_at,updated_at) VALUES(?,?,'Producer repair',3,'completed','unpaid',UTC_TIMESTAMP(),UTC_TIMESTAMP())", [f.skateId, a])
    await fund(drawerB, '10.00')
    await maintenanceService.payRecord(maintenance.insertId, b, cashMethod)
    expect(await balance(drawerB)).toBe('7.00')
    expect(await balance(main)).toBe('0.00')
    await expect(maintenanceService.payRecord(maintenance.insertId, b, cashMethod)).rejects.toMatchObject({ code: 'ALREADY_PAID' })
    expect(await q("SELECT id FROM treasury_movements WHERE reference_type='maintenance_payment' AND reference_id=?", [maintenance.insertId])).toHaveLength(1)
  })

  it('preserves central electronic maintenance payment and requires the existing active session', async () => {
    const f = await rentalFixture()
    const create = () => q("INSERT INTO maintenance_records(skate_id,created_by,problem_description,total_cost,status,payment_status,created_at,updated_at) VALUES(?,?,'Electronic repair',3,'completed','unpaid',UTC_TIMESTAMP(),UTC_TIMESTAMP())", [f.skateId, a])
    const first = await create()
    await maintenanceService.payRecord(first.insertId, b, cardMethod)
    expect(await balance(card)).toBe('-3.00')
    expect(await balance(drawerB)).toBe('0.00')
    const second = await create()
    await q("UPDATE cashier_shifts SET status='closed',closed_at=UTC_TIMESTAMP() WHERE id=?", [shiftB])
    await expect(maintenanceService.payRecord(second.insertId, b, cardMethod)).rejects.toMatchObject({ code: 'NO_ACTIVE_SHIFT' })
    expect(await balance(card)).toBe('-3.00')
  })

  it('rolls back expense source, movement, balance and retry record when its mandatory audit fails', async () => {
    await fund(drawerA, '10.00')
    const input = { operationKey: randomUUID(), amount: 5, description: 'Audit failure expense' }
    const failure = new Error('Injected mandatory audit failure')
    vi.spyOn(finance, 'strictAudit').mockRejectedValueOnce(failure)
    await expect(recordExpense(a, input)).rejects.toThrow(failure)
    expect(await balance(drawerA)).toBe('10.00')
    expect(await q('SELECT id FROM expenses WHERE cashier_id=?', [a])).toHaveLength(0)
    expect(await q('SELECT id FROM financial_operations WHERE actor_id=? AND operation_key=?', [a, input.operationKey])).toHaveLength(0)
    await recordExpense(a, input)
    expect(await balance(drawerA)).toBe('5.00')
  })

  it('rejects an inactive electronic collection method without any sale or stock effect', async () => {
    await q('UPDATE payment_methods SET is_active=0 WHERE id=?', [cardMethod])
    const input = saleInput()
    input.payments = [{ paymentMethodId: cardMethod, amount: 10, treasuryAccountId: card }]
    await expect(SalesService.createSale(input)).rejects.toMatchObject({ code: 'INVALID_PAYMENT_METHOD' })
    expect(await balance(card)).toBe('0.00')
    expect((await q('SELECT stock_quantity AS stock FROM products WHERE id=?', [product]))[0].stock).toBe(100)
    expect(await q('SELECT id FROM sales WHERE cashier_id=?', [a])).toHaveLength(0)
  })

  it('excludes transfer legs and explicit variances from operating revenue and expenses', async () => {
    const dates = { startDate: '2035-01-01', endDate: '2035-01-02' }
    const before = [await getOverviewReport(dates), await getOperatingFinancialReport(dates)]
    // Synthetic ledger representations verify report classification separately
    // from lifecycle tests; no physical transfer is asserted by these fixtures.
    for (const [account, direction, reference, amount] of [[drawerA, 'out', 'treasury_transfer', '40.00'], [main, 'in', 'treasury_transfer', '40.00'], [drawerA, 'in', 'treasury_variance', '3.00']] as const) {
      await q('INSERT INTO treasury_movements(treasury_account_id,amount,type,reference_type,reference_id,cashier_id,cash_snapshot,created_at) VALUES(?,?,?,?,?,?,1,?)', [account, amount, direction, reference, a, a, '2035-01-01 12:00:00'])
      await q('UPDATE treasury_accounts SET balance=balance+? WHERE id=?', [direction === 'in' ? amount : '-' + amount, account])
    }
    expect(await getOverviewReport(dates)).toEqual(before[0])
    expect(await getOperatingFinancialReport(dates)).toEqual(before[1])
  })

  it('rejects missing logical-operation tokens and fractional piastres without source writes', async () => {
    await expect(SalesService.createSale({ ...saleInput(), operationKey: undefined })).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
    await expect(recordExpense(a, { operationKey: randomUUID(), amount: 0.001, description: 'Invalid precision' })).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
    expect(await q('SELECT id FROM sales WHERE cashier_id=?', [a])).toHaveLength(0)
    expect(await q('SELECT id FROM expenses WHERE cashier_id=?', [a])).toHaveLength(0)
  })
})
