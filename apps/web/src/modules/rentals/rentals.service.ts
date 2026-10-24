/**
 * KOSHK SKATE ERP — Rentals Service (Frontend)
 * Phase 06 Redesign — Multi-Skate Rentals
 *
 * API client for the redesigned rental domain.
 *
 * Key changes from Phase 05:
 *   - startRental: accepts skateIds[] (multiple), NO payments at creation
 *   - returnRentalItem: item-level return (partial return support)
 *   - extendRentalItem: per-item extension
 *   - finalizeRental: final payment after all items returned
 *   - Billing is based on ACTUAL duration (server-computed at return)
 *   - Server time is authoritative — no browser Date.now() for billing
 */

import api from '../../services/api'

// ---------------------------------------------------------------------------
// Status types
// ---------------------------------------------------------------------------

export type RentalStatus = 'active' | 'completed' | 'cancelled' | 'returned'
export type RentalOperationalStatus = 'normal' | 'ending_soon' | 'overdue'
export type RentalItemStatus = 'active' | 'returned' | 'cancelled'

// ---------------------------------------------------------------------------
// Embedded info types
// ---------------------------------------------------------------------------

export interface RentalSkateInfo {
  id:        number
  skateCode: string
  size:      string
  type:      string | null
}

export interface RentalCustomerInfo {
  id:               number
  name:             string
  phone:            string
  nationalIdMasked: string
}

export interface RentalCashierInfo {
  id:   number
  name: string
}

// ---------------------------------------------------------------------------
// RentalItemDTO — one per-skate lifecycle unit
// ---------------------------------------------------------------------------

export interface RentalItemDTO {
  id:                      number
  rentalId:                number
  skate:                   RentalSkateInfo
  startedAt:               string
  expectedDurationMinutes: number
  expectedEndAt:           string
  returnedAt:              string | null
  actualDurationMinutes:   number | null
  actualAmount:            number | null
  pricePerHour:            number
  inspectionId:            number | null
  status:                  RentalItemStatus
  // Existing server-computed billing fields used by the finalization view.
  lateMinutes:             number | null
  lateFeeCollected:        number | null
  // Server-computed for active items
  operationalStatus?:      RentalOperationalStatus
  remainingMinutes?:       number
}

// ---------------------------------------------------------------------------
// RentalDTO — full Rental with items
// ---------------------------------------------------------------------------

export interface RentalDTO {
  id:            number
  rentalCode:    string
  reservationId: number | null
  invoiceNumber: string | null
  customer:      RentalCustomerInfo
  cashier:       RentalCashierInfo
  shiftId:       number | null
  items:         RentalItemDTO[]
  totalAmount:   number | null
  startedAt:     string
  completedAt:   string | null
  status:        RentalStatus
  notes:         string | null
  createdAt:     string
  updatedAt:     string
  [key: string]: unknown
}

export interface ActiveRentalDTO extends RentalDTO {
  hasOverdueItems:    boolean
  hasEndingSoonItems: boolean
}

// ---------------------------------------------------------------------------
// Request bodies
// ---------------------------------------------------------------------------

export interface StartRentalBody {
  skateIds:        number[]   // 1..N, all must be available
  customerId:      number
  durationMinutes?: number   // required for walk-ins; derived by server for reservations
  notes?:          string
  reservationId?:  number
}

export interface ReturnRentalItemBody {
  inspection: {
    wheelsCondition:    'good' | 'minor_damage' | 'damaged' | 'broken'
    brakeCondition:     'good' | 'minor_damage' | 'damaged' | 'broken'
    strapCondition:     'good' | 'minor_damage' | 'damaged' | 'broken'
    bearingsCondition:  'good' | 'minor_damage' | 'damaged' | 'broken'
    bodyCondition:      'good' | 'minor_damage' | 'damaged' | 'broken'
    maintenanceRequired: boolean
    otherNotes?:        string
  }
}

export interface ExtendRentalItemBody {
  extendByMinutes: number
}

export interface FinalizeRentalBody {
  payments: { paymentMethodId: number; amount: number }[]
}

// Legacy: kept for backward compat
export interface ReturnRentalBody extends ReturnRentalItemBody {}

// ---------------------------------------------------------------------------
// Response types
// ---------------------------------------------------------------------------

export interface PaginationMeta {
  page:       number
  perPage:    number
  total:      number
  totalPages: number
}

export interface ReturnItemResult {
  item:           RentalItemDTO
  rental:         RentalDTO
  lastInspectionId: number
  isLastItem:     boolean
}

export interface PricePreviewDTO {
  durationMinutes: number
  pricePerHour:    number
  rentalAmount:    number
}

export interface CustomerRentalHistoryItem {
  id:            number
  rentalCode:    string
  items:         RentalItemDTO[]
  totalAmount:   number | null
  startedAt:     string
  completedAt:   string | null
  status:        RentalStatus
  [key: string]: unknown
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildQuery(params: Record<string, string | number | undefined>): string {
  const qs = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') qs.set(k, String(v))
  }
  const str = qs.toString()
  return str ? `?${str}` : ''
}

// ---------------------------------------------------------------------------
// Status label helpers
// ---------------------------------------------------------------------------

export function getRentalStatusLabel(status: RentalStatus): string {
  switch (status) {
    case 'active':    return 'نشط'
    case 'completed': return 'مكتمل'
    case 'returned':  return 'مُعاد'   // legacy
    case 'cancelled': return 'ملغي'
  }
}

