import { Router } from 'express'
import { authenticate } from '../../middleware/auth.js'
import { requirePermission } from '../../middleware/permission.js'
import * as ExpensesService from './expenses.service.js'
import type { CreateExpenseInput } from './expenses.types.js'
import { ValidationError, UnauthorizedError } from '../../utils/errors.js'
import { loadUserWithPermissions } from '../auth/auth.service.js'

const router = Router()

router.use(authenticate)

// POST /api/v1/expenses - Record new expense
router.post('/', requirePermission('expenses.create'), async (req, res, next) => {
  try {
    const validated = req.body as CreateExpenseInput
    if (typeof validated.amount !== 'number' || validated.amount <= 0) {
      throw new ValidationError('المبلغ يجب أن يكون أكبر من الصفر')
    }
    if (typeof validated.description !== 'string' || validated.description.length < 3) {
      throw new ValidationError('الوصف يجب أن يكون 3 أحرف على الأقل')
    }
    const expense = await ExpensesService.recordExpense(req.user!.sub, validated)
    res.status(201).json(expense)
  } catch (error) {
    next(error)
  }
})

// GET /api/v1/expenses - List expenses
router.get('/', async (req, res, next) => {
  try {
    const actor = await loadUserWithPermissions(req.user!.sub)
    if (!actor.isActive) throw new UnauthorizedError()
    const list = await ExpensesService.listExpenses(req.user!.sub, actor.permissions)
    res.json(list)
  } catch (error) {
    next(error)
  }
})

export { router as expensesRouter }
