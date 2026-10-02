import { eq, and, sql, gte, lte, count, asc, desc, inArray, or } from 'drizzle-orm'
import { db, pool } from '../../db/connection.js'
import { reservations } from '../../db/schema/reservations.js'
import { skates } from '../../db/schema/skates.js'
import { customers } from '../../db/schema/customers.js'
import { auditService } from '../audit/audit.service.js'
import { users } from '../../db/schema/users.js'
import { getSystemActorId } from '../users/users.service.js'
import { NotFoundError, ValidationError, BusinessRuleError } from '../../utils/errors.js'
import type {
  ReservationDTO,
  CreateReservationRequest,
  UpdateReservationRequest,
  ListReservationsQuery,
  PaginatedReservations,
} from './reservations.types.js'
import type { ReservationStatus } from '../../db/schema/reservations.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function maskNationalId(value: string | null | undefined): string {
  if (!value) return '—'
  if (value.length <= 4) return value
  return '*'.repeat(value.length - 4) + value.slice(-4)
}

function isoDateNotNull(d: Date | string): string {
  return d instanceof Date ? d.toISOString() : String(d)
}

interface RawReservationRow {
  id: number
  customerId: number
  skateId: number
  skateSize: string | null
  reservedFrom: Date | string
  reservedUntil: Date | string
  status: ReservationStatus
  createdBy: number
  notes: string | null
  createdAt: Date | string
  updatedAt: Date | string
  // joined fields
  customerName?: string
  customerPhone?: string
  customerNationalId?: string | null
  skateCode?: string
  skateSizeStr?: string
  skateType?: string | null
  createdByName?: string
}

function rawToDTO(row: RawReservationRow): ReservationDTO {
  return {
    id: row.id,
    customer: {
      id: row.customerId,
      name: row.customerName ?? '',
      phone: row.customerPhone ?? '',
      nationalIdMasked: maskNationalId(row.customerNationalId),
    },
    skate: {
      id: row.skateId,
      skateCode: row.skateCode ?? '',
      size: row.skateSizeStr ?? '',
      type: row.skateType ?? null,
    },
    skateSize: row.skateSize,
    reservedFrom: isoDateNotNull(row.reservedFrom),
    reservedUntil: isoDateNotNull(row.reservedUntil),
    status: row.status,
    createdBy: {
      id: row.createdBy,
      name: row.createdByName ?? '',
    },
    notes: row.notes,
    createdAt: isoDateNotNull(row.createdAt),
    updatedAt: isoDateNotNull(row.updatedAt),
  }
}

async function fetchReservationsJoined(whereClause?: ReturnType<typeof and>): Promise<RawReservationRow[]> {
  const rows = await db
    .select({
      id: reservations.id,
      customerId: reservations.customerId,
      skateId: reservations.skateId,
      skateSize: reservations.skateSize,
      reservedFrom: reservations.reservedFrom,
      reservedUntil: reservations.reservedUntil,
      status: reservations.status,
      createdBy: reservations.createdBy,
      notes: reservations.notes,
      createdAt: reservations.createdAt,
      updatedAt: reservations.updatedAt,
      // joined
      customerName: customers.name,
      customerPhone: customers.phone,
      customerNationalId: customers.nationalId,
      skateCode: skates.skateCode,
      skateSizeStr: skates.size,
      skateType: skates.type,
      createdByName: users.name,
    })
    .from(reservations)
    .leftJoin(customers, eq(reservations.customerId, customers.id))
    .leftJoin(skates, eq(reservations.skateId, skates.id))
    .leftJoin(users, eq(reservations.createdBy, users.id))
    .where(whereClause)
    .orderBy(desc(reservations.reservedFrom))

  return rows as RawReservationRow[]
}

/**
 * Lazy Expiration (BR-2):
 * Any reservation where reservedUntil <= NOW and status is 'pending' or 'confirmed'
 * should be updated to 'cancelled'.
 */
