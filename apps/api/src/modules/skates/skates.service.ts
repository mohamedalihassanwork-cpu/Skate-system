/**
 * KOSHK SKATE ERP — Skates Service
 * Phase 03 — Skates / Asset Management
 *
 * Business rules enforced here:
 *   - DEC-030: skate_code optional — auto-generated as SK-NNN if omitted
 *              Generated code never reuses a previously used code (even deactivated skates
 *              permanently hold their code)
 *   - DEC-031: Admin cannot set status = 'rented' or 'reserved' directly
 *              These are controlled by Rental (Phase 05) and Reservation (Phase 10) workflows
 *   - DEC-032: qr_code and barcode auto-set to skate_code at creation; independently editable
 *   - DEC-033: type is free-text; no validation of values in Phase 03
 *   - DEC-009: No hard delete — soft-disable via is_active = false
 *
 * TD-002: DEC-007 (maintenance→available requires completed maintenance record)
 *   is deferred to Phase 09. In Phase 03, admin may set maintenance→available directly.
 *   NOTE: When implementing Phase 09, add maintenance completion check in updateSkate().
 */

import { eq, sql, and, like } from 'drizzle-orm'
import { db } from '../../db/connection.js'
import { skates, WORKFLOW_ONLY_STATUSES } from '../../db/schema/skates.js'
import {
  NotFoundError,
  ConflictError,
  ValidationError,
  BusinessRuleError,
} from '../../utils/errors.js'
import type {
  SkateDTO,
  CreateSkateRequest,
  UpdateSkateRequest,
  ListSkatesQuery,
  PaginatedSkates,
  SkateHistoryDTO,
} from './skates.types.js'
import type { SkateStatus, SkateCondition } from '../../db/schema/skates.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Maps a raw DB row to a clean SkateDTO for the client.
 */
function toDTO(row: typeof skates.$inferSelect): SkateDTO {
  return {
    id:           row.id,
    skateCode:    row.skateCode,
    qrCode:       row.qrCode ?? null,
    barcode:      row.barcode ?? null,
    size:         row.size,
    type:         row.type ?? null,
    status:       row.status,
    condition:    row.condition,
    purchaseDate: row.purchaseDate
      ? (row.purchaseDate instanceof Date
          ? row.purchaseDate.toISOString().split('T')[0]
          : String(row.purchaseDate))
      : null,
    purchaseCost: row.purchaseCost ?? null,
    notes:        row.notes ?? null,
    isActive:     row.isActive,
    createdAt:    row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
    updatedAt:    row.updatedAt instanceof Date ? row.updatedAt.toISOString() : String(row.updatedAt),
  }
}

/**
 * DEC-030: Auto-generate the next unique skate code.
 *
 * Format: SK-NNN (SK- prefix + 3-digit zero-padded sequential number)
 * Examples: SK-001, SK-002, ..., SK-009, SK-010, ..., SK-099, SK-100
 *
 * Algorithm:
 *   1. Find the MAX numeric suffix among ALL existing skate_code values
 *      matching the SK-NNN pattern (including deactivated skates — never reuse).
 *   2. Increment by 1.
 *   3. Format with padStart(3, '0').
 *   4. If no skates exist yet, start at SK-001.
 *
 * The DB UNIQUE constraint is the authoritative safety net for concurrent creation.
 */
async function generateSkateCode(): Promise<string> {
  // Extract the numeric portion from codes matching SK-NNN pattern.
  // Use Drizzle's .select() with sql template to avoid mysql2 raw execute() type issues.
  const result = await db
    .select({
      maxNum: sql<number | null>`MAX(CAST(SUBSTRING(${skates.skateCode}, 4) AS UNSIGNED))`,
    })
    .from(skates)
    .where(sql`${skates.skateCode} REGEXP '^SK-[0-9]{3}$'`)

  const maxNum = result[0]?.maxNum ?? null

  const nextNum = maxNum !== null ? Number(maxNum) + 1 : 1
  return `SK-${String(nextNum).padStart(3, '0')}`
}

// ---------------------------------------------------------------------------
// listSkates
// ---------------------------------------------------------------------------

