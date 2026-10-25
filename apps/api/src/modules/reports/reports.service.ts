import { db } from '../../db/connection.js'
import { sql, type SQL } from 'drizzle-orm'
import type {
  DateRangeInput, OverviewReportDTO, OperatingFinancialReportDTO, RevenueReportDTO,
  ExpenseReportDTO, PaginatedResult, ReportRentalDTO, ReportLateDTO, ReportDamageDTO,
  ReportMaintenanceDTO, ReportCustomerDTO, ReportCashierDTO, ReportSkatePerformanceDTO,
} from './reports.types.js'

type Reader = Pick<typeof db, 'execute'>
type Row = Record<string, any>

// The approved report calendar is fixed UTC+03:00, including winter dates.
export function buildDateBounds(localStartDate: string, localEndDate: string) {
  const offset = 3 * 60 * 60 * 1000
  const startBound = new Date(`${localStartDate}T00:00:00Z`)
  const endBound = new Date(`${localEndDate}T00:00:00Z`)
  endBound.setUTCDate(endBound.getUTCDate() + 1)
  startBound.setTime(startBound.getTime() - offset)
  endBound.setTime(endBound.getTime() - offset)
  return { startBound, endBound }
}

async function rows(reader: Reader, query: SQL): Promise<Row[]> {
  const [result] = await reader.execute(query)
  return result as unknown as Row[]
}
function readSnapshot<T>(work: (reader: Reader) => Promise<T>): Promise<T> {
  // In repeatable-read, the first SELECT establishes the shared read snapshot.
  // Drizzle 0.38 incorrectly combines WITH CONSISTENT SNAPSHOT + READ ONLY.
  return db.transaction(work, { isolationLevel: 'repeatable read', accessMode: 'read only' })
}
function num(value: unknown): number { return Number(value ?? 0) }
function money(value: unknown): number { return Math.round(num(value) * 100) / 100 }
function nullableNumber(value: unknown): number | null { return value == null ? null : num(value) }
function iso(value: Date | string | null): string | null {
  if (value == null) return null
  if (value instanceof Date) return value.toISOString()
  const normalized = String(value).replace(' ', 'T')
  return new Date(/[zZ]|[+-]\d{2}:\d{2}$/.test(normalized) ? normalized : `${normalized}Z`).toISOString()
}
function pattern(value: string): string { return `%${value.replace(/[=%_]/g, '=$&')}%` }
function contains(column: SQL, value?: string): SQL {
  return value ? sql`${column} LIKE ${pattern(value)} ESCAPE '='` : sql`TRUE`
}
function exact(column: SQL, value?: string): SQL { return value ? sql`${column} = ${value}` : sql`TRUE` }
function pagination(filters: DateRangeInput) {
  const page = filters.page ?? 1
  const limit = filters.limit ?? 50
  return { page, limit, offset: (page - 1) * limit }
}
async function paginated<T>(reader: Reader, cte: SQL, projection: SQL, order: SQL, filters: DateRangeInput, summaryQuery: SQL, map: (row: Row) => T): Promise<PaginatedResult<T>> {
  const { page, limit, offset } = pagination(filters)
  const [totals] = await rows(reader, sql`${cte} ${summaryQuery}`)
  const data = await rows(reader, sql`${cte} SELECT ${projection} FROM filtered ORDER BY ${order} LIMIT ${limit} OFFSET ${offset}`)
  const total = num(totals?.total)
  const summary = Object.fromEntries(Object.entries(totals ?? {}).filter(([key]) => key !== 'total').map(([key, value]) => [key, value == null ? null : money(value)]))
  return { data: data.map(map), meta: { total, page, limit, totalPages: Math.ceil(total / limit) }, summary }
}

// Item data is authoritative. Old headers are included only if no item exists,
// avoiding double counting historical records that have already been migrated.
const reportItems = sql`
  SELECT CONCAT('item-', i.id) AS rowId, i.id AS itemId, r.id AS id,
    r.rental_code AS rentalCode, r.customer_id AS customerId, r.cashier_id AS cashierId,
    c.name AS customerName, s.id AS skateId, s.skate_code AS skateCode, s.size,
    i.expected_duration_minutes AS expectedDuration, i.actual_duration_minutes AS duration,
    i.actual_amount AS amount, i.started_at AS startTime, i.expected_end_at AS endTime,
    i.returned_at AS actualReturnTime, i.status, r.status AS rentalStatus, u.name AS cashierName
  FROM rentals r JOIN rental_items i ON i.rental_id = r.id
  LEFT JOIN customers c ON c.id = r.customer_id
  LEFT JOIN skates s ON s.id = i.skate_id
  LEFT JOIN users u ON u.id = r.cashier_id
  UNION ALL
  SELECT CONCAT('rental-', r.id), NULL, r.id, r.rental_code, r.customer_id, r.cashier_id,
    c.name, s.id, s.skate_code, s.size, r.duration_minutes,
    CASE WHEN r.returned_at IS NOT NULL THEN CEIL(TIMESTAMPDIFF(SECOND, r.started_at, r.returned_at) / 60) ELSE NULL END,
    r.rental_amount, r.started_at, r.expected_end_at, r.returned_at,
    CASE WHEN r.status IN ('completed', 'returned') THEN 'returned' ELSE r.status END, r.status, u.name
  FROM rentals r LEFT JOIN customers c ON c.id = r.customer_id
  LEFT JOIN skates s ON s.id = r.skate_id
  LEFT JOIN users u ON u.id = r.cashier_id
  WHERE NOT EXISTS (SELECT 1 FROM rental_items i WHERE i.rental_id = r.id)
`

