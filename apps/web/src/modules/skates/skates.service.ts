/**
 * KOSHK SKATE ERP — Skates Service (Frontend)
 * Phase 03 — Skates / Asset Management
 *
 * Types match the backend SkateDTO exactly.
 * DEC-030: skateCode is optional on create (auto-generated if omitted)
 * DEC-031: status rented/reserved cannot be set via admin API
 * DEC-032: qrCode and barcode default to skateCode; user-editable
 * DEC-033: type is free-text — no enum constraint on frontend
 */

import api from '../../services/api'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SkateStatus = 'available' | 'rented' | 'reserved' | 'maintenance' | 'damaged' | 'lost'
export type SkateCondition = 'good' | 'fair' | 'poor'

export interface SkateDTO {
  id: number
  skateCode: string
  qrCode: string | null
  barcode: string | null
  size: string
  type: string | null
  status: SkateStatus
  condition: SkateCondition
  purchaseDate: string | null
  purchaseCost: string | null
  notes: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateSkateRequest {
  skateCode?: string
  size: string
  type?: string
  status?: SkateStatus
  condition?: SkateCondition
  purchaseDate?: string
  purchaseCost?: number
  notes?: string
}

export interface UpdateSkateRequest {
  size?: string
  type?: string | null
  status?: SkateStatus
  condition?: SkateCondition
  purchaseDate?: string | null
  purchaseCost?: number | null
  notes?: string | null
  isActive?: boolean
  qrCode?: string | null
  barcode?: string | null
}

export interface PaginatedSkates {
  data: SkateDTO[]
  pagination: {
    page: number
    perPage: number
    total: number
    totalPages: number
  }
}

// ---------------------------------------------------------------------------
// Status display labels (Arabic) — DEC-031
// ---------------------------------------------------------------------------

export const STATUS_LABELS: Record<SkateStatus, string> = {
  available:   'متاح',
  rented:      'مستأجر',
  reserved:    'محجوز',
  maintenance: 'صيانة',
  damaged:     'تالف',
  lost:        'مفقود',
}

// DEC-031: statuses admin can directly set
export const ADMIN_SETTABLE_STATUSES: SkateStatus[] = [
  'available',
  'maintenance',
  'damaged',
  'lost',
]

export const CONDITION_LABELS: Record<SkateCondition, string> = {
  good: 'جيدة',
  fair: 'مقبولة',
  poor: 'سيئة',
}

// ---------------------------------------------------------------------------
// Status badge colors — Visual Design Reference §13
// ---------------------------------------------------------------------------

export const STATUS_COLORS: Record<SkateStatus, { bg: string; text: string }> = {
  available:   { bg: '#DDF6EA', text: '#159A69' },
  rented:      { bg: '#FCE0E1', text: '#D83C40' },
  reserved:    { bg: '#FFF1C9', text: '#C88B00' },
  maintenance: { bg: '#EEF1F5', text: '#657084' },
  damaged:     { bg: '#FFF1C9', text: '#C88B00' },
  lost:        { bg: '#EEF1F5', text: '#657084' },
}

// ---------------------------------------------------------------------------
// API service
// ---------------------------------------------------------------------------

export const skatesService = {
  list: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : ''
    return api
      .get<{ success: boolean; data: SkateDTO[]; pagination: PaginatedSkates['pagination'] }>(
        `/api/v1/skates${qs}`,
      )
  },

  get: (id: number) =>
    api.get<{ success: boolean; data: SkateDTO }>(`/api/v1/skates/${id}`).then(r => r.data),

  create: (body: CreateSkateRequest) =>
    api.post<{ success: boolean; data: SkateDTO }>('/api/v1/skates', body).then(r => r.data),

  update: (id: number, body: UpdateSkateRequest) =>
    api.put<{ success: boolean; data: SkateDTO }>(`/api/v1/skates/${id}`, body).then(r => r.data),

  available: () =>
    api.get<{ success: boolean; data: SkateDTO[] }>('/api/v1/skates/available').then(r => r.data),
}
