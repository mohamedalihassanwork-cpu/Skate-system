import { eq, desc, sql } from 'drizzle-orm'
import { db } from '../../db/connection.js'
import { sales, saleItems, salePayments } from '../../db/schema/sales.js'
import { products } from '../../db/schema/products.js'
import { paymentMethods, treasuryMovements, treasuryAccounts } from '../../db/schema/payments.js'
import { auditService } from '../audit/audit.service.js'
import { CreateSaleDTO, SaleDTO } from './sales.types.js'
import { BusinessRuleError, NotFoundError, AppError } from '../../utils/errors.js'

// F-012 fix (Gate 4.2 Batch 2):
// Use full Date.now() (13 digits) + 5-digit random to reduce collision probability
// from ~1/1,000 to ~1/100,000 per concurrent millisecond slot.
// The DB UNIQUE constraint `sales_sale_code_unique` (migration 0012) remains the
// authoritative safety net; this change just makes retries practically unnecessary.
function generateSaleCode(): string {
  const timestamp = Date.now().toString()
  const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0')
  return `SAL-${timestamp}${random}`
}

// MySQL error number for duplicate key entry
const MYSQL_ERR_DUPLICATE_ENTRY = 1062

export class SalesService {
  static async listSales(): Promise<SaleDTO[]> {
    const records = await db.select().from(sales).orderBy(desc(sales.id))
    return records.map(r => ({
      id: r.id,
      saleCode: r.saleCode,
      customerId: r.customerId,
      cashierId: r.cashierId,
      shiftId: r.shiftId,
      totalAmount: parseFloat(r.totalAmount as any),
      status: r.status,
      notes: r.notes,
      createdAt: r.createdAt
    }))
  }

  static async getSale(id: number): Promise<SaleDTO | null> {
    const [record] = await db.select().from(sales).where(eq(sales.id, id)).limit(1)
    if (!record) return null

    const items = await db.select().from(saleItems).where(eq(saleItems.saleId, id))
    const payments = await db.select().from(salePayments).where(eq(salePayments.saleId, id))

    return {
      id: record.id,
      saleCode: record.saleCode,
      customerId: record.customerId,
      cashierId: record.cashierId,
      shiftId: record.shiftId,
      totalAmount: parseFloat(record.totalAmount as any),
      status: record.status,
      notes: record.notes,
      createdAt: record.createdAt,
      items: items.map(i => ({
        id: i.id,
        saleId: i.saleId,
        productId: i.productId,
        quantity: i.quantity,
        unitPrice: parseFloat(i.unitPrice as any),
        totalPrice: parseFloat(i.totalPrice as any)
      })),
      payments: payments.map(p => ({
        id: p.id,
        saleId: p.saleId,
        paymentMethodId: p.paymentMethodId,
        amount: parseFloat(p.amount as any),
        treasuryAccountId: p.treasuryAccountId,
        createdAt: p.createdAt
      }))
    }
  }

