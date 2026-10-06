/**
 * KOSHK SKATE ERP — Rentals Service
 * Phase 05 — Rental POS Core
 *
 * Business rules enforced here:
 *   - BR-01/BR-02/BR-03: skate must be status='available' (enforced inside TX with FOR UPDATE)
 *   - BR-04/BR-26: hourly rate comes from settings table — never hardcoded
 *   - BR-05/BR-20: expected_end_at = started_at + duration_minutes (stored)
 *   - BR-11/BR-17: price_per_hour and rental_amount are immutable snapshots
 *   - BR-15/DEC-065: raw_amount = hourlyRate × durationMinutes / 60
 *   - BR-16/DEC-067: rental_amount = Math.round(raw_amount) — nearest whole EGP
 *   - BR-21/DEC-062: rental_code = RN-NNNNN, based on auto-increment PK, UNIQUE
 *   - BR-22/DEC-064: persisted statuses: active | returned | cancelled ONLY
 *   - BR-23/DEC-066: operational statuses computed server-side — never stored
 *   - BR-24/DEC-052: deactivated customers cannot start a new rental
 *   - BR-29/DEC-060: no payment recording in Phase 05
 *   - BR-31/DEC-066: ending_soon threshold = 5 minutes
 *   - BR-32/DEC-068: initial rate = 120 EGP (from settings, not hardcoded)
 *   - BR-10/DEC-063: concurrency — FOR UPDATE lock on skate inside transaction
 *
 * Rental Code Concurrency Strategy (DEC-062, F-05 remediation):
 *   Previous: MAX+1 from rental_code inside TX.
 *   Problem:  Two concurrent inserts for DIFFERENT skates both read the same MAX
 *             before either commits → UNIQUE constraint collision → one valid
 *             rental fails.
 *
 *   Current: INSERT with a temporary placeholder code, then UPDATE the code
 *            to 'RN-' + padStart(insertId, 5) in the same transaction.
 *            The auto-increment PK is assigned by InnoDB and is globally unique
 *            even across concurrent transactions — no two inserts ever share an
 *            insertId. This guarantees:
 *              • Sequential order (by creation time via auto-increment)
 *              • Never reused (PK is never recycled)
 *              • UNIQUE constraint still enforced (no duplicates possible)
 *              • DEC-062 format preserved: RN-NNNNN
 *
 * Same-skate concurrency (TC-RENT-20):
 *   startRental() uses a raw MySQL connection with:
 *     BEGIN; SELECT ... FOR UPDATE; INSERT; UPDATE code; UPDATE skate; COMMIT;
 *   The FOR UPDATE row lock on the skate prevents two cashiers from renting
 *   the same skate simultaneously.
 */

import { eq, sql, and, gte, lte, count, asc, desc, inArray, lt, gt } from 'drizzle-orm'
import { auditService } from '../audit/audit.service.js';
import { pool } from '../../db/connection.js'
import { db } from '../../db/connection.js'
import { rentals, ENDING_SOON_THRESHOLD_MINUTES } from '../../db/schema/rentals.js'
import { skates } from '../../db/schema/skates.js'
import { reservations } from '../../db/schema/reservations.js'
import { customers } from '../../db/schema/customers.js'
import { users } from '../../db/schema/users.js'
import { settings } from '../../db/schema/settings'
import { paymentMethods, rentalPayments, treasuryMovements, treasuryAccounts } from '../../db/schema/payments'
import { lateFeeRecords } from '../../db/schema/inspections.js'
import {
  NotFoundError,
  ValidationError,
  BusinessRuleError,
} from '../../utils/errors.js'
import type {
  RentalDTO,
  ActiveRentalDTO,
  StartRentalRequest,
  ListRentalsQuery,
  PaginatedRentals,
  PricePreviewDTO,
  CustomerRentalHistoryItem,
  PaginatedCustomerRentals,
  RentalSkateInfo,
  RentalCustomerInfo,
  RentalCashierInfo,
} from './rentals.types.js'
import type { RentalStatus, RentalOperationalStatus } from '../../db/schema/rentals.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Masks national_id per DEC-056 (duplicated from customers.types to avoid cross-module import) */
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
 * rental_amount = Math.round(raw)  — nearest whole EGP, .5 rounds up
 */
function calculateRentalAmount(hourlyRate: number, durationMinutes: number): number {
  const raw = (hourlyRate * durationMinutes) / 60
  return Math.round(raw)
}

/**
 * DEC-066: Compute server-side operational status.
 * Threshold: ENDING_SOON_THRESHOLD_MINUTES (5 minutes)
 *
 * Boundary rules (DEC-066, DEC-070):
 *   remaining_time > 5 min          → normal
 *   remaining_time <= 5 AND > 0     → ending_soon
 *   NOW() > expected_end_at         → overdue  (strict greater-than)
 *   NOW() === expected_end_at       → NOT overdue (exactly at end = still ending_soon or normal)
 */
function computeOperationalStatus(
  expectedEndAt: Date | string,
  nowMs: number,
): { operationalStatus: RentalOperationalStatus; remainingMinutes: number } {
  const endMs = expectedEndAt instanceof Date
    ? expectedEndAt.getTime()
    : new Date(isoDateNotNull(expectedEndAt)).getTime()

  const diffMs = endMs - nowMs
  const diffMinutes = diffMs / 60000  // signed: negative = overdue

  // DEC-066: overdue only when NOW() > expected_end_at (strictly greater-than)
  // At exact equality (diffMinutes === 0), the rental is NOT yet overdue.
  if (diffMinutes < 0) {
    return { operationalStatus: 'overdue', remainingMinutes: 0 }
  }

  const remainingMinutes = Math.ceil(diffMinutes) // round up for display
  if (remainingMinutes <= ENDING_SOON_THRESHOLD_MINUTES) {
    return { operationalStatus: 'ending_soon', remainingMinutes }
  }

  return { operationalStatus: 'normal', remainingMinutes }
}

