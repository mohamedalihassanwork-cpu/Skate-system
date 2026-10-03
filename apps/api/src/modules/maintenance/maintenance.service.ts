import { eq, desc, sql, and } from 'drizzle-orm'
import { db } from '../../db/connection'
import { maintenanceRecords, maintenanceParts, skates, users, treasuryMovements, paymentMethods, cashierShifts } from '../../db/schema/index.js'
import { NotFoundError, BusinessRuleError } from '../../utils/errors.js'
import { auditService } from '../audit/audit.service.js'
import type { 
  CreateMaintenanceRecordPayload, 
  UpdateMaintenanceRecordPayload,
  CompleteMaintenanceRecordPayload,
  AddMaintenancePartPayload
} from './maintenance.types'

export class MaintenanceService {
  /**
   * List maintenance records with optional pagination
   */
  async listRecords(query: Record<string, string | number | undefined> = {}) {
    const page = Number(query.page) || 1
    const limit = Number(query.limit) || 50
    const offset = (page - 1) * limit

    const conditions = []
    if (query.status) {
      conditions.push(eq(maintenanceRecords.status, query.status as any))
    }
    if (query.skateId) {
      conditions.push(eq(maintenanceRecords.skateId, Number(query.skateId)))
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined

    const [totalCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(maintenanceRecords)
      .where(whereClause)

    const records = await db
      .select({
        id: maintenanceRecords.id,
        skateId: maintenanceRecords.skateId,
        skateCode: skates.skateCode,
        problemDescription: maintenanceRecords.problemDescription,
        repairDescription: maintenanceRecords.repairDescription,
        status: maintenanceRecords.status,
        totalCost: maintenanceRecords.totalCost,
        createdAt: maintenanceRecords.createdAt,
        startedAt: maintenanceRecords.startedAt,
        completedAt: maintenanceRecords.completedAt,
        paymentStatus: maintenanceRecords.paymentStatus,
        paymentMethodId: maintenanceRecords.paymentMethodId,
        paidAt: maintenanceRecords.paidAt,
        paidBy: maintenanceRecords.paidBy,
        createdByName: users.name,
      })
      .from(maintenanceRecords)
      .leftJoin(skates, eq(maintenanceRecords.skateId, skates.id))
      .leftJoin(users, eq(maintenanceRecords.createdBy, users.id))
      .where(whereClause)
      .orderBy(desc(maintenanceRecords.createdAt))
      .limit(limit)
      .offset(offset)

    return {
      records,
      pagination: {
        page,
        limit,
        total: totalCount.count,
        totalPages: Math.ceil(totalCount.count / limit),
      }
    }
  }

  /**
   * Get a specific maintenance record including its parts
   */
  async getRecord(id: number) {
    const [record] = await db
      .select({
        id: maintenanceRecords.id,
        skateId: maintenanceRecords.skateId,
        skateCode: skates.skateCode,
        inspectionId: maintenanceRecords.inspectionId,
        damageReportId: maintenanceRecords.damageReportId,
        problemDescription: maintenanceRecords.problemDescription,
        repairDescription: maintenanceRecords.repairDescription,
        status: maintenanceRecords.status,
        laborCost: maintenanceRecords.laborCost,
        partsCost: maintenanceRecords.partsCost,
        totalCost: maintenanceRecords.totalCost,
        createdAt: maintenanceRecords.createdAt,
        startedAt: maintenanceRecords.startedAt,
        completedAt: maintenanceRecords.completedAt,
        paymentStatus: maintenanceRecords.paymentStatus,
        paymentMethodId: maintenanceRecords.paymentMethodId,
        paidAt: maintenanceRecords.paidAt,
        paidBy: maintenanceRecords.paidBy,
        createdByName: users.name,
      })
      .from(maintenanceRecords)
      .leftJoin(skates, eq(maintenanceRecords.skateId, skates.id))
      .leftJoin(users, eq(maintenanceRecords.createdBy, users.id))
      .where(eq(maintenanceRecords.id, id))
      .limit(1)

    if (!record) {
      throw new NotFoundError('سجل الصيانة غير موجود')
    }

    const parts = await db
      .select()
      .from(maintenanceParts)
      .where(eq(maintenanceParts.maintenanceId, id))

    return { ...record, parts }
  }

  /**
   * Create a new pending maintenance record.
   *
   * F-006 (Gate 5.1): Idempotency guard added.
   * If a damageReportId or inspectionId is provided, we check whether a
   * maintenance_record already exists for that reference before inserting.
   * This prevents the double-record risk where:
   *   1. damage.service.createDamageReport() auto-creates a record (when
   *      maintenanceRequired=true), AND
   *   2. a cashier manually calls POST /maintenance for the same event.
   */
  async createRecord(payload: CreateMaintenanceRecordPayload, userId: number) {
    return await db.transaction(async (tx) => {
      // Ensure the skate exists
      const [skate] = await tx
        .select()
        .from(skates)
        .where(eq(skates.id, payload.skateId))
        .for('update')

      if (!skate) {
        throw new NotFoundError('الزلاجة غير موجودة')
      }

      // ── F-006 IDEMPOTENCY GUARD (concurrency-safe) ────────────────────────
      // SELECT ... FOR UPDATE acquires a next-key lock on the index range for
      // this damageReportId / inspectionId. Under REPEATABLE-READ a plain
      // SELECT reads a consistent snapshot, so two concurrent transactions
      // both see 0 rows and both proceed to insert — producing a duplicate.
      // FOR UPDATE serialises concurrent attempts: the second transaction
      // blocks until the first commits, then re-reads and finds the existing
      // record, throwing DUPLICATE_MAINTENANCE_RECORD.
      if (payload.damageReportId) {
        const [existing] = await tx
          .select({ id: maintenanceRecords.id })
          .from(maintenanceRecords)
          .where(eq(maintenanceRecords.damageReportId, payload.damageReportId))
          .limit(1)
          .for('update')

        if (existing) {
          throw new BusinessRuleError(
            'يوجد سجل صيانة مرتبط بهذا التقرير بالفعل',
            'DUPLICATE_MAINTENANCE_RECORD'
          )
        }
      }

      // Check for an existing maintenance record linked to the same inspection.
      if (payload.inspectionId) {
        const [existing] = await tx
          .select({ id: maintenanceRecords.id })
          .from(maintenanceRecords)
          .where(eq(maintenanceRecords.inspectionId, payload.inspectionId))
          .limit(1)
          .for('update')

        if (existing) {
          throw new BusinessRuleError(
            'يوجد سجل صيانة مرتبط بهذا الفحص بالفعل',
            'DUPLICATE_MAINTENANCE_RECORD'
          )
        }
      }
      // ── END F-006 GUARD ────────────────────────────────────────────────────

      if (skate.status !== 'maintenance') {
        await tx.update(skates)
          .set({ status: 'maintenance', updatedAt: new Date() })
          .where(eq(skates.id, payload.skateId))
      }

      const [result] = await tx.insert(maintenanceRecords).values({
        skateId: payload.skateId,
        inspectionId: payload.inspectionId,
        damageReportId: payload.damageReportId,
        problemDescription: payload.problemDescription,
        createdBy: userId,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      return result.insertId
    })
  }

  /**
   * Add a spare part to an open maintenance record
   */
  async addPart(id: number, payload: AddMaintenancePartPayload) {
    return await db.transaction(async (tx) => {
      const [record] = await tx
        .select()
        .from(maintenanceRecords)
        .where(eq(maintenanceRecords.id, id))
        .for('update')

      if (!record) {
        throw new NotFoundError('سجل الصيانة غير موجود')
      }

      if (record.status === 'completed') {
        throw new BusinessRuleError('لا يمكن تعديل سجل صيانة مغلق', 'ALREADY_COMPLETED')
      }

      const totalPartCost = Number(payload.quantity) * Number(payload.unitCost)

      await tx.insert(maintenanceParts).values({
        maintenanceId: id,
        partName: payload.partName,
        quantity: payload.quantity,
        unitCost: String(payload.unitCost),
        totalCost: String(totalPartCost),
      })

      // Update parts_cost and total_cost in the record
      const newPartsCost = Number(record.partsCost) + totalPartCost
      const newTotalCost = newPartsCost + Number(record.laborCost)

      // Automatically change status to in_progress if it was pending
      const newStatus = record.status === 'pending' ? 'in_progress' : record.status
      const startedAt = record.status === 'pending' ? new Date() : record.startedAt

      await tx.update(maintenanceRecords)
        .set({
          partsCost: String(newPartsCost),
          totalCost: String(newTotalCost),
          status: newStatus,
          startedAt,
          updatedAt: new Date(),
        })
        .where(eq(maintenanceRecords.id, id))

      return { success: true }
    })
  }

  /**
   * Remove a spare part
   */
  async removePart(recordId: number, partId: number) {
    return await db.transaction(async (tx) => {
      const [record] = await tx
        .select()
        .from(maintenanceRecords)
        .where(eq(maintenanceRecords.id, recordId))
        .for('update')

      if (!record || record.status === 'completed') {
        throw new BusinessRuleError('لا يمكن تعديل هذا السجل', 'INVALID_RECORD')
      }

      const [part] = await tx
        .select()
        .from(maintenanceParts)
        .where(and(eq(maintenanceParts.id, partId), eq(maintenanceParts.maintenanceId, recordId)))

      if (!part) {
        throw new NotFoundError('القطعة غير موجودة')
      }

      await tx.delete(maintenanceParts).where(eq(maintenanceParts.id, partId))

      const newPartsCost = Math.max(0, Number(record.partsCost) - Number(part.totalCost))
      const newTotalCost = newPartsCost + Number(record.laborCost)

      await tx.update(maintenanceRecords)
        .set({
          partsCost: String(newPartsCost),
          totalCost: String(newTotalCost),
          updatedAt: new Date()
        })
        .where(eq(maintenanceRecords.id, recordId))

      return { success: true }
    })
  }

  /**
   * Update labor cost or descriptions
   */
  async updateRecord(id: number, updates: { laborCost?: number, problemDescription?: string, repairDescription?: string, status?: 'pending' | 'in_progress' }) {
    return await db.transaction(async (tx) => {
      const [record] = await tx
        .select()
        .from(maintenanceRecords)
        .where(eq(maintenanceRecords.id, id))
        .for('update')

      if (!record) {
        throw new NotFoundError('سجل الصيانة غير موجود')
      }

      if (record.status === 'completed') {
        throw new BusinessRuleError('لا يمكن تعديل سجل صيانة مغلق', 'ALREADY_COMPLETED')
      }

      const dataToUpdate: any = { updatedAt: new Date() }
      
      if (updates.problemDescription !== undefined) {
        dataToUpdate.problemDescription = updates.problemDescription
      }
      if (updates.repairDescription !== undefined) {
        dataToUpdate.repairDescription = updates.repairDescription
      }
      if (updates.status !== undefined) {
        dataToUpdate.status = updates.status
        if (updates.status === 'in_progress' && record.status === 'pending' && !record.startedAt) {
          dataToUpdate.startedAt = new Date()
        }
      }
      if (updates.laborCost !== undefined) {
        dataToUpdate.laborCost = String(updates.laborCost)
        dataToUpdate.totalCost = String(Number(record.partsCost) + updates.laborCost)
      }

      await tx.update(maintenanceRecords)
        .set(dataToUpdate)
        .where(eq(maintenanceRecords.id, id))

      return { success: true }
    })
  }

  /**
   * Complete the maintenance record and transition skate to 'available' (DEC-007)
   */
  async completeRecord(id: number, userId: number, payload: CompleteMaintenanceRecordPayload) {
    return await db.transaction(async (tx) => {
      const [record] = await tx
        .select()
        .from(maintenanceRecords)
        .where(eq(maintenanceRecords.id, id))
        .for('update')

      if (!record) {
        throw new NotFoundError('سجل الصيانة غير موجود')
      }

      if (record.status === 'completed') {
        throw new BusinessRuleError('طلب الصيانة مغلق بالفعل', 'ALREADY_COMPLETED')
      }

      // Lock skate
      const [skate] = await tx
        .select()
        .from(skates)
        .where(eq(skates.id, record.skateId))
        .for('update')

      if (!skate) {
        throw new NotFoundError('الزلاجة غير موجودة')
      }

      const repairDesc = payload.repairDescription || record.repairDescription
      if (!repairDesc) {
        throw new BusinessRuleError('يجب إدخال وصف الإصلاح قبل إغلاق الطلب', 'MISSING_DESCRIPTION')
      }

      const isZeroCost = Number(record.totalCost) === 0

      // Mark record as completed
      await tx.update(maintenanceRecords)
        .set({
          status: 'completed',
          paymentStatus: isZeroCost ? 'no_cost' : 'unpaid',
          repairDescription: repairDesc,
          completedBy: userId,
          completedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(maintenanceRecords.id, id))

      // Enforce DEC-007: Skate returns to 'available'
      await tx.update(skates)
        .set({
          status: 'available',
          updatedAt: new Date()
        })
        .where(eq(skates.id, skate.id))

      // Phase 16: Audit log
      auditService.log({
        userId,
        action: 'COMPLETE_MAINTENANCE',
        entityType: 'MAINTENANCE_RECORD',
        entityId: String(id),
        oldValue: { status: record.status },
        newValue: { status: 'completed', repairDescription: repairDesc, totalCost: record.totalCost }
      }, tx)

      // No treasury movement in Phase 09 per owner decision on completion. Payment is explicit later.

      return { success: true }
    })
  }

  /**
   * System Payment for Maintenance
   */
  async payRecord(id: number, userId: number, paymentMethodId: number) {
    return await db.transaction(async (tx) => {
      // 1. Lock maintenance record
      const [record] = await tx
        .select()
        .from(maintenanceRecords)
        .where(eq(maintenanceRecords.id, id))
        .for('update')

      if (!record) {
        throw new NotFoundError('سجل الصيانة غير موجود')
      }

      // 2. Validate completed + unpaid
      if (record.status !== 'completed') {
        throw new BusinessRuleError('لا يمكن دفع سجل صيانة غير مكتمل', 'NOT_COMPLETED')
      }
      if (record.paymentStatus !== 'unpaid') {
        throw new BusinessRuleError('سجل الصيانة مدفوع بالفعل أو لا يحتاج للدفع', 'ALREADY_PAID')
      }

      // 3. Validate totalCost > 0
      if (Number(record.totalCost) <= 0) {
        throw new BusinessRuleError('لا توجد تكلفة مالية لهذا السجل', 'NO_COST')
      }

      // 4. Validate payment method
      const [method] = await tx
        .select()
        .from(paymentMethods)
        .where(eq(paymentMethods.id, paymentMethodId))
      
      if (!method || !method.isActive) {
        throw new BusinessRuleError('وسيلة الدفع غير صالحة', 'INVALID_PAYMENT_METHOD')
      }

      // 5. Resolve active cashier shift
      const [activeShiftRows] = await tx.execute(
        sql`SELECT id FROM cashier_shifts WHERE cashier_id = ${userId} AND status = 'active' LIMIT 1`
      )
      const activeShift = (activeShiftRows as unknown as any[])[0]
      if (!activeShift) {
        throw new BusinessRuleError('عملية الدفع تتطلب وجود وردية نشطة للكاشير.', 'NO_ACTIVE_SHIFT')
      }
      const shiftId = activeShift.id

      // 6. Create treasury movement
      await tx.insert(treasuryMovements).values({
        treasuryAccountId: method.treasuryAccountId,
        amount: record.totalCost || '0',
        type: 'out',
        referenceType: 'maintenance_payment',
        referenceId: id,
        cashierId: userId,
        shiftId: shiftId,
        notes: `دفعة صيانة: ${record.problemDescription || ''}`
      })

      // 6b. Update treasury account balance
      await tx.execute(
        sql`UPDATE treasury_accounts SET balance = balance - ${record.totalCost || 0}, updated_at = NOW() WHERE id = ${method.treasuryAccountId}`
      )

      // 7. Update maintenance record
      await tx.update(maintenanceRecords)
        .set({
          paymentStatus: 'paid',
          paymentMethodId,
          paidAt: new Date(),
          paidBy: userId,
          updatedAt: new Date()
        })
        .where(eq(maintenanceRecords.id, id))

      // 8. Audit log
      auditService.log({
        userId,
        action: 'PAY_MAINTENANCE_SYSTEM',
        entityType: 'MAINTENANCE_RECORD',
        entityId: String(id),
        oldValue: { paymentStatus: 'unpaid' },
        newValue: { paymentStatus: 'paid', paymentMethodId, amount: record.totalCost }
      }, tx)

      return { success: true }
    })
  }

  /**
   * External Payment for Maintenance
   */
  async payRecordExternal(id: number, userId: number) {
    return await db.transaction(async (tx) => {
      // 1. Lock maintenance record
      const [record] = await tx
        .select()
        .from(maintenanceRecords)
        .where(eq(maintenanceRecords.id, id))
        .for('update')

      if (!record) {
        throw new NotFoundError('سجل الصيانة غير موجود')
      }

      // 2. Validate completed + unpaid
      if (record.status !== 'completed') {
        throw new BusinessRuleError('لا يمكن دفع سجل صيانة غير مكتمل', 'NOT_COMPLETED')
      }
      if (record.paymentStatus !== 'unpaid') {
        throw new BusinessRuleError('سجل الصيانة مدفوع بالفعل أو لا يحتاج للدفع', 'ALREADY_PAID')
      }

      // 3. Update maintenance record
      await tx.update(maintenanceRecords)
        .set({
          paymentStatus: 'paid_external',
          paidAt: new Date(),
          paidBy: userId,
          updatedAt: new Date()
        })
        .where(eq(maintenanceRecords.id, id))

      // 4. Audit log
      auditService.log({
        userId,
        action: 'PAY_MAINTENANCE_EXTERNAL',
        entityType: 'MAINTENANCE_RECORD',
        entityId: String(id),
        oldValue: { paymentStatus: 'unpaid' },
        newValue: { paymentStatus: 'paid_external' }
      }, tx)

      return { success: true }
    })
  }
}

export const maintenanceService = new MaintenanceService()