export async function listSkates(query: ListSkatesQuery): Promise<PaginatedSkates> {
  const page    = Math.max(1, parseInt(query.page    ?? '1',  10))
  const perPage = Math.min(100, Math.max(1, parseInt(query.perPage ?? '20', 10)))
  const offset  = (page - 1) * perPage

  // Build WHERE conditions
  const conditions = []

  // Default: active skates only unless isActive explicitly set to '0'
  if (query.isActive === '0') {
    conditions.push(eq(skates.isActive, false))
  } else if (query.isActive === 'all') {
    // no filter
  } else {
    conditions.push(eq(skates.isActive, true))
  }

  if (query.status) {
    conditions.push(eq(skates.status, query.status as SkateStatus))
  }

  if (query.size) {
    conditions.push(eq(skates.size, query.size))
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined

  // Total count
  const countResult = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(skates)
    .where(whereClause)
  const total = Number(countResult[0]?.count ?? 0)

  // Paginated rows
  const rows = await db
    .select()
    .from(skates)
    .where(whereClause)
    .limit(perPage)
    .offset(offset)
    .orderBy(skates.id)

  return {
    data: rows.map(toDTO),
    pagination: {
      page,
      perPage,
      total,
      totalPages: Math.ceil(total / perPage),
    },
  }
}

// ---------------------------------------------------------------------------
// getSkate
// ---------------------------------------------------------------------------

export async function getSkate(id: number): Promise<SkateDTO> {
  const rows = await db.select().from(skates).where(eq(skates.id, id)).limit(1)
  if (!rows.length) throw new NotFoundError('الزلاجة غير موجودة')
  return toDTO(rows[0])
}

// ---------------------------------------------------------------------------
// getAvailableSkates — used by Rental module (Phase 05)
// ---------------------------------------------------------------------------

export async function getAvailableSkates(): Promise<SkateDTO[]> {
  const rows = await db
    .select()
    .from(skates)
    .where(and(eq(skates.status, 'available'), eq(skates.isActive, true)))
    .orderBy(skates.skateCode)
  return rows.map(toDTO)
}

// ---------------------------------------------------------------------------
// createSkate
// ---------------------------------------------------------------------------

export async function createSkate(body: CreateSkateRequest): Promise<SkateDTO> {
  // Validate required fields
  if (!body.size?.trim()) throw new ValidationError('المقاس مطلوب')

  // Resolve skate code — DEC-030
  let skateCode: string
  if (body.skateCode?.trim()) {
    skateCode = body.skateCode.trim().toUpperCase()
    // Check uniqueness
    const existing = await db.select().from(skates).where(eq(skates.skateCode, skateCode)).limit(1)
    if (existing.length) throw new ConflictError('رمز الزلاجة مستخدم بالفعل')
  } else {
    // Auto-generate — may retry once on the extremely unlikely race condition
    skateCode = await generateSkateCode()
    const existing = await db.select().from(skates).where(eq(skates.skateCode, skateCode)).limit(1)
    if (existing.length) {
      // Race condition — regenerate once more (DB UNIQUE will catch any remaining conflict)
      skateCode = await generateSkateCode()
    }
  }

  // DEC-032: qr_code = skate_code, barcode = skate_code at creation
  const qrCode  = skateCode
  const barcode = skateCode

  const status:    SkateStatus    = body.status    ?? 'available'
  const condition: SkateCondition = body.condition ?? 'good'

  // DEC-031: Admin cannot create a skate with status = rented or reserved
  if (WORKFLOW_ONLY_STATUSES.includes(status)) {
    throw new BusinessRuleError(
      `لا يمكن إنشاء زلاجة بحالة "${status}" — هذه الحالة تُحدَّد بواسطة سير العمل فقط`,
      'SKATE_STATUS_NOT_ALLOWED',
    )
  }

  const [result] = await db.insert(skates).values({
    skateCode,
    qrCode,
    barcode,
    size:         body.size.trim(),
    type:         body.type?.trim() || null,
    status,
    condition,
    purchaseDate: body.purchaseDate ? new Date(body.purchaseDate) : null,
    purchaseCost: body.purchaseCost !== undefined ? String(body.purchaseCost) : null,
    notes:        body.notes?.trim() || null,
    isActive:     true,
  })

  return getSkate((result as any).insertId)
}

// ---------------------------------------------------------------------------
// updateSkate
// ---------------------------------------------------------------------------

export async function updateSkate(id: number, body: UpdateSkateRequest): Promise<SkateDTO> {
  const rows = await db.select().from(skates).where(eq(skates.id, id)).limit(1)
  if (!rows.length) throw new NotFoundError('الزلاجة غير موجودة')

  const updates: Partial<typeof skates.$inferInsert> = {}

  if (body.size !== undefined) {
    if (!body.size.trim()) throw new ValidationError('المقاس لا يمكن أن يكون فارغاً')
    updates.size = body.size.trim()
  }

  if (body.type !== undefined) {
    updates.type = body.type?.trim() || null
  }

  // DEC-031: Admin cannot directly set rented or reserved
  if (body.status !== undefined) {
    if (WORKFLOW_ONLY_STATUSES.includes(body.status)) {
      throw new BusinessRuleError(
        `لا يمكن تعيين حالة "${body.status}" يدوياً — هذه الحالة تُحدَّد بواسطة سير العمل فقط`,
        'SKATE_STATUS_NOT_ALLOWED',
      )
    }
    // TD-002: DEC-007 (maintenance→available requires completed maintenance record)
    // is deferred to Phase 09. No check here yet.
    updates.status = body.status
  }

  if (body.condition !== undefined) {
    updates.condition = body.condition
  }

  if (body.purchaseDate !== undefined) {
    updates.purchaseDate = body.purchaseDate ? new Date(body.purchaseDate) : null
  }

  if (body.purchaseCost !== undefined) {
    updates.purchaseCost = body.purchaseCost !== null ? String(body.purchaseCost) : null
  }

  if (body.notes !== undefined) {
    updates.notes = body.notes ?? null
  }

  if (body.isActive !== undefined) {
    // DEC-009: soft disable — deactivated skates retain their skateCode permanently (never reused)
    updates.isActive = body.isActive
  }

  // DEC-032: qr_code and barcode are independently user-editable
  if (body.qrCode !== undefined) {
    updates.qrCode = body.qrCode ?? null
  }

  if (body.barcode !== undefined) {
    updates.barcode = body.barcode ?? null
  }

  if (Object.keys(updates).length > 0) {
    await db.update(skates).set(updates).where(eq(skates.id, id))
  }

  return getSkate(id)
}

// ---------------------------------------------------------------------------
// getSkateHistory — stub for Phase 03
// Dependent data (rentals, inspections, damage, maintenance) populated in future phases
// ---------------------------------------------------------------------------

export async function getSkateHistory(id: number): Promise<SkateHistoryDTO> {
  const skate = await getSkate(id)
  return {
    skate,
    rentals:            [], // Phase 05
    inspections:        [], // Phase 07
    damageReports:      [], // Phase 08
    maintenanceRecords: [], // Phase 09
  }
}