export async function lazyExpireReservations(): Promise<void> {
  const candidates = await db
    .select({ id: reservations.id })
    .from(reservations)
    .where(
      and(
        inArray(reservations.status, ['pending', 'confirmed']),
        lte(reservations.reservedUntil, sql`NOW()`)
      )
    )

  if (candidates.length === 0) return

  let systemActorId: number
  try {
    systemActorId = await getSystemActorId()
  } catch (err) {
    console.error('Failed to resolve System Actor ID for lazy expiration:', err)
    return
  }

  for (const candidate of candidates) {
    try {
      // 1. Atomically transition ONLY if still eligible (concurrency guard)
      const [result] = await db
        .update(reservations)
        .set({ status: 'cancelled' })
        .where(
          and(
            eq(reservations.id, candidate.id),
            inArray(reservations.status, ['pending', 'confirmed']),
            lte(reservations.reservedUntil, sql`NOW()`)
          )
        )

      // 2. Check if the transition actually happened
      if (result.affectedRows > 0) {
        // 3. Attempt audit independently
        try {
          await auditService.log({
            userId: systemActorId,
            action: 'SYSTEM_CANCEL_EXPIRED_RESERVATION',
            entityType: 'RESERVATION',
            entityId: String(candidate.id),
            newValue: { status: 'cancelled' }
          })
        } catch (auditErr) {
          // Swallow/log audit failure, DO NOT block business transition
          console.error(`Failed to log audit for expired reservation ${candidate.id}:`, auditErr)
        }
      }
    } catch (dbErr) {
      // Isolate business transition failure to the specific candidate
      console.error(`Failed to expire reservation ${candidate.id}:`, dbErr)
    }
  }
}

// ---------------------------------------------------------------------------
// Service Methods
// ---------------------------------------------------------------------------

export async function createReservation(userId: number, data: CreateReservationRequest): Promise<ReservationDTO> {
  // Input Validation
  if (!data.customerId || !Number.isInteger(data.customerId)) throw new ValidationError('معرف العميل مطلوب')
  if (!data.skateId || !Number.isInteger(data.skateId)) throw new ValidationError('معرف الزلاجة مطلوب (الحجز المخصص)')
  
  const from = new Date(data.reservedFrom)
  const until = new Date(data.reservedUntil)

  if (isNaN(from.getTime())) throw new ValidationError('تاريخ بداية الحجز غير صالح')
  if (isNaN(until.getTime())) throw new ValidationError('تاريخ نهاية الحجز غير صالح')
  if (from >= until) throw new ValidationError('تاريخ بداية الحجز يجب أن يكون قبل تاريخ النهاية')
  if (from < new Date()) throw new ValidationError('لا يمكن حجز في الماضي')

  const connection = await pool.getConnection()
  let newId: number
  try {
    await connection.beginTransaction()

    // 1. Lock the skate
    const [skateRows] = await connection.execute<any[]>(
      'SELECT id, status FROM skates WHERE id = ? FOR UPDATE',
      [data.skateId]
    )
    if (!skateRows[0]) {
      await connection.rollback()
      throw new NotFoundError('الزلاجة غير موجودة')
    }

    // 2. Lock the customer
    const [custRows] = await connection.execute<any[]>(
      'SELECT id, is_active FROM customers WHERE id = ? FOR UPDATE',
      [data.customerId]
    )
    if (!custRows[0]) {
      await connection.rollback()
      throw new NotFoundError('العميل غير موجود')
    }
    if (!custRows[0].is_active) {
      await connection.rollback()
      throw new BusinessRuleError('لا يمكن حجز زلاجة لعميل معطل', 'CUSTOMER_INACTIVE')
    }

    // 3. Prevent Overlaps (BR-5)
    // Overlap condition: existing.reservedFrom < new.reservedUntil AND existing.reservedUntil > new.reservedFrom
    const [overlapRows] = await connection.execute<any[]>(
      `SELECT id FROM reservations 
       WHERE skate_id = ? 
       AND status IN ('pending', 'confirmed') 
       AND reserved_from < ? 
       AND reserved_until > ?`,
      [data.skateId, until, from]
    )

    if (overlapRows.length > 0) {
      await connection.rollback()
      throw new BusinessRuleError('يوجد تعارض في مواعيد الحجز لهذه الزلاجة', 'RESERVATION_CONFLICT')
    }

    // 4. Insert Reservation
    const [insertResult] = await connection.execute<any>(
      `INSERT INTO reservations (customer_id, skate_id, reserved_from, reserved_until, status, created_by, notes, created_at, updated_at) 
       VALUES (?, ?, ?, ?, 'confirmed', ?, ?, NOW(), NOW())`,
      [data.customerId, data.skateId, from, until, userId, data.notes ?? null]
    )
    newId = insertResult.insertId
    await auditService.logRaw({ userId: userId, action: 'CREATE_RESERVATION', entityType: 'RESERVATION', entityId: String(newId), newValue: { skateId: data.skateId, customerId: data.customerId, reservedFrom: from.toISOString(), reservedUntil: until.toISOString() } }, connection)
    await connection.commit()
  } catch (err) {
    try { await connection.rollback() } catch {}
    throw err
  } finally {
    connection.release()
  }

  return await getReservation(newId)
}

