import api from '../../services/api'

export type ReservationStatus = 'pending' | 'confirmed' | 'cancelled' | 'fulfilled'

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

export interface Reservation {
  id: number
  rentalId: number | null
  customer: ReservationCustomerInfo
  skate: ReservationSkateInfo
  skateSize: string | null
  reservedFrom: string
  reservedUntil: string
  status: ReservationStatus
  createdBy: ReservationUserInfo
  notes: string | null
  createdAt: string
  updatedAt: string
}

export interface PaginatedReservations {
  data: Reservation[]
  pagination: {
    page: number
    perPage: number
    total: number
    totalPages: number
  }
}

export interface CreateReservationRequest {
  customerId: number
  skateId: number
  reservedFrom: string
  reservedUntil: string
  notes?: string
}

export interface UpdateReservationRequest {
  skateId?: number
  reservedFrom?: string
  reservedUntil?: string
  notes?: string
}

export interface ListReservationsQuery {
  page?: number
  perPage?: number
  status?: ReservationStatus | 'active'
  customerId?: number
  skateId?: number
  from?: string
  to?: string
}

export const reservationsService = {
  async getReservations(query?: ListReservationsQuery): Promise<PaginatedReservations> {
    const params = new URLSearchParams()
    if (query?.page) params.append('page', query.page.toString())
    if (query?.perPage) params.append('perPage', query.perPage.toString())
    if (query?.status) params.append('status', query.status)
    if (query?.customerId) params.append('customerId', query.customerId.toString())
    if (query?.skateId) params.append('skateId', query.skateId.toString())
    if (query?.from) params.append('from', query.from)
    if (query?.to) params.append('to', query.to)

    const response = await api.get<PaginatedReservations>(
      `/api/v1/reservations?${params.toString()}`
    )
    return response
  },

  async getReservation(id: number): Promise<Reservation> {
    const response = await api.get<Reservation>(`/api/v1/reservations/${id}`)
    return response
  },

  async createReservation(data: CreateReservationRequest): Promise<Reservation> {
    const response = await api.post<Reservation>('/api/v1/reservations', data)
    return response
  },

  async updateReservation(id: number, data: UpdateReservationRequest): Promise<Reservation> {
    const response = await api.put<Reservation>(`/api/v1/reservations/${id}`, data)
    return response
  },

  async cancelReservation(id: number): Promise<Reservation> {
    const response = await api.post<Reservation>(`/api/v1/reservations/${id}/cancel`)
    return response
  },
}
