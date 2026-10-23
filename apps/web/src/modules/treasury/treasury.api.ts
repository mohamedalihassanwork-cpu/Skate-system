import { api, type ApiResponse } from '../../services/api'

export interface Shift {
  id: number
  cashierId: number
  openedAt: string
  closedAt: string | null
  openingBalance: number
  expectedBalance: number | null
  actualBalance: number | null
  difference: number | null
  status: 'active' | 'closed'
}

export interface Expense {
  id: number
  amount: number
  description: string
  categoryId?: number
  cashierId: number
  shiftId: number
  createdAt: string
}

export interface TreasuryBalanceAccount {
  id: number
  name: string
  nameAr: string
  isActive: boolean
  isCashDrawer: boolean
  balance: string
  storedBalance: string
  difference: string
  movementCount: number
}

export interface TreasurySummary {
  asOf: string
  currency: 'EGP'
  totalBalance: string
  cashBalance: string
  nonCashBalance: string
  hasDiscrepancies: boolean
  accounts: TreasuryBalanceAccount[]
}

export const treasuryApi = {
  getSummary: () => api.get<ApiResponse<TreasurySummary>>('/api/v1/payments/treasury-summary'),
  getCurrentShift: () => api.get<Shift | null>('/api/v1/shifts/current'),
  openShift: (data: { openingBalance: number }) => api.post<ApiResponse<Shift>>('/api/v1/shifts/open', data),
  closeShift: (id: number, data: { actualBalance: number; closedAt?: string }) => api.post<ApiResponse<Shift>>(`/api/v1/shifts/${id}/close`, data),
  
  getExpenses: () => api.get<ApiResponse<Expense[]>>('/api/v1/expenses'),
  recordExpense: (data: { amount: number; description: string; categoryId?: number; operationKey?: string }) => api.post<ApiResponse<Expense>>('/api/v1/expenses', data),
  getPaymentMethods: () => api.get<ApiResponse<any[]>>('/api/v1/payments/methods'),
}

export interface HandoverSummary {
  pendingCount: number; pendingDeclaredAmount: string; rejectedCount: number; rejectedDeclaredAmount: string
  completedCount: number; receivedAmount: string; zeroAcknowledgedCount: number; adjustmentAmount: string
}
export interface TreasuryConfig { enabled: boolean; mainAccountId: number | null }
export interface ManagedAccount extends TreasuryBalanceAccount {
  accountRole: string; cashierId: number | null; cashierName: string | null
}
export interface ManagedShift {
  id: number; cashierId: number; status: 'active' | 'closed'; openedAt: string; businessDate: string
  openingBalance: string; openingLedgerBalance: string; openingDifference: string
  expectedBalance: string; expectedLedgerBalance: string
}
export interface Funding {
  id: number; cashierId: number; cashierName: string; amount: string
  status: 'pending' | 'accepted' | 'cancelled'; reason: string; createdBy: number; createdAt: string; acceptedAt?: string
}
export interface Handover {
  id: number; closingId: number; shiftId: number; cashierId: number; cashierName: string; accountId: number
  expectedBalance: string; expectedLedgerBalance: string; actualBalance: string; declaredAmount: string
  difference: string; settlementDifference: string; reason: string; createdAt: string
  status: 'pending' | 'confirmed' | 'rejected' | 'zero_acknowledged'
  reviewedBy?: number | null; reviewedAt?: string | null; reviewReason?: string | null
  confirmedBy: number | null; confirmedAt: string | null; receivedAmount: string | null
}
export interface TreasuryMovement extends Record<string, unknown> {
  id: number; type: 'in' | 'out'; amount: string; referenceType: string; referenceId: number | null
  shiftId: number | null; cashierName: string | null; createdAt: string
}
export interface Paged<T> { data: T[]; meta: { total: number; page: number; limit: number; totalPages: number } }
export interface OwnTreasury {
  enabled: boolean; assignment: { id: number; accountId: number; cashierId: number; isActive: boolean } | null
  account: ManagedAccount | null; shift: ManagedShift | null; currentBalance: string
  expectedBalance: string | null; expectedLedgerBalance: string | null; funding: Funding[]; handovers: Handover[]
}
export interface SetupOptions {
  accounts: Pick<ManagedAccount, 'id' | 'nameAr' | 'isCashDrawer' | 'isActive' | 'accountRole'>[]
  cashiers: { id: number; name: string }[]
}
export interface HandoverDetail {
  handover: Handover; closing: ManagedShift; attempts: Handover[]; movements: TreasuryMovement[]
  settlement: { id?: number; adjustmentAmount?: string; receivedAmount?: string; confirmedBy?: number; confirmedAt?: string } | null
}
const base = '/api/v1/treasury'
export const subTreasuryApi = {
  config: () => api.get<TreasuryConfig>(base + '/config'),
  own: () => api.get<OwnTreasury>(base + '/me'),
  accounts: () => api.get<ManagedAccount[]>(base + '/accounts'),
  funding: () => api.get<Funding[]>(base + '/funding'),
  setup: () => api.get<SetupOptions>(base + '/setup-options'),
  createAccount: (body: { name: string; nameAr: string; isCashDrawer: boolean; operationKey: string }) => api.post(base + '/accounts', body),
  assign: (body: { cashierId: number; accountId: number; operationKey: string }) => api.post(base + '/assignments', body),
  activate: (body: { mainAccountId: number; operationKey: string }) => api.post(base + '/activate', body),
  authorizeFunding: (body: { cashierId: number; amount: string; reason: string; operationKey: string }) => api.post(base + '/funding', body),
  fundingAction: (id: number, action: 'accept' | 'cancel', body: { operationKey: string; reason?: string }) => api.post(base + '/funding/' + id + '/' + action, body),
  open: (body: { openingBalance: string; operationKey: string }) => api.post('/api/v1/shifts/open', body),
  close: (id: number, body: { actualBalance: string; declaredAmount: string; reason: string; operationKey: string }) => api.post('/api/v1/shifts/' + id + '/close', body),
  summary: () => api.get<HandoverSummary>(base + '/summary'),
  handovers: (status = '', page = 1) => api.get<Paged<Handover>>(base + '/handovers?page=' + page + '&limit=20' + (status ? '&status=' + encodeURIComponent(status) : '')),
  handover: (id: number) => api.get<HandoverDetail>(base + '/handovers/' + id),
  confirm: (id: number, body: { receivedAmount: string; approveVariance: boolean; reason: string; operationKey: string }) => api.post(base + '/handovers/' + id + '/confirm', body),
  reject: (id: number, body: { reason: string; operationKey: string }) => api.post(base + '/handovers/' + id + '/reject', body),
  replace: (id: number, body: { declaredAmount: string; reason: string; operationKey: string }) => api.post(base + '/handovers/' + id + '/replace', body),
  movements: (id: number, page = 1) => api.get<Paged<TreasuryMovement>>(base + '/accounts/' + id + '/movements?page=' + page + '&limit=20'),
}