/**
 * Read the current configured hourly rate from the settings table.
 * DEC-061, DEC-068: Must be read at runtime — never hardcoded.
 * Throws BusinessRuleError if the key is missing (PRICING_CONFIG_MISSING).
 */
async function readHourlyRate(): Promise<number> {
  const [row] = await db
    .select()
    .from(settings)
    .where(eq(settings.key, 'rental_hourly_rate'))
    .limit(1)

  if (!row) {
    throw new BusinessRuleError(
      'إعدادات التسعير غير متوفرة',
      'PRICING_CONFIG_MISSING',
    )
  }

  const rate = parseFloat(row.value)
  if (!isFinite(rate) || rate <= 0) {
    throw new BusinessRuleError(
      'إعدادات التسعير غير صالحة',
      'PRICING_CONFIG_MISSING',
    )
  }

  return rate
}

// ---------------------------------------------------------------------------
// DTO mappers — raw join rows to typed DTOs
// ---------------------------------------------------------------------------

interface RawRentalRow {
  id: number
  rentalCode: string
  skateId: number
  customerId: number
  cashierId: number
  shiftId: number | null
  durationMinutes: number
  pricePerHour: string | number
  rentalAmount: string | number
  startedAt: Date | string
  expectedEndAt: Date | string
  returnedAt: Date | string | null
  status: RentalStatus
  notes: string | null
  createdAt: Date | string
  updatedAt: Date | string
  // joined fields
  skateCode?: string
  skateSize?: string
  skateType?: string | null
  customerName?: string
  customerPhone?: string
  customerNationalId?: string | null
  cashierName?: string
  lateMinutes?: number | null
  calculatedFee?: string | number | null
}

function rawToDTO(row: RawRentalRow): RentalDTO {
  const skate: RentalSkateInfo = {
    id: row.skateId,
    skateCode: row.skateCode ?? '',
    size: row.skateSize ?? '',
    type: row.skateType ?? null,
  }
  const customer: RentalCustomerInfo = {
    id: row.customerId,
    name: row.customerName ?? '',
    phone: row.customerPhone ?? '',
    nationalIdMasked: maskNationalId(row.customerNationalId),
  }
  const cashier: RentalCashierInfo = {
    id: row.cashierId,
    name: row.cashierName ?? '',
  }

  let lateFeeDetails: { lateMinutes: number; calculatedFee: number } | undefined = undefined
  if (row.lateMinutes != null && row.calculatedFee != null) {
    lateFeeDetails = {
      lateMinutes: row.lateMinutes,
      calculatedFee: parseFloat(String(row.calculatedFee))
    }
  }

  return {
    id: row.id,
    rentalCode: row.rentalCode,
    skate,
    customer,
    cashier,
    shiftId: row.shiftId,
    durationMinutes: row.durationMinutes,
    pricePerHour: parseFloat(String(row.pricePerHour)),
    rentalAmount: parseFloat(String(row.rentalAmount)),
    startedAt: isoDateNotNull(row.startedAt),
    expectedEndAt: isoDateNotNull(row.expectedEndAt),
    returnedAt: isoDate(row.returnedAt),
    status: row.status,
    notes: row.notes,
    lateFeeDetails,
    createdAt: isoDateNotNull(row.createdAt),
    updatedAt: isoDateNotNull(row.updatedAt),
  }
}

// ---------------------------------------------------------------------------
// Joined query helper — all rental columns plus related entity fields
// ---------------------------------------------------------------------------

async function fetchRentalsJoined(whereClause?: ReturnType<typeof and>): Promise<RawRentalRow[]> {
  const rows = await db
    .select({
      id: rentals.id,
      rentalCode: rentals.rentalCode,
      skateId: rentals.skateId,
      customerId: rentals.customerId,
      cashierId: rentals.cashierId,
      shiftId: rentals.shiftId,
      durationMinutes: rentals.durationMinutes,
      pricePerHour: rentals.pricePerHour,
      rentalAmount: rentals.rentalAmount,
      startedAt: rentals.startedAt,
      expectedEndAt: rentals.expectedEndAt,
      returnedAt: rentals.returnedAt,
      status: rentals.status,
      notes: rentals.notes,
      createdAt: rentals.createdAt,
      updatedAt: rentals.updatedAt,
      // Joined
      skateCode: skates.skateCode,
      skateSize: skates.size,
      skateType: skates.type,
      customerName: customers.name,
      customerPhone: customers.phone,
      customerNationalId: customers.nationalId,
      cashierName: users.name,
      lateMinutes: lateFeeRecords.lateMinutes,
      calculatedFee: lateFeeRecords.calculatedFee,
    })
    .from(rentals)
    .leftJoin(skates, eq(rentals.skateId, skates.id))
    .leftJoin(customers, eq(rentals.customerId, customers.id))
    .leftJoin(users, eq(rentals.cashierId, users.id))
    .leftJoin(lateFeeRecords, eq(rentals.id, lateFeeRecords.rentalId))
    .where(whereClause)
    .orderBy(desc(rentals.startedAt))

  return rows as RawRentalRow[]
}

// ---------------------------------------------------------------------------
// Service Methods
// ---------------------------------------------------------------------------

