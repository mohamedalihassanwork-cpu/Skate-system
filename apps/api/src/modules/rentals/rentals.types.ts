/**
 * KOSHK SKATE ERP — Rentals Types
 * Phase 06 Redesign — Multi-Skate Rentals
 *
 * Domain model:
 *   Rental (commercial transaction container)
 *     └─ Rental Items (per-skate billing units)
 *
 * Key design decisions (owner-approved):
 *   - DEC-062: rental_code format RN-NNNNN
 *   - DEC-064: persisted statuses: active | completed | cancelled | returned (legacy)
 *              computed operational statuses: normal | ending_soon | overdue (per item)
 *   - DEC-065: price_per_hour snapshot at item creation — immutable
 *   - DEC-067: amounts rounded to nearest whole EGP
 *   - §8:  Billing based on ACTUAL duration at return time
 *   - §11: returned_at captured IMMEDIATELY on return initiation (server-authoritative)
 *   - §7:  No payment at rental start; payment only after all items returned
 *   - §14: Extensions are per rental item; each extension audited
 */

import type { RentalStatus, RentalOperationalStatus } from '../../db/schema/rentals.js'

// ---------------------------------------------------------------------------
// Embedded sub-objects
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
  nationalIdMasked: string  // DEC-056: masked
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
  startedAt:               string   // ISO datetime — server-authoritative
  expectedDurationMinutes: number
  expectedEndAt:           string   // ISO datetime
  returnedAt:              string | null  // frozen immediately on return (§11)
  actualDurationMinutes:   number | null  // computed at return
  actualAmount:            number | null  // computed at return (rental charge only)
  pricePerHour:            number   // snapshot — immutable
  inspectionId:            number | null
  status:                  'active' | 'returned' | 'cancelled'
  // Late fee fields (DEC-004 — per Rental Item)
  lateMinutes:             number | null  // minutes past expectedEndAt
  lateFee:                 number | null  // calculated late fee (before waiver)
  lateFeeWaived:           number | null  // waived amount
  lateFeeCollected:        number | null  // amount actually charged
  lateFeeRecordId:         number | null  // FK to late_fee_records
  // Server-computed display state for active items (never persisted)
  operationalStatus?:      RentalOperationalStatus
  remainingMinutes?:       number
}

// ---------------------------------------------------------------------------
// RentalDTO — full Rental with all items
// ---------------------------------------------------------------------------

export interface RentalDTO {
  id:            number
  rentalCode:    string
  invoiceNumber: string | null   // NULL until finalized
  reservationId: number | null   // durable originating booking; NULL for walk-ins/history
  customer:      RentalCustomerInfo
  cashier:       RentalCashierInfo
  shiftId:       number | null
  items:         RentalItemDTO[]  // all rental items
  totalAmount:   number | null    // NULL until finalized
  startedAt:     string           // rental start time
  completedAt:   string | null    // NULL until payment collected
  status:        RentalStatus
  notes:         string | null
  createdAt:     string
  updatedAt:     string
}

// ---------------------------------------------------------------------------
// ActiveRentalDTO — active rental for the POS Active Rentals view
// Includes item-level operational status
// ---------------------------------------------------------------------------

export interface ActiveRentalDTO extends RentalDTO {
  // Convenience: whether ANY item in the rental is overdue
  hasOverdueItems:     boolean
  hasEndingSoonItems:  boolean
}

// ---------------------------------------------------------------------------
// Request — POST /api/v1/rentals (start rental)
// §6: Select Customer + 1..N Skates + Expected Duration → Start
// §7: NO payment at creation
// ---------------------------------------------------------------------------

export interface StartRentalRequest {
  skateIds:        number[]  // 1..N skate IDs (unique, all must be available)
  customerId:      number    // required integer > 0
  durationMinutes?: number  // required for walk-ins; reservation execution derives the full booked interval
  notes?:          string    // optional, max 1000 chars
  reservationId?:  number    // Phase 10 Atomic Fulfillment (single-skate reservations)
}

// ---------------------------------------------------------------------------
// Request — POST /api/v1/rental-items/:id/return
// §11: return time captured IMMEDIATELY on server receipt
// ---------------------------------------------------------------------------

export interface ReturnRentalItemRequest {
  waivedFee?:    number
  waiverReason?: string
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

// ---------------------------------------------------------------------------
// Request — POST /api/v1/rental-items/:id/extend
// §14: per-item extension; audited; does NOT change billing
// ---------------------------------------------------------------------------

export interface ExtendRentalItemRequest {
  extendByMinutes: number  // must be > 0 integer
}

// ---------------------------------------------------------------------------
// Response — return item result
// ---------------------------------------------------------------------------

export interface ReturnItemResult {
  item:           RentalItemDTO
  rental:         RentalDTO
  lastInspectionId: number
  isLastItem:     boolean   // true if all items now returned → final invoice ready
}

// ---------------------------------------------------------------------------
// Request — POST /api/v1/rentals/:id/finalize
// §15: Final invoice — collect payment for ALL items combined
// Called ONLY after all items returned
// ---------------------------------------------------------------------------

export interface FinalizeRentalRequest {
  payments: { paymentMethodId: number; amount: number }[]  // must sum to totalAmount
}

// ---------------------------------------------------------------------------
// Query filters — GET /api/v1/rentals
// ---------------------------------------------------------------------------

export interface ListRentalsQuery {
  page?:       string
  perPage?:    string
  status?:     string
  customerId?: string
  cashierId?:  string
  from?:       string
  to?:         string
}

// ---------------------------------------------------------------------------
// Price preview — GET /api/v1/rentals/calculate-price
// ---------------------------------------------------------------------------

export interface PricePreviewDTO {
  durationMinutes: number
  pricePerHour:    number
  rentalAmount:    number  // rounded whole EGP (DEC-067)
}

// ---------------------------------------------------------------------------
// Paginated list response
// ---------------------------------------------------------------------------

export interface PaginatedRentals {
  data: RentalDTO[]
  pagination: {
    page:       number
    perPage:    number
    total:      number
    totalPages: number
  }
}

// ---------------------------------------------------------------------------
// Customer rental history — GET /api/v1/customers/:id/rentals
// ---------------------------------------------------------------------------

export interface CustomerRentalHistoryItem {
  id:            number
  rentalCode:    string
  items:         RentalItemDTO[]
  totalAmount:   number | null
  startedAt:     string
  completedAt:   string | null
  status:        RentalStatus
}

export interface PaginatedCustomerRentals {
  data: CustomerRentalHistoryItem[]
  pagination: {
    page:       number
    perPage:    number
    total:      number
    totalPages: number
  }
}

// Re-export for backwards compat (used by other modules)
export type { RentalStatus, RentalOperationalStatus }
