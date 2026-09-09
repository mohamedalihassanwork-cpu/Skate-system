/**
 * KOSHK SKATE ERP — Users Routes
 * Phase 02 — Authentication & Permissions
 *
 * All routes require authentication + specific permissions (server-side — Rule 13)
 *
 * GET    /api/v1/users        — list all users         (users.view)
 * POST   /api/v1/users        — create user            (users.create)
 * GET    /api/v1/users/:id    — get user by ID         (users.view)
 * PATCH  /api/v1/users/:id    — update user            (users.edit)
 * DELETE /api/v1/users/:id    — deactivate user        (users.delete)
 */

import { Router, type Request, type Response, type NextFunction } from 'express'
import { authenticate } from '../../middleware/auth.js'
import { requirePermission } from '../../middleware/permission.js'
import * as usersService from './users.service.js'

const router = Router()

// GET /api/v1/users
router.get(
  '/',
  authenticate,
  requirePermission('users.view'),
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await usersService.listUsers()
      res.json({ success: true, data })
    } catch (err) {
      next(err)
    }
  },
)

// POST /api/v1/users
router.post(
  '/',
  authenticate,
  requirePermission('users.create'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await usersService.createUser(req.body)
      res.status(201).json({ success: true, data })
    } catch (err) {
      next(err)
    }
  },
)

// GET /api/v1/users/:id
router.get(
  '/:id',
  authenticate,
  requirePermission('users.view'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await usersService.getUser(parseInt(String(req.params['id']), 10))
      res.json({ success: true, data })
    } catch (err) {
      next(err)
    }
  },
)

// PATCH /api/v1/users/:id
router.patch(
  '/:id',
  authenticate,
  requirePermission('users.edit'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await usersService.updateUser(parseInt(String(req.params['id']), 10), req.body)
      res.json({ success: true, data })
    } catch (err) {
      next(err)
    }
  },
)

// DELETE /api/v1/users/:id  — soft deactivation, no hard delete (DEC-009)
router.delete(
  '/:id',
  authenticate,
  requirePermission('users.delete'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await usersService.deactivateUser(parseInt(String(req.params['id']), 10))
      res.status(200).json({ success: true, data: { message: 'تم تعطيل حساب المستخدم' } })
    } catch (err) {
      next(err)
    }
  },
)

export default router