/**
 * Rental POS configuration (F-06 — DEC-069).
 * Returns the configured hourly rate and standard duration options.
 * Backed by the settings table — not hardcoded in application code.
 * Used by GET /api/v1/rentals/config.
 *
 * DEC-070 / BR-26: Both settings keys are REQUIRED.
 * If either is absent, malformed, or invalid, this method throws an explicit
 * configuration error. It does NOT silently fall back to hardcoded values.
 *
 * No Settings management UI is created in Phase 05.
 * This endpoint is Rental-module-specific and read-only.
 */
export async function getRentalConfig(): Promise<{
  pricePerHour: number
  durationOptions: number[]
  lateFeePerMinute: number
}> {
  const [rateSetting, durationsSetting, lateFeeSetting] = await Promise.all([
    db.select().from(settings).where(eq(settings.key, 'rental_hourly_rate')).limit(1),
    db.select().from(settings).where(eq(settings.key, 'rental_duration_options')).limit(1),
    db.select().from(settings).where(eq(settings.key, 'late_fee_per_minute')).limit(1),
  ])

  if (!rateSetting[0]) {
    throw new BusinessRuleError('إعدادات التسعير غير متوفرة', 'PRICING_CONFIG_MISSING')
  }

  const pricePerHour = parseFloat(rateSetting[0].value)
  if (!isFinite(pricePerHour) || pricePerHour <= 0) {
    throw new BusinessRuleError('إعدادات التسعير غير صالحة', 'PRICING_CONFIG_MISSING')
  }

  // --- Duration options: authoritative from settings, no hardcoded fallback (BR-26, DEC-070) ---
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

  if (!lateFeeSetting[0]) {
    throw new BusinessRuleError('إعداد رسوم التأخير غير متوفر', 'LATE_FEE_CONFIG_MISSING')
  }
  const lateFeePerMinute = parseFloat(lateFeeSetting[0].value)

  return { pricePerHour, durationOptions, lateFeePerMinute }
}

/**
 * Calculate rental price preview (server-authoritative).
 * DEC-065, DEC-067: formula + rounding.
 * No rental record is created.
 */
export async function calculatePrice(durationMinutes: number): Promise<PricePreviewDTO> {
  if (!Number.isInteger(durationMinutes) || durationMinutes <= 0) {
    throw new ValidationError('مدة الإيجار غير صالحة', { durationMinutes: 'يجب أن تكون مدة الإيجار عدداً صحيحاً أكبر من صفر' })
  }

  const hourlyRate = await readHourlyRate()
  const rentalAmount = calculateRentalAmount(hourlyRate, durationMinutes)

  return { durationMinutes, pricePerHour: hourlyRate, rentalAmount }
}

/**
 * Start a new rental (Rental POS — primary workflow).
 *
 * ATOMIC TRANSACTION with FOR UPDATE locking on the skate row.
 * Prevents double-booking under concurrent requests.
 *
 * Steps (BR-01 through BR-32):
 *  1. Validate inputs
 *  2. Verify skate exists (outside TX — for better error messaging)
 *  3. Verify customer exists and is active (outside TX)
 *  4. Read hourly rate from settings (outside TX)
 *  5. BEGIN TRANSACTION
 *  6. SELECT skate FOR UPDATE (row-level lock)
 *  7. Verify skate status = 'available' (authoritative check inside TX)
 *  8. Calculate rental_amount (DEC-065, DEC-067)
 *  9. INSERT with temporary placeholder code; derive final code from insertId (DEC-070)
 * 10. Capture server start time
 * 11. Calculate expected_end_at
 * 12. INSERT rental record
 * 13. UPDATE rental_code to RN-NNNNN using insertId
 * 14. UPDATE skate status = 'rented'
 * 15. COMMIT
 */
