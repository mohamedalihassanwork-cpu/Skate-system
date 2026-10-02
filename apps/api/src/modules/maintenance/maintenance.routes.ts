import { Router, type Request, type Response, type NextFunction } from 'express'
import { maintenanceService } from './maintenance.service.js'
import { authenticate } from '../../middleware/auth.js'
import { requirePermission } from '../../middleware/permission.js'
import type {
  CreateMaintenanceRecordPayload,
  UpdateMaintenanceRecordPayload,
  CompleteMaintenanceRecordPayload,
  AddMaintenancePartPayload
} from './maintenance.types.js'

import { ValidationError } from '../../utils/errors.js'

const router = Router()

// List records
router.get('/', authenticate, requirePermission('maintenance.view'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await maintenanceService.listRecords(req.query as Record<string, string>)
    res.json({ success: true, ...result })
  } catch (error) {
    next(error)
  }
})

// Get record by ID
router.get('/:id', authenticate, requirePermission('maintenance.view'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const record = await maintenanceService.getRecord(Number(req.params.id))
    res.json({ success: true, data: record })
  } catch (error) {
    next(error)
  }
})

// Create record manually
router.post('/', authenticate, requirePermission('maintenance.create'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payload = req.body as CreateMaintenanceRecordPayload
    const insertId = await maintenanceService.createRecord(payload, (req as any).user!.id)
    const record = await maintenanceService.getRecord(insertId)
    res.status(201).json({ success: true, data: record })
  } catch (error) {
    next(error)
  }
})

// Update record
router.patch('/:id', authenticate, requirePermission('maintenance.edit'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payload = req.body as UpdateMaintenanceRecordPayload
    const laborCost = req.body.laborCost !== undefined ? Number(req.body.laborCost) : undefined

    await maintenanceService.updateRecord(Number(req.params.id), { ...payload, laborCost })
    const record = await maintenanceService.getRecord(Number(req.params.id))
    res.json({ success: true, data: record })
  } catch (error) {
    next(error)
  }
})

// Add part
router.post('/:id/parts', authenticate, requirePermission('maintenance.edit'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payload = req.body as AddMaintenancePartPayload
    await maintenanceService.addPart(Number(req.params.id), payload)
    const record = await maintenanceService.getRecord(Number(req.params.id))
    res.json({ success: true, data: record })
  } catch (error) {
    next(error)
  }
})

// Remove part
router.delete('/:id/parts/:partId', authenticate, requirePermission('maintenance.edit'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    await maintenanceService.removePart(Number(req.params.id), Number(req.params.partId))
    const record = await maintenanceService.getRecord(Number(req.params.id))
    res.json({ success: true, data: record })
  } catch (error) {
    next(error)
  }
})

// Complete record
router.post('/:id/complete', authenticate, requirePermission('maintenance.complete'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payload = req.body as CompleteMaintenanceRecordPayload
    await maintenanceService.completeRecord(Number(req.params.id), (req as any).user!.sub, payload)
    const record = await maintenanceService.getRecord(Number(req.params.id))
    res.json({ success: true, data: record })
  } catch (error) {
    next(error)
  }
})

// Pay record (system)
router.post('/:id/pay', authenticate, requirePermission('maintenance.pay'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const paymentMethodId = Number(req.body.paymentMethodId)
    if (!paymentMethodId || isNaN(paymentMethodId)) {
      throw new ValidationError('paymentMethodId is required')
    }
    await maintenanceService.payRecord(Number(req.params.id), (req as any).user!.sub, paymentMethodId)
    const record = await maintenanceService.getRecord(Number(req.params.id))
    res.json({ success: true, data: record })
  } catch (error) {
    next(error)
  }
})

// Pay record (external)
router.post('/:id/pay-external', authenticate, requirePermission('maintenance.pay'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    await maintenanceService.payRecordExternal(Number(req.params.id), (req as any).user!.sub)
    const record = await maintenanceService.getRecord(Number(req.params.id))
    res.json({ success: true, data: record })
  } catch (error) {
    next(error)
  }
})

export default router
