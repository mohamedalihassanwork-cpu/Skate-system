import { Router } from 'express'
import { ProductsService } from './products.service.js'
import { authenticate } from '../../middleware/auth.js'
import { requirePermission } from '../../middleware/permission.js'

export const productsRouter = Router()
import { ValidationError, NotFoundError, BusinessRuleError } from '../../utils/errors.js'

// ==========================================
// CATEGORIES
// ==========================================

productsRouter.get('/categories', authenticate, requirePermission('products.view'), async (req, res, next) => {
  try {
    const categories = await ProductsService.listCategories()
    res.json({ success: true, data: categories })
  } catch (err: any) {
    next(err)
  }
})

productsRouter.post('/categories', authenticate, requirePermission('products.manage'), async (req, res, next) => {
  try {
    if (!req.body.name || !req.body.nameAr) {
      throw new ValidationError('Missing required fields')
    }
    const category = await ProductsService.createCategory(req.body)
    res.status(201).json({ success: true, data: category })
  } catch (err: any) {
    next(err)
  }
})

productsRouter.put('/categories/:id', authenticate, requirePermission('products.manage'), async (req, res, next) => {
  try {
    const id = parseInt(String(req.params.id), 10)
    const category = await ProductsService.updateCategory(id, req.body)
    if (!category) {
      throw new NotFoundError('Category not found')
    }
    res.json({ success: true, data: category })
  } catch (err: any) {
    next(err)
  }
})

// ==========================================
// PRODUCTS
// ==========================================

productsRouter.get('/', authenticate, requirePermission('products.view'), async (req, res, next) => {
  try {
    const products = await ProductsService.listProducts()
    res.json({ success: true, data: products })
  } catch (err: any) {
    next(err)
  }
})

productsRouter.post('/', authenticate, requirePermission('products.manage'), async (req, res, next) => {
  try {
    if (!req.body.name || !req.body.nameAr || !req.body.categoryId || req.body.price === undefined) {
      throw new ValidationError('Missing required fields')
    }
    const product = await ProductsService.createProduct(req.body)
    res.status(201).json({ success: true, data: product })
  } catch (err: any) {
    next(err)
  }
})

productsRouter.put('/:id', authenticate, requirePermission('products.manage'), async (req, res, next) => {
  try {
    const id = parseInt(String(req.params.id), 10)
    const product = await ProductsService.updateProduct(id, req.body)
    if (!product) {
      throw new NotFoundError('Product not found')
    }
    res.json({ success: true, data: product })
  } catch (err: any) {
    if (err.message === 'STOCK_CANNOT_BE_NEGATIVE') {
      next(new BusinessRuleError('Stock cannot be negative', 'STOCK_CANNOT_BE_NEGATIVE'))
      return
    }
    next(err)
  }
})

productsRouter.get('/:id', authenticate, requirePermission('products.view'), async (req, res, next) => {
  try {
    const id = parseInt(String(req.params.id), 10)
    const product = await ProductsService.getProduct(id)
    if (!product) {
      throw new NotFoundError('Product not found')
    }
    res.json({ success: true, data: product })
  } catch (err: any) {
    next(err)
  }
})