const ledgerRevenue = sql`CASE
  WHEN type = 'in' AND reference_type IN ('rental_payment','late_fee_payment','damage_charge_payment','sale_payment') THEN amount
  WHEN type = 'out' AND reference_type IN ('rental_refund','sale_refund') THEN -amount ELSE 0 END`
const ledgerExpense = sql`CASE WHEN type = 'out' AND reference_type IN ('expense','maintenance_payment') THEN amount ELSE 0 END`
async function ledgerTotals(reader: Reader, filters: DateRangeInput) {
  const { startBound, endBound } = buildDateBounds(filters.startDate, filters.endDate)
  const [result] = await rows(reader, sql`SELECT
    COALESCE(SUM(CASE WHEN type='in' AND reference_type='rental_payment' THEN amount ELSE 0 END),0) AS rentalRevenue,
    COALESCE(SUM(CASE WHEN type='in' AND reference_type='late_fee_payment' THEN amount ELSE 0 END),0) AS lateFees,
    COALESCE(SUM(CASE WHEN type='in' AND reference_type='damage_charge_payment' THEN amount ELSE 0 END),0) AS damageCharges,
    COALESCE(SUM(CASE WHEN type='in' AND reference_type='sale_payment' THEN amount ELSE 0 END),0) AS salesRevenue,
    COALESCE(SUM(CASE WHEN type='out' AND reference_type IN ('rental_refund','sale_refund') THEN amount ELSE 0 END),0) AS refunds,
    COALESCE(SUM(${ledgerRevenue}),0) AS totalRevenue,
    COALESCE(SUM(${ledgerExpense}),0) AS totalExpenses
    FROM treasury_movements WHERE created_at >= ${startBound} AND created_at < ${endBound}`)
  return Object.fromEntries(Object.entries(result).map(([key,value]) => [key,money(value)])) as Record<string,number>
}
function revenueCategories(totals: Record<string,number>) {
  return [
    { type: 'إيجار الاسكيتات', total: totals.rentalRevenue },
    { type: 'غرامات التأخير المحصلة', total: totals.lateFees },
    { type: 'تعويضات الأضرار المحصلة', total: totals.damageCharges },
    { type: 'المبيعات', total: totals.salesRevenue },
    { type: 'الاسترداد', total: -totals.refunds },
  ]
}
function expenseCte(filters: DateRangeInput): SQL {
  const { startBound, endBound } = buildDateBounds(filters.startDate, filters.endDate)
  return sql`WITH expense_movements AS (
    SELECT m.*, e.category_id AS categoryId, u.name AS userName, a.name_ar AS accountName
    FROM treasury_movements m
    LEFT JOIN expenses e ON m.reference_type='expense' AND e.id=m.reference_id
    LEFT JOIN users u ON u.id=m.cashier_id
    LEFT JOIN treasury_accounts a ON a.id=m.treasury_account_id
    WHERE m.type='out' AND m.reference_type IN ('expense','maintenance_payment')
      AND m.created_at >= ${startBound} AND m.created_at < ${endBound}
  )`
}
async function expenseCategories(reader: Reader, filters: DateRangeInput) {
  const data = await rows(reader, sql`${expenseCte(filters)} SELECT
    CASE WHEN reference_type='maintenance_payment' THEN 'الصيانة'
      WHEN categoryId IS NULL THEN 'غير مصنف' ELSE CONCAT('فئة رقم ',categoryId) END AS category,
    SUM(amount) AS total FROM expense_movements GROUP BY category ORDER BY total DESC, category`)
  return data.map(r => ({category:String(r.category),total:money(r.total)}))
}

