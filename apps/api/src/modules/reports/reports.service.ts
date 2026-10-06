import { db } from '../../db/connection.js'
import { sql, and, gte, lt, eq, inArray, isNull, sum, count, desc, or } from 'drizzle-orm'
import { DateRangeInput, OverviewReportDTO, PaginatedResult } from './reports.types.js'
import { rentals } from '../../db/schema/rentals.js'
import { skates } from '../../db/schema/skates.js'
import { customers } from '../../db/schema/customers.js'
import { treasuryMovements, paymentMethods, treasuryAccounts } from '../../db/schema/payments.js'
import { expenses, cashierShifts } from '../../db/schema/treasury.js'
import { damageReports } from '../../db/schema/damages.js'
import { rentalPayments } from '../../db/schema/payments.js'
import { maintenanceRecords } from '../../db/schema/maintenance.js'
import { users } from '../../db/schema/users.js'
import { lateFeeRecords } from '../../db/schema/inspections.js'

/**
 * Builds the exact timestamp bounds for a given local date string (YYYY-MM-DD).
 * Inclusive of start, exclusive of end (which is start of the next day).
 */
export function buildDateBounds(localStartDate: string, localEndDate: string) {
  const startBound = new Date(`${localStartDate}T00:00:00Z`)

  const endBound = new Date(`${localEndDate}T00:00:00Z`)
  endBound.setDate(endBound.getDate() + 1)

  return { startBound, endBound }
}

export async function getOverviewReport(filters: DateRangeInput): Promise<OverviewReportDTO> {
  const { startBound, endBound } = buildDateBounds(filters.startDate, filters.endDate)

  // 1. Total Revenue (treasury_movements type='rental_payment', 'late_fee_payment', 'damage_charge_payment', etc.)
  // We exclude 'expense' and 'deposit' and refunds. Wait, revenue is total inward flow for these types minus refunds.
  // We can just sum where type in [...]
  const revenueRes = await db
    .select({ total: sum(treasuryMovements.amount) })
    .from(treasuryMovements)
    .where(
      and(
        gte(treasuryMovements.createdAt, startBound),
        lt(treasuryMovements.createdAt, endBound),
        inArray(treasuryMovements.referenceType, ['rental_payment', 'late_fee_payment', 'damage_charge_payment', 'sale_payment'])
      )
    )

  const refundsRes = await db
    .select({ total: sum(treasuryMovements.amount) })
    .from(treasuryMovements)
    .where(
      and(
        gte(treasuryMovements.createdAt, startBound),
        lt(treasuryMovements.createdAt, endBound),
        inArray(treasuryMovements.referenceType, ['rental_refund', 'sale_refund'])
      )
    )

  const revenue = Number(revenueRes[0]?.total || 0) - Number(refundsRes[0]?.total || 0)

  // 2. Expenses (from treasury_movements)
  const expenseRes = await db
    .select({ total: sum(treasuryMovements.amount) })
    .from(treasuryMovements)
    .where(
      and(
        gte(treasuryMovements.createdAt, startBound),
        lt(treasuryMovements.createdAt, endBound),
        eq(treasuryMovements.type, 'out'),
        inArray(treasuryMovements.referenceType, ['expense', 'maintenance_payment'])
      )
    )
  const totalExpenses = Number(expenseRes[0]?.total || 0)

  // 3. Rentals Count
  const rentalsRes = await db
    .select({ count: count() })
    .from(rentals)
    .where(
      and(
        gte(rentals.startedAt, startBound),
        lt(rentals.startedAt, endBound)
      )
    )
  const totalRentals = Number(rentalsRes[0]?.count || 0)

  // 4. Active Rentals
  const activeRentalsRes = await db
    .select({ count: count() })
    .from(rentals)
    .where(eq(rentals.status, 'active'))
  const activeRentals = Number(activeRentalsRes[0]?.count || 0)

  // 5. Late Rentals (Status active, endTime < now)
  const lateRentalsRes = await db
    .select({ count: count() })
    .from(rentals)
    .where(
      and(
        eq(rentals.status, 'active'),
        lt(rentals.expectedEndAt, new Date())
      )
    )
  const lateRentals = Number(lateRentalsRes[0]?.count || 0)

  // 6. Damages
  const damagesRes = await db
    .select({ count: count() })
    .from(damageReports)
    .where(
      and(
        gte(damageReports.createdAt, startBound),
        lt(damageReports.createdAt, endBound)
      )
    )
  const totalDamages = Number(damagesRes[0]?.count || 0)

  // 7. Active Maintenance
  const activeMaintRes = await db
    .select({ count: count() })
    .from(maintenanceRecords)
    .where(eq(maintenanceRecords.status, 'in_progress'))
  const activeMaintenance = Number(activeMaintRes[0]?.count || 0)

  return {
    totalRevenue: revenue,
    totalRentals,
    activeRentals,
    lateRentals,
    totalExpenses,
    totalDamages,
    activeMaintenance
  }
}