export async function startRental(
  cashierId: number,
  data: StartRentalRequest,
): Promise<RentalDTO> {
  // --- Input validation ---
  if (!data.skateId || !Number.isInteger(data.skateId) || data.skateId <= 0) {
    throw new ValidationError('معرف الاسكيت مطلوب')
  }
  if (!data.customerId || !Number.isInteger(data.customerId) || data.customerId <= 0) {
    throw new ValidationError('معرف العميل مطلوب')
  }
  if (!data.durationMinutes || !Number.isInteger(data.durationMinutes) || data.durationMinutes <= 0) {
    throw new ValidationError('مدة الإيجار غير صالحة', { durationMinutes: 'يجب أن تكون مدة الإيجار عدداً صحيحاً أكبر من صفر' })
  }
  if (data.notes && data.notes.length > 1000) {
    throw new ValidationError('الملاحظات تتجاوز الحد الأقصى 1000 حرف')
  }

  // --- Validate payments array (Phase 06) ---
  if (!Array.isArray(data.payments) || data.payments.length === 0) {
    throw new ValidationError('المدفوعات مطلوبة')
  }
  let requestedTotalPayment = 0
  for (const p of data.payments) {
    if (!p.paymentMethodId || !Number.isInteger(p.paymentMethodId) || p.paymentMethodId <= 0) {
      throw new ValidationError('معرف طريقة الدفع غير صالح')
    }
    if (typeof p.amount !== 'number' || p.amount <= 0) {
      throw new ValidationError('مبلغ الدفعة غير صالح')
    }
    requestedTotalPayment += p.amount
  }

  // --- Pre-flight: skate exists (application-layer check for better UX) ---
  const [skateRow] = await db.select().from(skates).where(eq(skates.id, data.skateId)).limit(1)
  if (!skateRow) throw new NotFoundError('الاسكيت غير موجودة')

  // --- Pre-flight: customer exists and is active ---
  const [customerRow] = await db.select().from(customers).where(eq(customers.id, data.customerId)).limit(1)
  if (!customerRow) throw new NotFoundError('العميل غير موجود')
  if (!customerRow.isActive) {
    throw new BusinessRuleError('لا يمكن إنشاء إيجار لعميل معطل', 'CUSTOMER_INACTIVE')
  }

  // --- Read hourly rate from settings (DEC-061, DEC-068) ---
  const hourlyRate = await readHourlyRate()

  // --- Enforce active shift (Phase 12 DEC-071) ---
  const [activeShiftRows] = await db.execute(
    sql`SELECT id FROM cashier_shifts WHERE cashier_id = ${cashierId} AND status = 'active' LIMIT 1`
  )
  const activeShift = (activeShiftRows as unknown as any[])[0]
  if (!activeShift) {
    throw new BusinessRuleError('عملية إنشاء الإيجار تتطلب وجود وردية نشطة. يرجى فتح وردية أولاً.', 'NO_ACTIVE_SHIFT')
  }

  // --- Atomic transaction with FOR UPDATE locking ---
  const connection = await pool.getConnection()
  let newRentalId: number

  try {
    await connection.beginTransaction()

    // Lock the skate row — prevents concurrent cashiers from renting same skate
    const [skateRows] = await connection.execute<any[]>(
      'SELECT id, status FROM skates WHERE id = ? FOR UPDATE',
      [data.skateId],
    )

    const lockedSkate = skateRows[0]
    if (!lockedSkate || lockedSkate.status !== 'available') {
      await connection.rollback()
      throw new BusinessRuleError('الاسكيت غير متاحة للاستئجار', 'SKATE_NOT_AVAILABLE')
    }

    // Check for active reservations that overlap with the intended rental duration
    const startedAt = new Date()
    const expectedEndAt = new Date(startedAt.getTime() + data.durationMinutes * 60000)

    const overlapRows = await db.select({ id: reservations.id, customerId: reservations.customerId })
      .from(reservations)
      .where(and(
        eq(reservations.skateId, data.skateId),
        inArray(reservations.status, ['pending', 'confirmed']),
        lt(reservations.reservedFrom, expectedEndAt),
        gt(reservations.reservedUntil, startedAt)
      ))

    if (overlapRows.length > 0) {
      if (!data.reservationId || overlapRows[0].id !== data.reservationId) {
        await connection.rollback()
        throw new BusinessRuleError('الاسكيت محجوزة حاليا ولا يمكن استئجارها', 'SKATE_RESERVED')
      }
    }

    // Fulfill reservation if provided
    if (data.reservationId) {
      const [resRows] = await connection.execute<any[]>(
        'SELECT id, status, customer_id, skate_id FROM reservations WHERE id = ? FOR UPDATE',
        [data.reservationId]
      )
      if (!resRows[0]) {
        await connection.rollback()
        throw new NotFoundError('الحجز غير موجود')
      }
      if (resRows[0].status !== 'pending' && resRows[0].status !== 'confirmed') {
        await connection.rollback()
        throw new BusinessRuleError('لا يمكن تنفيذ حجز غير نشط', 'RESERVATION_NOT_ACTIVE')
      }
      if (resRows[0].customer_id !== data.customerId || resRows[0].skate_id !== data.skateId) {
        await connection.rollback()
        throw new BusinessRuleError('بيانات الحجز لا تتطابق مع طلب الإيجار', 'RESERVATION_MISMATCH')
      }

      await connection.execute(
        "UPDATE reservations SET status = 'fulfilled', updated_at = NOW() WHERE id = ?",
        [data.reservationId]
      )
    }

    // Calculate rental amount (DEC-065, DEC-067)
    const rentalAmount = calculateRentalAmount(hourlyRate, data.durationMinutes)

    // Capture server time (BR-19)
    // (Variables startedAt and expectedEndAt already calculated above for reservation check)

    // Phase 14: Unified Invoice Number Generation — F-003 fix
    // Use LAST_INSERT_ID(value + 1) so the incremented value is session-scoped.
    // SELECT LAST_INSERT_ID() reads ONLY the value this session wrote, preventing
    // concurrent transactions from reading each other's sequence value.
    await connection.execute(
      `INSERT INTO sequences (name, value) VALUES ('invoice_number', 1)
       ON DUPLICATE KEY UPDATE value = LAST_INSERT_ID(value + 1)`
    )
    const [seqRows] = await connection.execute<any[]>(
      `SELECT LAST_INSERT_ID() AS value`
    )
    const invoiceVal = seqRows[0].value
    const invoiceNumber = `INV-${String(invoiceVal).padStart(6, '0')}`

    // INSERT rental record with a temporary placeholder code.
    // The final rental_code is derived from the auto-increment insertId (DEC-062, F-05).
    // A temporary unique placeholder prevents the UNIQUE constraint from rejecting the row
    // before we can compute the real code from the insertId.
    const tempCode = `TEMP-${Date.now()}-${Math.random().toString(36).slice(2)}`
    const [insertResult] = await connection.execute<any>(
      `INSERT INTO rentals
        (rental_code, invoice_number, skate_id, customer_id, cashier_id, shift_id, duration_minutes,
         price_per_hour, rental_amount, started_at, expected_end_at, status, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, NOW(), NOW())`,
      [
        tempCode,
        invoiceNumber,
        data.skateId,
        data.customerId,
        cashierId,
        activeShift.id,
        data.durationMinutes,
        hourlyRate.toFixed(2),
        rentalAmount.toFixed(2),
        startedAt,
        expectedEndAt,
        data.notes ?? null,
      ],
    )

    newRentalId = insertResult.insertId

    // Derive the final rental code from the auto-increment PK (DEC-062, F-05).
    // insertId is globally unique — no two concurrent inserts ever share one.
    // Format: RN-NNNNN (minimum 5 digits, no maximum).
    const rentalCode = 'RN-' + String(newRentalId).padStart(5, '0')

    // Update the placeholder code to the final code in the same transaction
    await connection.execute(
      'UPDATE rentals SET rental_code = ? WHERE id = ?',
      [rentalCode, newRentalId],
    )

    // Transition skate status: available → rented (DEC-031, BR-18)
    await connection.execute(
      "UPDATE skates SET status = 'rented', updated_at = NOW() WHERE id = ?",
      [data.skateId],
    )

    // Phase 06: Process payments
    // 1. Validate payment total exactly matches rentalAmount
    if (Math.abs(requestedTotalPayment - rentalAmount) > 0.001) {
      await connection.rollback()
      throw new BusinessRuleError('إجمالي المدفوعات لا يساوي قيمة الإيجار', 'INVALID_PAYMENT_TOTAL')
    }

    // 2. Lock and verify all payment methods
    const paymentMethodIds = data.payments.map(p => p.paymentMethodId)
    const placeholders = paymentMethodIds.map(() => '?').join(',')
    const [pmRows] = await connection.execute<any[]>(
      `SELECT id, treasury_account_id, is_active FROM payment_methods WHERE id IN (${placeholders}) FOR UPDATE`,
      paymentMethodIds
    )

    for (const p of data.payments) {
      const pm = pmRows.find(row => row.id === p.paymentMethodId)
      if (!pm) {
        await connection.rollback()
        throw new NotFoundError(`طريقة الدفع رقم ${p.paymentMethodId} غير موجودة`)
      }
      if (!pm.is_active) {
        await connection.rollback()
        throw new BusinessRuleError(`طريقة الدفع رقم ${p.paymentMethodId} غير مفعلة`, 'PAYMENT_METHOD_INACTIVE')
      }

      // INSERT rental_payments
      await connection.execute(
        `INSERT INTO rental_payments (rental_id, payment_method_id, amount, cashier_id, created_at) VALUES (?, ?, ?, ?, NOW())`,
        [newRentalId, p.paymentMethodId, p.amount, cashierId]
      )

      // INSERT treasury_movements
      await connection.execute(
        `INSERT INTO treasury_movements (treasury_account_id, amount, type, reference_type, reference_id, cashier_id, shift_id, notes, created_at) VALUES (?, ?, 'in', 'rental_payment', ?, ?, ?, ?, NOW())`,
        [pm.treasury_account_id, p.amount, newRentalId, cashierId, activeShift.id, `Rental ${rentalCode} Payment`]
      )

      // UPDATE treasury_accounts balance
      await connection.execute(
        `UPDATE treasury_accounts SET balance = balance + ?, updated_at = NOW() WHERE id = ?`,
        [p.amount, pm.treasury_account_id]
      )
    }

    // Phase 16: Audit Log (Atomic with business transaction)
    await connection.execute(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_value, new_value, created_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [
        cashierId,
        'START_RENTAL',
        'RENTAL',
        newRentalId,
        JSON.stringify({ status: 'available' }),
        JSON.stringify({ status: 'rented', durationMinutes: data.durationMinutes, rentalAmount })
      ]
    )

    await connection.commit()
  } catch (err) {
    try { await connection.rollback() } catch { /* ignore rollback error */ }
    throw err
  } finally {
    connection.release()
  }

  // Fetch and return the created rental with joins
  const rows = await fetchRentalsJoined(eq(rentals.id, newRentalId))
  if (!rows[0]) throw new Error('Failed to retrieve created rental')

  return rawToDTO(rows[0])
}