export function getOverviewReport(filters: DateRangeInput): Promise<OverviewReportDTO> {
  return readSnapshot(async reader => {
    const { startBound, endBound } = buildDateBounds(filters.startDate, filters.endDate)
    const totals = await ledgerTotals(reader, filters)
    const [result] = await rows(reader, sql`WITH report_items AS (${reportItems}) SELECT
      (SELECT COUNT(*) FROM rentals WHERE started_at >= ${startBound} AND started_at < ${endBound}) AS totalRentals,
      (SELECT COUNT(*) FROM rentals WHERE status='active') AS activeRentals,
      (SELECT COUNT(DISTINCT id) FROM report_items WHERE rentalStatus='active' AND status='active' AND endTime < ${new Date()}) AS lateRentals,
      (SELECT COUNT(*) FROM damage_reports WHERE created_at >= ${startBound} AND created_at < ${endBound}) AS totalDamages,
      (SELECT COUNT(*) FROM maintenance_records WHERE status IN ('pending','in_progress')) AS activeMaintenance`)
    return { totalRevenue: totals.totalRevenue, totalExpenses: totals.totalExpenses,
      totalRentals:num(result.totalRentals), activeRentals:num(result.activeRentals), lateRentals:num(result.lateRentals),
      totalDamages:num(result.totalDamages), activeMaintenance:num(result.activeMaintenance) }
  })
}
export function getOperatingFinancialReport(filters: DateRangeInput): Promise<OperatingFinancialReportDTO> {
  return readSnapshot(async reader => {
    const totals = await ledgerTotals(reader, filters)
    return {
      rentalRevenue:totals.rentalRevenue, lateFees:totals.lateFees, damageCharges:totals.damageCharges,
      salesRevenue:totals.salesRevenue, refunds:totals.refunds,
      grossRevenue:money(totals.totalRevenue + totals.refunds), totalRevenue:totals.totalRevenue,
      totalExpenses:totals.totalExpenses, operatingResult:money(totals.totalRevenue-totals.totalExpenses),
      revenueByCategory:revenueCategories(totals), expensesByCategory:await expenseCategories(reader,filters),
    }
  })
}
export function getRevenueReport(filters: DateRangeInput): Promise<RevenueReportDTO> {
  return readSnapshot(async reader => {
    const { startBound, endBound } = buildDateBounds(filters.startDate, filters.endDate)
    const totals = await ledgerTotals(reader,filters)
    const data = await rows(reader,sql`SELECT DATE(CONVERT_TZ(created_at,'+00:00','+03:00')) AS date,
      SUM(${ledgerRevenue}) AS value FROM treasury_movements
      WHERE created_at >= ${startBound} AND created_at < ${endBound}
        AND ((type='in' AND reference_type IN ('rental_payment','late_fee_payment','damage_charge_payment','sale_payment'))
          OR (type='out' AND reference_type IN ('rental_refund','sale_refund')))
      GROUP BY date ORDER BY date`)
    return { totalRevenue:totals.totalRevenue, chartData:data.map(r=>({date:String(r.date),value:money(r.value)})), byCategory:revenueCategories(totals) }
  })
}
export function getExpenseReport(filters: DateRangeInput): Promise<ExpenseReportDTO> {
  return readSnapshot(async reader => {
    const cte=expenseCte(filters)
    const data=await rows(reader,sql`${cte} SELECT DATE(CONVERT_TZ(created_at,'+00:00','+03:00')) AS date,SUM(amount) AS value FROM expense_movements GROUP BY date ORDER BY date`)
    const byUser=await rows(reader,sql`${cte} SELECT COALESCE(userName,'غير معروف') AS name,SUM(amount) AS total FROM expense_movements GROUP BY cashier_id,userName ORDER BY total DESC,cashier_id`)
    const byAccount=await rows(reader,sql`${cte} SELECT COALESCE(accountName,'غير معروف') AS name,SUM(amount) AS total FROM expense_movements GROUP BY treasury_account_id,accountName ORDER BY total DESC,treasury_account_id`)
    const chartData=data.map(r=>({date:String(r.date),value:money(r.value)}))
    return { totalExpenses:money(chartData.reduce((total,r)=>total+r.value,0)),chartData,
      byCategory:await expenseCategories(reader,filters),byUser:byUser.map(r=>({name:String(r.name),total:money(r.total)})),
      byAccount:byAccount.map(r=>({name:String(r.name),total:money(r.total)})) }
  })
}

