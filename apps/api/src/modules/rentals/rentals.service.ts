/**
 * KOSHK SKATE ERP — Rentals Service
 * Phase 06 Redesign — Multi-Skate Rentals
 *
 * Domain principle:
 *   A Rental is the commercial transaction.
 *   A Rental Item is the independent Skate rental lifecycle and billing unit.
 *   The final invoice is generated only when every Skate in the Rental has been returned.
 *
 * Business rules enforced:
 *   - §4:  Rental → Rental Items → Skate (1..N skates per rental)
 *   - §6:  No payment at rental start; all items start simultaneously
 *   - §7:  Payment only after all items returned (final invoice)
 *   - §8:  Billing based on ACTUAL duration at return time
 *   - §9:  Grace period from settings — never hardcoded, no silent fallback
 *   - §10: Partial return supported — Rental stays active while any item active
 *   - §11: returned_at captured IMMEDIATELY on return initiation (server NOW())
 *   - §12/§13: All business timestamps server-authoritative (never browser time)
 *   - §14: Extensions per Rental Item — auditable, server-persisted
 *   - §15: Final invoice appears ONLY when last active item returned
 *   - §16: Financial operations atomic and consistent (transactions + locks)
 *   - §17: Skate lifecycle respected (available/rented/maintenance/damaged)
 *   - §22: Concurrency — FOR UPDATE locks on skate rows and rental item rows
 *   - DEC-062: rental_code = RN-NNNNN via insertId strategy
 *   - DEC-065: price_per_hour snapshot immutable after creation
 *   - DEC-067: amounts rounded to whole EGP
 */

import { eq, sql, and, gte, lte, count, desc, inArray, lt, gt } from 'drizzle-orm'
import { auditService } from '../audit/audit.service.js'
import { pool } from '../../db/connection.js'
import { db } from '../../db/connection.js'
import { rentals, ENDING_SOON_THRESHOLD_MINUTES } from '../../db/schema/rentals.js'
import { rentalItems } from '../../db/schema/rental_items.js'
import { rentalItemExtensions } from '../../db/schema/rental_item_extensions.js'
import { skates } from '../../db/schema/skates.js'
import { reservations } from '../../db/schema/reservations.js'
import { customers } from '../../db/schema/customers.js'
import { users } from '../../db/schema/users.js'
import { settings } from '../../db/schema/settings'
import { paymentMethods, rentalPayments, treasuryMovements, treasuryAccounts } from '../../db/schema/payments'
import { lockCashierSession, resolvePaymentAccount, lockTreasuryAccounts, postTreasuryMovement, strictAudit, cents } from '../treasury/treasury-posting.js'
import { lateFeeRecords } from '../../db/schema/inspections.js'
import {
  NotFoundError,
  ValidationError,
  BusinessRuleError,
} from '../../utils/errors.js'
import { calculateLateFee, calculateLateMinutes } from '../../utils/financial.js'
import type {
  RentalDTO,
  RentalItemDTO,
  ActiveRentalDTO,
  StartRentalRequest,
  ReturnRentalItemRequest,
  ExtendRentalItemRequest,
  FinalizeRentalRequest,
  ListRentalsQuery,
  PaginatedRentals,
  PricePreviewDTO,
  CustomerRentalHistoryItem,
  PaginatedCustomerRentals,
  RentalSkateInfo,
  RentalCustomerInfo,
  RentalCashierInfo,
  ReturnItemResult,
} from './rentals.types.js'
import type { RentalStatus, RentalOperationalStatus } from '../../db/schema/rentals.js'
import type { PoolConnection } from 'mysql2/promise'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function maskNationalId(value: string | null | undefined): string {
  if (!value) return '—'
  if (value.length <= 4) return value
  return '*'.repeat(value.length - 4) + value.slice(-4)
}

function isoDate(d: Date | string | null | undefined): string | null {
  if (!d) return null
  return d instanceof Date ? d.toISOString() : String(d)
}

function isoDateNotNull(d: Date | string): string {
  return d instanceof Date ? d.toISOString() : String(d)
}

/**
 * DEC-065, DEC-067: Calculate rental amount.
 * raw = hourlyRate × durationMinutes / 60
 * rental_amount = Math.round(raw) — nearest whole EGP, .5 rounds up
 */
function calculateRentalAmount(hourlyRate: number, durationMinutes: number): number {
  const raw = (hourlyRate * durationMinutes) / 60
  return Math.round(raw)
}

// Call only after locking every affected skate. Locking reads see concurrent
// reservation edits/creations committed before that skate lock was acquired.
async function assertNoReservedWindowOverlap(
  connection: PoolConnection,
  skateIds: number[],
  from: Date,
  until: Date,
  excludedReservationId: number | null = null,
): Promise<void> {
  const placeholders = skateIds.map(() => '?').join(',')
  const [conflicts] = await connection.execute<any[]>(
    `SELECT id FROM reservations
     WHERE skate_id IN (${placeholders}) AND status IN ('pending', 'confirmed')
       AND reserved_from < ? AND reserved_until > ?
       AND (? IS NULL OR id != ?)
     ORDER BY id FOR UPDATE`,
    [...skateIds, until, from, excludedReservationId, excludedReservationId],
  )
  if (conflicts.length > 0) {
    throw new BusinessRuleError('الاسكيت محجوزة خلال مدة الإيجار المطلوبة ولا يمكن استئجارها', 'SKATE_RESERVED')
  }
}

/**
 * DEC-066: Compute server-side operational status for a Rental Item.
 * Threshold: ENDING_SOON_THRESHOLD_MINUTES (5 minutes)
 *
 * Boundary rules:
 *   remaining_time > 5 min      → normal
 *   remaining_time <= 5 AND > 0 → ending_soon
 *   NOW() > expected_end_at     → overdue (strict greater-than)
 *   NOW() === expected_end_at   → NOT overdue (still ending_soon)
 */
function computeOperationalStatus(
  expectedEndAt: Date | string,
  nowMs: number,
): { operationalStatus: RentalOperationalStatus; remainingMinutes: number } {
  const endMs = expectedEndAt instanceof Date
    ? expectedEndAt.getTime()
    : new Date(isoDateNotNull(expectedEndAt)).getTime()

  const diffMs = endMs - nowMs
  const diffMinutes = diffMs / 60000

  if (diffMinutes < 0) {
    return { operationalStatus: 'overdue', remainingMinutes: 0 }
  }

  const remainingMinutes = Math.ceil(diffMinutes)
  if (remainingMinutes <= ENDING_SOON_THRESHOLD_MINUTES) {
    return { operationalStatus: 'ending_soon', remainingMinutes }
  }

  return { operationalStatus: 'normal', remainingMinutes }
}

/**
 * Read the current configured hourly rate from settings.
 * DEC-061, DEC-068: Must be read at runtime — never hardcoded.
 * Throws BusinessRuleError with PRICING_CONFIG_MISSING if missing/invalid.
 */
async function readHourlyRate(): Promise<number> {
  const [row] = await db
    .select()
    .from(settings)
    .where(eq(settings.key, 'rental_hourly_rate'))
    .limit(1)

  if (!row) {
    throw new BusinessRuleError('إعدادات التسعير غير متوفرة', 'PRICING_CONFIG_MISSING')
  }

  const rate = parseFloat(row.value)
  if (!isFinite(rate) || rate <= 0) {
    throw new BusinessRuleError('إعدادات التسعير غير صالحة', 'PRICING_CONFIG_MISSING')
  }

  return rate
}

