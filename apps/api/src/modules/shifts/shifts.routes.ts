import { Router } from 'express'
import { authenticate } from '../../middleware/auth.js'
import { requirePermission } from '../../middleware/permission.js'
import * as ShiftsService from './shifts.service.js'
import type { OpenShiftInput, CloseShiftInput } from './shifts.types.js'
import { positiveId, cents } from '../treasury/treasury-posting.js'
import { loadUserWithPermissions } from '../auth/auth.service.js'
import { ForbiddenError, ValidationError } from '../../utils/errors.js'

const router = Router()

// All routes require authentication
router.use(authenticate)

// GET /api/v1/shifts/current - Get active shift for current cashier
router.get('/current', async (req, res, next) => {
  try {
    const user = await loadUserWithPermissions(req.user!.sub)
    if (!user.isActive) throw new ForbiddenError()
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
    cents(validated.openingBalance)
    const shift = await ShiftsService.openShift(req.user!.sub, validated)
    res.status(201).json(shift)
  } catch (error) {
    next(error)
  }
})

// POST /api/v1/shifts/:id/close - Close a shift
router.post('/:id/close', requirePermission('shifts.manage'), async (req, res, next) => {
  try {
    const shiftId = positiveId(req.params.id)
    const validated = req.body as CloseShiftInput
    cents(validated.actualBalance)
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
router.get('/', async (req, res, next) => {
  try {
    const user = await loadUserWithPermissions(req.user!.sub)
    if (!user.isActive || (!user.permissions.includes('shifts.view') && !user.permissions.includes('shifts.view_all'))) throw new ForbiddenError()
    const shifts = await ShiftsService.listShifts(req.user!.sub, user.permissions.includes('shifts.view_all'))
    res.json(shifts)
  } catch (error) {
    next(error)
  }
})

export { router as shiftsRouter }