export function getRentalReport(filters: DateRangeInput): Promise<PaginatedResult<ReportRentalDTO>> {
  return readSnapshot(async reader => {
    const { startBound,endBound }=buildDateBounds(filters.startDate,filters.endDate)
    const cte=sql`WITH report_items AS (${reportItems}), filtered AS (
      SELECT * FROM report_items WHERE startTime >= ${startBound} AND startTime < ${endBound}
        AND ${contains(sql`customerName`,filters.customer)} AND ${contains(sql`cashierName`,filters.cashier)}
        AND ${contains(sql`skateCode`,filters.skate)} AND ${exact(sql`size`,filters.size)}
        AND ${exact(sql`status`,filters.status)} AND ${exact(sql`rentalStatus`,filters.rentalStatus)}
        AND ${filters.duration ? sql`expectedDuration=${filters.duration}` : sql`TRUE`}
        AND ${filters.search ? sql`(rentalCode LIKE ${pattern(filters.search)} ESCAPE '=' OR customerName LIKE ${pattern(filters.search)} ESCAPE '=' OR skateCode LIKE ${pattern(filters.search)} ESCAPE '=')` : sql`TRUE`}
    )`
    return paginated(reader,cte,sql`*`,sql`startTime DESC,id DESC,rowId DESC`,filters,
      sql`SELECT COUNT(*) AS total,COUNT(*) AS totalItems,COUNT(DISTINCT id) AS totalRentals,COALESCE(SUM(amount),0) AS totalAmount FROM filtered`,
      r=>({rowId:String(r.rowId),id:num(r.id),rentalCode:r.rentalCode,customerName:r.customerName,skateCode:r.skateCode,size:r.size,
        expectedDuration:nullableNumber(r.expectedDuration),duration:nullableNumber(r.duration),amount:nullableNumber(r.amount),
        startTime:iso(r.startTime)!,endTime:iso(r.endTime),actualReturnTime:iso(r.actualReturnTime),status:r.status,rentalStatus:r.rentalStatus,cashierName:r.cashierName}))
  })
}

export function getLateReport(filters: DateRangeInput): Promise<PaginatedResult<ReportLateDTO>> {
  return readSnapshot(async reader=>{
    const { startBound,endBound }=buildDateBounds(filters.startDate,filters.endDate)
    const cte=sql`WITH late_rows AS (
      SELECT f.id,r.id AS rentalId,r.rental_code AS rentalCode,c.name AS customerName,s.skate_code AS skateCode,u.name AS cashierName,
        COALESCE(i.started_at,r.started_at) AS startTime,COALESCE(i.expected_end_at,r.expected_end_at) AS endTime,
        COALESCE(i.returned_at,r.returned_at) AS actualReturnTime,f.late_minutes AS lateMinutes,f.calculated_fee AS lateFee,
        CASE WHEN r.status IN ('completed','returned') THEN f.collected_fee ELSE 0 END AS collectedFee,
        f.waived_fee AS waivedFee,
        GREATEST(f.calculated_fee-f.waived_fee-CASE WHEN r.status IN ('completed','returned') THEN f.collected_fee ELSE 0 END,0) AS pendingFee
      FROM late_fee_records f JOIN rentals r ON r.id=f.rental_id
      LEFT JOIN rental_items i ON i.id=f.rental_item_id AND i.rental_id=r.id
      LEFT JOIN customers c ON c.id=r.customer_id LEFT JOIN skates s ON s.id=COALESCE(i.skate_id,r.skate_id)
      LEFT JOIN users u ON u.id=r.cashier_id WHERE f.created_at >= ${startBound} AND f.created_at < ${endBound}
    ), filtered AS (SELECT * FROM late_rows WHERE ${contains(sql`customerName`,filters.customer)} AND ${contains(sql`cashierName`,filters.cashier)}
      AND ${contains(sql`skateCode`,filters.skate)}
      AND ${filters.search ? sql`(rentalCode LIKE ${pattern(filters.search)} ESCAPE '=' OR customerName LIKE ${pattern(filters.search)} ESCAPE '=' OR skateCode LIKE ${pattern(filters.search)} ESCAPE '=' OR cashierName LIKE ${pattern(filters.search)} ESCAPE '=')` : sql`TRUE`})`
    const result=await paginated(reader,cte,sql`*`,sql`startTime DESC,id DESC`,filters,
      sql`SELECT COUNT(*) AS total,COUNT(*) AS lateRecordsCount,COUNT(DISTINCT rentalId) AS totalLateRentals,
        COALESCE(SUM(lateFee),0) AS calculatedLateFees,COALESCE(SUM(collectedFee),0) AS collectedLateFees,
        COALESCE(SUM(waivedFee),0) AS waivedLateFees,COALESCE(SUM(pendingFee),0) AS pendingLateFees,
        COALESCE(100*SUM(waivedFee)/NULLIF(SUM(lateFee),0),0) AS waiverRate FROM filtered`,
      r=>({id:num(r.id),rentalId:num(r.rentalId),rentalCode:r.rentalCode,customerName:r.customerName,skateCode:r.skateCode,cashierName:r.cashierName,
        startTime:iso(r.startTime)!,endTime:iso(r.endTime),actualReturnTime:iso(r.actualReturnTime),lateMinutes:num(r.lateMinutes),
        lateFee:money(r.lateFee),collectedFee:money(r.collectedFee),waivedFee:money(r.waivedFee),pendingFee:money(r.pendingFee)}))
    const byCashier=await rows(reader,sql`${cte} SELECT COALESCE(cashierName,'غير معروف') AS name,
      SUM(lateFee) AS calculatedFees,SUM(collectedFee) AS collectedFees,SUM(waivedFee) AS waivedFees,SUM(pendingFee) AS pendingFees
      FROM filtered GROUP BY cashierName ORDER BY calculatedFees DESC,cashierName`)
    result.byCashier=byCashier.map(r=>({name:r.name,calculatedFees:money(r.calculatedFees),collectedFees:money(r.collectedFees),waivedFees:money(r.waivedFees),pendingFees:money(r.pendingFees)}))
    // Fee records retain decimal settlement values; finalization rounds their
    // commercial sum. Show actual cash separately without inventing item allocation.
    const [actual] = await rows(reader,sql`${cte} SELECT COALESCE(SUM(m.amount),0) AS actualCollectedLateFees
      FROM treasury_movements m WHERE m.type='in' AND m.reference_type='late_fee_payment'
        AND m.created_at >= ${startBound} AND m.created_at < ${endBound}
        AND EXISTS (SELECT 1 FROM filtered f WHERE f.rentalId=m.reference_id)`)
    result.summary.actualCollectedLateFees=money(actual.actualCollectedLateFees)
    return result
  })
}

