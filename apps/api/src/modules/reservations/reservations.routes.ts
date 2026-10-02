import { Router } from 'express'
import {
  createReservation,
  listReservations,
  getReservation,
  updateReservation,
  cancelReservation,
} from './reservations.service.js'
import { authenticate } from '../../middleware/auth.js'
import { requirePermission } from '../../middleware/permission.js'
import type { Request, Response, NextFunction } from 'express'
import { ValidationError } from '../../utils/errors.js'

export const reservationsRouter = Router()

reservationsRouter.use(authenticate)

reservationsRouter.post('/', requirePermission('reservations.create'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await createReservation(req.user!.sub, req.body)
    res.status(201).json(data)
  } catch (error) {
    next(error)
  }
})

reservationsRouter.get('/', requirePermission('reservations.view'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await listReservations(req.query as any)
    res.json(data)
  } catch (error) {
    next(error)
  }
})

reservationsRouter.get('/:id', requirePermission('reservations.view'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id as string, 10)
    if (isNaN(id)) {
      throw new ValidationError('معرف غير صالح')
    }
    const data = await getReservation(id)
    res.json(data)
  } catch (error) {
    next(error)
  }
})

reservationsRouter.put('/:id', requirePermission('reservations.edit'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id as string, 10)
    if (isNaN(id)) {
      throw new ValidationError('معرف غير صالح')
    }
    const data = await updateReservation(id, req.body)
    res.json(data)
  } catch (error) {
    next(error)
  }
})

reservationsRouter.post('/:id/cancel', requirePermission('reservations.cancel'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id as string, 10)
    if (isNaN(id)) {
      throw new ValidationError('معرف غير صالح')
    }
    const data = await cancelReservation(id, req.user!.sub)
    res.json(data)
  } catch (error) {
    next(error)
  }
})
