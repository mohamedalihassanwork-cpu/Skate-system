/**
 * KOSHK SKATE ERP — Rentals Routes
 * Phase 05 — Rental POS Core
 *
 * CRITICAL: Static routes MUST be registered BEFORE /:id to prevent
 * "active" and "calculate-price" being matched as :id values.
 *
 * Registration order:
 *   1. GET  /active          — must be first
 *   2. GET  /calculate-price — must be before /:id
 *   3. GET  /               — list
 *   4. POST /               — create
 *   5. GET  /:id             — detail — LAST
 *
 * Phase 07 endpoints NOT implemented here:
 *   POST /:id/return
 *   POST /:id/waive-late-fee
 */

import { Router, type Request, type Response, type NextFunction } from 'express'
import { authenticate } from '../../middleware/auth.js'
import { requirePermission } from '../../middleware/permission.js'
import * as rentalSvc from './rentals.service.js'
import type { ListRentalsQuery, StartRentalRequest } from './rentals.types.js'

import { AuthenticationError, ForbiddenError } from '../../utils/errors.js'

const router = Router()

// ---------------------------------------------------------------------------
// GET /api/v1/rentals/active — active rentals with operational status
// MUST be registered before /:id (DEC-066)
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
// GET /api/v1/rentals/config — Rental POS configuration (F-06 — DEC-069)
// Returns configured hourly rate and standard duration options from settings.
// MUST be registered before /:id
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
// GET /api/v1/rentals/calculate-price — price preview (server-authoritative)
// MUST be registered before /:id
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
// GET /api/v1/rentals — list rentals (paginated, filterable)
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
// POST /api/v1/rentals — start rental (Rental POS primary action)
// ---------------------------------------------------------------------------

router.post(
  '/',
  authenticate,
  requirePermission('rentals.create'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // cashierId comes from the authenticated user's JWT sub claim (BR-19, DEC-063)
      // TokenPayload.sub holds the user ID — NOT .id
      const cashierId = (req as any).user?.sub
      if (!cashierId) {
        throw new AuthenticationError('يجب تسجيل الدخول أولاً')
      }
      const data = await rentalSvc.startRental(cashierId, req.body as StartRentalRequest)
      res.status(201).json({ success: true, data })
    } catch (err) {
      next(err)
    }
  },
)

// ---------------------------------------------------------------------------
// GET /api/v1/rentals/:id — rental detail (read-only)
// MUST be registered LAST to avoid capturing static paths
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
// POST /api/v1/rentals/:id/cancel — cancel a rental and refund (Phase 06)
// ---------------------------------------------------------------------------

router.post(
  '/:id/cancel',
  authenticate,
  requirePermission('rentals.create'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const cashierId = (req as any).user?.sub
      if (!cashierId) {
        throw new AuthenticationError('يجب تسجيل الدخول أولاً')
      }
      const data = await rentalSvc.cancelRental(parseInt(String(req.params['id']), 10), cashierId)
      res.json({ success: true, data })
    } catch (err) {
      next(err)
    }
  },
)

// ---------------------------------------------------------------------------
// POST /api/v1/rentals/:id/return — return a rental and process late fee (Phase 07)
// ---------------------------------------------------------------------------

router.post(
  '/:id/return',
  authenticate,
  requirePermission('rentals.return'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const cashierId = (req as any).user?.sub
      const userPermissions = (req as any).authUser?.permissions || []
      const canWaive = userPermissions.includes('waivers.approve')

      if (!cashierId) {
        throw new AuthenticationError('يجب تسجيل الدخول أولاً')
      }
      
      // If the request includes a waiver, the user must have waivers.approve permission
      const waivedFee = req.body.waivedFee ? parseFloat(String(req.body.waivedFee)) : 0;
      if (waivedFee > 0 && !canWaive) {
        throw new ForbiddenError('لا تملك صلاحية الموافقة على التنازل عن الرسوم')
      }

      const data = await rentalSvc.returnRental(parseInt(String(req.params['id']), 10), cashierId, req.body)
      res.json({ success: true, data })
    } catch (err) {
      next(err)
    }
  },
)

export default router
