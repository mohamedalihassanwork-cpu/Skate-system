import { eq, and, count, desc } from 'drizzle-orm'
import { auditService } from '../audit/audit.service.js';
import { db, pool } from '../../db/connection.js'
import { damageReports } from '../../db/schema/damages.js'
import { skates } from '../../db/schema/skates.js'
import { customers } from '../../db/schema/customers.js'
import { users } from '../../db/schema/users.js'
import { paymentMethods } from '../../db/schema/payments.js'
import { BusinessRuleError, NotFoundError, ValidationError } from '../../utils/errors.js'
import {
  CreateDamageReportRequest,
  PayDamageChargeRequest,
  WaiveDamageChargeRequest,
  DamageReportDTO,
} from './damage.types.js'

export function rawToDTO(row: any): DamageReportDTO {
  return {
    id: row.id,
    skateId: row.skateId,
    rentalId: row.rentalId,
    inspectionId: row.inspectionId,
    customerId: row.customerId,
    reportedBy: row.reportedBy,
    damageType: row.damageType,
    severity: row.severity,
    description: row.description,
    customerCharge: parseFloat(String(row.customerCharge)),
    chargeCollected: parseFloat(String(row.chargeCollected)),
    chargeWaived: parseFloat(String(row.chargeWaived)),
    status: row.status,
    maintenanceRequired: row.maintenanceRequired,
    createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : '',
    skateCode: row.skateCode ?? undefined,
    customerName: row.customerName ?? undefined,
    customerNationalId: row.customerNationalId ?? undefined,
    reporterName: row.reporterName ?? undefined,
  }
}