  static async createSale(data: CreateSaleDTO): Promise<SaleDTO> {
    if (!data.items || data.items.length === 0) {
      throw new BusinessRuleError('سلة المشتريات فارغة', 'CART_EMPTY')
    }

    if (!data.payments || data.payments.length === 0) {
      throw new BusinessRuleError('المدفوعات مطلوبة', 'NO_PAYMENTS')
    }

    const [activeShiftRows] = await db.execute(
      sql`SELECT id FROM cashier_shifts WHERE cashier_id = ${data.cashierId} AND status = 'active' LIMIT 1`
    )
    const activeShift = (activeShiftRows as unknown as any[])[0]
    if (!activeShift) {
      throw new BusinessRuleError('عملية إنشاء البيع تتطلب وجود وردية نشطة. يرجى فتح وردية أولاً.', 'NO_ACTIVE_SHIFT')
    }

    // F-012 fix: retry the transaction up to 3 times on duplicate saleCode.
    // On each attempt generateSaleCode() produces a fresh code so collision
    // probability decreases with each retry. If all attempts fail the last
    // MySQL error is re-thrown (will surface as HTTP 500 — extremely unlikely).
    const MAX_ATTEMPTS = 3
    let lastError: unknown

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        const saleId = await db.transaction(async (tx) => {
          let computedTotalAmount = 0
          const processedItems = []

          // 1. Process items and lock products
          for (const item of data.items) {
            if (item.quantity <= 0) {
              throw new BusinessRuleError('الكمية غير صالحة', 'INVALID_QUANTITY')
            }

            // Lock row FOR UPDATE
            const [productRow] = await tx.execute(
              sql`SELECT * FROM products WHERE id = ${item.productId} FOR UPDATE`
            )

            const product = (productRow as unknown as any[])[0]
            if (!product) {
              throw new NotFoundError('المنتج غير موجود')
            }

            if (!product.is_active) {
              throw new BusinessRuleError('المنتج غير مفعل', 'PRODUCT_INACTIVE')
            }

            if (product.stock_quantity < item.quantity) {
              throw new BusinessRuleError('المخزون غير كاف', 'INSUFFICIENT_STOCK')
            }

            const unitPrice = parseFloat(product.price)
            const totalPrice = unitPrice * item.quantity
            computedTotalAmount += totalPrice

            processedItems.push({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice,
              totalPrice
            })

            // Deduct stock
            await tx.update(products)
              .set({ stockQuantity: product.stock_quantity - item.quantity })
              .where(eq(products.id, item.productId))
          }

          // 2. Validate payments
          let totalPaymentProvided = 0
          for (const p of data.payments) {
            if (p.amount <= 0) throw new BusinessRuleError('مبلغ الدفعة غير صالح', 'INVALID_PAYMENT_AMOUNT')
            
            // Verify payment method to treasury account mapping
            const [pmRow] = await tx.select().from(paymentMethods).where(eq(paymentMethods.id, p.paymentMethodId)).limit(1)
            if (!pmRow) throw new BusinessRuleError('طريقة الدفع غير صالحة', 'INVALID_PAYMENT_METHOD')
            
            // Auto-assign treasury account
            p.treasuryAccountId = pmRow.treasuryAccountId

            totalPaymentProvided += p.amount
          }

          // Floating point safe comparison
          if (Math.abs(computedTotalAmount - totalPaymentProvided) > 0.01) {
            throw new BusinessRuleError('المدفوعات لا تتطابق مع الإجمالي', 'PAYMENT_MISMATCH')
          }

          // Phase 14: Unified Invoice Number — F-003 fix
          // Use LAST_INSERT_ID(value + 1) so the incremented value is session-scoped.
          // SELECT LAST_INSERT_ID() reads ONLY the value this session wrote, preventing
          // concurrent transactions from reading each other's sequence value.
          await tx.execute(sql`INSERT INTO sequences (name, value) VALUES ('invoice_number', 1) ON DUPLICATE KEY UPDATE value = LAST_INSERT_ID(value + 1)`)
          const [seqRows] = await tx.execute(sql`SELECT LAST_INSERT_ID() AS value`)
          const invoiceVal = (seqRows as unknown as any[])[0].value
          const invoiceNumber = `INV-${String(invoiceVal).padStart(6, '0')}`

          // 3. Create Sale (generateSaleCode() called fresh on each attempt)
          const [saleResult] = await tx.insert(sales).values({
            saleCode: generateSaleCode(),
            invoiceNumber,
            customerId: data.customerId || null,
            cashierId: data.cashierId,
            shiftId: activeShift.id,
            totalAmount: computedTotalAmount.toString(),
            notes: data.notes || null,
            status: 'completed'
          })

          const newSaleId = saleResult.insertId

          // 4. Create Sale Items
          for (const pItem of processedItems) {
            await tx.insert(saleItems).values({
              saleId: newSaleId,
              productId: pItem.productId,
              quantity: pItem.quantity,
              unitPrice: pItem.unitPrice.toString(),
              totalPrice: pItem.totalPrice.toString()
            })
          }

          // 5. Create Sale Payments & Treasury Movements
          for (const p of data.payments) {
            const [paymentResult] = await tx.insert(salePayments).values({
              saleId: newSaleId,
              paymentMethodId: p.paymentMethodId,
              amount: p.amount.toString(),
              treasuryAccountId: p.treasuryAccountId
            })

            await tx.insert(treasuryMovements).values({
              treasuryAccountId: p.treasuryAccountId,
              amount: p.amount.toString(),
              type: 'in',
              referenceType: 'sale_payment',
              referenceId: newSaleId, // link to sale ID
              cashierId: data.cashierId,
              shiftId: activeShift.id,
              notes: `Payment for Sale ${newSaleId}`
            })

            // Update Treasury Account Balance
            const [accRow] = await tx.select().from(treasuryAccounts).where(eq(treasuryAccounts.id, p.treasuryAccountId)).limit(1)
            if (accRow) {
              const newBalance = parseFloat(accRow.balance as string) + parseFloat(p.amount.toString())
              await tx.update(treasuryAccounts)
                .set({ balance: newBalance.toString() })
                .where(eq(treasuryAccounts.id, p.treasuryAccountId))
            }
          }

          await auditService.log({
            userId: data.cashierId,
            action: 'CREATE_SALE',
            entityType: 'SALE',
            entityId: String(newSaleId),
            newValue: { totalAmount: computedTotalAmount }
          }, tx)

          return newSaleId
        })

        return (await this.getSale(saleId))!

      } catch (err: any) {
        // Retry only on duplicate saleCode — other errors propagate immediately
        if (
          err?.errno === MYSQL_ERR_DUPLICATE_ENTRY &&
          typeof err?.sqlMessage === 'string' &&
          err.sqlMessage.includes('sale_code') &&
          attempt < MAX_ATTEMPTS
        ) {
          lastError = err
          continue
        }
        throw err
      }
    }

    // All retry attempts exhausted (probability: effectively zero for normal load)
    throw lastError
  }

  static async cancelSale(saleId: number, adminUserId: number): Promise<SaleDTO> {
    const [activeShiftRows] = await db.execute(
      sql`SELECT id FROM cashier_shifts WHERE cashier_id = ${adminUserId} AND status = 'active' LIMIT 1`
    )
    const activeShift = (activeShiftRows as unknown as any[])[0]
    if (!activeShift) {
      throw new BusinessRuleError('عملية إلغاء البيع تتطلب وجود وردية نشطة. يرجى فتح وردية أولاً.', 'NO_ACTIVE_SHIFT')
    }
    
    await db.transaction(async (tx) => {
      // Lock sale FOR UPDATE
      const [saleRow] = await tx.execute(
        sql`SELECT * FROM sales WHERE id = ${saleId} FOR UPDATE`
      )
      const sale = (saleRow as unknown as any[])[0]

      if (!sale) throw new NotFoundError('البيع غير موجود')
      if (sale.status === 'cancelled') throw new AppError('تم الإلغاء بالفعل', 409, 'ALREADY_CANCELLED')

      // Mark cancelled
      await tx.update(sales).set({ status: 'cancelled' }).where(eq(sales.id, saleId))

      // Lock and restore products
      const items = await tx.select().from(saleItems).where(eq(saleItems.saleId, saleId))
      
      for (const item of items) {
        const [productRow] = await tx.execute(
          sql`SELECT * FROM products WHERE id = ${item.productId} FOR UPDATE`
        )
        const product = (productRow as unknown as any[])[0]
        if (product) {
          await tx.update(products)
            .set({ stockQuantity: product.stock_quantity + item.quantity })
            .where(eq(products.id, item.productId))
        }
      }

      // Refund treasury movements
      const payments = await tx.select().from(salePayments).where(eq(salePayments.saleId, saleId))
      let totalRefundAmount = 0
      for (const p of payments) {
        const pAmount = parseFloat(p.amount as string)
        totalRefundAmount += pAmount

        await tx.insert(treasuryMovements).values({
          treasuryAccountId: p.treasuryAccountId,
          amount: p.amount,
          type: 'out',
          referenceType: 'sale_refund',
          referenceId: saleId,
          cashierId: adminUserId,
          shiftId: activeShift ? activeShift.id : null,
          notes: `Refund for Cancelled Sale ${saleId}`
        })

        // Update Treasury Account Balance
        const [accRow] = await tx.select().from(treasuryAccounts).where(eq(treasuryAccounts.id, p.treasuryAccountId)).limit(1)
        if (accRow) {
          const newBalance = parseFloat(accRow.balance as string) - pAmount
          await tx.update(treasuryAccounts)
            .set({ balance: newBalance.toString() })
            .where(eq(treasuryAccounts.id, p.treasuryAccountId))
        }
      }

      await auditService.log({ userId: adminUserId, action: 'CANCEL_SALE', entityType: 'SALE', entityId: String(saleId), newValue: { status: 'cancelled' } }, tx)
      if (totalRefundAmount > 0) {
        await auditService.log({ userId: adminUserId, action: 'REFUND_SALE', entityType: 'SALE', entityId: String(saleId), newValue: { refundedAmount: totalRefundAmount } }, tx)
      }
    })

    return (await this.getSale(saleId))!
  }
}