/**
 * Get active rentals with server-computed operational status.
 * DEC-064, DEC-066: operational status is computed — never stored.
 */
export async function getActiveRentals(): Promise<ActiveRentalDTO[]> {
  const rows = await fetchRentalsJoined(eq(rentals.status, 'active'))

  const nowMs = Date.now()

  return rows.map(row => {
    const dto = rawToDTO(row)
    const { operationalStatus, remainingMinutes } = computeOperationalStatus(row.expectedEndAt, nowMs)
    return { ...dto, operationalStatus, remainingMinutes }
  })
}

/**
 * List rentals with pagination and filters.
 */
export async function listRentals(query: ListRentalsQuery): Promise<PaginatedRentals> {
  const page = Math.max(1, parseInt(query.page ?? '1', 10))
  const perPage = Math.min(100, Math.max(1, parseInt(query.perPage ?? '20', 10)))
  const offset = (page - 1) * perPage

  const conditions: ReturnType<typeof eq>[] = []

  if (query.status && ['active', 'returned', 'cancelled'].includes(query.status)) {
    conditions.push(eq(rentals.status, query.status as RentalStatus))
  }
  if (query.skateId) conditions.push(eq(rentals.skateId, parseInt(query.skateId, 10)))
  if (query.customerId) conditions.push(eq(rentals.customerId, parseInt(query.customerId, 10)))
  if (query.cashierId) conditions.push(eq(rentals.cashierId, parseInt(query.cashierId, 10)))
  if (query.from) conditions.push(gte(rentals.startedAt, new Date(query.from)))
  if (query.to) conditions.push(lte(rentals.startedAt, new Date(query.to)))

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined

  const [{ total }] = await db
    .select({ total: count() })
    .from(rentals)
    .where(whereClause)

  const rows = await db
    .select({
      id: rentals.id,
      rentalCode: rentals.rentalCode,
      skateId: rentals.skateId,
      customerId: rentals.customerId,
      cashierId: rentals.cashierId,
      shiftId: rentals.shiftId,
      durationMinutes: rentals.durationMinutes,
      pricePerHour: rentals.pricePerHour,
      rentalAmount: rentals.rentalAmount,
      startedAt: rentals.startedAt,
      expectedEndAt: rentals.expectedEndAt,
      returnedAt: rentals.returnedAt,
      status: rentals.status,
      notes: rentals.notes,
      createdAt: rentals.createdAt,
      updatedAt: rentals.updatedAt,
      skateCode: skates.skateCode,
      skateSize: skates.size,
      skateType: skates.type,
      customerName: customers.name,
      customerPhone: customers.phone,
      customerNationalId: customers.nationalId,
      cashierName: users.name,
    })
    .from(rentals)
    .leftJoin(skates, eq(rentals.skateId, skates.id))
    .leftJoin(customers, eq(rentals.customerId, customers.id))
    .leftJoin(users, eq(rentals.cashierId, users.id))
    .where(whereClause)
    .orderBy(desc(rentals.startedAt))
    .limit(perPage)
    .offset(offset)

  return {
    data: (rows as RawRentalRow[]).map(rawToDTO),
    pagination: {
      page,
      perPage,
      total: Number(total),
      totalPages: Math.ceil(Number(total) / perPage),
    },
  }
}

