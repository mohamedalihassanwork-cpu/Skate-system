import { db } from '../../db/connection.js'
import { eq, inArray } from 'drizzle-orm'
import { rentals } from '../../db/schema/rentals.js'
import { sales, saleItems, salePayments } from '../../db/schema/sales.js'
import { users } from '../../db/schema/users.js'
import { customers } from '../../db/schema/customers.js'
import { skates } from '../../db/schema/skates.js'
import { rentalPayments, paymentMethods } from '../../db/schema/payments.js'
import { lateFeeRecords } from '../../db/schema/inspections.js'
import { damageReports } from '../../db/schema/damages.js'
import { products } from '../../db/schema/products.js'

export async function getRentalInvoice(rentalId: number) {
  const [rental] = await db
    .select()
    .from(rentals)
    .where(eq(rentals.id, rentalId))
    .limit(1)

  if (!rental || !rental.invoiceNumber) {
    return null
  }

  // Fetch relations
  const [cashier] = await db.select().from(users).where(eq(users.id, rental.cashierId)).limit(1)
  const [customer] = rental.customerId ? await db.select().from(customers).where(eq(customers.id, rental.customerId)).limit(1) : [null]
  const [skate] = rental.skateId
    ? await db.select().from(skates).where(eq(skates.id, rental.skateId)).limit(1)
    : [null]


  // Payments
  const payments = await db
    .select({
      amount: rentalPayments.amount,
      method: paymentMethods.name,
    })
    .from(rentalPayments)
    .innerJoin(paymentMethods, eq(rentalPayments.paymentMethodId, paymentMethods.id))
    .where(eq(rentalPayments.rentalId, rentalId))

  // Late Fees
  const [lateFee] = await db.select().from(lateFeeRecords).where(eq(lateFeeRecords.rentalId, rentalId)).limit(1)

  // Damages
  const damages = await db.select().from(damageReports).where(eq(damageReports.rentalId, rentalId))
  const totalDamages = damages.reduce((sum, d) => sum + Number(d.customerCharge || 0), 0)

  return {
    type: 'RENTAL',
    invoiceNumber: rental.invoiceNumber,
    transactionCode: rental.rentalCode,
    date: rental.createdAt,
    status: rental.status,
    cashierName: cashier?.name || 'مجهول',
    customerName: customer?.name || 'عميل نقدي (بدون تسجيل)',
    
    skateBarcode: skate?.barcode || '',
    durationMinutes: rental.durationMinutes,
    startTime: rental.startedAt,
    returnTime: rental.returnedAt,
    
    rentalAmount: Number(rental.rentalAmount),
    
    lateDuration: lateFee?.lateMinutes || 0,
    lateFee: lateFee ? Number(lateFee.calculatedFee) : 0,
    
    damageCharge: totalDamages,
    
    total: Number(rental.rentalAmount) + (lateFee ? Number(lateFee.calculatedFee) : 0) + totalDamages,
    
    payments: payments.map(p => ({
      method: p.method,
      amount: Number(p.amount)
    }))
  }
}

export async function getSaleInvoice(saleId: number) {
  const [sale] = await db
    .select()
    .from(sales)
    .where(eq(sales.id, saleId))
    .limit(1)

  if (!sale || !sale.invoiceNumber) {
    return null
  }

  // Fetch relations
  const [cashier] = await db.select().from(users).where(eq(users.id, sale.cashierId)).limit(1)
  const [customer] = sale.customerId ? await db.select().from(customers).where(eq(customers.id, sale.customerId)).limit(1) : [null]

  // Items
  const items = await db
    .select({
      productName: products.name,
      quantity: saleItems.quantity,
      unitPrice: saleItems.unitPrice,
      totalPrice: saleItems.totalPrice,
    })
    .from(saleItems)
    .innerJoin(products, eq(saleItems.productId, products.id))
    .where(eq(saleItems.saleId, saleId))

  // Payments
  const payments = await db
    .select({
      amount: salePayments.amount,
      method: paymentMethods.name,
    })
    .from(salePayments)
    .innerJoin(paymentMethods, eq(salePayments.paymentMethodId, paymentMethods.id))
    .where(eq(salePayments.saleId, saleId))

  return {
    type: 'SALE',
    invoiceNumber: sale.invoiceNumber,
    transactionCode: sale.saleCode,
    date: sale.createdAt,
    status: sale.status,
    cashierName: cashier?.name || 'مجهول',
    customerName: customer?.name || 'عميل نقدي (بدون تسجيل)',
    
    items: items.map(i => ({
      name: i.productName,
      quantity: i.quantity,
      unitPrice: Number(i.unitPrice),
      totalPrice: Number(i.totalPrice)
    })),
    
    total: Number(sale.totalAmount),
    
    payments: payments.map(p => ({
      method: p.method,
      amount: Number(p.amount)
    }))
  }
}
