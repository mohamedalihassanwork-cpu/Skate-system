import type { ReservationStatus } from '../../db/schema/reservations.js'

export interface ReservationSkateInfo {
  id: number
  skateCode: string
  size: string
  type: string | null
}

export interface ReservationCustomerInfo {
  id: number
  name: string
  phone: string
  nationalIdMasked: string
}

export interface ReservationUserInfo {
  id: number
  name: string
}

export interface ReservationDTO {
  id: number
  rentalId: number | null // reverse lookup of rentals.reservation_id; never a second stored link
  customer: ReservationCustomerInfo
  skate: ReservationSkateInfo
  skateSize: string | null // Kept for schema compatibility, though skateId is required in Phase 10
  reservedFrom: string // ISO date
  reservedUntil: string // ISO date
  status: ReservationStatus
  createdBy: ReservationUserInfo
  notes: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateReservationRequest {
  customerId: number
  skateId: number
  reservedFrom: string // ISO date
  reservedUntil: string // ISO date
  notes?: string
}

export interface UpdateReservationRequest {
  skateId?: number
  reservedFrom?: string // ISO date
  reservedUntil?: string // ISO date
  notes?: string
}

export interface ListReservationsQuery {
  page?: string
  perPage?: string
  status?: ReservationStatus | 'active' // 'active' for pending + confirmed
  customerId?: string
  skateId?: string
  from?: string
  to?: string
}

export interface PaginatedReservations {
  data: ReservationDTO[]
  pagination: {
    page: number
    perPage: number
    total: number
    totalPages: number
  }
}
