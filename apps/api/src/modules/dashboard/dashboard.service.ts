import { db } from '../../db/connection.js'
import { sql, and, gte, lt, lte, eq, inArray, isNull, isNotNull, sum, count, desc } from 'drizzle-orm'
import { rentals } from '../../db/schema/rentals.js'
import { rentalItems } from '../../db/schema/rental_items.js'
import { skates } from '../../db/schema/skates.js'
import { sales, saleItems } from '../../db/schema/sales.js'
import { products } from '../../db/schema/products.js'
import { treasuryMovements } from '../../db/schema/payments.js'
import { expenses } from '../../db/schema/treasury.js'
import { maintenanceRecords } from '../../db/schema/maintenance.js'
import { lateFeeRecords } from '../../db/schema/inspections.js'
import { customers } from '../../db/schema/customers.js'

export interface DashboardDateRange {
  startDate: string
  endDate: string
}

function buildDateBounds(localStartDate: string, localEndDate: string) {
  const startBound = new Date(`${localStartDate}T00:00:00Z`)
  const endBound = new Date(`${localEndDate}T00:00:00Z`)
  endBound.setDate(endBound.getDate() + 1)
  return { startBound, endBound }
}

export async function getDashboardData(userPermissions: string[], dateRange: DashboardDateRange) {
  const { startBound, endBound } = buildDateBounds(dateRange.startDate, dateRange.endDate)

  // Determine permissions
  const canViewReports = userPermissions.includes('reports.view') || userPermissions.includes('*') // Assuming * for full admin if any
  // Some granular fallbacks just in case
  const canViewExpenses = canViewReports || userPermissions.includes('expenses.view')
  const canViewSales = canViewReports || userPermissions.includes('sales.view')

  // We will build the response incrementally
  const response: any = {
    period: {
      type: 'custom', // can be customized if needed by the frontend
      start: startBound.toISOString(),
      end: endBound.toISOString(),
    },
    kpis: {},
    charts: {},
    permissions: {
      canViewFinancials: canViewReports,
    }
  }

  // 1. Current State KPIs (Operational)
  // Always available (or if they need specific permissions, we assume everyone sees them as operational data unless restricted)
  // We will return them unconditionally for now since operations need them
  const activeRentalsRes = await db.select({ count: count() }).from(rentals).where(eq(rentals.status, 'active'))
  const lateRentalsRes = await db.select({ count: count() }).from(rentalItems).where(and(eq(rentalItems.status, 'active'), lt(rentalItems.expectedEndAt, new Date())))
  
  const allSkatesRes = await db.select({ count: count(), status: skates.status }).from(skates).groupBy(skates.status)
  
  const skatesByStatus: Record<string, number> = {}
  let totalSkates = 0
  
  allSkatesRes.forEach(row => {
    skatesByStatus[row.status] = Number(row.count)
    totalSkates += Number(row.count)
  })

  response.kpis.activeRentals = Number(activeRentalsRes[0]?.count || 0)
  response.kpis.lateRentals = Number(lateRentalsRes[0]?.count || 0)
  response.kpis.skatesByStatus = skatesByStatus
  response.kpis.totalSkates = totalSkates

  const thresholdDate = new Date(Date.now() + 5 * 60 * 1000)

  const endingSoonRentals = await db.select({
    id: rentals.id,
    rentalCode: rentals.rentalCode,
    customerName: customers.name,
    skateCode: skates.skateCode,
    expectedEndAt: rentalItems.expectedEndAt,
    startedAt: rentalItems.startedAt
  })
  .from(rentalItems)
  .leftJoin(rentals, eq(rentalItems.rentalId, rentals.id))
  .leftJoin(customers, eq(rentals.customerId, customers.id))
  .leftJoin(skates, eq(rentalItems.skateId, skates.id))
  .where(and(eq(rentalItems.status, 'active'), lte(rentalItems.expectedEndAt, thresholdDate)))
  .orderBy(rentalItems.expectedEndAt)
  .limit(8)
  
  response.kpis.endingSoonRentals = endingSoonRentals

  // 2. Period KPIs (Operational)
  const totalRentalsRes = await db.select({ count: count() }).from(rentals).where(and(gte(rentals.startedAt, startBound), lt(rentals.startedAt, endBound)))
  response.kpis.rentalsPeriod = Number(totalRentalsRes[0]?.count || 0)

  // 3. Period KPIs (Financial)
  if (canViewReports) {
    const revenueRes = await db.select({ total: sum(treasuryMovements.amount) }).from(treasuryMovements)
      .where(and(gte(treasuryMovements.createdAt, startBound), lt(treasuryMovements.createdAt, endBound), inArray(treasuryMovements.referenceType, ['rental_payment', 'late_fee_payment', 'damage_charge_payment', 'sale_payment'])))
    
    const refundsRes = await db.select({ total: sum(treasuryMovements.amount) }).from(treasuryMovements)
      .where(and(gte(treasuryMovements.createdAt, startBound), lt(treasuryMovements.createdAt, endBound), inArray(treasuryMovements.referenceType, ['rental_refund', 'sale_refund'])))
    
    const expensesRes = await db.select({ total: sum(treasuryMovements.amount) }).from(treasuryMovements)
      .where(and(gte(treasuryMovements.createdAt, startBound), lt(treasuryMovements.createdAt, endBound), eq(treasuryMovements.type, 'out'), inArray(treasuryMovements.referenceType, ['expense', 'maintenance_payment'])))

    const collectedLateFeesRes = await db.select({ total: sum(treasuryMovements.amount) }).from(treasuryMovements)
      .where(and(gte(treasuryMovements.createdAt, startBound), lt(treasuryMovements.createdAt, endBound), eq(treasuryMovements.referenceType, 'late_fee_payment')))

    const waivedLateFeesRes = await db.select({ total: sum(lateFeeRecords.waivedFee) }).from(lateFeeRecords)
     .where(and(gte(lateFeeRecords.createdAt, startBound), lt(lateFeeRecords.createdAt, endBound), isNotNull(lateFeeRecords.waivedBy)))
      
    const damageChargesRes = await db.select({ total: sum(treasuryMovements.amount) }).from(treasuryMovements)
      .where(and(gte(treasuryMovements.createdAt, startBound), lt(treasuryMovements.createdAt, endBound), eq(treasuryMovements.referenceType, 'damage_charge_payment')))

    const rev = Number(revenueRes[0]?.total || 0) - Number(refundsRes[0]?.total || 0)
    const exp = Number(expensesRes[0]?.total || 0)
    
    response.kpis.revenue = rev
    response.kpis.expenses = exp
    response.kpis.operatingResult = rev - exp
    response.kpis.collectedLateFees = Number(collectedLateFeesRes[0]?.total || 0)
    response.kpis.waivedLateFees = Number(waivedLateFeesRes[0]?.total || 0)
    response.kpis.damageCharges = Number(damageChargesRes[0]?.total || 0)
    
    // Recent Sales
    const recentSalesRes = await db.select({
      id: sales.id,
      customerName: customers.name,
      totalAmount: sales.totalAmount,
      status: sales.status,
      createdAt: sales.createdAt,
      itemName: sql<string>`GROUP_CONCAT(${products.name} SEPARATOR ', ')`
    })
    .from(sales)
    .leftJoin(customers, eq(sales.customerId, customers.id))
    .leftJoin(saleItems, eq(sales.id, saleItems.saleId))
    .leftJoin(products, eq(saleItems.productId, products.id))
    .where(eq(sales.status, 'completed'))
    .groupBy(sales.id, customers.name, sales.totalAmount, sales.status, sales.createdAt)
    .orderBy(desc(sales.createdAt))
    .limit(5)

    response.kpis.recentSales = recentSalesRes.map(s => ({
      ...s,
      totalAmount: Number(s.totalAmount)
    }))

    // CHARTS (Financial)
    // Revenue over time
    const revenueOverTimeRes = await db.select({
      date: sql<string>`DATE(CONVERT_TZ(${treasuryMovements.createdAt}, '+00:00', '+03:00'))`.as('date'),
      total: sum(treasuryMovements.amount)
    }).from(treasuryMovements)
      .where(and(gte(treasuryMovements.createdAt, startBound), lt(treasuryMovements.createdAt, endBound), inArray(treasuryMovements.referenceType, ['rental_payment', 'late_fee_payment', 'damage_charge_payment', 'sale_payment'])))
      .groupBy(sql`date`)
      .orderBy(sql`date`)

    // Expenses over time
    const expensesOverTimeRes = await db.select({
      date: sql<string>`DATE(CONVERT_TZ(${expenses.createdAt}, '+00:00', '+03:00'))`.as('date'),
      total: sum(expenses.amount)
    }).from(expenses)
      .where(and(gte(expenses.createdAt, startBound), lt(expenses.createdAt, endBound)))
      .groupBy(sql`date`)
      .orderBy(sql`date`)

    response.charts.revenueOverTime = revenueOverTimeRes.map((r: any) => ({ date: r.date, total: Number(r.total) }))
    response.charts.expenses = expensesOverTimeRes.map((r: any) => ({ date: r.date, total: Number(r.total) }))
  }

  // CHARTS (Operational - everyone might see this, or limit it to canViewReports as well? Let's limit to reports.view to be safe unless specified)
  if (canViewReports) {
    // Rental Volume over time
    const rentalVolumeRes = await db.select({
      date: sql<string>`DATE(CONVERT_TZ(${rentals.startedAt}, '+00:00', '+03:00'))`.as('date'),
      count: count()
    }).from(rentals)
      .where(and(gte(rentals.startedAt, startBound), lt(rentals.startedAt, endBound)))
      .groupBy(sql`date`)
      .orderBy(sql`date`)

    // Most-rented skates
    const mostRentedSkatesRes = await db.select({
      skateCode: skates.skateCode,
      count: count()
    }).from(rentalItems)
      .innerJoin(skates, eq(rentalItems.skateId, skates.id))
      .where(and(gte(rentalItems.startedAt, startBound), lt(rentalItems.startedAt, endBound)))
      .groupBy(skates.skateCode)
      .orderBy(desc(count()))
      .limit(10)

    // Skate performance (revenue by skate)
    const skatePerformanceRes = await db.select({
      skateCode: skates.skateCode,
      revenue: sum(rentalItems.actualAmount)
    }).from(rentalItems)
      .innerJoin(skates, eq(rentalItems.skateId, skates.id))
      .where(and(gte(rentalItems.startedAt, startBound), lt(rentalItems.startedAt, endBound)))
      .groupBy(skates.skateCode)
      .orderBy(desc(sum(rentalItems.actualAmount)))
      .limit(10)

    response.charts.rentalVolume = rentalVolumeRes.map((r: any) => ({ date: r.date, count: Number(r.count) }))
    response.charts.mostRentedSkates = mostRentedSkatesRes.map((r: any) => ({ skateCode: r.skateCode, count: Number(r.count) }))
    response.charts.skatePerformance = skatePerformanceRes.map((r: any) => ({ skateCode: r.skateCode, revenue: Number(r.revenue) }))
  }

  return response
}