export async function createDamageReport(
  cashierId: number,
  data: CreateDamageReportRequest
): Promise<DamageReportDTO> {
  const connection = await pool.getConnection()
  let insertId: number
  try {
    await connection.beginTransaction()

    const [skateRows] = await connection.execute<any[]>(
      'SELECT id, status FROM skates WHERE id = ? FOR UPDATE',
      [data.skateId]
    )
    if (!skateRows[0]) {
      await connection.rollback()
      throw new NotFoundError('الاسكيت غير موجودة')
    }

    const [result] = await connection.execute<any>(
      `INSERT INTO damage_reports (
        skate_id, rental_id, inspection_id, customer_id, reported_by, 
        damage_type, severity, description, customer_charge, 
        maintenance_required, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        data.skateId, data.rentalId ?? null, data.inspectionId ?? null, data.customerId ?? null, cashierId,
        data.damageType, data.severity, data.description ?? null, data.customerCharge,
        data.maintenanceRequired ? 1 : 0
      ]
    )
    insertId = result.insertId

    if (data.maintenanceRequired) {
      await connection.execute(
        "UPDATE skates SET status = 'maintenance', updated_at = NOW() WHERE id = ?",
        [data.skateId]
      )

      if (data.inspectionId) {
        const [existing] = await connection.execute<any[]>(
          'SELECT id FROM maintenance_records WHERE inspection_id = ?',
          [data.inspectionId]
        )
        if (existing[0]) {
          await connection.execute(
            'UPDATE maintenance_records SET damage_report_id = ? WHERE id = ?',
            [insertId, existing[0].id]
          )
        } else {
          await connection.execute(
            `INSERT INTO maintenance_records (skate_id, damage_report_id, inspection_id, created_by, status, created_at, updated_at) 
             VALUES (?, ?, ?, ?, 'pending', NOW(), NOW())`,
            [data.skateId, insertId, data.inspectionId, cashierId]
          )
        }
      } else {
        await connection.execute(
          `INSERT INTO maintenance_records (skate_id, damage_report_id, created_by, status, created_at, updated_at) 
           VALUES (?, ?, ?, 'pending', NOW(), NOW())`,
          [data.skateId, insertId, cashierId]
        )
      }
    }

    // Phase 16: Audit Log
    await auditService.logRaw({
      userId: cashierId, action: 'CREATE_DAMAGE_REPORT', entityType: 'DAMAGE_REPORT', entityId: String(insertId), newValue: {
        skateId: data.skateId,
        damageType: data.damageType,
        severity: data.severity,
        customerCharge: data.customerCharge,
        maintenanceRequired: data.maintenanceRequired
      }
    }, connection)

    await connection.commit()
  } catch (err) {
    try { await connection.rollback() } catch { }
    throw err
  } finally {
    connection.release()
  }

  return getDamageReport(insertId)
}

export async function getDamageReport(id: number): Promise<DamageReportDTO> {
  const rows = await db
    .select({
      id: damageReports.id,
      skateId: damageReports.skateId,
      rentalId: damageReports.rentalId,
      inspectionId: damageReports.inspectionId,
      customerId: damageReports.customerId,
      reportedBy: damageReports.reportedBy,
      damageType: damageReports.damageType,
      severity: damageReports.severity,
      description: damageReports.description,
      customerCharge: damageReports.customerCharge,
      chargeCollected: damageReports.chargeCollected,
      chargeWaived: damageReports.chargeWaived,
      status: damageReports.status,
      maintenanceRequired: damageReports.maintenanceRequired,
      createdAt: damageReports.createdAt,
      skateCode: skates.skateCode,
      customerName: customers.name,
      customerNationalId: customers.nationalId,
      reporterName: users.name,
    })
    .from(damageReports)
    .leftJoin(skates, eq(damageReports.skateId, skates.id))
    .leftJoin(customers, eq(damageReports.customerId, customers.id))
    .leftJoin(users, eq(damageReports.reportedBy, users.id))
    .where(eq(damageReports.id, id))

  if (!rows[0]) throw new NotFoundError('تقرير الضرر غير موجود')
  return rawToDTO(rows[0])
}

export async function listDamageReports(query: any): Promise<any> {
  const page = Math.max(1, parseInt(query.page ?? '1', 10))
  const perPage = Math.min(100, Math.max(1, parseInt(query.perPage ?? '20', 10)))
  const offset = (page - 1) * perPage

  const conditions: ReturnType<typeof eq>[] = []
  if (query.status) conditions.push(eq(damageReports.status, query.status))
  if (query.skateId) conditions.push(eq(damageReports.skateId, parseInt(query.skateId, 10)))
  if (query.customerId) conditions.push(eq(damageReports.customerId, parseInt(query.customerId, 10)))

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined

  const [{ total }] = await db.select({ total: count() }).from(damageReports).where(whereClause)

  const rows = await db
    .select({
      id: damageReports.id,
      skateId: damageReports.skateId,
      rentalId: damageReports.rentalId,
      inspectionId: damageReports.inspectionId,
      customerId: damageReports.customerId,
      reportedBy: damageReports.reportedBy,
      damageType: damageReports.damageType,
      severity: damageReports.severity,
      description: damageReports.description,
      customerCharge: damageReports.customerCharge,
      chargeCollected: damageReports.chargeCollected,
      chargeWaived: damageReports.chargeWaived,
      status: damageReports.status,
      maintenanceRequired: damageReports.maintenanceRequired,
      createdAt: damageReports.createdAt,
      skateCode: skates.skateCode,
      customerName: customers.name,
      customerNationalId: customers.nationalId,
      reporterName: users.name,
    })
    .from(damageReports)
    .leftJoin(skates, eq(damageReports.skateId, skates.id))
    .leftJoin(customers, eq(damageReports.customerId, customers.id))
    .leftJoin(users, eq(damageReports.reportedBy, users.id))
    .where(whereClause)
    .orderBy(desc(damageReports.createdAt))
    .limit(perPage)
    .offset(offset)

  return {
    data: rows.map(rawToDTO),
    pagination: {
      page,
      perPage,
      total: Number(total),
      totalPages: Math.ceil(Number(total) / perPage),
    },
  }
}

function computeStatus(charge: number, collected: number, waived: number): 'pending' | 'partially_paid' | 'paid' | 'waived' {
  if (collected + waived >= charge) {
    if (collected === 0 && waived >= charge) return 'waived'
    return 'paid'
  }
  if (collected + waived > 0) return 'partially_paid'
  return 'pending'
}

export async function collectCharge(
  id: number,
  cashierId: number,
  data: PayDamageChargeRequest
): Promise<DamageReportDTO> {
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()

    const [reportRows] = await connection.execute<any[]>(
      'SELECT * FROM damage_reports WHERE id = ? FOR UPDATE',
      [id]
    )
    const report = reportRows[0]
    if (!report) {
      await connection.rollback()
      throw new NotFoundError('تقرير الضرر غير موجود')
    }

    if (report.status === 'paid' || report.status === 'waived') {
      await connection.rollback()
      throw new BusinessRuleError('لا يمكن تحصيل رسوم لتقرير تم دفعه أو الإعفاء عنه', 'ALREADY_PAID')
    }

    const currentCharge = parseFloat(String(report.customer_charge))
    const currentCollected = parseFloat(String(report.charge_collected))
    const currentWaived = parseFloat(String(report.charge_waived))
    const remaining = currentCharge - (currentCollected + currentWaived)

    let requestedTotal = 0
    for (const p of data.payments) {
      requestedTotal += p.amount
    }

    if (requestedTotal > remaining + 0.001) {
      await connection.rollback()
      throw new BusinessRuleError('المبلغ المطلوب تحصيله أكبر من المبلغ المتبقي', 'OVERPAYMENT_NOT_ALLOWED')
    }

    const [shiftRows] = await connection.execute<any[]>(
      'SELECT id FROM cashier_shifts WHERE cashier_id = ? AND closed_at IS NULL LIMIT 1',
      [cashierId]
    )
    const shiftId = shiftRows[0]?.id ?? null

    // F-007 fix (Gate 4.2 Batch 1): Enforce active cashier shift — consistent with
    // startRental, returnRental, cancelRental, createSale, cancelSale, recordExpense,
    // and payRecord. Previously, shiftId was silently null, causing treasury_movements
    // to be recorded with shift_id = NULL and no financial-shift traceability.
    if (!shiftId) {
      await connection.rollback()
      throw new BusinessRuleError(
        'عملية تحصيل رسوم الضرر تتطلب وجود وردية نشطة. يرجى فتح وردية أولاً.',
        'NO_ACTIVE_SHIFT'
      )
    }

    const paymentMethodIds = data.payments.map(p => p.paymentMethodId)
    const placeholders = paymentMethodIds.map(() => '?').join(',')
    const [pmRows] = await connection.execute<any[]>(
      `SELECT id, treasury_account_id, is_active FROM payment_methods WHERE id IN (${placeholders}) FOR UPDATE`,
      paymentMethodIds
    )

    for (const p of data.payments) {
      const pm = pmRows.find(row => row.id === p.paymentMethodId)
      if (!pm || !pm.is_active) {
        await connection.rollback()
        throw new BusinessRuleError(`طريقة الدفع غير صالحة`, 'PAYMENT_METHOD_INVALID')
      }

      await connection.execute(
        `INSERT INTO rental_payments (rental_id, payment_method_id, amount, payment_type, cashier_id, created_at) VALUES (?, ?, ?, 'damage_charge', ?, NOW())`,
        [report.rental_id, p.paymentMethodId, p.amount, cashierId]
      )

      await connection.execute(
        `INSERT INTO treasury_movements (treasury_account_id, shift_id, amount, type, reference_type, reference_id, cashier_id, notes, created_at) VALUES (?, ?, ?, 'in', 'damage_charge_payment', ?, ?, ?, NOW())`,
        [pm.treasury_account_id, shiftId, p.amount, id, cashierId, `Damage charge for report ${id}`]
      )

      await connection.execute(
        `UPDATE treasury_accounts SET balance = balance + ?, updated_at = NOW() WHERE id = ?`,
        [p.amount, pm.treasury_account_id]
      )
    }

    const newCollected = currentCollected + requestedTotal
    const nextStatus = computeStatus(currentCharge, newCollected, currentWaived)

    await connection.execute(
      `UPDATE damage_reports SET charge_collected = ?, status = ?, updated_at = NOW() WHERE id = ?`,
      [newCollected, nextStatus, id]
    )

    await auditService.logRaw({
      userId: cashierId,
      action: 'COLLECT_DAMAGE_CHARGE',
      entityType: 'DAMAGE_REPORT',
      entityId: String(id),
      newValue: {
        rentalId: report.rental_id,
        collectedAmount: requestedTotal
      }
    }, connection)

    await connection.commit()
  } catch (err) {
    try { await connection.rollback() } catch { }
    throw err
  } finally {
    connection.release()
  }

  return getDamageReport(id)
}

export async function waiveCharge(
  id: number,
  userId: number,
  data: WaiveDamageChargeRequest
): Promise<DamageReportDTO> {
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()

    const [reportRows] = await connection.execute<any[]>(
      'SELECT * FROM damage_reports WHERE id = ? FOR UPDATE',
      [id]
    )
    const report = reportRows[0]
    if (!report) {
      await connection.rollback()
      throw new NotFoundError('تقرير الضرر غير موجود')
    }

    if (report.status === 'paid' || report.status === 'waived') {
      await connection.rollback()
      throw new BusinessRuleError('لا يمكن إعفاء تقرير مسدد بالفعل', 'ALREADY_PAID')
    }

    const currentCharge = parseFloat(String(report.customer_charge))
    const currentCollected = parseFloat(String(report.charge_collected))
    const currentWaived = parseFloat(String(report.charge_waived))
    const remaining = currentCharge - (currentCollected + currentWaived)

    if (data.amount > remaining + 0.001) {
      await connection.rollback()
      throw new BusinessRuleError('مبلغ الإعفاء أكبر من الرصيد المتبقي', 'OVERWAIVE_NOT_ALLOWED')
    }

    const newWaived = currentWaived + data.amount
    const nextStatus = computeStatus(currentCharge, currentCollected, newWaived)

    await connection.execute(
      `UPDATE damage_reports 
        SET charge_waived = ?, waived_by = ?, waiver_reason = ?, status = ?, updated_at = NOW() 
        WHERE id = ?`,
      [newWaived, userId, data.reason, nextStatus, id]
    )

    // Phase 16: Audit log
    await auditService.logRaw({ userId: userId, action: 'WAIVE_DAMAGE_CHARGE', entityType: 'DAMAGE_REPORT', entityId: String(id), oldValue: { chargeWaived: currentWaived, status: report.status }, newValue: { chargeWaived: newWaived, status: nextStatus, amountWaived: data.amount, reason: data.reason } }, connection)

    await connection.commit()
  } catch (err) {
    try { await connection.rollback() } catch { }
    throw err
  } finally {
    connection.release()
  }

  return getDamageReport(id)
}