export async function getOperatingFinancialReport(filters: DateRangeInput): Promise<any> {
  const { startBound, endBound } = buildDateBounds(filters.startDate, filters.endDate)

  // 1. Revenue by components
  const rentalRevenueRes = await db
    .select({ total: sum(treasuryMovements.amount) })
    .from(treasuryMovements)
    .where(and(
      gte(treasuryMovements.createdAt, startBound),
      lt(treasuryMovements.createdAt, endBound),
      eq(treasuryMovements.referenceType, 'rental_payment')
    ))

  const rentalPaymentsRes = await db
    .select({ total: sum(treasuryMovements.amount) })
    .from(treasuryMovements)
    .where(and(
      gte(treasuryMovements.createdAt, startBound),
      lt(treasuryMovements.createdAt, endBound),
      eq(treasuryMovements.referenceType, 'late_fee_payment')
    ))

  const damageChargesRes = await db
    .select({ total: sum(treasuryMovements.amount) })
    .from(treasuryMovements)
    .where(and(
      gte(treasuryMovements.createdAt, startBound),
      lt(treasuryMovements.createdAt, endBound),
      eq(treasuryMovements.referenceType, 'damage_charge_payment')
    ))

  const salesRevenueRes = await db
    .select({ total: sum(treasuryMovements.amount) })
    .from(treasuryMovements)
    .where(and(
      gte(treasuryMovements.createdAt, startBound),
      lt(treasuryMovements.createdAt, endBound),
      eq(treasuryMovements.referenceType, 'sale_payment')
    ))

  const refundsRes = await db
    .select({ total: sum(treasuryMovements.amount) })
    .from(treasuryMovements)
    .where(and(
      gte(treasuryMovements.createdAt, startBound),
      lt(treasuryMovements.createdAt, endBound),
      inArray(treasuryMovements.referenceType, ['rental_refund', 'sale_refund'])
    ))

  const rentalRev = Number(rentalRevenueRes[0]?.total || 0)
  const lateRev = Number(rentalPaymentsRes[0]?.total || 0)
  const damageRev = Number(damageChargesRes[0]?.total || 0)
  const salesRev = Number(salesRevenueRes[0]?.total || 0)
  const refunds = Number(refundsRes[0]?.total || 0)

  // According to spec: Operating Result = Total Revenue (Rentals + Late Fees + Damages + Other as defined by the spec) - Total Expenses
  // Note: Refunds reduce the total revenue. We deduct refunds from the total.
  const totalRevenue = rentalRev + lateRev + damageRev + salesRev - refunds

  // 2. Expenses
  const expenseRes = await db
    .select({ total: sum(treasuryMovements.amount) })
    .from(treasuryMovements)
    .where(and(
      gte(treasuryMovements.createdAt, startBound),
      lt(treasuryMovements.createdAt, endBound),
      eq(treasuryMovements.type, 'out'),
      inArray(treasuryMovements.referenceType, ['expense', 'maintenance_payment'])
    ))

  const totalExpenses = Number(expenseRes[0]?.total || 0)
  // 3. Category breakdown (still uses expenses table for manual categorizations, plus maintenance)
  const catRes = await db
    .select({
      category: expenses.categoryId,
      total: sum(expenses.amount)
    })
    .from(expenses)
    .where(and(
      gte(expenses.createdAt, startBound),
      lt(expenses.createdAt, endBound)
    ))
    .groupBy(expenses.categoryId)

  const maintenanceExpRes = await db
    .select({ total: sum(treasuryMovements.amount) })
    .from(treasuryMovements)
    .where(and(
      gte(treasuryMovements.createdAt, startBound),
      lt(treasuryMovements.createdAt, endBound),
      eq(treasuryMovements.type, 'out'),
      eq(treasuryMovements.referenceType, 'maintenance_payment')
    ))
  const totalMaintExp = Number(maintenanceExpRes[0]?.total || 0)

  return {
    rentalRevenue: rentalRev,
    rentalPayments: lateRev,
    damageCharges: damageRev,
    salesRevenue: salesRev,
    refunds: refunds,
    totalRevenue,
    totalExpenses,
    operatingResult: totalRevenue - totalExpenses,
    revenueByCategory: [
      { type: 'إيجار الاسكيتات', total: rentalRev },
      { type: 'غرامات التأخير', total: lateRev },
      { type: 'تعويضات الأضرار', total: damageRev },
      { type: 'المبيعات', total: salesRev },
      { type: 'الاسترداد', total: -refunds }
    ].filter(r => r.total !== 0),
    expensesByCategory: [
      ...catRes.map(r => ({
        category: r.category ? String(r.category) : 'غير مصنف',
        total: Number(r.total || 0)
      })),
      ...(totalMaintExp > 0 ? [{ category: 'الصيانة', total: totalMaintExp }] : [])
    ]
  }
}