/**
 * Read grace minutes from settings (§9).
 * Must be >= 0. No silent fallback.
 */
async function readGraceMinutes(): Promise<number> {
  const [row] = await db
    .select()
    .from(settings)
    .where(eq(settings.key, 'rental_grace_minutes'))
    .limit(1)

  if (!row) {
    throw new BusinessRuleError(
      'إعداد دقائق السماح للإيجار غير متوفر',
      'GRACE_CONFIG_MISSING',
    )
  }

  const grace = parseFloat(row.value)
  if (!isFinite(grace) || grace < 0) {
    throw new BusinessRuleError(
      'إعداد دقائق السماح للإيجار غير صالح — يجب أن يكون عدداً غير سالب',
      'GRACE_CONFIG_INVALID',
    )
  }

  return grace
}

/**
 * Read the configured late fee per minute from settings (DEC-004).
 * Returns 0 if key is missing or value is 0 — no late fee is a valid config.
 * Throws only if value is negative or non-numeric.
 */
async function readLateFeePerMinute(): Promise<number> {
  const [row] = await db
    .select()
    .from(settings)
    .where(eq(settings.key, 'late_fee_per_minute'))
    .limit(1)

  if (!row) return 0  // Not configured → no late fee

  const fee = parseFloat(row.value)
  if (!isFinite(fee) || fee < 0) {
    throw new BusinessRuleError(
      'إعداد غرامة التأخير غير صالح — يجب أن يكون عدداً غير سالب',
      'LATE_FEE_CONFIG_INVALID',
    )
  }

  return fee
}

// ---------------------------------------------------------------------------
// DTO Mappers
// ---------------------------------------------------------------------------

interface RawRentalRow {
  id: number
  rentalCode: string
  invoiceNumber: string | null
  reservationId: number | null
  customerId: number
  cashierId: number
  shiftId: number | null
  startedAt: Date | string
  totalAmount: string | number | null
  completedAt: Date | string | null
  status: RentalStatus
  notes: string | null
  createdAt: Date | string
  updatedAt: Date | string
  // joined
  customerName?: string
  customerPhone?: string
  customerNationalId?: string | null
  cashierName?: string
}

interface RawItemRow {
  id: number
  rentalId: number
  skateId: number
  startedAt: Date | string
  expectedDurationMinutes: number
  expectedEndAt: Date | string
  returnedAt: Date | string | null
  actualDurationMinutes: number | null
  actualAmount: string | number | null
  pricePerHour: string | number
  inspectionId: number | null
  status: 'active' | 'returned' | 'cancelled'
  // joined skate fields
  skateCode?: string
  skateSize?: string
  skateType?: string | null
  // late fee fields (joined from late_fee_records)
  lateFeeRecordId?: number | null
  lateMinutes?: number | null
  calculatedFee?: string | number | null
  waivedFee?: string | number | null
  collectedFee?: string | number | null
}

function rawItemToDTO(row: RawItemRow, nowMs?: number): RentalItemDTO {
  const dto: RentalItemDTO = {
    id: row.id,
    rentalId: row.rentalId,
    skate: {
      id: row.skateId,
      skateCode: row.skateCode ?? '',
      size: row.skateSize ?? '',
      type: row.skateType ?? null,
    },
    startedAt: isoDateNotNull(row.startedAt),
    expectedDurationMinutes: row.expectedDurationMinutes,
    expectedEndAt: isoDateNotNull(row.expectedEndAt),
    returnedAt: isoDate(row.returnedAt),
    actualDurationMinutes: row.actualDurationMinutes ?? null,
    actualAmount: row.actualAmount != null ? parseFloat(String(row.actualAmount)) : null,
    pricePerHour: parseFloat(String(row.pricePerHour)),
    inspectionId: row.inspectionId,
    status: row.status,
    // Late fee fields (DEC-004 — per Rental Item)
    lateFeeRecordId: row.lateFeeRecordId ?? null,
    lateMinutes:     row.lateMinutes     != null ? Number(row.lateMinutes)                    : null,
    lateFee:         row.calculatedFee   != null ? parseFloat(String(row.calculatedFee))     : null,
    lateFeeWaived:   row.waivedFee       != null ? parseFloat(String(row.waivedFee))         : null,
    lateFeeCollected:row.collectedFee    != null ? parseFloat(String(row.collectedFee))      : null,
  }

  // Add operational status for active items
  if (row.status === 'active' && nowMs !== undefined) {
    const { operationalStatus, remainingMinutes } = computeOperationalStatus(row.expectedEndAt, nowMs)
    dto.operationalStatus = operationalStatus
    dto.remainingMinutes = remainingMinutes
  }

  return dto
}

function rawToDTO(row: RawRentalRow, items: RentalItemDTO[]): RentalDTO {
  return {
    id: row.id,
    rentalCode: row.rentalCode,
    invoiceNumber: row.invoiceNumber ?? null,
    reservationId: row.reservationId ?? null,
    customer: {
      id: row.customerId,
      name: row.customerName ?? '',
      phone: row.customerPhone ?? '',
      nationalIdMasked: maskNationalId(row.customerNationalId),
    },
    cashier: {
      id: row.cashierId,
      name: row.cashierName ?? '',
    },
    shiftId: row.shiftId,
    items,
    totalAmount: row.totalAmount != null ? parseFloat(String(row.totalAmount)) : null,
    startedAt: isoDateNotNull(row.startedAt),
    completedAt: isoDate(row.completedAt),
    status: row.status,
    notes: row.notes,
    createdAt: isoDateNotNull(row.createdAt),
    updatedAt: isoDateNotNull(row.updatedAt),
  }
}

// ---------------------------------------------------------------------------
// Internal query helpers
// ---------------------------------------------------------------------------

