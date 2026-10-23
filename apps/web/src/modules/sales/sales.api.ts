import { api } from '../../services/api'

export interface SalePaymentInput {
  paymentMethodId: number
  amount: number
  treasuryAccountId?: number
}

export interface SaleItemInput {
  productId: number
  quantity: number
}

export interface CreateSaleRequest {
  operationKey?: string
  customerId?: number | null
  items: SaleItemInput[]
  payments: SalePaymentInput[]
  notes?: string
}

export interface Sale {
  id: number
  saleCode: string
  customerId: number | null
  cashierId: number
  shiftId: number | null
  totalAmount: number
  status: 'completed' | 'cancelled'
  notes: string | null
  createdAt: string
  items?: SaleItem[]
  payments?: SalePayment[]
}

export interface SaleItem {
  id: number
  saleId: number
  productId: number
  quantity: number
  unitPrice: number
  totalPrice: number
}

export interface SalePayment {
  id: number
  saleId: number
  paymentMethodId: number
  amount: number
  treasuryAccountId: number
  createdAt: string
}

export const salesApi = {
  getSales: () => api.get<{ success: boolean; data: Sale[] }>('/api/v1/sales'),
  getSale: (id: number) => api.get<{ success: boolean; data: Sale }>(`/api/v1/sales/${id}`),
  createSale: (data: CreateSaleRequest) => api.post<{ success: boolean; data: Sale }>('/api/v1/sales', data),
  cancelSale: (id: number) => api.post<{ success: boolean; data: Sale }>(`/api/v1/sales/${id}/cancel`),
}