export async function getRevenueReport(filters: DateRangeInput): Promise<any> {
  const { startBound, endBound } = buildDateBounds(filters.startDate, filters.endDate)

  const revenueRes = await db
    .select({
      date: sql<string>`DATE(CONVERT_TZ(${treasuryMovements.createdAt}, '+00:00', '+03:00'))`,
      total: sum(treasuryMovements.amount)
    })
    .from(treasuryMovements)
    .where(and(
      gte(treasuryMovements.createdAt, startBound),
      lt(treasuryMovements.createdAt, endBound),
      inArray(treasuryMovements.referenceType, ['rental_payment', 'late_fee_payment', 'damage_charge_payment', 'sale_payment'])
    ))
    .groupBy(sql`DATE(CONVERT_TZ(${treasuryMovements.createdAt}, '+00:00', '+03:00'))`)
    .orderBy(sql`DATE(CONVERT_TZ(${treasuryMovements.createdAt}, '+00:00', '+03:00'))`)

  const totalRev = await db
    .select({ total: sum(treasuryMovements.amount) })
    .from(treasuryMovements)
    .where(and(
      gte(treasuryMovements.createdAt, startBound),
      lt(treasuryMovements.createdAt, endBound),
      inArray(treasuryMovements.referenceType, ['rental_payment', 'late_fee_payment', 'damage_charge_payment', 'sale_payment'])
    ))

  const refundsRes = await db
    .select({ total: sum(treasuryMovements.amount) })
    .from(treasuryMovements)
    .where(and(
      gte(treasuryMovements.createdAt, startBound),
      lt(treasuryMovements.createdAt, endBound),
      inArray(treasuryMovements.referenceType, ['rental_refund', 'sale_refund'])
    ))

  const totalRevenue = Number(totalRev[0]?.total || 0) - Number(refundsRes[0]?.total || 0)

  return {
    totalRevenue,
    chartData: revenueRes.map(r => ({
      date: r.date,
      value: Number(r.total || 0)
    }))
  }
}

