export interface OpenShiftInput {
  openingBalance: number | string
  operationKey?: string
}

export interface CloseShiftInput {
  actualBalance: number | string
  declaredAmount?: number | string
  reason?: string
  operationKey?: string
  closedAt?: string // Optional explicit end time
}

export interface ShiftDTO {
  id: number
  cashierId: number
  cashierName?: string
  openedAt: string
  closedAt: string | null
  openingBalance: number
  expectedBalance: number | null
  actualBalance: number | null
  difference: number | null
  status: 'active' | 'closed'
  treasuryAccountId?: number | null
  expectedLedgerBalance?: string | null
  openingLedgerBalance?: string | null
  declaredAmount?: string | null
  businessDate?: string | null
  handoverId?: number
}
