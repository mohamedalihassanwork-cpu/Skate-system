/**
 * KOSHK SKATE ERP — Rental Items Routes
 * Phase 06 Redesign — Multi-Skate Rentals
 *
 * Endpoints for per-skate Rental Item operations:
 *   GET  /api/v1/rental-items/:id          — get item detail
 *   POST /api/v1/rental-items/:id/return   — return one item (partial return)
 *   POST /api/v1/rental-items/:id/extend   — extend one item's expected duration
 *
 * These endpoints operate on individual Rental Items within a Rental.
 * The Rental stays active until all items are returned.
 * Payment collection happens via POST /api/v1/rentals/:id/finalize.
 */

import { Router, type Request, type Response, type NextFunction } from 'express'
import { authenticate } from '../../middleware/auth.js'
import { requirePermission } from '../../middleware/permission.js'
import * as rentalSvc from '../rentals/rentals.service.js'
import type { ReturnRentalItemRequest, ExtendRentalItemRequest } from '../rentals/rentals.types.js'
import { AuthenticationError } from '../../utils/errors.js'

const router = Router()

// ---------------------------------------------------------------------------
// GET /api/v1/rental-items/:id — get single Rental Item detail
// ---------------------------------------------------------------------------

router.get(
  '/:id',
  authenticate,
  requirePermission('rentals.view'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await rentalSvc.getRentalItem(parseInt(String(req.params['id']), 10))
      res.json({ success: true, data })
    } catch (err) {
      next(err)
    }
  },
)

// ---------------------------------------------------------------------------
// POST /api/v1/rental-items/:id/return — return a single Rental Item
//
// §11: Server captures returned_at IMMEDIATELY at start of handler.
// Billing is frozen at that server timestamp.
//
// Body: { inspection: { wheelsCondition, brakeCondition, strapCondition,
//                       bearingsCondition, bodyCondition, maintenanceRequired,
//                       otherNotes? } }
//
// Response includes isLastItem=true when all items in the Rental are returned
// — the caller should then proceed to POST /api/v1/rentals/:rentalId/finalize.
// ---------------------------------------------------------------------------

router.post(
  '/:id/return',
  authenticate,
  requirePermission('rentals.return'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const cashierId = (req as any).user?.sub
      if (!cashierId) throw new AuthenticationError('يجب تسجيل الدخول أولاً')
      const data = await rentalSvc.returnRentalItem(
        parseInt(String(req.params['id']), 10),
        cashierId,
        req.body as ReturnRentalItemRequest,
      )
      res.json({ success: true, data })
    } catch (err) {
      next(err)
    }
  },
)

// ---------------------------------------------------------------------------
// POST /api/v1/rental-items/:id/extend — extend a single Rental Item
//
// §14: Extension changes expected_end_at but does NOT change billing.
// Billing always uses actual_duration_minutes at return time.
//
// Body: { extendByMinutes: number }
// ---------------------------------------------------------------------------

router.post(
  '/:id/extend',
  authenticate,
  requirePermission('rentals.create'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const cashierId = (req as any).user?.sub
      if (!cashierId) throw new AuthenticationError('يجب تسجيل الدخول أولاً')
      const data = await rentalSvc.extendRentalItem(
        parseInt(String(req.params['id']), 10),
        cashierId,
        req.body as ExtendRentalItemRequest,
      )
      res.json({ success: true, data })
    } catch (err) {
      next(err)
    }
  },
)

export default router
