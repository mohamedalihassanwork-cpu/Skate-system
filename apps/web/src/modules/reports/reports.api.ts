import api from '../../services/api'
import type { ApiResponse } from '../../services/api'

export interface DateRange {
  startDate: string // YYYY-MM-DD
  endDate: string   // YYYY-MM-DD
}

export interface PaginatedParams extends DateRange {
  page: number
  limit: number
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

export interface PaginatedResult<T> {
  data: T[]
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
  summary: Record<string, number | null>
  byType?: { type: string; count: number; chargeAmount: number; repairCost: number }[]
  byCashier?: { name: string; calculatedFees: number; collectedFees: number; waivedFees: number; pendingFees: number }[]
}

export interface OverviewData {
  totalRevenue: number
  totalExpenses: number
  totalRentals: number
  activeRentals: number
  lateRentals: number
  totalDamages: number
  activeMaintenance: number
}

export interface FinancialData {
  rentalRevenue: number
  lateFees: number
  damageCharges: number
  salesRevenue: number
  refunds: number
  grossRevenue: number
  totalRevenue: number
  totalExpenses: number
  operatingResult: number
  revenueByCategory: { type: string; total: number }[]
  expensesByCategory: { category: string; total: number }[]
}

export interface TimelineData {
  totalRevenue?: number
  totalExpenses?: number
  chartData: { date: string; value: number }[]
  byCategory: { type?: string; category?: string; total: number }[]
  byUser?: { name: string; total: number }[]
  byAccount?: { name: string; total: number }[]
}

function qs(params: any) {
  const q = new URLSearchParams()
  for (const k in params) {
    if (params[k] !== undefined && params[k] !== null) {
      q.append(k, String(params[k]))
    }
  }
  return `?${q.toString()}`
}

export const reportsApi = {
  getOverview: (params: DateRange) => 
    api.get<ApiResponse<OverviewData>>(`/api/v1/reports/overview${qs(params)}`),
    
  getOperatingFinancial: (params: DateRange) => 
    api.get<ApiResponse<FinancialData>>(`/api/v1/reports/operating-financial${qs(params)}`),
    
  getRevenue: (params: DateRange) => 
    api.get<ApiResponse<TimelineData>>(`/api/v1/reports/revenue${qs(params)}`),
    
  getRentals: (params: PaginatedParams) => 
    api.get<ApiResponse<PaginatedResult<any>>>(`/api/v1/reports/rentals${qs(params)}`),
    
  getLate: (params: PaginatedParams) => 
    api.get<ApiResponse<PaginatedResult<any>>>(`/api/v1/reports/late${qs(params)}`),
    
  getDamage: (params: PaginatedParams) => 
    api.get<ApiResponse<PaginatedResult<any>>>(`/api/v1/reports/damages${qs(params)}`),
    
  getMaintenance: (params: PaginatedParams) => 
    api.get<ApiResponse<PaginatedResult<any>>>(`/api/v1/reports/maintenance${qs(params)}`),
    
  getExpenses: (params: DateRange) => 
    api.get<ApiResponse<TimelineData>>(`/api/v1/reports/expenses${qs(params)}`),
    
  getCustomers: (params: PaginatedParams) => 
    api.get<ApiResponse<PaginatedResult<any>>>(`/api/v1/reports/customers${qs(params)}`),
    
  getCashiers: (params: PaginatedParams) => 
    api.get<ApiResponse<PaginatedResult<any>>>(`/api/v1/reports/cashiers${qs(params)}`),
    
  getSkates: (params: PaginatedParams) => 
    api.get<ApiResponse<PaginatedResult<any>>>(`/api/v1/reports/skate-performance${qs(params)}`),
}
