export interface CreateDamageReportRequest {
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

export interface PayDamageChargeRequest {
  operationKey?: string
  payments: { paymentMethodId: number; amount: number }[]
}

export interface WaiveDamageChargeRequest {
  amount: number
  reason: string
}

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
