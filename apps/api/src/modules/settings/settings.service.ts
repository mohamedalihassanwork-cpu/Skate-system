import { db } from '../../db/connection.js'
import { settings } from '../../db/schema/settings.js'
import { eq } from 'drizzle-orm'
import { auditService } from '../audit/audit.service.js'

export const settingsService = {
  getAll: async () => {
    const rows = await db.select().from(settings)
    return rows.reduce((acc, row) => {
      acc[row.key] = JSON.parse(row.value)
      return acc
    }, {} as Record<string, any>)
  },

  update: async (updates: Record<string, any>, userId: number) => {
    const keys = Object.keys(updates)
    if (keys.length === 0) return true

    for (const key of keys) {
      const [oldSetting] = await db.select().from(settings).where(eq(settings.key, key)).limit(1)
      const oldValue = oldSetting ? JSON.parse(oldSetting.value) : null

      const value = JSON.stringify(updates[key])
      await db.update(settings).set({ value, updatedAt: new Date() }).where(eq(settings.key, key))

      // Phase 05.5 (RISK-003 fix): use JSON.stringify comparison for semantic equality.
      // The original `oldValue !== updates[key]` used reference inequality, which always
      // evaluates to true for arrays even when values are identical, producing spurious
      // audit entries for rental_duration_options. Now we compare serialised forms.
      const oldJson = JSON.stringify(oldValue)
      const newJson = JSON.stringify(updates[key])
      if (oldJson !== newJson) {
        auditService.log({
          userId,
          action: 'UPDATE_SETTINGS',
          entityType: 'SETTING',
          entityId: key,
          oldValue: { key, value: oldValue },
          newValue: { key, value: updates[key] }
        })
      }
    }
    return true
  }
}