export async function listReservations(query: ListReservationsQuery): Promise<PaginatedReservations> {
  await lazyExpireReservations() // Expire stale reservations on read

  const page = Math.max(1, parseInt(query.page ?? '1', 10))
  const perPage = Math.min(100, Math.max(1, parseInt(query.perPage ?? '20', 10)))
  const offset = (page - 1) * perPage

  const conditions: ReturnType<typeof eq>[] = []

  if (query.status) {
    if (query.status === 'active') {
      conditions.push(inArray(reservations.status, ['pending', 'confirmed']) as any)
    } else {
      conditions.push(eq(reservations.status, query.status))
    }
  }
  if (query.customerId) conditions.push(eq(reservations.customerId, parseInt(query.customerId, 10)))
  if (query.skateId) conditions.push(eq(reservations.skateId, parseInt(query.skateId, 10)))
  if (query.from) conditions.push(gte(reservations.reservedFrom, new Date(query.from)))
  if (query.to) conditions.push(lte(reservations.reservedUntil, new Date(query.to)))

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined

  const [{ total }] = await db
    .select({ total: count() })
    .from(reservations)
    .where(whereClause)

  const rows = await db
    .select({
      id: reservations.id,
      customerId: reservations.customerId,
      skateId: reservations.skateId,
      skateSize: reservations.skateSize,
      reservedFrom: reservations.reservedFrom,
      reservedUntil: reservations.reservedUntil,
      status: reservations.status,
      createdBy: reservations.createdBy,
      notes: reservations.notes,
      createdAt: reservations.createdAt,
      updatedAt: reservations.updatedAt,
      // joined
      customerName: customers.name,
      customerPhone: customers.phone,
      customerNationalId: customers.nationalId,
      skateCode: skates.skateCode,
      skateSizeStr: skates.size,
      skateType: skates.type,
      createdByName: users.name,
    })
    .from(reservations)
    .leftJoin(customers, eq(reservations.customerId, customers.id))
    .leftJoin(skates, eq(reservations.skateId, skates.id))
    .leftJoin(users, eq(reservations.createdBy, users.id))
    .where(whereClause)
    .orderBy(desc(reservations.reservedFrom))
    .limit(perPage)
    .offset(offset)

  return {
    data: (rows as RawReservationRow[]).map(rawToDTO),
    pagination: {
      page,
      perPage,
      total: Number(total),
      totalPages: Math.ceil(Number(total) / perPage),
    },
  }
}

export async function getReservation(id: number): Promise<ReservationDTO> {
  await lazyExpireReservations()
  const rows = await fetchReservationsJoined(eq(reservations.id, id))
  if (!rows[0]) throw new NotFoundError(`الحجز رقم ${id} غير موجود`)
  return rawToDTO(rows[0])
}

