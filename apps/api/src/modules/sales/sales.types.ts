/**
 * KOSHK SKATE ERP — Sales Types
 * Phase 11 — Sales POS
 */

export interface SalePaymentInput {
  paymentMethodId: number
  amount: number
  treasuryAccountId: number
}

export interface SaleItemInput {
  productId: number
  quantity: number
}

export interface CreateSaleDTO {
  operationKey?: string
  customerId?: number | null
  cashierId: number
  shiftId?: number | null
  items: SaleItemInput[]
  payments: SalePaymentInput[]
  notes?: string
}

export interface SaleDTO {
  id: number
  saleCode: string
  customerId: number | null
  cashierId: number
  shiftId: number | null
  totalAmount: number
  status: 'completed' | 'cancelled'
  notes: string | null
  createdAt: Date
  items?: SaleItemDTO[]
  payments?: SalePaymentDTO[]
}

export interface SaleItemDTO {
  id: number
  saleId: number
  productId: number
  quantity: number
  unitPrice: number
  totalPrice: number
}

export interface SalePaymentDTO {
  id: number
  saleId: number
  paymentMethodId: number
  amount: number
  treasuryAccountId: number
  createdAt: Date
}