async function fetchRentalsByCondition(
  whereClause?: any,
): Promise<{ rental: RawRentalRow; items: RawItemRow[] }[]> {
  // Fetch rentals
  const rentalRows = await db
    .select({
      id: rentals.id,
      rentalCode: rentals.rentalCode,
      invoiceNumber: rentals.invoiceNumber,
      reservationId: rentals.reservationId,
      customerId: rentals.customerId,
      cashierId: rentals.cashierId,
      shiftId: rentals.shiftId,
      startedAt: rentals.startedAt,
      totalAmount: rentals.totalAmount,
      completedAt: rentals.completedAt,
      status: rentals.status,
      notes: rentals.notes,
      createdAt: rentals.createdAt,
      updatedAt: rentals.updatedAt,
      customerName: customers.name,
      customerPhone: customers.phone,
      customerNationalId: customers.nationalId,
      cashierName: users.name,
    })
    .from(rentals)
    .leftJoin(customers, eq(rentals.customerId, customers.id))
    .leftJoin(users, eq(rentals.cashierId, users.id))
    .where(whereClause)
    .orderBy(desc(rentals.startedAt))

  if (rentalRows.length === 0) return []

  const rentalIds = rentalRows.map(r => r.id)

  // Fetch all items for these rentals (with late fee join)
  const itemRows = await db
    .select({
      id: rentalItems.id,
      rentalId: rentalItems.rentalId,
      skateId: rentalItems.skateId,
      startedAt: rentalItems.startedAt,
      expectedDurationMinutes: rentalItems.expectedDurationMinutes,
      expectedEndAt: rentalItems.expectedEndAt,
      returnedAt: rentalItems.returnedAt,
      actualDurationMinutes: rentalItems.actualDurationMinutes,
      actualAmount: rentalItems.actualAmount,
      pricePerHour: rentalItems.pricePerHour,
      inspectionId: rentalItems.inspectionId,
      status: rentalItems.status,
      skateCode: skates.skateCode,
      skateSize: skates.size,
      skateType: skates.type,
      // Late fee fields (DEC-004 — per Rental Item)
      lateFeeRecordId: lateFeeRecords.id,
      lateMinutes:     lateFeeRecords.lateMinutes,
      calculatedFee:   lateFeeRecords.calculatedFee,
      waivedFee:       lateFeeRecords.waivedFee,
      collectedFee:    lateFeeRecords.collectedFee,
    })
    .from(rentalItems)
    .leftJoin(skates, eq(rentalItems.skateId, skates.id))
    .leftJoin(lateFeeRecords, eq(lateFeeRecords.rentalItemId, rentalItems.id))
    .where(inArray(rentalItems.rentalId, rentalIds))

  // Group items by rentalId
  const itemsByRental = new Map<number, RawItemRow[]>()
  for (const item of itemRows) {
    if (!itemsByRental.has(item.rentalId)) {
      itemsByRental.set(item.rentalId, [])
    }
    itemsByRental.get(item.rentalId)!.push(item as RawItemRow)
  }

  return rentalRows.map(rental => ({
    rental: rental as RawRentalRow,
    items: itemsByRental.get(rental.id) ?? [],
  }))
}

// ---------------------------------------------------------------------------
// Service Methods
// ---------------------------------------------------------------------------

/**
 * Rental POS configuration (DEC-069 preserved).
 * Returns configured hourly rate and standard duration options from settings.
 * §9: Also returns rental_grace_minutes.
 * No silent fallback — throws if any required key is missing/invalid.
 */
export async function getRentalConfig(): Promise<{
  pricePerHour: number
  durationOptions: number[]
  gracePeriodMinutes: number
}> {
  const [rateSetting, durationsSetting, graceSetting] = await Promise.all([
    db.select().from(settings).where(eq(settings.key, 'rental_hourly_rate')).limit(1),
    db.select().from(settings).where(eq(settings.key, 'rental_duration_options')).limit(1),
    db.select().from(settings).where(eq(settings.key, 'rental_grace_minutes')).limit(1),
  ])

  if (!rateSetting[0]) {
    throw new BusinessRuleError('إعدادات التسعير غير متوفرة', 'PRICING_CONFIG_MISSING')
  }

  const pricePerHour = parseFloat(rateSetting[0].value)
  if (!isFinite(pricePerHour) || pricePerHour <= 0) {
    throw new BusinessRuleError('إعدادات التسعير غير صالحة', 'PRICING_CONFIG_MISSING')
  }

  if (!durationsSetting[0]) {
    throw new BusinessRuleError(
      'إعداد مدد الإيجار القياسية غير موجود في الإعدادات',
      'RENTAL_DURATION_CONFIG_INVALID',
    )
  }

  let durationOptions: number[]
  try {
    const parsed = JSON.parse(durationsSetting[0].value)
    if (
      !Array.isArray(parsed) ||
      parsed.length === 0 ||
      !parsed.every((x) => Number.isInteger(x) && x > 0)
    ) {
      throw new Error('invalid')
    }
    durationOptions = parsed
  } catch {
    throw new BusinessRuleError(
      'إعداد مدد الإيجار القياسية غير صالح — يجب أن يكون مصفوفة JSON من أعداد صحيحة موجبة',
      'RENTAL_DURATION_CONFIG_INVALID',
    )
  }

  if (!graceSetting[0]) {
    throw new BusinessRuleError('إعداد دقائق السماح للإيجار غير متوفر', 'GRACE_CONFIG_MISSING')
  }
  const gracePeriodMinutes = parseFloat(graceSetting[0].value)
  if (!isFinite(gracePeriodMinutes) || gracePeriodMinutes < 0) {
    throw new BusinessRuleError('إعداد دقائق السماح للإيجار غير صالح', 'GRACE_CONFIG_INVALID')
  }

  return { pricePerHour, durationOptions, gracePeriodMinutes }
}

/**
 * Calculate rental price preview (server-authoritative).
 * DEC-065, DEC-067: formula + rounding.
 */
export async function calculatePrice(durationMinutes: number): Promise<PricePreviewDTO> {
  if (!Number.isInteger(durationMinutes) || durationMinutes <= 0) {
    throw new ValidationError('مدة الإيجار غير صالحة', {
      durationMinutes: 'يجب أن تكون مدة الإيجار عدداً صحيحاً أكبر من صفر',
    })
  }

  const hourlyRate = await readHourlyRate()
  const rentalAmount = calculateRentalAmount(hourlyRate, durationMinutes)

  return { durationMinutes, pricePerHour: hourlyRate, rentalAmount }
}

/**
 * Start a new multi-skate Rental (§6).
 *
 * Creates:
 *   - One Rental (commercial container)
 *   - One Rental Item per skate selected
 *
 * NO payment collected at creation (§7).
 * NO invoice generated at creation.
 * All items share the same startedAt (server NOW()).
 * Each item gets its own expectedEndAt = startedAt + durationMinutes.
 *
 * ATOMIC TRANSACTION with FOR UPDATE locking on all skate rows (§22).
 */
