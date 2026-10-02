import { Router } from 'express'
import { authenticate } from '../../middleware/auth.js'
import { requirePermission } from '../../middleware/permission.js'
import * as ShiftsService from './shifts.service.js'
import type { OpenShiftInput, CloseShiftInput } from './shifts.types.js'
import { ValidationError } from '../../utils/errors.js'

const router = Router()

// All routes require authentication
router.use(authenticate)

// GET /api/v1/shifts/current - Get active shift for current cashier
router.get('/current', async (req, res, next) => {
  try {
    const shift = await ShiftsService.getActiveShiftForCashier(req.user!.sub)
    res.json(shift)
  } catch (error) {
    next(error)
  }
})

// POST /api/v1/shifts/open - Open a new shift
router.post('/open', requirePermission('shifts.manage'), async (req, res, next) => {
  try {
    const validated = req.body as OpenShiftInput
    if (typeof validated.openingBalance !== 'number' || validated.openingBalance < 0) {
      throw new ValidationError('رصيد الافتتاح يجب أن يكون 0 أو أكثر')
    }
    const shift = await ShiftsService.openShift(req.user!.sub, validated)
    res.status(201).json(shift)
  } catch (error) {
    next(error)
  }
})

// POST /api/v1/shifts/:id/close - Close a shift
router.post('/:id/close', requirePermission('shifts.manage'), async (req, res, next) => {
  try {
    const shiftId = parseInt(req.params.id as string, 10)
    const validated = req.body as CloseShiftInput
    if (typeof validated.actualBalance !== 'number' || validated.actualBalance < 0) {
      throw new ValidationError('الرصيد الفعلي يجب أن يكون 0 أو أكثر')
    }
    if (validated.closedAt !== undefined && typeof validated.closedAt !== 'string') {
      throw new ValidationError('وقت الإغلاق يجب أن يكون نص (تاريخ)')
    }
    const shift = await ShiftsService.closeShift(shiftId, validated, req.user!.sub)
    res.json(shift)
  } catch (error) {
    next(error)
  }
})

// GET /api/v1/shifts - List all shifts (Admin)
router.get('/', requirePermission('shifts.view'), async (req, res, next) => {
  try {
    const shifts = await ShiftsService.listShifts()
    res.json(shifts)
  } catch (error) {
    next(error)
  }
})

export { router as shiftsRouter }