export function getDamageReport(filters: DateRangeInput): Promise<PaginatedResult<ReportDamageDTO>> {
  return readSnapshot(async reader=>{
    const { startBound,endBound }=buildDateBounds(filters.startDate,filters.endDate)
    const cte=sql`WITH damage_rows AS (
      SELECT d.id,s.skate_code AS skateCode,c.name AS customerName,d.damage_type AS damageType,d.severity,d.status,
        d.customer_charge AS chargeAmount,d.charge_collected AS chargeCollected,d.charge_waived AS chargeWaived,
        GREATEST(d.customer_charge-d.charge_collected-d.charge_waived,0) AS outstandingCharge,
        COALESCE(m.repairCost,0) AS repairCost,d.created_at AS reportedAt
      FROM damage_reports d LEFT JOIN skates s ON s.id=d.skate_id LEFT JOIN customers c ON c.id=d.customer_id
      LEFT JOIN (SELECT damage_report_id,SUM(total_cost) AS repairCost FROM maintenance_records GROUP BY damage_report_id) m ON m.damage_report_id=d.id
      WHERE d.created_at >= ${startBound} AND d.created_at < ${endBound}
    ),filtered AS (SELECT * FROM damage_rows WHERE ${exact(sql`status`,filters.status)} AND ${contains(sql`customerName`,filters.customer)}
      AND ${contains(sql`skateCode`,filters.skate)}
      AND ${filters.search ? sql`(customerName LIKE ${pattern(filters.search)} ESCAPE '=' OR skateCode LIKE ${pattern(filters.search)} ESCAPE '=' OR damageType LIKE ${pattern(filters.search)} ESCAPE '=')` : sql`TRUE`})`
    const result=await paginated(reader,cte,sql`*`,sql`reportedAt DESC,id DESC`,filters,
      sql`SELECT COUNT(*) AS total,COUNT(*) AS totalDamages,COALESCE(SUM(chargeAmount),0) AS totalCharges,
        COALESCE(SUM(chargeCollected),0) AS totalCollected,COALESCE(SUM(chargeWaived),0) AS totalWaived,
        COALESCE(SUM(outstandingCharge),0) AS totalOutstanding,COALESCE(SUM(repairCost),0) AS totalRepairCost FROM filtered`,
      r=>({id:num(r.id),skateCode:r.skateCode,customerName:r.customerName,damageType:r.damageType,severity:r.severity,status:r.status,
        chargeAmount:money(r.chargeAmount),chargeCollected:money(r.chargeCollected),chargeWaived:money(r.chargeWaived),
        outstandingCharge:money(r.outstandingCharge),repairCost:money(r.repairCost),reportedAt:iso(r.reportedAt)!}))
    const byType=await rows(reader,sql`${cte} SELECT damageType AS type,COUNT(*) AS count,SUM(chargeAmount) AS chargeAmount,SUM(repairCost) AS repairCost FROM filtered GROUP BY damageType ORDER BY count DESC,damageType`)
    result.byType=byType.map(r=>({type:r.type,count:num(r.count),chargeAmount:money(r.chargeAmount),repairCost:money(r.repairCost)}))
    return result
  })
}

