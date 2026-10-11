/**
 * KOSHK SKATE ERP — Rentals Routes
 * Phase 06 Redesign — Multi-Skate Rentals
 *
 * CRITICAL: Static routes MUST be registered BEFORE /:id to prevent
 * "active", "config", "calculate-price" being matched as :id values.
 *
 * Registration order:
 *   1. GET  /active          — active rentals with item-level status
 *   2. GET  /config          — rental POS config
 *   3. GET  /calculate-price — price preview
 *   4. GET  /               — paginated list
 *   5. POST /               — create rental (multi-skate, no payment)
 *   6. GET  /:id             — rental detail (with items)
 *   7. POST /:id/cancel      — cancel rental
 *   8. POST /:id/finalize    — final invoice + payment after all items returned
 *   9. POST /:id/return      — legacy single-skate return (compatibility)
 *
 * Rental Item routes are in rental-items.routes.ts, mounted at /api/v1/rental-items
 */

import { Router, type Request, type Response, type NextFunction } from 'express'
import { authenticate } from '../../middleware/auth.js'
import { requirePermission } from '../../middleware/permission.js'
import * as rentalSvc from './rentals.service.js'
import type { ListRentalsQuery, StartRentalRequest, FinalizeRentalRequest } from './rentals.types.js'
import { AuthenticationError } from '../../utils/errors.js'

const router = Router()

// ---------------------------------------------------------------------------
// GET /api/v1/rentals/active
// ---------------------------------------------------------------------------

router.get(
  '/active',
  authenticate,
  requirePermission('rentals.view'),
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await rentalSvc.getActiveRentals()
      res.json({ success: true, data })
    } catch (err) {
      next(err)
    }
  },
)

// ---------------------------------------------------------------------------
// GET /api/v1/rentals/config
// ---------------------------------------------------------------------------

router.get(
  '/config',
  authenticate,
  requirePermission('rentals.create'),
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await rentalSvc.getRentalConfig()
      res.json({ success: true, data })
    } catch (err) {
      next(err)
    }
  },
)

// ---------------------------------------------------------------------------
// GET /api/v1/rentals/calculate-price
// ---------------------------------------------------------------------------

router.get(
  '/calculate-price',
  authenticate,
  requirePermission('rentals.create'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const durationMinutes = parseInt(String(req.query['durationMinutes'] ?? ''), 10)
      const data = await rentalSvc.calculatePrice(durationMinutes)
      res.json({ success: true, data })
    } catch (err) {
      next(err)
    }
  },
)

// ---------------------------------------------------------------------------
// GET /api/v1/rentals — list (paginated, filterable)
// ---------------------------------------------------------------------------

router.get(
  '/',
  authenticate,
  requirePermission('rentals.view'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await rentalSvc.listRentals(req.query as ListRentalsQuery)
      res.json({ success: true, ...result })
    } catch (err) {
      next(err)
    }
  },
)

// ---------------------------------------------------------------------------
// POST /api/v1/rentals — start rental (multi-skate, NO payment at creation)
// Body: { skateIds: number[], customerId, durationMinutes, notes?, reservationId? }
// ---------------------------------------------------------------------------

router.post(
  '/',
  authenticate,
  requirePermission('rentals.create'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const cashierId = (req as any).user?.sub
      if (!cashierId) throw new AuthenticationError('يجب تسجيل الدخول أولاً')
      const data = await rentalSvc.startRental(cashierId, req.body as StartRentalRequest)
      res.status(201).json({ success: true, data })
    } catch (err) {
      next(err)
    }
  },
)

// ---------------------------------------------------------------------------
// GET /api/v1/rentals/:id — rental detail with all items
// MUST be after all static paths
// ---------------------------------------------------------------------------

router.get(
  '/:id',
  authenticate,
  requirePermission('rentals.view'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await rentalSvc.getRental(parseInt(String(req.params['id']), 10))
      res.json({ success: true, data })
    } catch (err) {
      next(err)
    }
  },
)

// ---------------------------------------------------------------------------
// POST /api/v1/rentals/:id/cancel — cancel active rental
// ---------------------------------------------------------------------------

router.post(
  '/:id/cancel',
  authenticate,
  requirePermission('rentals.create'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const cashierId = (req as any).user?.sub
      if (!cashierId) throw new AuthenticationError('يجب تسجيل الدخول أولاً')
      const data = await rentalSvc.cancelRental(parseInt(String(req.params['id']), 10), cashierId)
      res.json({ success: true, data })
    } catch (err) {
      next(err)
    }
  },
)

// ---------------------------------------------------------------------------
// POST /api/v1/rentals/:id/finalize — collect final payment after all items returned
// Body: { payments: [{ paymentMethodId, amount }] }
// Called only after ALL rental items have been returned.
// ---------------------------------------------------------------------------

router.post(
  '/:id/finalize',
  authenticate,
  requirePermission('rentals.return'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const cashierId = (req as any).user?.sub
      if (!cashierId) throw new AuthenticationError('يجب تسجيل الدخول أولاً')
      const data = await rentalSvc.finalizeRental(
        parseInt(String(req.params['id']), 10),
        cashierId,
        req.body as FinalizeRentalRequest,
      )
      res.json({ success: true, data })
    } catch (err) {
      next(err)
    }
  },
)

// ---------------------------------------------------------------------------
// POST /api/v1/rentals/:id/return — legacy single-skate compatibility endpoint
// Delegates to returnRentalItem for the first (and only) active item.
// Kept for backwards compat with existing tests / UI until migration is complete.
// ---------------------------------------------------------------------------

router.post(
  '/:id/return',
  authenticate,
  requirePermission('rentals.return'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const cashierId = (req as any).user?.sub
      if (!cashierId) throw new AuthenticationError('يجب تسجيل الدخول أولاً')
      const data = await rentalSvc.returnRental(
        parseInt(String(req.params['id']), 10),
        cashierId,
        req.body,
      )
      res.json({ success: true, data })
    } catch (err) {
      next(err)
    }
  },
)

export default router