export function getOperationalStatusLabel(status: RentalOperationalStatus): string {
  switch (status) {
    case 'normal':      return 'عادي'
    case 'ending_soon': return 'ينتهي قريباً'
    case 'overdue':     return 'متأخر'
  }
}

export function operationalStatusToBadge(status: RentalOperationalStatus): 'active' | 'overdue' | 'rented' {
  switch (status) {
    case 'normal':      return 'active'
    case 'ending_soon': return 'rented'
    case 'overdue':     return 'overdue'
  }
}

export function lifetimeStatusToBadge(status: RentalStatus): 'active' | 'completed' | 'cancelled' {
  switch (status) {
    case 'active':    return 'active'
    case 'completed': return 'completed'
    case 'returned':  return 'completed'  // legacy
    case 'cancelled': return 'cancelled'
  }
}

export function getItemStatusLabel(status: RentalItemStatus): string {
  switch (status) {
    case 'active':    return 'نشط'
    case 'returned':  return 'مُعاد'
    case 'cancelled': return 'ملغي'
  }
}

// ---------------------------------------------------------------------------
// Rental service
// ---------------------------------------------------------------------------

export const rentalsService = {
  /**
   * POST /api/v1/rentals — start multi-skate rental (NO payment at creation)
   */
  create: (body: StartRentalBody) =>
    api.post<{ success: boolean; data: RentalDTO }>('/api/v1/rentals', body),

  /**
   * GET /api/v1/rentals/active — active rentals with per-item operational status
   */
  getActive: () =>
    api.get<{ success: boolean; data: ActiveRentalDTO[] }>('/api/v1/rentals/active'),

  /**
   * GET /api/v1/rentals/calculate-price — price preview (server-authoritative)
   */
  calculatePrice: (durationMinutes: number) =>
    api.get<{ success: boolean; data: PricePreviewDTO }>(
      `/api/v1/rentals/calculate-price?durationMinutes=${durationMinutes}`,
    ),

  /**
   * GET /api/v1/rentals/config — rental POS configuration (rate, durations, grace)
   */
  getConfig: () =>
    api.get<{ success: boolean; data: { pricePerHour: number; durationOptions: number[]; gracePeriodMinutes: number } }>(
      '/api/v1/rentals/config',
    ),

  /**
   * GET /api/v1/rentals — paginated list with filters
   */
  list: (params?: { page?: number; perPage?: number; status?: string; customerId?: number }) =>
    api.get<{ success: boolean; data: RentalDTO[]; pagination: PaginationMeta }>(
      `/api/v1/rentals${buildQuery(params ?? {})}`,
    ),

  /**
   * GET /api/v1/rentals/:id — single rental with all items
   */
  get: (id: number) =>
    api.get<{ success: boolean; data: RentalDTO }>(`/api/v1/rentals/${id}`),

  /**
   * POST /api/v1/rentals/:id/cancel — cancel active rental
   */
  cancel: (id: number) =>
    api.post<{ success: boolean; data: RentalDTO }>(`/api/v1/rentals/${id}/cancel`, {}),

  /**
   * POST /api/v1/rentals/:id/finalize — collect final payment after all items returned
   */
  finalize: (id: number, body: FinalizeRentalBody) =>
    api.post<{ success: boolean; data: RentalDTO }>(`/api/v1/rentals/${id}/finalize`, body),

  /**
   * GET /api/v1/customers/:id/rentals — customer rental history
   */
  getCustomerRentals: (customerId: number, params?: { page?: number; perPage?: number }) =>
    api.get<{ success: boolean; data: CustomerRentalHistoryItem[]; pagination: PaginationMeta }>(
      `/api/v1/customers/${customerId}/rentals${buildQuery(params ?? {})}`,
    ),

  /**
   * Legacy: POST /api/v1/rentals/:id/return — single-skate return (compat)
   * Use rentalItemsService.return() for the new per-item flow.
   */
  return: (id: number, body: ReturnRentalBody) =>
    api.post<{ success: boolean; data: RentalDTO & { lastInspectionId: number } }>(
      `/api/v1/rentals/${id}/return`,
      body,
    ),
}

// ---------------------------------------------------------------------------
// Rental Items service — per-skate operations
// ---------------------------------------------------------------------------

export const rentalItemsService = {
  /**
   * GET /api/v1/rental-items/:id — single item detail
   */
  get: (itemId: number) =>
    api.get<{ success: boolean; data: RentalItemDTO }>(`/api/v1/rental-items/${itemId}`),

  /**
   * POST /api/v1/rental-items/:id/return — return a single item (partial return)
   * Server captures returned_at IMMEDIATELY — billing is frozen server-side.
   */
  return: (itemId: number, body: ReturnRentalItemBody) =>
    api.post<{ success: boolean; data: ReturnItemResult }>(
      `/api/v1/rental-items/${itemId}/return`,
      body,
    ),

  /**
   * POST /api/v1/rental-items/:id/extend — extend a single item's expected duration
   * Does NOT change billing — billing uses actual_duration_minutes at return.
   */
  extend: (itemId: number, body: ExtendRentalItemBody) =>
    api.post<{ success: boolean; data: RentalItemDTO }>(
      `/api/v1/rental-items/${itemId}/extend`,
      body,
    ),
}
