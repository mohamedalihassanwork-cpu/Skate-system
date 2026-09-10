/**
 * KOSHK SKATE ERP — Skates Types
 * Phase 03 — Skates / Asset Management
 */

import type { SkateStatus, SkateCondition } from '../../db/schema/skates.js'

// ---------------------------------------------------------------------------
// DTO — shape returned to the client
// ---------------------------------------------------------------------------

export interface SkateDTO {
  id: number
  skateCode: string
  qrCode: string | null
  barcode: string | null
  size: string
  type: string | null
  status: SkateStatus
  condition: SkateCondition
  purchaseDate: string | null    // ISO date string YYYY-MM-DD
  purchaseCost: string | null    // Decimal returned as string from MySQL
  notes: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

// ---------------------------------------------------------------------------
// Request bodies
// ---------------------------------------------------------------------------

export interface CreateSkateRequest {
  skateCode?: string             // DEC-030: optional — auto-generated if omitted
  size: string
  type?: string                  // DEC-033: free-text, optional
  status?: SkateStatus           // defaults to 'available'
  condition?: SkateCondition     // defaults to 'good'
  purchaseDate?: string          // YYYY-MM-DD
  purchaseCost?: number
  notes?: string
  // qr_code and barcode are NOT in the create request body:
  // they are auto-set to skate_code at creation (DEC-032)
}

export interface UpdateSkateRequest {
  size?: string
  type?: string
  status?: SkateStatus
  condition?: SkateCondition
  purchaseDate?: string | null
  purchaseCost?: number | null
  notes?: string | null
  isActive?: boolean
  // DEC-032: user may edit qr_code and barcode after creation
  qrCode?: string | null
  barcode?: string | null
}

// ---------------------------------------------------------------------------
// List query filters
// ---------------------------------------------------------------------------

export interface ListSkatesQuery {
  status?: SkateStatus
  size?: string
  isActive?: string             // '0' | '1' | undefined (default: active only)
  page?: string
  perPage?: string
  sortBy?: string
  sortDir?: 'asc' | 'desc'
}

// ---------------------------------------------------------------------------
// Paginated list response wrapper
// ---------------------------------------------------------------------------

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
// History stub — populated in future phases
// ---------------------------------------------------------------------------

export interface SkateHistoryDTO {
  skate: SkateDTO
  rentals: unknown[]           // Phase 05
  inspections: unknown[]       // Phase 07
  damageReports: unknown[]     // Phase 08
  maintenanceRecords: unknown[] // Phase 09
}