/**
 * Get a single rental by ID with full joins.
 */
export async function getRental(id: number): Promise<RentalDTO> {
  const rows = await fetchRentalsJoined(eq(rentals.id, id))
  if (!rows[0]) throw new NotFoundError(`الإيجار رقم ${id} غير موجود`)
  return rawToDTO(rows[0])
}

/**
 * Get rental history for a specific customer (DEC-055).
 * Paginated, ordered by started_at DESC.
 */
export async function getCustomerRentals(
  customerId: number,
  query: { page?: string; perPage?: string },
): Promise<PaginatedCustomerRentals> {
  // Verify customer exists
  const [customerRow] = await db.select().from(customers).where(eq(customers.id, customerId)).limit(1)
  if (!customerRow) throw new NotFoundError(`العميل رقم ${customerId} غير موجود`)

  const page = Math.max(1, parseInt(query.page ?? '1', 10))
  const perPage = Math.min(100, Math.max(1, parseInt(query.perPage ?? '20', 10)))
  const offset = (page - 1) * perPage

  const [{ total }] = await db
    .select({ total: count() })
    .from(rentals)
    .where(eq(rentals.customerId, customerId))

  const rows = await db
    .select({
      id: rentals.id,
      rentalCode: rentals.rentalCode,
      skateId: rentals.skateId,
      durationMinutes: rentals.durationMinutes,
      rentalAmount: rentals.rentalAmount,
      startedAt: rentals.startedAt,
      expectedEndAt: rentals.expectedEndAt,
      returnedAt: rentals.returnedAt,
      status: rentals.status,
      skateCode: skates.skateCode,
      skateSize: skates.size,
      skateType: skates.type,
    })
    .from(rentals)
    .leftJoin(skates, eq(rentals.skateId, skates.id))
    .where(eq(rentals.customerId, customerId))
    .orderBy(desc(rentals.startedAt))
    .limit(perPage)
    .offset(offset)

  const data: CustomerRentalHistoryItem[] = rows.map(row => ({
    id: row.id,
    rentalCode: row.rentalCode,
    skate: {
      id: row.skateId,
      skateCode: (row as any).skateCode ?? '',
      size: (row as any).skateSize ?? '',
      type: (row as any).skateType ?? null,
    },
    durationMinutes: row.durationMinutes,
    rentalAmount: parseFloat(String(row.rentalAmount)),
    startedAt: isoDateNotNull(row.startedAt),
    expectedEndAt: isoDateNotNull(row.expectedEndAt),
    returnedAt: isoDate(row.returnedAt),
    status: row.status,
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

/**
 * Cancel an active rental (Phase 06).
 * Reverts skate to 'available', marks rental as 'cancelled'.
 * Automatically refunds any upfront payments via compensating treasury movements.
 */
export async function cancelRental(rentalId: number, cashierId: number): Promise<RentalDTO> {
  // --- Enforce active shift (Phase 12 DEC-071) ---
  const [activeShiftRows] = await db.execute(
    sql`SELECT id FROM cashier_shifts WHERE cashier_id = ${cashierId} AND status = 'active' LIMIT 1`
  )
  const activeShift = (activeShiftRows as unknown as any[])[0]
  if (!activeShift) {
    throw new BusinessRuleError('عملية إلغاء الإيجار تتطلب وجود وردية نشطة. يرجى فتح وردية أولاً.', 'NO_ACTIVE_SHIFT')
  }
  const connection = await pool.getConnection()

  try {
    await connection.beginTransaction()

    // 1. Lock the rental
    const [rentalRows] = await connection.execute<any[]>(
      'SELECT id, skate_id, status FROM rentals WHERE id = ? FOR UPDATE',
      [rentalId]
    )
    const rental = rentalRows[0]
    if (!rental) {
      await connection.rollback()
      throw new NotFoundError(`الإيجار رقم ${rentalId} غير موجود`)
    }
    if (rental.status !== 'active') {
      await connection.rollback()
      throw new BusinessRuleError('لا يمكن إلغاء هذا الإيجار. يمكن إلغاء الإيجارات النشطة فقط.', 'RENTAL_NOT_CANCELLABLE')
    }

    // 2. Fetch payments for this rental with treasury_account info
    const [paymentRows] = await connection.execute<any[]>(
      `SELECT rp.id, rp.amount, pm.treasury_account_id 
       FROM rental_payments rp
       JOIN payment_methods pm ON rp.payment_method_id = pm.id
       WHERE rp.rental_id = ? AND rp.payment_type = 'rental'`,
      [rentalId]
    )

    // 3. Process refunds if there are payments
    for (const pay of paymentRows) {
      // INSERT refund treasury_movement (out)
      await connection.execute(
        `INSERT INTO treasury_movements (treasury_account_id, amount, type, reference_type, reference_id, cashier_id, shift_id, notes, created_at) VALUES (?, ?, 'out', 'rental_refund', ?, ?, ?, ?, NOW())`,
        [pay.treasury_account_id, pay.amount, rentalId, cashierId, activeShift.id, `Refund for cancelled rental ${rentalId}`]
      )

      // UPDATE treasury_accounts balance (deduct)
      await connection.execute(
        `UPDATE treasury_accounts SET balance = balance - ?, updated_at = NOW() WHERE id = ?`,
        [pay.amount, pay.treasury_account_id]
      )
    }

    // 4. Mark rental as cancelled
    await connection.execute(
      "UPDATE rentals SET status = 'cancelled', updated_at = NOW() WHERE id = ?",
      [rentalId]
    )

    await auditService.logRaw({ userId: cashierId, action: 'CANCEL_RENTAL', entityType: 'RENTAL', entityId: String(rentalId), newValue: { status: 'cancelled' } }, connection)

    if (paymentRows.length > 0) {
      const totalRefund = paymentRows.reduce((sum, p) => sum + p.amount, 0)
      await auditService.logRaw({ userId: cashierId, action: 'REFUND_RENTAL', entityType: 'RENTAL', entityId: String(rentalId), newValue: { refundedAmount: totalRefund } }, connection)
    }

    // 5. Release the skate
    await connection.execute(
      "UPDATE skates SET status = 'available', updated_at = NOW() WHERE id = ?",
      [rental.skate_id]
    )

    await connection.commit()
  } catch (err) {
    try { await connection.rollback() } catch { /* ignore rollback error */ }
    throw err
  } finally {
    connection.release()
  }

  return getRental(rentalId)
}

/**
 * Return a rental and process late fee / inspection (Phase 07).
 */
export async function returnRental(
  rentalId: number,
  cashierId: number,
  data: import('./rentals.types.js').ReturnRentalRequest
): Promise<RentalDTO & { lastInspectionId: number }> {
  // --- Enforce active shift (Phase 12 DEC-071) ---
  const [activeShiftRows] = await db.execute(
    sql`SELECT id FROM cashier_shifts WHERE cashier_id = ${cashierId} AND status = 'active' LIMIT 1`
  )
  const activeShift = (activeShiftRows as unknown as any[])[0]
  if (!activeShift) {
    throw new BusinessRuleError('عملية إرجاع الإيجار تتطلب وجود وردية نشطة. يرجى فتح وردية أولاً.', 'NO_ACTIVE_SHIFT')
  }
  // Read late_fee_per_minute from settings
  const [feeSetting] = await db.select().from(settings).where(eq(settings.key, 'late_fee_per_minute')).limit(1)
  if (!feeSetting) {
    throw new BusinessRuleError('إعداد رسوم التأخير غير متوفر', 'LATE_FEE_CONFIG_MISSING')
  }
  const lateFeePerMinute = parseFloat(feeSetting.value)

  const connection = await pool.getConnection()

  try {
    await connection.beginTransaction()

    // 1. Lock rental
    const [rentalRows] = await connection.execute<any[]>(
      'SELECT id, skate_id, status, expected_end_at FROM rentals WHERE id = ? FOR UPDATE',
      [rentalId]
    )
    const rental = rentalRows[0]
    if (!rental) {
      await connection.rollback()
      throw new NotFoundError(`الإيجار رقم ${rentalId} غير موجود`)
    }
    if (rental.status !== 'active') {
      await connection.rollback()
      throw new BusinessRuleError('لا يمكن إرجاع إيجار غير نشط', 'RENTAL_NOT_ACTIVE')
    }

    // 2. Lock skate
    const [skateRows] = await connection.execute<any[]>(
      'SELECT id, status FROM skates WHERE id = ? FOR UPDATE',
      [rental.skate_id]
    )
    const skate = skateRows[0]
    if (!skate) {
      await connection.rollback()
      throw new NotFoundError(`الاسكيت غير موجودة`)
    }

    // 3. Calculate late fee
    const now = new Date()
    const expectedEnd = new Date(rental.expected_end_at)
    let lateMinutes = 0
    let calculatedFee = 0

    if (now > expectedEnd) {
      const diffMs = now.getTime() - expectedEnd.getTime()
      lateMinutes = Math.ceil(diffMs / 60000)
      calculatedFee = Math.round(lateMinutes * lateFeePerMinute)
    }

    // 4. Validate accounting rule
    let collectedFee = 0
    if (data.payments && Array.isArray(data.payments)) {
      for (const p of data.payments) {
        if (typeof p.amount !== 'number' || p.amount <= 0) {
          await connection.rollback()
          throw new ValidationError('مبلغ الدفعة غير صالح')
        }
        collectedFee += p.amount
      }
    }

    const waivedFee = data.waivedFee ? parseFloat(String(data.waivedFee)) : 0
    if (waivedFee < 0) {
      await connection.rollback()
      throw new ValidationError('مبلغ الإعفاء لا يمكن أن يكون سالباً')
    }

    if (Math.abs(calculatedFee - (collectedFee + waivedFee)) > 0.001) {
      await connection.rollback()
      throw new BusinessRuleError(
        `الرسوم المحسوبة (${calculatedFee}) يجب أن تساوي المدفوع (${collectedFee}) + المعفى (${waivedFee})`,
        'INVALID_LATE_FEE_TOTAL'
      )
    }

    // 5. Process Payments
    if (collectedFee > 0) {
      const paymentMethodIds = data.payments.map(p => p.paymentMethodId)
      const placeholders = paymentMethodIds.map(() => '?').join(',')
      const [pmRows] = await connection.execute<any[]>(
        `SELECT id, treasury_account_id, is_active FROM payment_methods WHERE id IN (${placeholders}) FOR UPDATE`,
        paymentMethodIds
      )

      for (const p of data.payments) {
        const pm = pmRows.find(row => row.id === p.paymentMethodId)
        if (!pm) {
          await connection.rollback()
          throw new NotFoundError(`طريقة الدفع رقم ${p.paymentMethodId} غير موجودة`)
        }
        if (!pm.is_active) {
          await connection.rollback()
          throw new BusinessRuleError(`طريقة الدفع رقم ${p.paymentMethodId} غير مفعلة`, 'PAYMENT_METHOD_INACTIVE')
        }

        // INSERT rental_payments (with payment_type = 'late_fee')
        await connection.execute(
          `INSERT INTO rental_payments (rental_id, payment_method_id, amount, payment_type, cashier_id, created_at) VALUES (?, ?, ?, 'late_fee', ?, NOW())`,
          [rentalId, p.paymentMethodId, p.amount, cashierId]
        )

        // INSERT treasury_movements (with reference_type = 'late_fee_payment')
        await connection.execute(
          `INSERT INTO treasury_movements (treasury_account_id, amount, type, reference_type, reference_id, cashier_id, shift_id, notes, created_at) VALUES (?, ?, 'in', 'late_fee_payment', ?, ?, ?, ?, NOW())`,
          [pm.treasury_account_id, p.amount, rentalId, cashierId, activeShift.id, `Late fee payment for rental ${rentalId}`]
        )

        // UPDATE treasury_accounts balance
        await connection.execute(
          `UPDATE treasury_accounts SET balance = balance + ?, updated_at = NOW() WHERE id = ?`,
          [p.amount, pm.treasury_account_id]
        )
      }
    }

    // 6. Insert late fee record
    let lateFeeRecordId = null
    if (calculatedFee > 0 || lateMinutes > 0) {
      const [lfResult] = await connection.execute(
        `INSERT INTO late_fee_records (rental_id, late_minutes, calculated_fee, collected_fee, waived_fee, waived_by, waiver_reason, waived_at, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          rentalId,
          lateMinutes,
          calculatedFee,
          collectedFee,
          waivedFee,
          waivedFee > 0 ? cashierId : null,
          waivedFee > 0 ? (data.waiverReason ?? null) : null,
          waivedFee > 0 ? now : null
        ]
      )
      lateFeeRecordId = (lfResult as any).insertId

    }

    // 7. Insert inspection
    const ins = data.inspection
    const [insResult] = await connection.execute<any>(
      `INSERT INTO inspections (rental_id, skate_id, inspected_by, wheels_condition, brake_condition, strap_condition, bearings_condition, body_condition, other_notes, maintenance_required, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        rentalId,
        rental.skate_id,
        cashierId,
        ins.wheelsCondition,
        ins.brakeCondition,
        ins.strapCondition,
        ins.bearingsCondition,
        ins.bodyCondition,
        ins.otherNotes ?? null,
        ins.maintenanceRequired ? 1 : 0
      ]
    )
    const inspectionId = insResult.insertId

    // 8. Update rental
    await connection.execute(
      "UPDATE rentals SET status = 'returned', returned_at = NOW(), updated_at = NOW() WHERE id = ?",
      [rentalId]
    )

    await auditService.logRaw({ userId: cashierId, action: 'RETURN_RENTAL', entityType: 'RENTAL', entityId: String(rentalId), newValue: { status: 'returned' } }, connection)

    if (collectedFee > 0 && lateFeeRecordId) {
      await auditService.logRaw({ userId: cashierId, action: 'COLLECT_LATE_FEE', entityType: 'LATE_FEE', entityId: String(lateFeeRecordId), newValue: { rentalId, collectedFee } }, connection)
    }

    // 9. Update skate status
    const nextSkateStatus = ins.maintenanceRequired ? 'maintenance' : 'available'
    await connection.execute(
      "UPDATE skates SET status = ?, updated_at = NOW() WHERE id = ?",
      [nextSkateStatus, rental.skate_id]
    )

    // DEC-007: Phase 09 automatic maintenance record creation
    if (ins.maintenanceRequired) {
      await connection.execute(
        `INSERT INTO maintenance_records (skate_id, inspection_id, created_by, status, created_at, updated_at) 
         VALUES (?, ?, ?, 'pending', NOW(), NOW())`,
        [rental.skate_id, inspectionId, cashierId]
      )
    }

    // Phase 16: Audit Log
    if (waivedFee > 0) {
      await auditService.logRaw({ userId: cashierId, action: 'WAIVE_LATE_FEE', entityType: 'LATE_FEE', entityId: String(lateFeeRecordId), oldValue: { rentalId, calculatedFee }, newValue: { waivedFee, reason: data.waiverReason } }, connection)
    }

    await connection.commit()

    const rentalDto = await getRental(rentalId)
    return { ...rentalDto, lastInspectionId: inspectionId }
  } catch (err) {
    try { await connection.rollback() } catch { /* ignore rollback error */ }
    throw err
  } finally {
    connection.release()
  }
}
