import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { db } from '../db/connection'
import { expenses, treasuryMovements, users, cashierShifts, treasuryAccounts } from '../db/schema'
import * as reportsService from '../modules/reports/reports.service'
import { eq } from 'drizzle-orm'

describe('Reports API - Expenses', () => {
  let adminId: number
  let shiftId: number
  let accountId: number
  
  beforeAll(async () => {
    const ts = Date.now()
    const [u] = await db.insert(users).values({ name: 'Report Test', email: `rt.${ts}@koshk.com`, passwordHash: '1', isActive: true, createdAt: new Date(), updatedAt: new Date() })
    adminId = u.insertId
    
    const [s] = await db.insert(cashierShifts).values({ cashierId: adminId, status: 'active', openingBalance: '0', expectedBalance: '0', createdAt: new Date(), updatedAt: new Date() })
    shiftId = s.insertId

    const [acc] = await db.insert(treasuryAccounts).values({ name: 'Test Drawer', nameAr: 'خزينة', balance: '0', isActive: true })
    accountId = acc.insertId

    const testDate = new Date('2010-01-01T12:00:00Z')

    // Insert 1 manual expense (creates treasury movement in real system, we simulate it here)
    const [exp] = await db.insert(expenses).values({ amount: '100.00', cashierId: adminId, shiftId, description: 'Manual', createdAt: testDate })
    await db.insert(treasuryMovements).values({ treasuryAccountId: accountId, amount: '100.00', type: 'out', referenceType: 'expense', referenceId: exp.insertId, cashierId: adminId, shiftId, createdAt: testDate })

    // Insert 1 system maintenance payment
    await db.insert(treasuryMovements).values({ treasuryAccountId: accountId, amount: '330.00', type: 'out', referenceType: 'maintenance_payment', referenceId: 999, cashierId: adminId, shiftId, createdAt: testDate })

    // Insert 1 other treasury out that is NOT an operating expense
    await db.insert(treasuryMovements).values({ treasuryAccountId: accountId, amount: '50.00', type: 'out', referenceType: 'other', referenceId: 999, cashierId: adminId, shiftId, createdAt: testDate })
  })

  afterAll(async () => {
    await db.delete(treasuryMovements).where(eq(treasuryMovements.cashierId, adminId))
    await db.delete(expenses).where(eq(expenses.cashierId, adminId))
    await db.delete(treasuryAccounts).where(eq(treasuryAccounts.id, accountId))
    await db.delete(cashierShifts).where(eq(cashierShifts.id, shiftId))
    await db.delete(users).where(eq(users.id, adminId))
  })

  it('TC-REP-EXP-01: manual expenses + maintenance payments calculated correctly', async () => {
    const sd = '2010-01-01'
    const ed = '2010-01-02'
    
    const overview = await reportsService.getOverviewReport({ startDate: sd, endDate: ed })
    expect(overview.totalExpenses).toBe(430) // 100 + 330
    
    const financial = await reportsService.getOperatingFinancialReport({ startDate: sd, endDate: ed })
    expect(financial.totalExpenses).toBe(430)
  })
})
