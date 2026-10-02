import { Router } from 'express'
import { settingsService } from './settings.service.js'
import { authenticate } from '../../middleware/auth.js'
import { requirePermission } from '../../middleware/permission.js'
import { ValidationError } from '../../utils/errors.js'

export const settingsRouter = Router()

// All users need to read settings (for print toggle, hourly rate, etc)
settingsRouter.get('/', authenticate, async (req, res, next) => {
  try {
    const data = await settingsService.getAll()
    res.json({ success: true, data })
  } catch (err) {
    next(err)
  }
})

// Only admins can update settings
settingsRouter.patch('/', authenticate, requirePermission('settings.manage'), async (req, res, next) => {
  try {
    const updates = req.body
    
    if (typeof updates !== 'object' || updates === null || Array.isArray(updates)) {
      throw new ValidationError('بيانات الإعدادات غير صالحة')
    }

    const SUPPORTED_KEYS: Record<string, string> = {
      rental_hourly_rate: 'number',
      rental_duration_options: 'array',
      late_fee_per_minute: 'number',
      print_invoices_enabled: 'boolean',
      notification_sound_enabled: 'boolean'
    }

    // Validate keys and types
    for (const [key, value] of Object.entries(updates)) {
      if (!SUPPORTED_KEYS[key]) {
        throw new ValidationError(`إعداد غير معروف: ${key}`)
      }

      const expectedType = SUPPORTED_KEYS[key]
      if (expectedType === 'array' && !Array.isArray(value)) {
        throw new ValidationError(`يجب أن يكون الإعداد ${key} مصفوفة`)
      } else if (expectedType !== 'array' && typeof value !== expectedType) {
        throw new ValidationError(`يجب أن يكون نوع الإعداد ${key} ${expectedType}`)
      }
    }

    await settingsService.update(updates, req.user!.sub)
    const data = await settingsService.getAll()
    res.json({ success: true, data })
  } catch (err) {
    next(err)
  }
})