export function getMaintenanceReport(filters: DateRangeInput): Promise<PaginatedResult<ReportMaintenanceDTO>> {
  return readSnapshot(async reader=>{
    const { startBound,endBound }=buildDateBounds(filters.startDate,filters.endDate)
    const cte=sql`WITH maintenance_rows AS (
      SELECT m.id,s.skate_code AS skateCode,m.problem_description AS problemType,m.status,m.payment_status AS paymentStatus,
        m.total_cost AS repairCost,m.created_at AS createdAt,m.started_at AS startedAt,m.completed_at AS completedAt,
        CASE WHEN m.status='completed' AND m.started_at IS NOT NULL AND m.completed_at IS NOT NULL
          THEN GREATEST(TIMESTAMPDIFF(SECOND,m.started_at,m.completed_at)/60,0) ELSE NULL END AS elapsedMinutes
      FROM maintenance_records m LEFT JOIN skates s ON s.id=m.skate_id WHERE m.created_at >= ${startBound} AND m.created_at < ${endBound}
    ),filtered AS (SELECT * FROM maintenance_rows WHERE ${exact(sql`status`,filters.status)} AND ${contains(sql`skateCode`,filters.skate)}
      AND ${filters.search ? sql`(skateCode LIKE ${pattern(filters.search)} ESCAPE '=' OR problemType LIKE ${pattern(filters.search)} ESCAPE '=')` : sql`TRUE`})`
    return paginated(reader,cte,sql`*`,sql`createdAt DESC,id DESC`,filters,
      sql`SELECT COUNT(*) AS total,COUNT(*) AS totalMaintenance,COALESCE(SUM(repairCost),0) AS totalCost,
        COALESCE(AVG(repairCost),0) AS averageCost,COALESCE(SUM(status='completed'),0) AS completedCount,
        AVG(CASE WHEN status='completed' THEN elapsedMinutes ELSE NULL END) AS averageCompletedMinutes FROM filtered`,
      r=>({id:num(r.id),skateCode:r.skateCode,problemType:r.problemType,status:r.status,paymentStatus:r.paymentStatus,
        repairCost:money(r.repairCost),createdAt:iso(r.createdAt)!,startedAt:iso(r.startedAt),completedAt:iso(r.completedAt),
        elapsedMinutes:r.elapsedMinutes==null?null:money(r.elapsedMinutes)}))
  })
}

export function getCustomerReport(filters: DateRangeInput): Promise<PaginatedResult<ReportCustomerDTO>> {
  return readSnapshot(async reader=>{
    const {startBound,endBound}=buildDateBounds(filters.startDate,filters.endDate)
    const cte=sql`WITH report_items AS (${reportItems}), activity AS (
      SELECT customer_id,COUNT(*) AS rentalsCount FROM rentals WHERE started_at >= ${startBound} AND started_at < ${endBound} GROUP BY customer_id
    ), late_activity AS (
      SELECT customerId,COUNT(DISTINCT id) AS lateReturns FROM report_items WHERE startTime >= ${startBound} AND startTime < ${endBound} AND actualReturnTime > endTime GROUP BY customerId
    ), damage_activity AS (
      SELECT customer_id,COUNT(*) AS damages FROM damage_reports WHERE created_at >= ${startBound} AND created_at < ${endBound} GROUP BY customer_id
    ), customer_movements AS (
      SELECT COALESCE(r.customer_id,d.customer_id,s.customer_id) AS customerId,
        CASE WHEN m.type='in' THEN m.amount ELSE -m.amount END AS value
      FROM treasury_movements m
      LEFT JOIN rentals r ON m.reference_type IN ('rental_payment','late_fee_payment','rental_refund') AND r.id=m.reference_id
      LEFT JOIN damage_reports d ON m.reference_type='damage_charge_payment' AND d.id=m.reference_id
      LEFT JOIN sales s ON m.reference_type IN ('sale_payment','sale_refund') AND s.id=m.reference_id
      WHERE m.created_at >= ${startBound} AND m.created_at < ${endBound}
        AND ((m.type='in' AND m.reference_type IN ('rental_payment','late_fee_payment','damage_charge_payment','sale_payment'))
          OR (m.type='out' AND m.reference_type IN ('rental_refund','sale_refund')))
    ), spending AS (
      SELECT customerId,SUM(value) AS totalSpent,COUNT(*) AS movementCount FROM customer_movements GROUP BY customerId
    ),filtered AS (
      SELECT c.id,c.name,COALESCE(a.rentalsCount,0) AS rentalsCount,COALESCE(p.totalSpent,0) AS totalSpent,
        COALESCE(l.lateReturns,0) AS lateReturns,COALESCE(d.damages,0) AS damages
      FROM customers c LEFT JOIN activity a ON a.customer_id=c.id LEFT JOIN late_activity l ON l.customerId=c.id
      LEFT JOIN damage_activity d ON d.customer_id=c.id LEFT JOIN spending p ON p.customerId=c.id
      WHERE (COALESCE(a.rentalsCount,0)>0 OR COALESCE(d.damages,0)>0 OR COALESCE(p.movementCount,0)>0)
        AND ${contains(sql`c.name`,filters.search)} AND ${contains(sql`c.name`,filters.customer)}
    )`
    const order=filters.sort==='frequency' ? sql`rentalsCount DESC,totalSpent DESC,id` : sql`totalSpent DESC,id`
    return paginated(reader,cte,sql`*`,order,filters,
      sql`SELECT COUNT(*) AS total,COUNT(*) AS totalCustomers,COALESCE(SUM(rentalsCount),0) AS totalRentals,
        COALESCE(SUM(totalSpent),0) AS totalSpent,COALESCE(SUM(lateReturns),0) AS lateReturns,COALESCE(SUM(damages),0) AS damages FROM filtered`,
      r=>({id:num(r.id),name:r.name,rentalsCount:num(r.rentalsCount),totalSpent:money(r.totalSpent),lateReturns:num(r.lateReturns),damages:num(r.damages)}))
  })
}

