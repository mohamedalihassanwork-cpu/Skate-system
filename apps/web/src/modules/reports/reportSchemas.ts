import { formatCurrency } from '../../utils/currency'

export type ReportType = 'overview' | 'financial' | 'revenue' | 'rentals' | 'late' | 'damage' | 'maintenance' | 'expenses' | 'customers' | 'cashiers' | 'skates'
export type ReportRow = Record<string, unknown>
export const chartTooltipStyle = { borderRadius: 'var(--radius-base)', border: '1px solid var(--color-border)', background: 'var(--color-white)', color: 'var(--color-text-primary)' }
export const reportSummaryLabels: Record<string, string> = {
  actualCollectedLateFees: 'تحصيل الفترة الفعلي لإيجارات النتائج',
  rentalsCount: 'مرات الإيجار', lateRecordsCount: 'سجلات التأخير', lateReturns: 'الإيجارات التي أعيدت متأخرة', damages: 'عدد الأضرار', maintenanceCount: 'مرات الصيانة', customerCharges: 'المطالبات على العملاء', collectedDamageCharges: 'تعويضات الأضرار المحصلة', revenue: 'صافي الإيرادات المحصلة', lateFees: 'غرامات التأخير المحصلة', waivedFees: 'الغرامات المعفاة', expenses: 'المصروفات المسجلة', shiftDifference: 'مجموع فروق الورديات المسجلة',
  totalRentals: 'عدد الإيجارات', totalItems: 'عدد بنود الإيجار', totalAmount: 'قيمة الإيجارات المسجلة', totalLateRentals: 'الإيجارات المتأخرة', calculatedLateFees: 'الغرامات المحسوبة', collectedLateFees: 'الرسوم المسوّاة المسجلة', waivedLateFees: 'الغرامات المعفاة', pendingLateFees: 'بانتظار التسوية', waiverRate: 'نسبة قيمة الإعفاء (%)', totalDamages: 'عدد الأضرار', totalCharges: 'المطالبات على العملاء', totalCollected: 'المبالغ المحصلة', totalWaived: 'المبالغ المعفاة', totalOutstanding: 'المبالغ المتبقية', totalRepairCost: 'تكلفة الإصلاح', totalMaintenance: 'عمليات الصيانة', totalCost: 'تكلفة الصيانة المسجلة', averageCost: 'متوسط التكلفة', completedCount: 'العمليات المكتملة', averageCompletedMinutes: 'متوسط مدة الصيانة المكتملة (دقيقة)', totalCustomers: 'العملاء ذوو نشاط في الفترة', totalSpent: 'صافي المدفوعات', totalCashiers: 'الكاشير ذوو نشاط في الفترة', totalRevenue: 'صافي الإيرادات', totalExpenses: 'المصروفات', totalSkates: 'عدد الاسكيتات', unusedSkates: 'الاسكيتات غير المستخدمة', usageMinutes: 'الاستخدام الفعلي (دقيقة)', rentalRevenue: 'قيمة الإيجارات المسجلة', maintenanceCost: 'تكلفة الصيانة', damageCount: 'عدد الأضرار',
}
export const monetarySummaryKeys = new Set(['actualCollectedLateFees', 'totalAmount', 'calculatedLateFees', 'collectedLateFees', 'waivedLateFees', 'pendingLateFees', 'totalCharges', 'totalCollected', 'totalWaived', 'totalOutstanding', 'totalRepairCost', 'totalCost', 'averageCost', 'totalSpent', 'totalRevenue', 'totalExpenses', 'rentalRevenue', 'maintenanceCost', 'customerCharges', 'collectedDamageCharges', 'revenue', 'lateFees', 'waivedFees', 'expenses', 'shiftDifference'])
export interface ReportColumn {
  key: string
  label: string
  kind: 'text' | 'number' | 'currency' | 'date' | 'datetime' | 'status' | 'boolean'
}
const col = (key: string, label: string, kind: ReportColumn['kind'] = 'text'): ReportColumn => ({ key, label, kind })
const schemas: Record<ReportType, ReportColumn[]> = {
  overview: [col('totalRevenue', 'صافي الإيرادات المحصلة', 'currency'), col('totalExpenses', 'المصروفات المسجلة', 'currency'), col('totalRentals', 'الإيجارات في الفترة', 'number'), col('activeRentals', 'الإيجارات النشطة حالياً', 'number'), col('lateRentals', 'الإيجارات المتأخرة حالياً', 'number'), col('totalDamages', 'الأضرار في الفترة', 'number'), col('activeMaintenance', 'الصيانة المفتوحة حالياً', 'number')],
  financial: [col('rentalRevenue', 'إيرادات الإيجار', 'currency'), col('lateFees', 'غرامات التأخير المحصلة', 'currency'), col('damageCharges', 'تعويضات الأضرار المحصلة', 'currency'), col('salesRevenue', 'إيرادات المبيعات', 'currency'), col('grossRevenue', 'الإيرادات قبل الاسترداد', 'currency'), col('refunds', 'المبالغ المستردة', 'currency'), col('totalRevenue', 'صافي الإيرادات المحصلة', 'currency'), col('totalExpenses', 'المصروفات المسجلة', 'currency'), col('operatingResult', 'النتيجة التشغيلية', 'currency')],
  revenue: [col('date', 'التاريخ', 'date'), col('value', 'صافي الإيرادات المحصلة', 'currency')],
  expenses: [col('date', 'التاريخ', 'date'), col('value', 'المصروفات المسجلة', 'currency')],
  rentals: [col('rentalCode', 'رقم الإيجار'), col('customerName', 'العميل'), col('skateCode', 'كود الاسكيت'), col('size', 'المقاس'), col('expectedDuration', 'المدة المحجوزة (دقيقة)', 'number'), col('duration', 'المدة الفعلية (دقيقة)', 'number'), col('amount', 'قيمة الإيجار المسجلة', 'currency'), col('startTime', 'وقت البدء', 'datetime'), col('endTime', 'النهاية المتوقعة', 'datetime'), col('actualReturnTime', 'الإرجاع الفعلي', 'datetime'), col('status', 'حالة الاسكيت في الإيجار', 'status'), col('rentalStatus', 'حالة الإيجار', 'status'), col('cashierName', 'الكاشير')],
  late: [col('rentalCode', 'رقم الإيجار'), col('customerName', 'العميل'), col('skateCode', 'كود الاسكيت'), col('cashierName', 'كاشير الإيجار'), col('startTime', 'وقت البدء', 'datetime'), col('endTime', 'النهاية المتوقعة', 'datetime'), col('actualReturnTime', 'الإرجاع الفعلي', 'datetime'), col('lateMinutes', 'التأخير (دقيقة)', 'number'), col('lateFee', 'الغرامة المحسوبة', 'currency'), col('collectedFee', 'الرسوم المسوّاة المسجلة', 'currency'), col('waivedFee', 'الغرامة المعفاة', 'currency'), col('pendingFee', 'بانتظار التسوية', 'currency')],
  damage: [col('skateCode', 'كود الاسكيت'), col('customerName', 'العميل'), col('damageType', 'نوع الضرر', 'status'), col('severity', 'الشدة', 'status'), col('chargeAmount', 'المطالبة على العميل', 'currency'), col('chargeCollected', 'المبلغ المحصل', 'currency'), col('chargeWaived', 'المبلغ المعفى', 'currency'), col('outstandingCharge', 'المتبقي', 'currency'), col('repairCost', 'تكلفة الإصلاح', 'currency'), col('status', 'حالة التحصيل', 'status'), col('reportedAt', 'وقت الإبلاغ', 'datetime')],
  maintenance: [col('skateCode', 'كود الاسكيت'), col('problemType', 'وصف المشكلة'), col('status', 'الحالة', 'status'), col('paymentStatus', 'حالة دفع الصيانة', 'status'), col('repairCost', 'تكلفة الإصلاح المسجلة', 'currency'), col('createdAt', 'وقت التسجيل', 'datetime'), col('startedAt', 'وقت بدء الصيانة', 'datetime'), col('completedAt', 'وقت اكتمال الصيانة', 'datetime'), col('elapsedMinutes', 'مدة الصيانة المكتملة (دقيقة)', 'number')],
  customers: [col('name', 'العميل'), col('rentalsCount', 'عدد الإيجارات', 'number'), col('totalSpent', 'صافي المدفوعات في الفترة', 'currency'), col('lateReturns', 'مرات التأخير', 'number'), col('damages', 'عدد الأضرار', 'number')],
  cashiers: [col('name', 'الكاشير'), col('rentalsCount', 'عدد الإيجارات', 'number'), col('revenue', 'صافي الإيرادات المحصلة', 'currency'), col('lateFees', 'غرامات التأخير المحصلة', 'currency'), col('waivedFees', 'الغرامات المعفاة', 'currency'), col('expenses', 'المصروفات المسجلة', 'currency'), col('shiftDifference', 'فرق الوردية المسجل', 'currency')],
  skates: [col('code', 'كود الاسكيت'), col('type', 'النوع'), col('size', 'المقاس'), col('status', 'الحالة الحالية', 'status'), col('rentalsCount', 'مرات الإيجار', 'number'), col('rentalRevenue', 'قيمة الإيجار المسجلة', 'currency'), col('usageMinutes', 'الاستخدام الفعلي (دقيقة)', 'number'), col('maintenanceCount', 'مرات الصيانة', 'number'), col('maintenanceCost', 'تكلفة الصيانة المسجلة', 'currency'), col('damageCount', 'عدد الأضرار', 'number'), col('customerCharges', 'المطالبات على العملاء', 'currency'), col('collectedDamageCharges', 'تعويضات الأضرار المحصلة', 'currency')],
}
const labels: Record<string, string> = {
  active: 'نشط', returned: 'تم الإرجاع', completed: 'مكتمل', cancelled: 'ملغى', pending: 'معلق', in_progress: 'قيد التنفيذ', paid: 'مدفوع', partially_paid: 'مدفوع جزئياً', waived: 'معفى', unpaid: 'غير مدفوع', paid_external: 'مدفوع خارج الخزينة', legacy: 'سجل سابق', no_cost: 'بدون تكلفة', minor: 'بسيط', moderate: 'متوسط', severe: 'شديد', wheel: 'عجلة', strap: 'حزام', brake: 'فرامل', bearing: 'رمان بلي', body: 'هيكل', other: 'أخرى', available: 'متاح', rented: 'مؤجر', reserved: 'محجوز', maintenance: 'في الصيانة', damaged: 'تالف', lost: 'مفقود', inspected: 'تم الفحص', overdue: 'متأخر', normal: 'ضمن الوقت', ending_soon: 'ينتهي قريباً',
}
export function getReportColumns(type: ReportType | string): ReportColumn[] {
  return schemas[type as ReportType] ?? []
}
export function formatReportCell(column: ReportColumn, value: unknown): string {
  if (value === null || value === undefined || value === '') return '—'
  if (column.kind === 'currency') return formatCurrency(value as number | string)
  if (column.kind === 'number') return Number.isFinite(Number(value)) ? Number(value).toLocaleString('en-US', { maximumFractionDigits: 2 }) : '—'
  if (column.kind === 'datetime') {
    const date = new Date(String(value))
    return Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat('ar-EG-u-nu-latn', { timeZone: 'Etc/GMT-3', year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(date) : '—'
  }
  if (column.kind === 'date') return String(value).slice(0, 10)
  if (column.kind === 'status') return labels[String(value)] ?? String(value)
  if (column.kind === 'boolean') return value ? 'نعم' : 'لا'
  return String(value)
}
export function getReportExportRows(type: ReportType | string, data: ReportRow[]): Record<string, string | number>[] {
  const columns = getReportColumns(type)
  return data.map(row => Object.fromEntries(columns.map(column => [
    column.kind === 'currency' ? `${column.label} (ج.م)` : column.label,
    (column.kind === 'number' || column.kind === 'currency') && row[column.key] !== null && row[column.key] !== undefined && row[column.key] !== '' && Number.isFinite(Number(row[column.key]))
      ? Number(row[column.key]) : formatReportCell(column, row[column.key]),
  ])))
}
