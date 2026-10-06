import { Router } from 'express'
import { settingsService } from './settings.service.js'
import { authenticate } from '../../middleware/auth.js'
import { requirePermission } from '../../middleware/permission.js'
import { ValidationError } from '../../utils/errors.js'

export const settingsRouter = Router()

// All authenticated users may read settings.
// Intentional: other modules (rentals config, notifications, invoices) call this.
// settings.view controls sidebar visibility only — not this endpoint.
settingsRouter.get('/', authenticate, async (req, res, next) => {
  try {
    const data = await settingsService.getAll()
    res.json({ success: true, data })
  } catch (err) {
    next(err)
  }
})

// Only users with settings.manage may update settings.
// Backend authorization is mandatory — frontend PermissionGate is advisory.
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

    // Phase 05.5 — Settings Administration: per-key type + business-rule validation
    for (const [key, value] of Object.entries(updates)) {
      if (!SUPPORTED_KEYS[key]) {
        throw new ValidationError(`إعداد غير معروف: ${key}`)
      }

      const expectedType = SUPPORTED_KEYS[key]

      // Type check
      if (expectedType === 'array' && !Array.isArray(value)) {
        throw new ValidationError(`يجب أن يكون الإعداد ${key} مصفوفة`)
      } else if (expectedType !== 'array' && typeof value !== expectedType) {
        throw new ValidationError(`يجب أن يكون نوع الإعداد ${key} ${expectedType}`)
      }

      // Business-rule range validation — SETT-003, SETT-004

      if (key === 'rental_hourly_rate') {
        // SETT-001 / DEC-068: must be positive number (> 0)
        // Zero or negative would make all future rentals free — financial risk RISK-001
        if ((value as number) <= 0) {
          throw new ValidationError('يجب أن يكون سعر الإيجار بالساعة أكبر من صفر')
        }
      }

      if (key === 'late_fee_per_minute') {
        // SETT-004: zero is valid (no late fee); negative is not
        if ((value as number) < 0) {
          throw new ValidationError('لا يمكن أن يكون رسم التأخير لكل دقيقة قيمة سالبة')
        }
      }

      if (key === 'rental_duration_options') {
        const arr = value as unknown[]
        // SETT-003: Must contain at least one value
        if (arr.length === 0) {
          throw new ValidationError('يجب أن يحتوي خيارات مدة الإيجار على قيمة واحدة على الأقل')
        }
        // SETT-003: Every element must be a positive integer
        for (const item of arr) {
          if (typeof item !== 'number' || !Number.isInteger(item) || item <= 0) {
            throw new ValidationError('يجب أن تكون جميع قيم خيارات مدة الإيجار أعداداً صحيحة موجبة')
          }
        }
        // SETT-003: No duplicate values
        const nums = arr as number[]
        const unique = new Set(nums)
        if (unique.size !== nums.length) {
          throw new ValidationError('لا يمكن تكرار قيم خيارات مدة الإيجار')
        }
        // SETT-003: Values must be ascending
        for (let i = 1; i < nums.length; i++) {
          if (nums[i] <= nums[i - 1]) {
            throw new ValidationError('يجب أن تكون قيم خيارات مدة الإيجار بترتيب تصاعدي')
          }
        }
      }
    }

    await settingsService.update(updates, req.user!.sub)
    const data = await settingsService.getAll()
    res.json({ success: true, data })
  } catch (err) {
    next(err)
  }
})
