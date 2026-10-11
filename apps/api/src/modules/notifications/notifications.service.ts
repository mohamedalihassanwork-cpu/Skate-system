import { db } from '../../db/connection.js'
import { rentals } from '../../db/schema/rentals.js'
import { rentalItems } from '../../db/schema/rental_items.js'
import { customers } from '../../db/schema/customers.js'
import { skates } from '../../db/schema/skates.js'
import { eq, and } from 'drizzle-orm'

export const ENDING_SOON_WINDOW_SECONDS = 75

export const notificationsService = {
  getNotifications: async () => {
    // Multi-skate redesign: operational status is per rental_item, not per rental.
    // Fetch active rental items with their rental + customer + skate context.
    const activeItems = await db
      .select({
        itemId: rentalItems.id,
        rentalId: rentalItems.rentalId,
        expectedEndAt: rentalItems.expectedEndAt,
        rentalCode: rentals.rentalCode,
        customerName: customers.name,
        customerId: customers.id,
        skateId: skates.id,
        skateCode: skates.skateCode,
      })
      .from(rentalItems)
      .innerJoin(rentals, eq(rentalItems.rentalId, rentals.id))
      .innerJoin(customers, eq(rentals.customerId, customers.id))
      .innerJoin(skates, eq(rentalItems.skateId, skates.id))
      .where(and(eq(rentals.status, 'active'), eq(rentalItems.status, 'active')))

    const now = new Date().getTime()
    const notifications: any[] = []

    for (const row of activeItems) {
      if (!row.expectedEndAt) continue
      const expectedEnd = new Date(row.expectedEndAt).getTime()
      const remainingTime = Math.floor((expectedEnd - now) / 1000) // seconds

      let type: string | null = null
      let textAr = ''

      if (remainingTime <= 0) {
        type = 'EXPIRED'
        textAr = 'الإيجار انتهى'
      } else if (remainingTime <= ENDING_SOON_WINDOW_SECONDS) {
        type = 'ENDING_SOON'
        textAr = 'الإيجار ينتهي قريبًا'
      }

      if (type) {
        notifications.push({
          rentalId: row.rentalId,
          rentalItemId: row.itemId,
          customer: {
            id: row.customerId,
            name: row.customerName,
          },
          skate: {
            id: row.skateId,
            skateCode: row.skateCode,
          },
          expectedEndTime: new Date(row.expectedEndAt).toISOString(),
          remainingTime,
          type,
          textAr,
        })
      }
    }

    return notifications
  }
}