export async function startRental(
  cashierId: number,
  data: StartRentalRequest,
): Promise<RentalDTO> {
  // --- Input validation ---
  if (!Array.isArray(data.skateIds) || data.skateIds.length === 0) {
    throw new ValidationError('يجب تحديد اسكيت واحد على الأقل')
  }
  if (data.skateIds.length > 20) {
    throw new ValidationError('لا يمكن تأجير أكثر من 20 اسكيت في طلب واحد')
  }
  if (data.skateIds.some(id => !Number.isInteger(id) || id <= 0)) {
    throw new ValidationError('معرفات الاسكيت يجب أن تكون أعداداً صحيحة أكبر من صفر')
  }
  // Deduplicate check
  const uniqueSkateIds = new Set(data.skateIds)
  if (uniqueSkateIds.size !== data.skateIds.length) {
    throw new ValidationError('لا يمكن تكرار اسكيت في نفس طلب الإيجار')
  }
  if (!data.customerId || !Number.isInteger(data.customerId) || data.customerId <= 0) {
    throw new ValidationError('معرف العميل مطلوب')
  }
  const hasReservation = data.reservationId !== undefined
  if (hasReservation && (!Number.isInteger(data.reservationId) || data.reservationId! <= 0)) {
    throw new ValidationError('معرف الحجز غير صالح')
  }
  if (!hasReservation && (!Number.isInteger(data.durationMinutes) || (data.durationMinutes ?? 0) <= 0)) {
    throw new ValidationError('مدة الإيجار غير صالحة', {
      durationMinutes: 'يجب أن تكون مدة الإيجار عدداً صحيحاً أكبر من صفر',
    })
  }
  if (data.notes && data.notes.length > 1000) {
    throw new ValidationError('الملاحظات تتجاوز الحد الأقصى 1000 حرف')
  }

  // --- Pre-flight: customer exists and is active ---
  const [customerRow] = await db.select().from(customers).where(eq(customers.id, data.customerId)).limit(1)
  if (!customerRow) throw new NotFoundError('العميل غير موجود')
  if (!customerRow.isActive) {
    throw new BusinessRuleError('لا يمكن إنشاء إيجار لعميل معطل', 'CUSTOMER_INACTIVE')
  }

  // --- Read pricing from settings ---
  const hourlyRate = await readHourlyRate()

  const connection = await pool.getConnection()
  let newRentalId: number

  try {
    await connection.beginTransaction()
    const activeShift = await lockCashierSession(connection, cashierId)

    // Lock all requested skates simultaneously (alphabetic order to avoid deadlocks)
    const sortedSkateIds = [...data.skateIds].sort((a, b) => a - b)
    const skateIdPlaceholders = sortedSkateIds.map(() => '?').join(',')
    const [skateRowsLocked] = await connection.execute<any[]>(
      `SELECT id, status, skate_code FROM skates WHERE id IN (${skateIdPlaceholders}) ORDER BY id FOR UPDATE`,
      sortedSkateIds,
    )

    // Validate all skates exist and are available
    for (const skateId of data.skateIds) {
      const found = skateRowsLocked.find((s: any) => s.id === skateId)
      if (!found) {
        await connection.rollback()
        throw new NotFoundError(`الاسكيت رقم ${skateId} غير موجودة`)
      }
      if (found.status !== 'available') {
        await connection.rollback()
        throw new BusinessRuleError(
          `الاسكيت ${found.skate_code} غير متاحة للاستئجار (الحالة: ${found.status})`,
          'SKATE_NOT_AVAILABLE',
        )
      }
    }

    // Revalidate the customer in the transaction, after the shared skate lock.
    const [lockedCustomers] = await connection.execute<any[]>(
      'SELECT id, is_active FROM customers WHERE id = ? FOR UPDATE',
      [data.customerId],
    )
    if (!lockedCustomers[0]) throw new NotFoundError('العميل غير موجود')
    if (!lockedCustomers[0].is_active) {
      throw new BusinessRuleError('لا يمكن إنشاء إيجار لعميل معطل', 'CUSTOMER_INACTIVE')
    }

    let durationMinutes = data.durationMinutes!
    let reservationWindow: { reservedFrom: string; reservedUntil: string } | null = null
    if (hasReservation) {
      const [reservationRows] = await connection.execute<any[]>(
        'SELECT id, status, customer_id, skate_id, reserved_from, reserved_until FROM reservations WHERE id = ? FOR UPDATE',
        [data.reservationId!],
      )
      const reservation = reservationRows[0]
      if (!reservation) throw new NotFoundError('الحجز غير موجود')
      if (reservation.status !== 'pending' && reservation.status !== 'confirmed') {
        throw new BusinessRuleError('لا يمكن تنفيذ حجز غير نشط', 'RESERVATION_NOT_ACTIVE')
      }
      if (reservation.customer_id !== data.customerId || !uniqueSkateIds.has(reservation.skate_id)) {
        throw new BusinessRuleError('بيانات الحجز لا تتطابق مع طلب الإيجار', 'RESERVATION_MISMATCH')
      }
      const reservedFrom = new Date(reservation.reserved_from)
      const reservedUntil = new Date(reservation.reserved_until)
      durationMinutes = (reservedUntil.getTime() - reservedFrom.getTime()) / 60000
      if (!Number.isInteger(durationMinutes) || durationMinutes <= 0) {
        throw new BusinessRuleError('مدة الحجز يجب أن تكون عدداً صحيحاً من الدقائق أكبر من صفر؛ يرجى تصحيح مواعيد الحجز', 'RESERVATION_DURATION_INVALID')
      }
      if (reservedUntil.getTime() <= Date.now()) {
        throw new BusinessRuleError('انتهى وقت الحجز ولا يمكن تنفيذه', 'RESERVATION_EXPIRED')
      }
      reservationWindow = { reservedFrom: reservedFrom.toISOString(), reservedUntil: reservedUntil.toISOString() }
    }

    // Match DATETIME's whole-second precision for both occupancy checks and
    // persistence; a subsecond difference must not turn touching windows into overlaps.
    const startedAt = new Date(Math.floor(Date.now() / 1000) * 1000)
    const expectedEndAt = new Date(startedAt.getTime() + durationMinutes * 60000)
    await assertNoReservedWindowOverlap(connection, sortedSkateIds, startedAt, expectedEndAt, data.reservationId ?? null)

    // INSERT Rental with temporary placeholder code (DEC-062, DEC-070)
    const tempCode = `TEMP-${Date.now()}-${Math.random().toString(36).slice(2)}`
    const [insertResult] = await connection.execute<any>(
      `INSERT INTO rentals
        (rental_code, customer_id, cashier_id, shift_id, started_at, status, notes, reservation_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'active', ?, ?, NOW(), NOW())`,
      [
        tempCode,
        data.customerId,
        cashierId,
        activeShift.id,
        startedAt,
        data.notes ?? null,
        data.reservationId ?? null,
      ],
    )

    newRentalId = insertResult.insertId

    // Derive final rental_code from insertId (DEC-062)
    const rentalCode = 'RN-' + String(newRentalId).padStart(5, '0')
    await connection.execute(
      'UPDATE rentals SET rental_code = ? WHERE id = ?',
      [rentalCode, newRentalId],
    )

    // Create one Rental Item per skate
    const rentalAmount = calculateRentalAmount(hourlyRate, durationMinutes)
    for (const skateId of data.skateIds) {
      await connection.execute(
        `INSERT INTO rental_items
          (rental_id, skate_id, started_at, expected_duration_minutes, expected_end_at,
           price_per_hour, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 'active', NOW(), NOW())`,
        [
          newRentalId,
          skateId,
          startedAt,
          durationMinutes,
          expectedEndAt,
          hourlyRate.toFixed(2),
        ],
      )
    }

    if (hasReservation) {
      await connection.execute(
        "UPDATE reservations SET status = 'fulfilled', updated_at = NOW() WHERE id = ?",
        [data.reservationId!],
      )
    }

    // Transition all skates: available → rented
    await connection.execute(
      `UPDATE skates SET status = 'rented', updated_at = NOW() WHERE id IN (${skateIdPlaceholders})`,
      sortedSkateIds,
    )

    // Audit log
    await connection.execute(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_value, new_value, created_at)
       VALUES (?, 'START_RENTAL', 'RENTAL', ?, ?, ?, NOW())`,
      [
        cashierId,
        newRentalId,
        JSON.stringify({ status: 'pending' }),
        JSON.stringify({
          status: 'active',
          rentalCode,
          skateIds: data.skateIds,
          durationMinutes,
          expectedAmount: rentalAmount,
          ...(hasReservation ? { reservationId: data.reservationId, ...reservationWindow } : {}),
        }),
      ],
    )

    await connection.commit()
  } catch (err) {
    try { await connection.rollback() } catch { /* ignore */ }
    throw err
  } finally {
    connection.release()
  }

  const result = await getRental(newRentalId)
  return result
}

/**
 * Get active rentals with per-item operational status (§24).
 */
export async function getActiveRentals(): Promise<ActiveRentalDTO[]> {
  const groups = await fetchRentalsByCondition(eq(rentals.status, 'active'))
  const nowMs = Date.now()

  return groups.map(({ rental, items }) => {
    const itemDTOs = items.map(item => rawItemToDTO(item, nowMs))
    const dto = rawToDTO(rental as RawRentalRow, itemDTOs)

    const hasOverdueItems = itemDTOs.some(
      i => i.status === 'active' && i.operationalStatus === 'overdue'
    )
    const hasEndingSoonItems = itemDTOs.some(
      i => i.status === 'active' && i.operationalStatus === 'ending_soon'
    )

    return { ...dto, hasOverdueItems, hasEndingSoonItems }
  })
}

/**
 * List rentals with pagination and filters.
 */
export async function listRentals(query: ListRentalsQuery): Promise<PaginatedRentals> {
  const page = Math.max(1, parseInt(query.page ?? '1', 10))
  const perPage = Math.min(100, Math.max(1, parseInt(query.perPage ?? '20', 10)))
  const offset = (page - 1) * perPage

  const conditions: any[] = []

  if (query.status && ['active', 'completed', 'cancelled', 'returned'].includes(query.status)) {
    conditions.push(eq(rentals.status, query.status as RentalStatus))
  }
  if (query.customerId) conditions.push(eq(rentals.customerId, parseInt(query.customerId, 10)))
  if (query.cashierId) conditions.push(eq(rentals.cashierId, parseInt(query.cashierId, 10)))
  if (query.from) conditions.push(gte(rentals.startedAt, new Date(query.from)))
  if (query.to) conditions.push(lte(rentals.startedAt, new Date(query.to)))

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined

  const [{ total }] = await db.select({ total: count() }).from(rentals).where(whereClause)

  // Get paginated rental IDs first
  const rentalIdRows = await db
    .select({ id: rentals.id })
    .from(rentals)
    .where(whereClause)
    .orderBy(desc(rentals.startedAt))
    .limit(perPage)
    .offset(offset)

  const groups = await fetchRentalsByCondition(
    rentalIdRows.length > 0
      ? inArray(rentals.id, rentalIdRows.map(r => r.id))
      : eq(rentals.id, -1)  // no results
  )

  // Preserve order from rentalIdRows
  const orderedGroups = rentalIdRows.map(r =>
    groups.find(g => g.rental.id === r.id)!
  ).filter(Boolean)

  return {
    data: orderedGroups.map(({ rental, items }) =>
      rawToDTO(rental as RawRentalRow, items.map(i => rawItemToDTO(i)))
    ),
    pagination: {
      page,
      perPage,
      total: Number(total),
      totalPages: Math.ceil(Number(total) / perPage),
    },
  }
}

/**
 * Get a single rental by ID with all items.
 */
export async function getRental(id: number): Promise<RentalDTO> {
  const groups = await fetchRentalsByCondition(eq(rentals.id, id))
  if (!groups[0]) throw new NotFoundError(`الإيجار رقم ${id} غير موجود`)
  const { rental, items } = groups[0]
  return rawToDTO(rental as RawRentalRow, items.map(i => rawItemToDTO(i)))
}

/**
 * Get a single Rental Item by ID.
 */
export async function getRentalItem(itemId: number): Promise<RentalItemDTO> {
  const rows = await db
    .select({
      id: rentalItems.id,
      rentalId: rentalItems.rentalId,
      skateId: rentalItems.skateId,
      startedAt: rentalItems.startedAt,
      expectedDurationMinutes: rentalItems.expectedDurationMinutes,
      expectedEndAt: rentalItems.expectedEndAt,
      returnedAt: rentalItems.returnedAt,
      actualDurationMinutes: rentalItems.actualDurationMinutes,
      actualAmount: rentalItems.actualAmount,
      pricePerHour: rentalItems.pricePerHour,
      inspectionId: rentalItems.inspectionId,
      status: rentalItems.status,
      skateCode: skates.skateCode,
      skateSize: skates.size,
      skateType: skates.type,
    })
    .from(rentalItems)
    .leftJoin(skates, eq(rentalItems.skateId, skates.id))
    .where(eq(rentalItems.id, itemId))
    .limit(1)

  if (!rows[0]) throw new NotFoundError(`بند الإيجار رقم ${itemId} غير موجود`)
  return rawItemToDTO(rows[0] as RawItemRow, Date.now())
}

/**
 * Return a single Rental Item (§10 — Partial Return).
 *
 * CRITICAL: returned_at is captured by the SERVER at the START of this function,
 * BEFORE inspection data is processed. This freezes billing immediately (§11).
 *
 * Flow:
 *   1. Server captures returned_at = NOW() (billing stop)
 *   2. Lock Rental Item FOR UPDATE
 *   3. Verify item is active
 *   4. Lock Skate FOR UPDATE
 *   5. Compute actual_duration_minutes from returned_at - started_at
 *   6. Compute actual_amount from actual_duration_minutes (§8)
 *   7. Save inspection
 *   8. Update rental_item: returned_at, actual_*, status=returned, inspection_id
 *   9. Update skate: rented → available or maintenance
 *  10. Check if ALL items in Rental are now returned → if yes, mark for finalization
 *  11. Audit log
 *
 * If this is the last active item, caller should proceed to finalizeRental().
 */
export async function returnRentalItem(
  itemId: number,
  cashierId: number,
  data: ReturnRentalItemRequest,
): Promise<ReturnItemResult> {
  // §11: Capture server return time IMMEDIATELY (billing stop point)
  const returnedAt = new Date()

  // Read grace minutes from settings (§9)
  const gracePeriodMinutes = await readGraceMinutes()

  const connection = await pool.getConnection()
  let inspectionId: number
  let newRentalItemId = itemId
  let isLastItem = false
  let rentalId: number

  try {
    await connection.beginTransaction()
    await lockCashierSession(connection, cashierId)

    // Lock the rental item
    const [itemRows] = await connection.execute<any[]>(
      'SELECT id, rental_id, skate_id, started_at, expected_end_at, status FROM rental_items WHERE id = ? FOR UPDATE',
      [itemId],
    )
    const item = itemRows[0]
    if (!item) {
      await connection.rollback()
      throw new NotFoundError(`بند الإيجار رقم ${itemId} غير موجود`)
    }
    if (item.status !== 'active') {
      await connection.rollback()
      throw new BusinessRuleError('لا يمكن إرجاع بند إيجار غير نشط', 'ITEM_NOT_ACTIVE')
    }

    rentalId = item.rental_id

    // Lock the skate
    const [skateRows] = await connection.execute<any[]>(
      'SELECT id, status FROM skates WHERE id = ? FOR UPDATE',
      [item.skate_id],
    )
    if (!skateRows[0]) {
      await connection.rollback()
      throw new NotFoundError('الاسكيت غير موجودة')
    }

    // §11: returned_at already captured above BEFORE this transaction
    // Compute actual duration in minutes (ceiling to whole minutes)
    const startedAtMs = new Date(item.started_at).getTime()
    const diffSeconds = (returnedAt.getTime() - startedAtMs) / 1000
    const actualDurationMinutes = Math.max(1, Math.ceil(diffSeconds / 60))

    // §8: Billing based on actual duration
    // §9: Grace period — actual-duration billing (grace doesn't change minimum bill)
    // pricePerHour is the snapshot stored on the item
    const [itemPriceRow] = await connection.execute<any[]>(
      'SELECT price_per_hour FROM rental_items WHERE id = ?',
      [itemId],
    )
    const pricePerHour = parseFloat(itemPriceRow[0]?.price_per_hour ?? '120')
    const actualAmount = calculateRentalAmount(pricePerHour, actualDurationMinutes)

    // Calculate Late Fee (DEC-004)
    const lateFeePerMinute = await readLateFeePerMinute()
    
    const expectedEnd = new Date(item.expected_end_at)
    // Late time starts ONLY after expectedEndTime + grace
    const expectedWithGrace = new Date(expectedEnd.getTime() + gracePeriodMinutes * 60000)
    
    let calculatedLateFee = 0
    let lateMinutes = 0
    if (lateFeePerMinute > 0) {
      lateMinutes = calculateLateMinutes(expectedWithGrace, returnedAt)
      calculatedLateFee = lateMinutes * lateFeePerMinute
    }
    
    const waivedFee = data.waivedFee ?? 0
    const collectedFee = Math.max(0, calculatedLateFee - waivedFee)

    if (calculatedLateFee > 0) {
      await connection.execute(
        `INSERT INTO late_fee_records
          (rental_id, rental_item_id, late_minutes, calculated_fee, waived_fee, collected_fee, waived_by, waiver_reason, waived_at, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          item.rental_id, 
          itemId, 
          lateMinutes, 
          calculatedLateFee, 
          waivedFee, 
          collectedFee, 
          waivedFee > 0 ? cashierId : null, 
          data.waiverReason ?? null,
          waivedFee > 0 ? new Date() : null
        ]
      )
    }

    // Insert inspection
    const ins = data.inspection
    const [insResult] = await connection.execute<any>(
      `INSERT INTO inspections
        (rental_id, rental_item_id, skate_id, inspected_by,
         wheels_condition, brake_condition, strap_condition, bearings_condition,
         body_condition, other_notes, maintenance_required, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        item.rental_id,
        itemId,
        item.skate_id,
        cashierId,
        ins.wheelsCondition,
        ins.brakeCondition,
        ins.strapCondition,
        ins.bearingsCondition,
        ins.bodyCondition,
        ins.otherNotes ?? null,
        ins.maintenanceRequired ? 1 : 0,
      ],
    )
    inspectionId = insResult.insertId

    // Update rental item: freeze billing + record results
    await connection.execute(
      `UPDATE rental_items
       SET returned_at = ?, actual_duration_minutes = ?, actual_amount = ?,
           inspection_id = ?, status = 'returned', updated_at = NOW()
       WHERE id = ?`,
      [returnedAt, actualDurationMinutes, actualAmount.toFixed(2), inspectionId, itemId],
    )

    // Transition skate status
    const nextSkateStatus = ins.maintenanceRequired ? 'maintenance' : 'available'
    await connection.execute(
      `UPDATE skates SET status = ?, updated_at = NOW() WHERE id = ?`,
      [nextSkateStatus, item.skate_id],
    )

    // Phase 09: create maintenance record if required
    if (ins.maintenanceRequired) {
      await connection.execute(
        `INSERT INTO maintenance_records (skate_id, inspection_id, created_by, status, created_at, updated_at)
         VALUES (?, ?, ?, 'pending', NOW(), NOW())`,
        [item.skate_id, inspectionId, cashierId],
      )
    }

    // Check if all items in this Rental are now returned/cancelled
    const [remainingRows] = await connection.execute<any[]>(
      `SELECT COUNT(*) as cnt FROM rental_items WHERE rental_id = ? AND status = 'active'`,
      [item.rental_id],
    )
    const remainingActive = remainingRows[0]?.cnt ?? 1
    isLastItem = remainingActive === 0

    // Audit log
    await auditService.logRaw({
      userId: cashierId,
      action: 'RETURN_RENTAL_ITEM',
      entityType: 'RENTAL_ITEM',
      entityId: String(itemId),
      newValue: {
        returnedAt: returnedAt.toISOString(),
        actualDurationMinutes,
        actualAmount,
        rentalId: item.rental_id,
      },
    }, connection)

    await connection.commit()
  } catch (err) {
    try { await connection.rollback() } catch { /* ignore */ }
    throw err
  } finally {
    connection.release()
  }

  const itemDto = await getRentalItem(newRentalItemId)
  const rentalDto = await getRental(rentalId!)

  return { item: itemDto, rental: rentalDto, lastInspectionId: inspectionId!, isLastItem }
}

/**
 * Extend a single Rental Item's expected duration (§14).
 *
 * Extension changes the operational expected_end_at.
 * Extension does NOT change billing — billing uses actual_duration_minutes at return.
 * Each extension is audited in rental_item_extensions.
 * Server computes and persists new_expected_end_at (§26 — never browser-calculated).
 */
export async function extendRentalItem(
  itemId: number,
  cashierId: number,
  data: ExtendRentalItemRequest,
): Promise<RentalItemDTO> {
  if (!Number.isInteger(data.extendByMinutes) || data.extendByMinutes <= 0) {
    throw new ValidationError('مدة التمديد يجب أن تكون عدداً صحيحاً أكبر من صفر')
  }

  const connection = await pool.getConnection()

  try {
    await connection.beginTransaction()
    await lockCashierSession(connection, cashierId)

    // Lock the rental item
    const [itemRows] = await connection.execute<any[]>(
      'SELECT id, status, skate_id, expected_end_at, rental_id FROM rental_items WHERE id = ? FOR UPDATE',
      [itemId],
    )
    const item = itemRows[0]
    if (!item) {
      await connection.rollback()
      throw new NotFoundError(`بند الإيجار رقم ${itemId} غير موجود`)
    }
    if (item.status !== 'active') {
      await connection.rollback()
      throw new BusinessRuleError('لا يمكن تمديد بند إيجار غير نشط', 'ITEM_NOT_ACTIVE')
    }

    // Shared with reservation create/edit so an extension cannot race a booking.
    await connection.execute('SELECT id FROM skates WHERE id = ? FOR UPDATE', [item.skate_id])

    // Verify parent rental is still active
    const [rentalRows] = await connection.execute<any[]>(
      'SELECT status FROM rentals WHERE id = ? FOR UPDATE',
      [item.rental_id],
    )
    if (!rentalRows[0] || rentalRows[0].status !== 'active') {
      await connection.rollback()
      throw new BusinessRuleError('لا يمكن تمديد إيجار غير نشط', 'RENTAL_NOT_ACTIVE')
    }

    const previousExpectedEndAt = new Date(item.expected_end_at)
    const newExpectedEndAt = new Date(
      previousExpectedEndAt.getTime() + data.extendByMinutes * 60000
    )
    await assertNoReservedWindowOverlap(connection, [item.skate_id], previousExpectedEndAt, newExpectedEndAt)

    // Update expected_end_at and expected_duration_minutes on the item
    const [currentDurRow] = await connection.execute<any[]>(
      'SELECT expected_duration_minutes FROM rental_items WHERE id = ?',
      [itemId],
    )
    const newExpectedDuration =
      (currentDurRow[0]?.expected_duration_minutes ?? 0) + data.extendByMinutes

    await connection.execute(
      `UPDATE rental_items
       SET expected_end_at = ?, expected_duration_minutes = ?, updated_at = NOW()
       WHERE id = ?`,
      [newExpectedEndAt, newExpectedDuration, itemId],
    )

    // Create extension audit record
    await connection.execute(
      `INSERT INTO rental_item_extensions
        (rental_item_id, extended_by_minutes, previous_expected_end_at, new_expected_end_at, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [
        itemId,
        data.extendByMinutes,
        previousExpectedEndAt,
        newExpectedEndAt,
        cashierId,
      ],
    )

    // Audit log
    await auditService.logRaw({
      userId: cashierId,
      action: 'EXTEND_RENTAL_ITEM',
      entityType: 'RENTAL_ITEM',
      entityId: String(itemId),
      oldValue: { expectedEndAt: previousExpectedEndAt.toISOString() },
      newValue: {
        extendByMinutes: data.extendByMinutes,
        newExpectedEndAt: newExpectedEndAt.toISOString(),
      },
    }, connection)

    await connection.commit()
  } catch (err) {
    try { await connection.rollback() } catch { /* ignore */ }
    throw err
  } finally {
    connection.release()
  }

  return getRentalItem(itemId)
}

