export interface DateRangeInput {
  startDate: string
  endDate: string
  page?: number
  limit?: number
  search?: string
  customer?: string
  cashier?: string
  skate?: string
  size?: string
  status?: string
  rentalStatus?: string
  duration?: number
  sort?: string
}

export interface OverviewReportDTO {
  totalRevenue: number
  totalRentals: number
  activeRentals: number
  lateRentals: number
  totalExpenses: number
  totalDamages: number
  activeMaintenance: number
}
export interface OperatingFinancialReportDTO {
  rentalRevenue: number
  lateFees: number
  damageCharges: number
  salesRevenue: number
  refunds: number
  grossRevenue: number
  totalRevenue: number
  totalExpenses: number
  operatingResult: number
  revenueByCategory: Array<{ type: string; total: number }>
  expensesByCategory: Array<{ category: string; total: number }>
}
export interface ChartDataPoint { date: string; value: number }
export interface RevenueReportDTO {
  totalRevenue: number
  chartData: ChartDataPoint[]
  byCategory: Array<{ type: string; total: number }>
}
export interface ExpenseReportDTO {
  totalExpenses: number
  chartData: ChartDataPoint[]
  byCategory: Array<{ category: string; total: number }>
  byUser: Array<{ name: string; total: number }>
  byAccount: Array<{ name: string; total: number }>
}
export interface PaginatedResult<T> {
  data: T[]
  meta: { total: number; page: number; limit: number; totalPages: number }
  summary: Record<string, number | null>
  byType?: Array<{ type: string; count: number; chargeAmount: number; repairCost: number }>
  byCashier?: Array<{ name: string; calculatedFees: number; collectedFees: number; waivedFees: number; pendingFees: number }>
}
export interface ReportRentalDTO {
  rowId: string
  id: number
  rentalCode: string
  customerName: string | null
  skateCode: string | null
  size: string | null
  expectedDuration: number | null
  duration: number | null
  amount: number | null
  startTime: string
  endTime: string | null
  actualReturnTime: string | null
  status: string
  rentalStatus: string
  cashierName: string | null
}
export interface ReportSkatePerformanceDTO {
  id: number
  code: string
  type: string | null
  size: string
  rentalsCount: number
  rentalRevenue: number
  maintenanceCount: number
  maintenanceCost: number
  damageCount: number
  customerCharges: number
  collectedDamageCharges: number
  usageMinutes: number
  status: string
}
export interface ReportLateDTO {
  id: number
  rentalId: number
  rentalCode: string
  customerName: string | null
  skateCode: string | null
  cashierName: string | null
  startTime: string
  endTime: string | null
  actualReturnTime: string | null
  lateMinutes: number
  lateFee: number
  collectedFee: number
  waivedFee: number
  pendingFee: number
}
export interface ReportDamageDTO {
  id: number
  skateCode: string | null
  customerName: string | null
  damageType: string
  severity: string
  chargeAmount: number
  chargeCollected: number
  chargeWaived: number
  outstandingCharge: number
  repairCost: number
  status: string
  reportedAt: string
}
export interface ReportMaintenanceDTO {
  id: number
  skateCode: string | null
  problemType: string | null
  status: string
  paymentStatus: string
  repairCost: number
  createdAt: string
  startedAt: string | null
  completedAt: string | null
  elapsedMinutes: number | null
}
export interface ReportCustomerDTO {
  id: number
  name: string
  rentalsCount: number
  totalSpent: number
  lateReturns: number
  damages: number
}
export interface ReportCashierDTO {
  id: number
  name: string
  rentalsCount: number
  revenue: number
  lateFees: number
  waivedFees: number
  expenses: number
  shiftDifference: number | null
}