export async function getExpenseReport(filters: DateRangeInput): Promise<any> {
  const { startBound, endBound } = buildDateBounds(filters.startDate, filters.endDate)

  const expRes = await db
    .select({
      date: sql<string>`DATE(CONVERT_TZ(${treasuryMovements.createdAt}, '+00:00', '+03:00'))`,
      total: sum(treasuryMovements.amount)
    })
    .from(treasuryMovements)
    .where(and(
      gte(treasuryMovements.createdAt, startBound),
      lt(treasuryMovements.createdAt, endBound),
      eq(treasuryMovements.type, 'out'),
      inArray(treasuryMovements.referenceType, ['expense', 'maintenance_payment'])
    ))
    .groupBy(sql`DATE(CONVERT_TZ(${treasuryMovements.createdAt}, '+00:00', '+03:00'))`)
    .orderBy(sql`DATE(CONVERT_TZ(${treasuryMovements.createdAt}, '+00:00', '+03:00'))`)

  const catRes = await db
    .select({
      category: expenses.categoryId,
      total: sum(expenses.amount)
    })
    .from(expenses)
    .where(and(
      gte(expenses.createdAt, startBound),
      lt(expenses.createdAt, endBound)
    ))
    .groupBy(expenses.categoryId)

  const totalExp = await db
    .select({ total: sum(treasuryMovements.amount) })
    .from(treasuryMovements)
    .where(and(
      gte(treasuryMovements.createdAt, startBound),
      lt(treasuryMovements.createdAt, endBound),
      eq(treasuryMovements.type, 'out'),
      inArray(treasuryMovements.referenceType, ['expense', 'maintenance_payment'])
    ))

  return {
    totalExpenses: Number(totalExp[0]?.total || 0),
    chartData: expRes.map(r => ({
      date: r.date,
      value: Number(r.total || 0)
    })),
    byCategory: catRes.map(r => ({
      category: r.category,
      total: Number(r.total || 0)
    }))
  }
}

export async function getRentalReport(filters: DateRangeInput): Promise<PaginatedResult<any>> {
  const { startBound, endBound } = buildDateBounds(filters.startDate, filters.endDate)
  const offset = (filters.page - 1) * filters.limit

  const baseQuery = db
    .select({
      id: rentals.id,
      customerName: customers.name,
      skateCode: skates.skateCode,
      duration: rentals.durationMinutes,
      amount: rentals.rentalAmount,
      startedAt: rentals.startedAt,
      expectedEndAt: rentals.expectedEndAt,
      status: rentals.status,
      cashierName: users.name
    })
    .from(rentals)
    .leftJoin(customers, eq(rentals.customerId, customers.id))
    .leftJoin(skates, eq(rentals.skateId, skates.id))
    .leftJoin(users, eq(rentals.cashierId, users.id))
    .where(and(
      gte(rentals.startedAt, startBound),
      lt(rentals.startedAt, endBound)
    ))

  const countQuery = await db
    .select({ count: count() })
    .from(rentals)
    .where(and(
      gte(rentals.startedAt, startBound),
      lt(rentals.startedAt, endBound)
    ))

  const data = await baseQuery.orderBy(desc(rentals.startedAt)).limit(filters.limit).offset(offset)
  const total = Number(countQuery[0]?.count || 0)

  return {
    data: data.map(r => ({
      id: r.id,
      customerName: r.customerName,
      skateCode: r.skateCode,
      duration: r.duration,
      amount: Number(r.amount),
      startTime: r.startedAt.toISOString(),
      endTime: r.expectedEndAt.toISOString(),
      status: r.status,
      cashierName: r.cashierName
    })),
    meta: {
      total,
      page: filters.page,
      limit: filters.limit,
      totalPages: Math.ceil(total / filters.limit)
    }
  }
}

export async function getLateReport(filters: DateRangeInput): Promise<PaginatedResult<any>> {
  const { startBound, endBound } = buildDateBounds(filters.startDate, filters.endDate)
  const offset = (filters.page - 1) * filters.limit

  const baseQuery = db
    .select({
      id: rentals.id,
      customerName: customers.name,
      skateCode: skates.skateCode,
      startedAt: rentals.startedAt,
      expectedEndAt: rentals.expectedEndAt,
      returnedAt: rentals.returnedAt,
      lateFee: lateFeeRecords.calculatedFee
    })
    .from(lateFeeRecords)
    .innerJoin(rentals, eq(lateFeeRecords.rentalId, rentals.id))
    .leftJoin(customers, eq(rentals.customerId, customers.id))
    .leftJoin(skates, eq(rentals.skateId, skates.id))
    .where(and(
      gte(rentals.startedAt, startBound),
      lt(rentals.startedAt, endBound)
    ))

  const countQuery = await db
    .select({ count: count() })
    .from(lateFeeRecords)
    .innerJoin(rentals, eq(lateFeeRecords.rentalId, rentals.id))
    .where(and(
      gte(rentals.startedAt, startBound),
      lt(rentals.startedAt, endBound)
    ))

  const data = await baseQuery.orderBy(desc(rentals.startedAt)).limit(filters.limit).offset(offset)
  const total = Number(countQuery[0]?.count || 0)

  return {
    data: data.map(r => ({
      id: r.id,
      customerName: r.customerName,
      skateCode: r.skateCode,
      startTime: r.startedAt.toISOString(),
      endTime: r.expectedEndAt.toISOString(),
      actualReturnTime: r.returnedAt ? r.returnedAt.toISOString() : null,
      lateFee: Number(r.lateFee)
    })),
    meta: {
      total,
      page: filters.page,
      limit: filters.limit,
      totalPages: Math.ceil(total / filters.limit)
    }
  }
}