/**
 * Finalize a Rental: generate invoice, collect payment, mark completed (§15).
 *
 * Called ONLY after all Rental Items have been returned.
 * total_amount = SUM of all actual_amounts from returned items.
 * Payment must exactly match total_amount.
 * Rental transitions to 'completed'.
 *
 * Idempotent-safe: rejects if Rental is already completed.
 */
export async function finalizeRental(
  rentalId: number,
  cashierId: number,
  data: FinalizeRentalRequest,
): Promise<RentalDTO> {
  // Validate payments array
  if (!Array.isArray(data.payments) || data.payments.length === 0) {
    throw new ValidationError('المدفوعات مطلوبة')
  }
  let requestedTotalPayment = 0
  for (const p of data.payments) {
    cents(p.amount)
    if (!p.paymentMethodId || !Number.isInteger(p.paymentMethodId) || p.paymentMethodId <= 0) {
      throw new ValidationError('معرف طريقة الدفع غير صالح')
    }
    if (typeof p.amount !== 'number' || p.amount <= 0) {
      throw new ValidationError('مبلغ الدفعة غير صالح')
    }
    requestedTotalPayment += p.amount
  }

  const connection = await pool.getConnection()

  try {
    await connection.beginTransaction()
    const activeShift = await lockCashierSession(connection, cashierId)

    // Lock the rental
    const [rentalRows] = await connection.execute<any[]>(
      'SELECT id, status FROM rentals WHERE id = ? FOR UPDATE',
      [rentalId],
    )
    const rental = rentalRows[0]
    if (!rental) {
      await connection.rollback()
      throw new NotFoundError(`الإيجار رقم ${rentalId} غير موجود`)
    }
    if (rental.status === 'completed') {
      await connection.rollback()
      throw new BusinessRuleError('تم إتمام هذا الإيجار مسبقاً', 'RENTAL_ALREADY_COMPLETED')
    }
    if (rental.status !== 'active') {
      await connection.rollback()
      throw new BusinessRuleError('لا يمكن إتمام إيجار غير نشط', 'RENTAL_NOT_ACTIVE')
    }

    // Verify ALL items are returned
    const [activeItemsRows] = await connection.execute<any[]>(
      `SELECT COUNT(*) as cnt FROM rental_items WHERE rental_id = ? AND status = 'active'`,
      [rentalId],
    )
    if ((activeItemsRows[0]?.cnt ?? 1) > 0) {
      await connection.rollback()
      throw new BusinessRuleError(
        'لا يمكن إتمام الإيجار — لا يزال هناك اسكيت لم يُعاد',
        'RENTAL_HAS_ACTIVE_ITEMS',
      )
    }

    // Calculate total from actual amounts of all returned items (base rent)
    const [totalRow] = await connection.execute<any[]>(
      `SELECT SUM(actual_amount) as total FROM rental_items WHERE rental_id = ? AND status = 'returned'`,
      [rentalId],
    )
    const baseRent = Math.round(parseFloat(totalRow[0]?.total ?? '0'))

    // Calculate late fees for this rental
    const [lateTotalRow] = await connection.execute<any[]>(
      `SELECT SUM(collected_fee) as lateTotal FROM late_fee_records WHERE rental_id = ?`,
      [rentalId],
    )
    const lateFeeAmount = Math.round(parseFloat(lateTotalRow[0]?.lateTotal ?? '0'))

    const totalAmount = baseRent + lateFeeAmount

    // Validate payment total matches
    if (Math.abs(requestedTotalPayment - totalAmount) > 0.001) {
      await connection.rollback()
      throw new BusinessRuleError(
        `إجمالي المدفوعات (${requestedTotalPayment}) لا يساوي المبلغ الإجمالي للإيجار (${totalAmount}) شاملاً غرامات التأخير إن وجدت`,
        'INVALID_PAYMENT_TOTAL',
      )
    }

    // Generate invoice number
    await connection.execute(
      `INSERT INTO sequences (name, value) VALUES ('invoice_number', 1)
       ON DUPLICATE KEY UPDATE value = LAST_INSERT_ID(value + 1)`
    )
    const [seqRows] = await connection.execute<any[]>(
      `SELECT LAST_INSERT_ID() AS value`
    )
    const invoiceVal = seqRows[0].value
    const invoiceNumber = `INV-${String(invoiceVal).padStart(6, '0')}`

    // Lock and verify all payment methods
    const paymentMethodIds = data.payments.map(p => p.paymentMethodId)
    const pmPlaceholders = paymentMethodIds.map(() => '?').join(',')
    const [pmRows] = await connection.execute<any[]>(
      `SELECT id, treasury_account_id, is_active FROM payment_methods WHERE id IN (${pmPlaceholders}) FOR UPDATE`,
      paymentMethodIds,
    )

    const rentalCode = (await connection.execute<any[]>('SELECT rental_code FROM rentals WHERE id = ?', [rentalId]))[0][0]?.rental_code ?? ''

    const resolvedAccounts = new Map<number, number>()
    for (const pm of pmRows) {
      resolvedAccounts.set(pm.id, await resolvePaymentAccount(connection, activeShift, pm.treasury_account_id, cashierId))
    }
    await lockTreasuryAccounts(connection, [...resolvedAccounts.values()])

    let remainingLateFee = lateFeeAmount

    for (const p of data.payments) {
      const pm = pmRows.find((row: any) => row.id === p.paymentMethodId)
      if (!pm) {
        await connection.rollback()
        throw new NotFoundError(`طريقة الدفع رقم ${p.paymentMethodId} غير موجودة`)
      }
      if (!pm.is_active) {
        await connection.rollback()
        throw new BusinessRuleError(
          `طريقة الدفع رقم ${p.paymentMethodId} غير مفعلة`,
          'PAYMENT_METHOD_INACTIVE',
        )
      }

      const accountId = resolvedAccounts.get(p.paymentMethodId)!

      // Proportionally allocate this payment between late fee and base rent
      let amountForLateFee = 0
      let amountForRent = p.amount

      if (remainingLateFee > 0) {
        amountForLateFee = Math.min(p.amount, remainingLateFee)
        amountForRent = p.amount - amountForLateFee
        remainingLateFee -= amountForLateFee
      }

      if (amountForRent > 0) {
        // Insert rental payment
        await connection.execute(
          `INSERT INTO rental_payments
            (rental_id, payment_method_id, treasury_account_id, amount, payment_type, cashier_id, created_at)
           VALUES (?, ?, ?, ?, 'rental', ?, NOW())`,
          [rentalId, p.paymentMethodId, accountId, amountForRent.toFixed(2), cashierId],
        )

        await postTreasuryMovement(connection, {
          accountId, amount: amountForRent.toFixed(2), type: 'in',
          referenceType: 'rental_payment', referenceId: rentalId,
          cashierId, shiftId: activeShift.id,
          notes: `Rental ${rentalCode} Final Payment (Rent)`,
        })
      }

      if (amountForLateFee > 0) {
        // Insert late fee payment
        await connection.execute(
          `INSERT INTO rental_payments
            (rental_id, payment_method_id, treasury_account_id, amount, payment_type, cashier_id, created_at)
           VALUES (?, ?, ?, ?, 'late_fee', ?, NOW())`,
          [rentalId, p.paymentMethodId, accountId, amountForLateFee.toFixed(2), cashierId],
        )

        await postTreasuryMovement(connection, {
          accountId, amount: amountForLateFee.toFixed(2), type: 'in',
          referenceType: 'late_fee_payment', referenceId: rentalId,
          cashierId, shiftId: activeShift.id,
          notes: `Rental ${rentalCode} Final Payment (Late Fee)`,
        })
      }


    }

    // Complete the rental
    const completedAt = new Date()
    await connection.execute(
      `UPDATE rentals
       SET status = 'completed', total_amount = ?, completed_at = ?,
           invoice_number = ?, updated_at = NOW()
       WHERE id = ?`,
      [totalAmount.toFixed(2), completedAt, invoiceNumber, rentalId],
    )

    // Audit log
    await strictAudit(connection, {
      userId: cashierId,
      action: 'FINALIZE_RENTAL',
      entityType: 'RENTAL',
      entityId: String(rentalId),
      newValue: { status: 'completed', totalAmount, invoiceNumber, shiftId: activeShift.id },
    })

    await connection.commit()
  } catch (err) {
    try { await connection.rollback() } catch { /* ignore */ }
    throw err
  } finally {
    connection.release()
  }

  return getRental(rentalId)
}