export function getCashierReport(filters: DateRangeInput): Promise<PaginatedResult<ReportCashierDTO>> {
  return readSnapshot(async reader=>{
    const {startBound,endBound}=buildDateBounds(filters.startDate,filters.endDate)
    const cte=sql`WITH activity AS (
      SELECT cashier_id,COUNT(*) AS rentalsCount FROM rentals WHERE started_at >= ${startBound} AND started_at < ${endBound} GROUP BY cashier_id
    ), movement_activity AS (
      SELECT cashier_id,COUNT(*) AS movementCount,SUM(${ledgerRevenue}) AS revenue,SUM(${ledgerExpense}) AS expenses,
        SUM(CASE WHEN type='in' AND reference_type='late_fee_payment' THEN amount ELSE 0 END) AS lateFees
      FROM treasury_movements WHERE created_at >= ${startBound} AND created_at < ${endBound}
        AND ((type='in' AND reference_type IN ('rental_payment','late_fee_payment','damage_charge_payment','sale_payment'))
          OR (type='out' AND reference_type IN ('rental_refund','sale_refund','expense','maintenance_payment')))
      GROUP BY cashier_id
    ), waiver_activity AS (
      SELECT waived_by,SUM(waived_fee) AS waivedFees FROM late_fee_records
      WHERE COALESCE(waived_at,created_at) >= ${startBound} AND COALESCE(waived_at,created_at) < ${endBound} GROUP BY waived_by
    ), shift_activity AS (
      SELECT cashier_id,COUNT(*) AS shiftCount,SUM(difference) AS shiftDifference FROM cashier_shifts
      WHERE opened_at >= ${startBound} AND opened_at < ${endBound} GROUP BY cashier_id
    ), filtered AS (
      SELECT u.id,u.name,COALESCE(a.rentalsCount,0) AS rentalsCount,COALESCE(m.revenue,0) AS revenue,
        COALESCE(m.lateFees,0) AS lateFees,COALESCE(w.waivedFees,0) AS waivedFees,
        COALESCE(m.expenses,0) AS expenses,s.shiftDifference
      FROM users u LEFT JOIN activity a ON a.cashier_id=u.id LEFT JOIN movement_activity m ON m.cashier_id=u.id
      LEFT JOIN waiver_activity w ON w.waived_by=u.id LEFT JOIN shift_activity s ON s.cashier_id=u.id
      WHERE (COALESCE(a.rentalsCount,0)>0 OR COALESCE(m.movementCount,0)>0 OR COALESCE(w.waivedFees,0)>0 OR COALESCE(s.shiftCount,0)>0)
        AND ${contains(sql`u.name`,filters.search)} AND ${contains(sql`u.name`,filters.cashier)}
    )`
    return paginated(reader,cte,sql`*`,sql`revenue DESC,id`,filters,
      sql`SELECT COUNT(*) AS total,COUNT(*) AS totalCashiers,COALESCE(SUM(rentalsCount),0) AS totalRentals,
        COALESCE(SUM(revenue),0) AS revenue,COALESCE(SUM(lateFees),0) AS lateFees,COALESCE(SUM(waivedFees),0) AS waivedFees,
        COALESCE(SUM(expenses),0) AS expenses,SUM(shiftDifference) AS shiftDifference FROM filtered`,
      r=>({id:num(r.id),name:r.name,rentalsCount:num(r.rentalsCount),revenue:money(r.revenue),lateFees:money(r.lateFees),
        waivedFees:money(r.waivedFees),expenses:money(r.expenses),shiftDifference:r.shiftDifference==null?null:money(r.shiftDifference)}))
  })
}

