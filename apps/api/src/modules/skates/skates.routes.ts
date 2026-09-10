/**
 * KOSHK SKATE ERP — Skates Routes
 * Phase 03 — Skates / Asset Management
 *
 * IMPORTANT: GET /available MUST be registered before GET /:id to prevent
 * "available" being matched as an :id parameter value.
 *
 * GET    /api/v1/skates            — list skates with filters  (skates.view)
 * POST   /api/v1/skates            — create skate              (skates.create)
 * GET    /api/v1/skates/available  — available skates for rental (rentals.create)
 * GET    /api/v1/skates/:id        — get skate by ID           (skates.view)
 * PUT    /api/v1/skates/:id        — update skate              (skates.edit)
 * GET    /api/v1/skates/:id/history — skate timeline (stub)   (skates.view)
 */

import { Router, type Request, type Response, type NextFunction } from 'express'
import { authenticate } from '../../middleware/auth.js'
import { requirePermission } from '../../middleware/permission.js'
import * as skateSvc from './skates.service.js'

const router = Router()

// ---------------------------------------------------------------------------
// GET /api/v1/skates — list skates
// ---------------------------------------------------------------------------

router.get(
  '/',
  authenticate,
  requirePermission('skates.view'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await skateSvc.listSkates(req.query as any)
      res.json({ success: true, ...result })
    } catch (err) {
      next(err)
    }
  },
)

// ---------------------------------------------------------------------------
// POST /api/v1/skates — create skate
// ---------------------------------------------------------------------------

router.post(
  '/',
  authenticate,
  requirePermission('skates.create'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await skateSvc.createSkate(req.body)
      res.status(201).json({ success: true, data })
    } catch (err) {
      next(err)
    }
  },
)

// ---------------------------------------------------------------------------
// GET /api/v1/skates/available — available skates for Rental module (Phase 05)
// MUST be registered BEFORE /:id to avoid "available" being treated as an ID
// ---------------------------------------------------------------------------

router.get(
  '/available',
  authenticate,
  requirePermission('rentals.create'),
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await skateSvc.getAvailableSkates()
      res.json({ success: true, data })
    } catch (err) {
      next(err)
    }
  },
)

// ---------------------------------------------------------------------------
// GET /api/v1/skates/:id — get skate by ID
// ---------------------------------------------------------------------------

router.get(
  '/:id',
  authenticate,
  requirePermission('skates.view'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await skateSvc.getSkate(parseInt(String(req.params['id']), 10))
      res.json({ success: true, data })
    } catch (err) {
      next(err)
    }
  },
)

// ---------------------------------------------------------------------------
// PUT /api/v1/skates/:id — update skate
// DEC-031: status = rented | reserved → 422 (BusinessRuleError in service)
// ---------------------------------------------------------------------------

router.put(
  '/:id',
  authenticate,
  requirePermission('skates.edit'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await skateSvc.updateSkate(parseInt(String(req.params['id']), 10), req.body)
      res.json({ success: true, data })
    } catch (err) {
      next(err)
    }
  },
)

// ---------------------------------------------------------------------------
// GET /api/v1/skates/:id/history — skate timeline (stub in Phase 03)
// ---------------------------------------------------------------------------

router.get(
  '/:id/history',
  authenticate,
  requirePermission('skates.view'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await skateSvc.getSkateHistory(parseInt(String(req.params['id']), 10))
      res.json({ success: true, data })
    } catch (err) {
      next(err)
    }
  },
)

export default router