/**
 * Cancel an active rental.
 * Reverts all active skates to 'available', marks all active items 'cancelled',
 * marks Rental 'cancelled'.
 * No payment refund needed (payment not collected at start in new model).
 */
export async function cancelRental(rentalId: number, cashierId: number): Promise<RentalDTO> {
  const connection = await pool.getConnection()

  try {
    await connection.beginTransaction()
    await lockCashierSession(connection, cashierId)

    // Lock the rental
    const [rentalRows] = await connection.execute<any[]>(
      'SELECT id, status FROM rentals WHERE id = ? FOR UPDATE',
      [rentalId],
    )
    const rental = rentalRows[0]
    if (!rental) {
      await connection.rollback()
      throw new NotFoundError(`الإيجار رقم ${rentalId} غير موجود`)
    }
    if (rental.status !== 'active') {
      await connection.rollback()
      throw new BusinessRuleError(
        'لا يمكن إلغاء هذا الإيجار. يمكن إلغاء الإيجارات النشطة فقط.',
        'RENTAL_NOT_CANCELLABLE',
      )
    }

    // Get all active items
    const [activeItems] = await connection.execute<any[]>(
      `SELECT id, skate_id FROM rental_items WHERE rental_id = ? AND status = 'active'`,
      [rentalId],
    )

    // Cancel all active items and release their skates
    for (const item of activeItems) {
      await connection.execute(
        `UPDATE rental_items SET status = 'cancelled', updated_at = NOW() WHERE id = ?`,
        [item.id],
      )
      await connection.execute(
        `UPDATE skates SET status = 'available', updated_at = NOW() WHERE id = ?`,
        [item.skate_id],
      )
    }

    // Mark rental cancelled
    await connection.execute(
      `UPDATE rentals SET status = 'cancelled', updated_at = NOW() WHERE id = ?`,
      [rentalId],
    )

    await auditService.logRaw({
      userId: cashierId,
      action: 'CANCEL_RENTAL',
      entityType: 'RENTAL',
      entityId: String(rentalId),
      newValue: { status: 'cancelled' },
    }, connection)

    await connection.commit()
  } catch (err) {
    try { await connection.rollback() } catch { /* ignore */ }
    throw err
  } finally {
    connection.release()
  }

  return getRental(rentalId)
}

