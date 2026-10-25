import * as XLSX from 'xlsx'
import { reportsApi } from './reports.api'
import { formatReportCell, getReportColumns, reportSummaryLabels, monetarySummaryKeys } from './reportSchemas'
import type { ReportColumn, ReportRow, ReportType } from './reportSchemas'

export interface ExportTable { title: string; columns: ReportColumn[]; rows: ReportRow[] }
export interface ExportContext { startDate: string; endDate: string; filters?: Record<string, string | number | undefined> }
export interface ReportExportData extends ExportContext { tables: ExportTable[]; rowCount: number }
const textColumn = (key: string, label: string): ReportColumn => ({ key, label, kind: 'text' })
const moneyColumn = (key: string, label: string): ReportColumn => ({ key, label, kind: 'currency' })
const numberColumn = (key: string, label: string): ReportColumn => ({ key, label, kind: 'number' })
const titles: Record<ReportType, string> = { overview: 'نظرة عامة', financial: 'النتيجة التشغيلية', revenue: 'الإيرادات', rentals: 'الإيجارات', late: 'المتأخرات', damage: 'الأضرار', maintenance: 'الصيانة', expenses: 'المصروفات', customers: 'العملاء', cashiers: 'الكاشير', skates: 'أداء الاسكيتات' }
const filterLabels: Record<string, string> = { search: 'بحث', customer: 'العميل', cashier: 'الكاشير', skate: 'الاسكيت', size: 'المقاس', status: 'الحالة', rentalStatus: 'حالة الإيجار', duration: 'المدة المحجوزة (دقيقة)' }
const sortLabels: Record<string,string> = { spending:'الأعلى إنفاقاً', frequency:'الأكثر إيجاراً', revenue:'الأعلى قيمة إيجار', 'most-used':'الأكثر استخداماً', 'least-used':'الأقل استخداماً', maintenance:'الأكثر صيانة', damages:'الأكثر أضراراً' }

export function exportFilterContext(filters: ExportContext['filters']): string {
  return Object.entries(filters ?? {}).filter(([, value]) => value !== undefined && value !== '').map(([key, value]) => {
    if (key === 'sort') return `الترتيب: ${sortLabels[String(value)] ?? value}`
    const column: ReportColumn = { key, label: filterLabels[key] ?? key, kind: key === 'status' || key === 'rentalStatus' ? 'status' : 'text' }
    return `${column.label}: ${formatReportCell(column, value)}`
  }).join('، ') || 'بدون مرشحات إضافية'
}

function summaryTables(summary: Record<string, unknown> | undefined): ExportTable[] {
  if (!summary) return []
  const entries = Object.entries(summary).filter(([key]) => key in reportSummaryLabels)
  return [
    { title: 'ملخص الأعداد والمدد', columns: [textColumn('metric', 'المؤشر'), numberColumn('value', 'القيمة')], rows: entries.filter(([key]) => !monetarySummaryKeys.has(key)).map(([key, value]) => ({ metric: reportSummaryLabels[key], value })) },
    { title: 'ملخص القيم المالية', columns: [textColumn('metric', 'المؤشر'), moneyColumn('value', 'القيمة')], rows: entries.filter(([key]) => monetarySummaryKeys.has(key)).map(([key, value]) => ({ metric: reportSummaryLabels[key], value })) },
  ].filter(table => table.rows.length > 0)
}

type PageResponse = { data: { data: ReportRow[]; meta: { total: number; page: number; limit: number; totalPages: number }; summary?: Record<string, unknown>; byType?: ReportRow[]; byCashier?: ReportRow[] } }

/** Follow actual server pagination; fail visibly if the activity count changes mid-export. */
export async function collectReportPages(fetchPage: (page: number, limit: number) => Promise<PageResponse>): Promise<{ rows: ReportRow[]; first: PageResponse['data'] }> {
  const first = (await fetchPage(1, 100)).data
  const rows = [...first.data]
  if (first.meta.page !== 1 || !Number.isSafeInteger(first.meta.totalPages) || first.meta.totalPages < 0 || first.meta.limit < 1) throw new Error('تعذر التحقق من صفحات التقرير')
  for (let page = 2; page <= first.meta.totalPages; page++) {
    const next = (await fetchPage(page, first.meta.limit)).data
    if (next.meta.page !== page || next.meta.total !== first.meta.total || next.meta.totalPages !== first.meta.totalPages || next.meta.limit !== first.meta.limit) throw new Error('تغيرت بيانات التقرير أثناء التصدير؛ أعد المحاولة')
    rows.push(...next.data)
  }
  if (rows.length !== first.meta.total) throw new Error('لم يتم تحميل كل بيانات التقرير؛ أعد المحاولة')
  return { rows, first }
}