export async function getDamageReport(filters: DateRangeInput): Promise<PaginatedResult<any>> {
  const { startBound, endBound } = buildDateBounds(filters.startDate, filters.endDate)
  const offset = (filters.page - 1) * filters.limit

  const baseQuery = db
    .select({
      id: damageReports.id,
      skateCode: skates.skateCode,
      customerName: customers.name,
      damageType: damageReports.damageType,
      chargeAmount: damageReports.customerCharge,
      severity: damageReports.severity,
      reportedAt: damageReports.createdAt
    })
    .from(damageReports)
    .leftJoin(skates, eq(damageReports.skateId, skates.id))
    .leftJoin(customers, eq(damageReports.customerId, customers.id))
    .where(and(
      gte(damageReports.createdAt, startBound),
      lt(damageReports.createdAt, endBound)
    ))

  const countQuery = await db
    .select({ count: count() })
    .from(damageReports)
    .where(and(
      gte(damageReports.createdAt, startBound),
      lt(damageReports.createdAt, endBound)
    ))

  const data = await baseQuery.orderBy(desc(damageReports.createdAt)).limit(filters.limit).offset(offset)
  const total = Number(countQuery[0]?.count || 0)

  return {
    data: data.map(r => ({
      id: r.id,
      skateCode: r.skateCode,
      customerName: r.customerName,
      damageType: r.damageType,
      chargeAmount: Number(r.chargeAmount || 0),
      severity: r.severity,
      reportedAt: r.reportedAt.toISOString()
    })),
    meta: {
      total,
      page: filters.page,
      limit: filters.limit,
      totalPages: Math.ceil(total / filters.limit)
    }
  }
}

export async function getMaintenanceReport(filters: DateRangeInput): Promise<PaginatedResult<any>> {
  const { startBound, endBound } = buildDateBounds(filters.startDate, filters.endDate)
  const offset = (filters.page - 1) * filters.limit

  const baseQuery = db
    .select({
      id: maintenanceRecords.id,
      skateCode: skates.skateCode,
      problemType: maintenanceRecords.problemDescription,
      status: maintenanceRecords.status,
      repairCost: maintenanceRecords.totalCost,
      startedAt: maintenanceRecords.startedAt,
      completedAt: maintenanceRecords.completedAt
    })
    .from(maintenanceRecords)
    .leftJoin(skates, eq(maintenanceRecords.skateId, skates.id))
    .where(and(
      gte(maintenanceRecords.startedAt, startBound),
      lt(maintenanceRecords.startedAt, endBound)
    ))

  const countQuery = await db
    .select({ count: count() })
    .from(maintenanceRecords)
    .where(and(
      gte(maintenanceRecords.startedAt, startBound),
      lt(maintenanceRecords.startedAt, endBound)
    ))

  const data = await baseQuery.orderBy(desc(maintenanceRecords.startedAt)).limit(filters.limit).offset(offset)
  const total = Number(countQuery[0]?.count || 0)

  return {
    data: data.map(r => ({
      id: r.id,
      skateCode: r.skateCode,
      problemType: r.problemType,
      status: r.status,
      repairCost: Number(r.repairCost || 0),
      startedAt: r.startedAt ? r.startedAt.toISOString() : null,
      completedAt: r.completedAt ? r.completedAt.toISOString() : null
    })),
    meta: {
      total,
      page: filters.page,
      limit: filters.limit,
      totalPages: Math.ceil(total / filters.limit)
    }
  }
}

