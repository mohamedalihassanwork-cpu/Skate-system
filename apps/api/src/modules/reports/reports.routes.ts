import { Router, type Request } from 'express'
import { authenticate } from '../../middleware/auth.js'
import { requirePermission } from '../../middleware/permission.js'
import type { DateRangeInput } from './reports.types.js'
import * as reportsService from './reports.service.js'
import { ValidationError } from '../../utils/errors.js'

function calendarDate(value: unknown): string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new ValidationError('يجب أن يكون التاريخ بصيغة YYYY-MM-DD')
  }
  const date = new Date(`${value}T00:00:00Z`)
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0,10) !== value || value < '1000-01-01' || value > '9999-12-30') {
    throw new ValidationError('يرجى إدخال تاريخ صحيح ضمن النطاق المدعوم')
  }
  return value
}
function positiveInteger(value: unknown, fallback: number, maximum = Number.MAX_SAFE_INTEGER): number {
  if (value === undefined) return fallback
  if (typeof value !== 'string' || !/^\d+$/.test(value)) throw new ValidationError('يجب إدخال عدد صحيح موجب')
  const parsed = Number(value)
  if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > maximum) throw new ValidationError('قيمة الترقيم أو المدة خارج النطاق المسموح')
  return parsed
}
function optionalText(value: unknown): string | undefined {
  if (value === undefined) return undefined
  if (typeof value !== 'string' || value.length > 100 || /[\u0000-\u001f]/.test(value)) throw new ValidationError('قيمة المرشح غير صالحة')
  return value.trim() || undefined
}
function validateQuery(req: Request): DateRangeInput {
  if (req.query.startDate === undefined || req.query.endDate === undefined) throw new ValidationError('تاريخ البداية والنهاية مطلوبان')
  let startDate = calendarDate(req.query.startDate)
  let endDate = calendarDate(req.query.endDate)
  if (startDate > endDate) [startDate,endDate] = [endDate,startDate]
  const page = positiveInteger(req.query.page,1)
  const limit = positiveInteger(req.query.limit,50,100)
  if (!Number.isSafeInteger((page-1)*limit)) throw new ValidationError('رقم الصفحة خارج النطاق المسموح')
  const filters: DateRangeInput = {startDate,endDate,page,limit}
  for (const key of ['search','customer','cashier','skate','size','status','rentalStatus','sort'] as const) filters[key] = optionalText(req.query[key])
  if (req.query.duration !== undefined) filters.duration = positiveInteger(req.query.duration,1,2147483647)
  const statuses: Record<string,string[]> = {
    '/rentals':['active','returned','cancelled'], '/damages':['pending','partially_paid','paid','waived'],
    '/maintenance':['pending','in_progress','completed'], '/skate-performance':['available','rented','reserved','maintenance','damaged','lost'],
  }
  if (filters.status && !(statuses[req.path] ?? []).includes(filters.status)) throw new ValidationError('حالة التقرير غير صالحة')
  if (filters.rentalStatus && !['active','completed','returned','cancelled'].includes(filters.rentalStatus)) throw new ValidationError('حالة الإيجار غير صالحة')
  const sorts: Record<string,string[]> = { '/customers': ['spending','frequency'], '/skate-performance': ['revenue','most-used','least-used','maintenance','damages'] }
  if (filters.sort && !(sorts[req.path] ?? []).includes(filters.sort)) throw new ValidationError('ترتيب التقرير غير صالح')
  return filters
}

export const reportsRouter = Router()
reportsRouter.use(authenticate)
reportsRouter.use(requirePermission('reports.view'))
const reports = [
  ['/overview', reportsService.getOverviewReport],
  ['/operating-financial', reportsService.getOperatingFinancialReport],
  ['/revenue', reportsService.getRevenueReport],
  ['/expenses', reportsService.getExpenseReport],
  ['/rentals', reportsService.getRentalReport],
  ['/late', reportsService.getLateReport],
  ['/damages', reportsService.getDamageReport],
  ['/maintenance', reportsService.getMaintenanceReport],
  ['/customers', reportsService.getCustomerReport],
  ['/cashiers', reportsService.getCashierReport],
  ['/skate-performance', reportsService.getSkatePerformanceReport],
] as const
for (const [path,report] of reports) {
  reportsRouter.get(path,async (req,res,next) => {
    try { res.json({success:true,data:await report(validateQuery(req))}) }
    catch (error) { next(error) }
  })
}
