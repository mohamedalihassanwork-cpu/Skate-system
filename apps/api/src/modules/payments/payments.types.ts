/**
 * KOSHK SKATE ERP — Payments Types
 * Phase 06 — Payments & Treasury
 */

export interface PaymentMethodDTO {
  id: number
  name: string
  nameAr: string
  isActive: boolean
  treasuryAccountId: number
}

export interface TreasuryAccountDTO {
  id: number
  name: string
  nameAr: string
  isActive: boolean
  balance: number
}

/** Exact EGP decimals; no payment-method join or floating-point summation. */
export interface TreasuryBalanceAccountDTO {
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

export interface TreasurySummaryDTO {
  asOf: string
  currency: 'EGP'
  totalBalance: string
  cashBalance: string
  nonCashBalance: string
  hasDiscrepancies: boolean
  accounts: TreasuryBalanceAccountDTO[]
}