export async function fetchAllReportData(type: ReportType, startDate: string, endDate: string, filters: ExportContext['filters'] = {}): Promise<ReportExportData> {
  const params = { startDate, endDate, ...filters }
  const tables: ExportTable[] = []
  let rowCount = 0
  if (type === 'overview' || type === 'financial') {
    const res = type === 'overview' ? await reportsApi.getOverview(params) : await reportsApi.getOperatingFinancial(params)
    tables.push({ title: titles[type], columns: getReportColumns(type), rows: [res.data as unknown as ReportRow] })
    if (type === 'financial') {
      const financial = res.data as unknown as { revenueByCategory: ReportRow[]; expensesByCategory: ReportRow[] }
      tables.push({ title: 'تحليل الإيرادات', columns: [textColumn('type', 'البند'), moneyColumn('total', 'القيمة')], rows: financial.revenueByCategory })
      tables.push({ title: 'تحليل المصروفات', columns: [textColumn('category', 'الفئة'), moneyColumn('total', 'القيمة')], rows: financial.expensesByCategory })
    }
    rowCount = 1
  } else if (type === 'revenue' || type === 'expenses') {
    const res = type === 'revenue' ? await reportsApi.getRevenue(params) : await reportsApi.getExpenses(params)
    const data = res.data
    tables.push({ title: 'الإجمالي', columns: [moneyColumn(type === 'revenue' ? 'totalRevenue' : 'totalExpenses', titles[type])], rows: [data as unknown as ReportRow] })
    tables.push({ title: 'حسب اليوم', columns: getReportColumns(type), rows: data.chartData as unknown as ReportRow[] })
    tables.push({ title: 'حسب الفئة', columns: [textColumn(type === 'revenue' ? 'type' : 'category', 'الفئة'), moneyColumn('total', 'القيمة')], rows: data.byCategory as unknown as ReportRow[] })
    if (type === 'expenses') {
      const expenses = data as unknown as { byUser: ReportRow[]; byAccount: ReportRow[] }
      tables.push({ title: 'حسب المستخدم', columns: [textColumn('name', 'المستخدم'), moneyColumn('total', 'القيمة')], rows: expenses.byUser })
      tables.push({ title: 'حسب حساب الخزينة', columns: [textColumn('name', 'حساب الخزينة'), moneyColumn('total', 'القيمة')], rows: expenses.byAccount })
    }
    rowCount = data.chartData.length
  } else {
    const getters = { rentals: reportsApi.getRentals, late: reportsApi.getLate, damage: reportsApi.getDamage, maintenance: reportsApi.getMaintenance, customers: reportsApi.getCustomers, cashiers: reportsApi.getCashiers, skates: reportsApi.getSkates }
    const { rows, first } = await collectReportPages((page, limit) => getters[type]({ ...params, page, limit }) as Promise<PageResponse>)
    tables.push(...summaryTables(first.summary), { title: titles[type], columns: getReportColumns(type), rows })
    if (first.byType) tables.push({ title: 'حسب نوع الضرر', columns: [{ key: 'type', label: 'نوع الضرر', kind: 'status' }, numberColumn('count', 'عدد الأضرار'), moneyColumn('chargeAmount', 'المطالبات'), moneyColumn('repairCost', 'تكلفة الإصلاح')], rows: first.byType })
    if (first.byCashier) tables.push({ title: 'حسب كاشير الإيجار', columns: [textColumn('name', 'الكاشير'), moneyColumn('calculatedFees', 'الغرامات المحسوبة'), moneyColumn('collectedFees', 'الرسوم المسوّاة المسجلة'), moneyColumn('waivedFees', 'الغرامات المعفاة'), moneyColumn('pendingFees', 'بانتظار التسوية')], rows: first.byCashier })
    rowCount = rows.length
  }
  return { startDate, endDate, filters, tables: tables.filter(table => table.rows?.length > 0), rowCount }
}