export async function getCustomerReport(filters: DateRangeInput): Promise<PaginatedResult<any>> {
  const { startBound, endBound } = buildDateBounds(filters.startDate, filters.endDate)
  const offset = (filters.page - 1) * filters.limit

  // Aggregate stats per customer for the given date range.
  // This requires grouping on customers. Since Drizzle's group by can be tricky with complex aggregates,
  // we'll just query rentals and damages grouped by customer using SQL.
  const query = sql`
    SELECT 
      c.id, c.name,
      COUNT(r.id) as rentalsCount,
      SUM(r.rental_amount) as totalSpent,
      SUM(CASE WHEN r.returned_at > r.expected_end_at THEN 1 ELSE 0 END) as lateReturns,
      (SELECT COUNT(d.id) FROM damage_reports d WHERE d.customer_id = c.id AND d.created_at >= ${startBound} AND d.created_at < ${endBound}) as damages
    FROM customers c
    LEFT JOIN rentals r ON r.customer_id = c.id AND r.started_at >= ${startBound} AND r.started_at < ${endBound}
    GROUP BY c.id
    HAVING COUNT(r.id) > 0 OR damages > 0
    ORDER BY totalSpent DESC
    LIMIT ${filters.limit} OFFSET ${offset}
  `

  const countQuery = sql`
    SELECT COUNT(*) as cnt FROM (
      SELECT c.id,
      (SELECT COUNT(d.id) FROM damage_reports d WHERE d.customer_id = c.id AND d.created_at >= ${startBound} AND d.created_at < ${endBound}) as damages
      FROM customers c
      LEFT JOIN rentals r ON r.customer_id = c.id AND r.started_at >= ${startBound} AND r.started_at < ${endBound}
      GROUP BY c.id
      HAVING COUNT(r.id) > 0 OR damages > 0
    ) sub
  `

  const [data] = await db.execute(query) as any
  const [totalRes] = await db.execute(countQuery) as any
  const total = Number(totalRes[0]?.cnt || 0)

  return {
    data: data.map((r: any) => ({
      id: r.id,
      name: r.name,
      rentalsCount: Number(r.rentalsCount),
      totalSpent: Number(r.totalSpent),
      lateReturns: Number(r.lateReturns),
      damages: Number(r.damages)
    })),
    meta: {
      total,
      page: filters.page,
      limit: filters.limit,
      totalPages: Math.ceil(total / filters.limit)
    }
  }
}

