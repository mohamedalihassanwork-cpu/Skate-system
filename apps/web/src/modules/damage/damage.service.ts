import api from '../../services/api'

export interface DamageReportDTO {
  id: number
  skateId: number
  rentalId: number
  inspectionId: number
  customerId: number
  reportedBy: number
  damageType: string
  severity: string
  description: string
  customerCharge: number
  chargeCollected: number
  chargeWaived: number
  status: 'pending' | 'partially_paid' | 'paid' | 'waived'
  maintenanceRequired: boolean
  createdAt: string
  skateCode?: string
  customerName?: string
  customerNationalId?: string
  reporterName?: string
}

export interface CreateDamageReportPayload {
  rentalId: number
  inspectionId: number
  skateId: number
  customerId: number
  damageType: 'wheel' | 'strap' | 'brake' | 'bearing' | 'body' | 'other'
  severity: 'minor' | 'moderate' | 'severe'
  description: string
  customerCharge: number
  maintenanceRequired: boolean
}

export interface PayDamageChargePayload {
  operationKey?: string
  payments: { paymentMethodId: number; amount: number }[]
}

export interface WaiveDamageChargePayload {
  amount: number
  reason: string
}

export const damageService = {
  list: (params?: Record<string, string | number>) => {
    const qs = params ? '?' + new URLSearchParams(params as any).toString() : ''
    return api.get<{ success: boolean; data: DamageReportDTO[]; pagination: any }>(`/api/v1/damages${qs}`)
  },

  get: (id: number) =>
    api.get<{ success: boolean; data: DamageReportDTO }>(`/api/v1/damages/${id}`),

  create: (body: CreateDamageReportPayload) =>
    api.post<{ success: boolean; data: DamageReportDTO }>('/api/v1/damages', body),

  pay: (id: number, body: PayDamageChargePayload) =>
    api.post<{ success: boolean; data: DamageReportDTO }>(`/api/v1/damages/${id}/pay`, body),

  waive: (id: number, body: WaiveDamageChargePayload) =>
    api.post<{ success: boolean; data: DamageReportDTO }>(`/api/v1/damages/${id}/waive`, body),
}