/** User text must remain text in spreadsheet applications; numeric values retain numeric types. */
export function spreadsheetCell(column: ReportColumn, value: unknown): string | number {
  if ((column.kind === 'currency' || column.kind === 'number') && value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value))) return Number(value)
  const formatted = formatReportCell(column, value)
  let index = 0
  while (index < formatted.length && (formatted.charCodeAt(index) <= 32 || /\s/.test(formatted[index]))) index++
  return /^[=+@-]/.test(formatted.slice(index)) ? `'${formatted}` : formatted
}
const headers = (columns: ReportColumn[]) => columns.map(column => column.kind === 'currency' ? `${column.label} (ج.م)` : column.label)
function spreadsheetRows(data: ReportExportData): Array<Array<string | number>> {
  const rows: Array<Array<string | number>> = [['الفترة', `${data.startDate} — ${data.endDate}`], ['المرشحات', exportFilterContext(data.filters)], ['تقويم التقرير', 'UTC+03:00 ثابت']]
  for (const table of data.tables) {
    rows.push([], [table.title], headers(table.columns))
    rows.push(...table.rows.map(row => table.columns.map(column => spreadsheetCell(column, row[column.key]))))
  }
  return rows
}
export function exportToCSV(data: ReportExportData, filename: string) {
  const csv = XLSX.utils.sheet_to_csv(XLSX.utils.aoa_to_sheet(spreadsheetRows(data)))
  const url = URL.createObjectURL(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `${filename}.csv`
  document.body.appendChild(link)
  link.click()
  link.remove()
  // Give the browser time to start the download before releasing the Blob URL.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
export function exportToExcel(data: ReportExportData, filename: string) {
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(spreadsheetRows(data)), 'التقرير')
  workbook.Workbook = { Views: [{ RTL: true }] }
  XLSX.writeFile(workbook, `${filename}.xlsx`)
}
export function escapeReportHtml(value: unknown): string {
  return String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!)
}
export function buildReportPrintHtml(data: ReportExportData, title: string, context: ExportContext = data): string {
  const tables = data.tables.map(table => `<section><h2>${escapeReportHtml(table.title)}</h2><table><thead><tr>${table.columns.map(column => `<th scope="col">${escapeReportHtml(headers([column])[0])}</th>`).join('')}</tr></thead><tbody>${table.rows.map(row => `<tr>${table.columns.map(column => `<td>${escapeReportHtml(formatReportCell(column, row[column.key]))}</td>`).join('')}</tr>`).join('')}</tbody></table></section>`).join('')
  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeReportHtml(title)}</title><style>body{font-family:Cairo,'Segoe UI',sans-serif;color:#1F293D;padding:24px;line-height:1.6}h1{font-size:24px}h2{font-size:18px}p{overflow-wrap:anywhere}table{border-collapse:collapse;width:100%;font-size:12px}th,td{border:1px solid #E3E7EB;padding:6px;text-align:right;overflow-wrap:anywhere}th{background:#EEF1F5}thead{display:table-header-group}tr{break-inside:avoid}section{margin-block:24px}.actions button{font:inherit;padding:8px 16px;cursor:pointer}.actions p{font-size:14px}@page{size:A4 landscape;margin:12mm}@media print{body{padding:0}.actions{display:none}}</style></head><body><div class="actions"><button type="button" id="print-report">طباعة / حفظ PDF</button><p>اختر «حفظ بتنسيق PDF» في نافذة الطباعة للحصول على ملف PDF.</p></div><h1>${escapeReportHtml(title)}</h1><p>الفترة: <bdi>${escapeReportHtml(context.startDate)} — ${escapeReportHtml(context.endDate)}</bdi> · تقويم التقرير UTC+03:00 ثابت</p><p>${escapeReportHtml(exportFilterContext(context.filters))}</p>${tables}</body></html>`
}
export function openReportPrintWindow(): Window {
  const printWindow = window.open('', '_blank')
  if (!printWindow) throw new Error('تعذر فتح نافذة الطباعة؛ اسمح بالنوافذ المنبثقة وأعد المحاولة')
  printWindow.opener = null
  printWindow.document.write('<!doctype html><html lang="ar" dir="rtl"><meta charset="UTF-8"><title>تحميل التقرير</title><body><p role="status">جارٍ تجهيز التقرير للطباعة...</p></body></html>')
  printWindow.document.close()
  return printWindow
}
/** Native browser Arabic shaping and Print / Save as PDF; no unsupported PDF-font fallback. */
export function exportToPDF(data: ReportExportData, _filename: string, title: string, context: ExportContext, printWindow: Window) {
  if (printWindow.closed) throw new Error('أغلقت نافذة الطباعة؛ أعد المحاولة')
  printWindow.document.open()
  printWindow.document.write(buildReportPrintHtml(data, title, context))
  printWindow.document.close()
  // Reuse the approved Cairo stylesheet already present in the ERP document.
  for (const sheet of document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')) {
    if (sheet.href.startsWith('https://fonts.googleapis.com/')) {
      const link = printWindow.document.createElement('link')
      link.rel = 'stylesheet'
      link.href = sheet.href
      printWindow.document.head.appendChild(link)
    }
  }
  printWindow.document.getElementById('print-report')?.addEventListener('click', () => printWindow.print())
  void printWindow.document.fonts.ready.then(() => { if (!printWindow.closed) { printWindow.focus(); printWindow.print() } })
}