export async function updateReservation(id: number, data: UpdateReservationRequest): Promise<ReservationDTO> {
  const current = await getReservation(id)
  
  if (current.status !== 'pending' && current.status !== 'confirmed') {
    throw new BusinessRuleError('لا يمكن تعديل حجز ملغي أو منتهي', 'RESERVATION_NOT_ACTIVE')
  }

  const skateId = data.skateId ?? current.skate.id
  const from = data.reservedFrom ? new Date(data.reservedFrom) : new Date(current.reservedFrom)
  const until = data.reservedUntil ? new Date(data.reservedUntil) : new Date(current.reservedUntil)

  if (isNaN(from.getTime())) throw new ValidationError('تاريخ بداية الحجز غير صالح')
  if (isNaN(until.getTime())) throw new ValidationError('تاريخ نهاية الحجز غير صالح')
  if (from >= until) throw new ValidationError('تاريخ بداية الحجز يجب أن يكون قبل تاريخ النهاية')

  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()

    // Lock the reservation
    const [resRows] = await connection.execute<any[]>(
      'SELECT id, status FROM reservations WHERE id = ? FOR UPDATE',
      [id]
    )
    if (!resRows[0]) {
      await connection.rollback()
      throw new NotFoundError('الحجز غير موجود')
    }

    if (data.skateId && data.skateId !== current.skate.id) {
      // Lock new skate
      const [skateRows] = await connection.execute<any[]>(
        'SELECT id, status FROM skates WHERE id = ? FOR UPDATE',
        [data.skateId]
      )
      if (!skateRows[0]) {
        await connection.rollback()
        throw new NotFoundError('الزلاجة غير موجودة')
      }
    }

    // Check overlaps excluding self
    const [overlapRows] = await connection.execute<any[]>(
      `SELECT id FROM reservations 
       WHERE skate_id = ? 
       AND id != ?
       AND status IN ('pending', 'confirmed') 
       AND reserved_from < ? 
       AND reserved_until > ?`,
      [skateId, id, until, from]
    )

    if (overlapRows.length > 0) {
      await connection.rollback()
      throw new BusinessRuleError('يوجد تعارض في مواعيد الحجز لهذه الزلاجة', 'RESERVATION_CONFLICT')
    }

    await connection.execute(
      `UPDATE reservations 
       SET skate_id = ?, reserved_from = ?, reserved_until = ?, notes = ?, updated_at = NOW() 
       WHERE id = ?`,
      [skateId, from, until, data.notes !== undefined ? data.notes : current.notes, id]
    )

    await connection.commit()
  } catch (err) {
    try { await connection.rollback() } catch {}
    throw err
  } finally {
    connection.release()
  }

  return await getReservation(id)
}

export async function cancelReservation(id: number, userId: number): Promise<ReservationDTO> {
  // Gate 4.2 Batch 2 — F-010: Reservation Cancellation TOCTOU
  // Vulnerability: previously, read status and update status were separate queries
  // producing duplicate audit entries and undefined side effects.
  //
  // Fix: use the same pool.getConnection() + FOR UPDATE pattern already used by
  // createReservation() and updateReservation(). The row lock ensures that the
  // second concurrent caller blocks until the first commits, then re-reads
  // status = 'cancelled' and throws BusinessRuleError('RESERVATION_NOT_ACTIVE').
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()

    // 1. Lock reservation row — concurrent callers block here until commit/rollback
    const [resRows] = await connection.execute<any[]>(
      'SELECT id, status FROM reservations WHERE id = ? FOR UPDATE',
      [id]
    )

    if (!resRows[0]) {
      await connection.rollback()
      throw new NotFoundError(`الحجز رقم ${id} غير موجود`)
    }

    const currentStatus: string = resRows[0].status

    // 2. Re-check status inside the lock (authoritative read)
    if (currentStatus !== 'pending' && currentStatus !== 'confirmed') {
      await connection.rollback()
      throw new BusinessRuleError(
        'لا يمكن إلغاء هذا الحجز لأن حالته لا تسمح بذلك',
        'RESERVATION_NOT_ACTIVE'
      )
    }

    // 3. Cancel inside the same transaction
    await connection.execute(
      'UPDATE reservations SET status = ?, updated_at = NOW() WHERE id = ?',
      ['cancelled', id]
    )

    // 4. Audit inside the transaction (logRaw so audit is atomic with the cancel)
    await auditService.logRaw(
      {
        userId,
        action: 'CANCEL_RESERVATION',
        entityType: 'RESERVATION',
        entityId: String(id),
        newValue: { status: 'cancelled' },
      },
      connection
    )

    await connection.commit()
  } catch (err) {
    try { await connection.rollback() } catch {}
    throw err
  } finally {
    connection.release()
  }

  return await getReservation(id)
}
