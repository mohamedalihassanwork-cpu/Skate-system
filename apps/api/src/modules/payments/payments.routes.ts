/**
 * KOSHK SKATE ERP — Payments Routes
 * Phase 06 — Payments & Treasury
 */

import { Router, type Request, type Response, type NextFunction } from 'express'
import { authenticate } from '../../middleware/auth'
import { requirePermission } from '../../middleware/permission'
import * as paymentsSvc from './payments.service'

const router = Router()

// GET /api/v1/payments/methods — List active payment methods
router.get(
  '/methods',
  authenticate,
  // Accessible to anyone who can create a rental (needs to see payment options)
  requirePermission('rentals.create'),
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await paymentsSvc.listActivePaymentMethods()
      res.json({ success: true, data })
    } catch (err) {
      next(err)
    }
  },
)

// GET /api/v1/payments/treasury-accounts — List treasury accounts
router.get(
  '/treasury-accounts',
  authenticate,
  requirePermission('treasury.view'),
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await paymentsSvc.listTreasuryAccounts()
      res.json({ success: true, data })
    } catch (err) {
      next(err)
    }
  },
)

// Current recorded funds, independent of cashier shifts.
router.get(
  '/treasury-summary',
  authenticate,
  requirePermission('treasury.view'),
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      res.setHeader('Cache-Control', 'no-store')
      const data = await paymentsSvc.getTreasurySummary()
      res.json({ success: true, data })
    } catch (err) {
      next(err)
    }
  },
)

export default router