/**
 * Get rental history for a specific customer.
 */
export async function getCustomerRentals(
  customerId: number,
  query: { page?: string; perPage?: string },
): Promise<PaginatedCustomerRentals> {
  const [customerRow] = await db.select().from(customers).where(eq(customers.id, customerId)).limit(1)
  if (!customerRow) throw new NotFoundError(`العميل رقم ${customerId} غير موجود`)

  const page = Math.max(1, parseInt(query.page ?? '1', 10))
  const perPage = Math.min(100, Math.max(1, parseInt(query.perPage ?? '20', 10)))
  const offset = (page - 1) * perPage

  const [{ total }] = await db
    .select({ total: count() })
    .from(rentals)
    .where(eq(rentals.customerId, customerId))

  const rentalIdRows = await db
    .select({ id: rentals.id })
    .from(rentals)
    .where(eq(rentals.customerId, customerId))
    .orderBy(desc(rentals.startedAt))
    .limit(perPage)
    .offset(offset)

  const groups = await fetchRentalsByCondition(
    rentalIdRows.length > 0
      ? inArray(rentals.id, rentalIdRows.map(r => r.id))
      : eq(rentals.id, -1)
  )

  const orderedGroups = rentalIdRows.map(r =>
    groups.find(g => g.rental.id === r.id)!
  ).filter(Boolean)

  const data: CustomerRentalHistoryItem[] = orderedGroups.map(({ rental, items }) => ({
    id: rental.id,
    rentalCode: rental.rentalCode,
    items: items.map(i => rawItemToDTO(i)),
    totalAmount: rental.totalAmount != null ? parseFloat(String(rental.totalAmount)) : null,
    startedAt: isoDateNotNull(rental.startedAt),
    completedAt: isoDate(rental.completedAt),
    status: rental.status,
  }))

  return {
    data,
    pagination: {
      page,
      perPage,
      total: Number(total),
      totalPages: Math.ceil(Number(total) / perPage),
    },
  }
}

// ---------------------------------------------------------------------------
// Legacy compatibility: returnRental (for old single-skate tests / migration)
// Delegates to returnRentalItem for the first active item of the rental
// ---------------------------------------------------------------------------

export async function returnRental(
  rentalId: number,
  cashierId: number,
  data: import('./rentals.types.js').ReturnRentalItemRequest,
): Promise<RentalDTO & { lastInspectionId: number }> {
  // Find the (single) active item for this rental
  const itemRows = await db
    .select({ id: rentalItems.id })
    .from(rentalItems)
    .where(and(eq(rentalItems.rentalId, rentalId), eq(rentalItems.status, 'active')))
    .limit(1)

  if (!itemRows[0]) {
    throw new BusinessRuleError('لا يوجد بند إيجار نشط لهذا الإيجار', 'NO_ACTIVE_ITEM')
  }

  const result = await returnRentalItem(itemRows[0].id, cashierId, data)
  return { ...result.rental, lastInspectionId: result.lastInspectionId }
}