export function getSkatePerformanceReport(filters: DateRangeInput): Promise<PaginatedResult<ReportSkatePerformanceDTO>> {
  return readSnapshot(async reader=>{
    const {startBound,endBound}=buildDateBounds(filters.startDate,filters.endDate)
    const cte=sql`WITH report_items AS (${reportItems}), rental_activity AS (
      SELECT skateId,COUNT(*) AS rentalsCount,SUM(amount) AS rentalRevenue,SUM(duration) AS usageMinutes FROM report_items
      WHERE startTime >= ${startBound} AND startTime < ${endBound} GROUP BY skateId
    ),maintenance_activity AS (
      SELECT skate_id,COUNT(*) AS maintenanceCount,SUM(total_cost) AS maintenanceCost FROM maintenance_records
      WHERE created_at >= ${startBound} AND created_at < ${endBound} GROUP BY skate_id
    ),damage_activity AS (
      SELECT skate_id,COUNT(*) AS damageCount,SUM(customer_charge) AS customerCharges,SUM(charge_collected) AS collectedDamageCharges FROM damage_reports
      WHERE created_at >= ${startBound} AND created_at < ${endBound} GROUP BY skate_id
    ),filtered AS (
      SELECT s.id,s.skate_code AS code,s.type,s.size,s.status,COALESCE(r.rentalsCount,0) AS rentalsCount,
        COALESCE(r.rentalRevenue,0) AS rentalRevenue,COALESCE(r.usageMinutes,0) AS usageMinutes,
        COALESCE(m.maintenanceCount,0) AS maintenanceCount,COALESCE(m.maintenanceCost,0) AS maintenanceCost,
        COALESCE(d.damageCount,0) AS damageCount,COALESCE(d.customerCharges,0) AS customerCharges,COALESCE(d.collectedDamageCharges,0) AS collectedDamageCharges
      FROM skates s LEFT JOIN rental_activity r ON r.skateId=s.id LEFT JOIN maintenance_activity m ON m.skate_id=s.id LEFT JOIN damage_activity d ON d.skate_id=s.id
      WHERE ${exact(sql`s.status`,filters.status)} AND ${exact(sql`s.size`,filters.size)} AND ${contains(sql`s.skate_code`,filters.skate)}
        AND ${filters.search ? sql`(s.skate_code LIKE ${pattern(filters.search)} ESCAPE '=' OR s.type LIKE ${pattern(filters.search)} ESCAPE '=' OR s.size LIKE ${pattern(filters.search)} ESCAPE '=')` : sql`TRUE`}
    )`
    const orders: Record<string,SQL> = { 'most-used':sql`rentalsCount DESC,id`, 'least-used':sql`rentalsCount ASC,id`, maintenance:sql`maintenanceCount DESC,id`, damages:sql`damageCount DESC,id` }
    return paginated(reader,cte,sql`*`,orders[filters.sort ?? ''] ?? sql`rentalRevenue DESC,id`,filters,
      sql`SELECT COUNT(*) AS total,COUNT(*) AS totalSkates,COALESCE(SUM(rentalsCount=0),0) AS unusedSkates,COALESCE(SUM(rentalsCount),0) AS rentalsCount,
        COALESCE(SUM(rentalRevenue),0) AS rentalRevenue,COALESCE(SUM(maintenanceCount),0) AS maintenanceCount,
        COALESCE(SUM(maintenanceCost),0) AS maintenanceCost,COALESCE(SUM(damageCount),0) AS damageCount,
        COALESCE(SUM(customerCharges),0) AS customerCharges,COALESCE(SUM(collectedDamageCharges),0) AS collectedDamageCharges,COALESCE(SUM(usageMinutes),0) AS usageMinutes FROM filtered`,
      r=>({id:num(r.id),code:r.code,type:r.type,size:r.size,status:r.status,rentalsCount:num(r.rentalsCount),rentalRevenue:money(r.rentalRevenue),
        maintenanceCount:num(r.maintenanceCount),maintenanceCost:money(r.maintenanceCost),damageCount:num(r.damageCount),
        customerCharges:money(r.customerCharges),collectedDamageCharges:money(r.collectedDamageCharges),usageMinutes:money(r.usageMinutes)}))
  })
}