export async function getCashierReport(filters: DateRangeInput): Promise<PaginatedResult<any>> {
  const { startBound, endBound } = buildDateBounds(filters.startDate, filters.endDate)
  const offset = (filters.page - 1) * filters.limit

  // Aggregate stats per cashier account (user) rather than purely by shift,
  // since some operations might lack a shift_id but will always have a cashier_id.
  const query = sql`
    SELECT 
      u.id, u.name,
      (SELECT SUM(difference) FROM cashier_shifts WHERE cashier_id = u.id AND opened_at >= ${startBound} AND opened_at < ${endBound}) as shiftDifference,
      (SELECT COUNT(id) FROM rentals WHERE cashier_id = u.id AND started_at >= ${startBound} AND started_at < ${endBound}) as rentalsCount,
      (SELECT SUM(amount) FROM treasury_movements WHERE cashier_id = u.id AND reference_type IN ('rental_payment', 'late_fee_payment', 'damage_charge_payment', 'sale_payment') AND created_at >= ${startBound} AND created_at < ${endBound}) as revenue,
      (SELECT SUM(amount) FROM treasury_movements WHERE cashier_id = u.id AND reference_type = 'rental_payment' AND created_at >= ${startBound} AND created_at < ${endBound}) as rentalPayments,
      (SELECT SUM(amount) FROM expenses WHERE cashier_id = u.id AND created_at >= ${startBound} AND created_at < ${endBound}) as expenses
    FROM users u
    HAVING rentalsCount > 0 OR revenue > 0 OR expenses > 0 OR shiftDifference IS NOT NULL
    ORDER BY revenue DESC
    LIMIT ${filters.limit} OFFSET ${offset}
  `

  const countQuery = sql`
    SELECT COUNT(*) as cnt FROM (
      SELECT u.id,
      (SELECT SUM(difference) FROM cashier_shifts WHERE cashier_id = u.id AND opened_at >= ${startBound} AND opened_at < ${endBound}) as shiftDifference,
      (SELECT COUNT(id) FROM rentals WHERE cashier_id = u.id AND started_at >= ${startBound} AND started_at < ${endBound}) as rentalsCount,
      (SELECT SUM(amount) FROM treasury_movements WHERE cashier_id = u.id AND reference_type IN ('rental_payment', 'late_fee_payment', 'damage_charge_payment', 'sale_payment') AND created_at >= ${startBound} AND created_at < ${endBound}) as revenue,
      (SELECT SUM(amount) FROM expenses WHERE cashier_id = u.id AND created_at >= ${startBound} AND created_at < ${endBound}) as expenses
      FROM users u
      HAVING rentalsCount > 0 OR revenue > 0 OR expenses > 0 OR shiftDifference IS NOT NULL
    ) sub
  `

  const [data] = await db.execute(query) as any
  const [totalRes] = await db.execute(countQuery) as any
  const total = Number(totalRes[0]?.cnt || 0)

  return {
    data: data.map((r: any) => ({
      id: r.id,
      name: r.name,
      rentalsCount: Number(r.rentalsCount || 0),
      revenue: Number(r.revenue || 0),
      rentalPayments: Number(r.rentalPayments || 0),
      expenses: Number(r.expenses || 0),
      shiftDifference: Number(r.shiftDifference || 0)
    })),
    meta: {
      total,
      page: filters.page,
      limit: filters.limit,
      totalPages: Math.ceil(total / filters.limit)
    }
  }
}

export async function getSkatePerformanceReport(filters: DateRangeInput): Promise<PaginatedResult<any>> {
  const { startBound, endBound } = buildDateBounds(filters.startDate, filters.endDate)
  const offset = (filters.page - 1) * filters.limit

  const query = sql`
    SELECT 
      s.id, s.skate_code as code, s.type, s.status,
      COUNT(r.id) as rentalsCount,
      SUM(r.rental_amount) as rentalRevenue,
      (SELECT COUNT(m.id) FROM maintenance_records m WHERE m.skate_id = s.id AND m.started_at >= ${startBound} AND m.started_at < ${endBound}) as maintenanceCount,
      (SELECT SUM(m.total_cost) FROM maintenance_records m WHERE m.skate_id = s.id AND m.started_at >= ${startBound} AND m.started_at < ${endBound}) as maintenanceCost,
      (SELECT COUNT(d.id) FROM damage_reports d WHERE d.skate_id = s.id AND d.created_at >= ${startBound} AND d.created_at < ${endBound}) as damageCount
    FROM skates s
    LEFT JOIN rentals r ON r.skate_id = s.id AND r.started_at >= ${startBound} AND r.started_at < ${endBound}
    GROUP BY s.id
    ORDER BY rentalRevenue DESC
    LIMIT ${filters.limit} OFFSET ${offset}
  `

  const countQuery = sql`SELECT COUNT(id) as cnt FROM skates`

  const [data] = await db.execute(query) as any
  const [totalRes] = await db.execute(countQuery) as any
  const total = Number(totalRes[0]?.cnt || 0)

  return {
    data: data.map((r: any) => ({
      id: r.id,
      code: r.code,
      type: r.type,
      status: r.status,
      rentalsCount: Number(r.rentalsCount || 0),
      rentalRevenue: Number(r.rentalRevenue || 0),
      maintenanceCount: Number(r.maintenanceCount || 0),
      maintenanceCost: Number(r.maintenanceCost || 0),
      damageCount: Number(r.damageCount || 0)
    })),
    meta: {
      total,
      page: filters.page,
      limit: filters.limit,
      totalPages: Math.ceil(total / filters.limit)
    }
  }
}
