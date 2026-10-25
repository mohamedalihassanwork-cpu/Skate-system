import { describe, it, expect, vi } from 'vitest'
import { collectReportPages, fetchAllReportData, spreadsheetCell, buildReportPrintHtml } from '../../../web/src/modules/reports/exportUtils'
import { getReportColumns, formatReportCell, getReportExportRows } from '../../../web/src/modules/reports/reportSchemas'
import type { ReportExportData } from '../../../web/src/modules/reports/exportUtils'
import { reportsApi } from '../../../web/src/modules/reports/reports.api'

vi.mock('../../../web/src/modules/reports/reports.api', () => ({ reportsApi: {
  getOverview: vi.fn(), getOperatingFinancial: vi.fn(), getRevenue: vi.fn(), getExpenses: vi.fn(),
  getRentals: vi.fn(), getLate: vi.fn(), getDamage: vi.fn(), getMaintenance: vi.fn(), getCustomers: vi.fn(), getCashiers: vi.fn(), getSkates: vi.fn(),
} }))

describe('Reports formatting and exports (no browser)', () => {
  it('keeps skate codes and activity counts out of date formatting', () => {
    const columns = getReportColumns('rentals')
    expect(formatReportCell(columns.find(column => column.key === 'skateCode')!, 'SK-2026-10')).toBe('SK-2026-10')
    expect(formatReportCell(getReportColumns('customers').find(column => column.key === 'rentalsCount')!, 1234)).toBe('1,234')
  })
  it('uses fixed Arabic columns even when optional values are absent', () => {
    const rows = getReportExportRows('rentals', [{ rentalCode: 'RN-00001', skateCode: null, amount: 125.5 }])
    expect(rows[0]['رقم الإيجار']).toBe('RN-00001')
    expect(rows[0]['كود الاسكيت']).toBe('—')
    expect(Object.values(rows[0])).toContain(125.5)
    expect(Object.keys(rows[0])).not.toContain('amount')
  })
  it('retains zero and negative monetary values and translates statuses', () => {
    const money = { key: 'value', label: 'القيمة', kind: 'currency' as const }
    expect(spreadsheetCell(money, -25.5)).toBe(-25.5)
    expect(spreadsheetCell(money, 0)).toBe(0)
    expect(formatReportCell({ key: 'status', label: 'الحالة', kind: 'status' }, 'inspected')).toBe('تم الفحص')
    expect(formatReportCell(money, null)).toBe('—')
    expect(getReportColumns('late').find(column => column.key === 'collectedFee')?.label).toBe('الرسوم المسوّاة المسجلة')
  })
  it('displays timestamps in the applied fixed +03 calendar even on a different device timezone', () => {
    const previous = process.env.TZ
    process.env.TZ = 'Pacific/Honolulu'
    try {
      const text = formatReportCell({ key: 'startTime', label: 'وقت البدء', kind: 'datetime' }, '2026-10-01T21:30:00Z')
      expect(text).toContain('2 أكتوبر 2026')
      expect(text).not.toContain('1 أكتوبر 2026')
    } finally {
      if (previous === undefined) delete process.env.TZ
      else process.env.TZ = previous
    }
  })
  it.each(['=HYPERLINK("x")', '+SUM(1,2)', '@command', '-cmd', ' \t=command'])('neutralizes spreadsheet formula text %s', value => {
    expect(spreadsheetCell({ key: 'name', label: 'الاسم', kind: 'text' }, value)).toBe(`'${value}`)
  })
  it('follows server page sizes instead of silently exporting only the first page', async () => {
    const fetchPage = vi.fn(async (page: number, _limit: number) => ({ data: { data: page === 1 ? [{ id: 1 }, { id: 2 }] : [{ id: 3 }], meta: { page, total: 3, limit: 2, totalPages: 2 } } }))
    const result = await collectReportPages(fetchPage)
    expect(result.rows.map(row => row.id)).toEqual([1, 2, 3])
    expect(fetchPage.mock.calls).toEqual([[1, 100], [2, 2]])
  })
  it('rejects incomplete or changing exports with an actionable error', async () => {
    await expect(collectReportPages(async page => ({ data: { data: [{ id: page }], meta: { page, total: page === 1 ? 3 : 4, limit: 2, totalPages: 2 } } }))).rejects.toThrow('تغيرت بيانات التقرير')
    await expect(collectReportPages(async page => ({ data: { data: [{ id: page }], meta: { page, total: 2, limit: 2, totalPages: 1 } } }))).rejects.toThrow('لم يتم تحميل كل بيانات التقرير')
  })
  it('exports zero-activity summary reports and exact revenue categories', async () => {
    vi.mocked(reportsApi.getOverview).mockResolvedValue({ data: { totalRevenue: 0, totalRentals: 0, totalExpenses: 0, activeRentals: 0, lateRentals: 0, totalDamages: 0, activeMaintenance: 0 } })
    const overview = await fetchAllReportData('overview', '2026-10-01', '2026-10-02')
    expect(overview.rowCount).toBe(1)
    expect(overview.tables[0].columns.some(column => column.key === 'activeMaintenance')).toBe(true)
    vi.mocked(reportsApi.getRevenue).mockResolvedValue({ data: { totalRevenue: -20, chartData: [{ date: '2026-10-02', value: -20 }], byCategory: [{ type: 'الاسترداد', total: -20 }] } })
    const revenue = await fetchAllReportData('revenue', '2026-10-01', '2026-10-02')
    expect(revenue.tables.map(table => table.title)).toEqual(['الإجمالي', 'حسب اليوم', 'حسب الفئة'])
    expect(revenue.tables[2].rows[0].total).toBe(-20)
  })
  it('preserves applied filters on each export page', async () => {
    vi.mocked(reportsApi.getRentals).mockImplementation(async params => ({ data: { data: [{ rentalCode: `RN-${params.page}` }], meta: { page: params.page, total: 2, limit: 1, totalPages: 2 }, summary: {} } }))
    const result = await fetchAllReportData('rentals', '2026-10-01', '2026-10-02', { customer: 'أحمد', status: 'returned' })
    expect(result.rowCount).toBe(2)
    const calls = vi.mocked(reportsApi.getRentals).mock.calls.slice(-2)
    expect(calls.every(([params]) => params.customer === 'أحمد' && params.status === 'returned' && params.startDate === '2026-10-01')).toBe(true)
  })
  it('builds Arabic RTL print markup with escaped customer data and signed values', () => {
    const data: ReportExportData = { rowCount: 1, startDate: '2026-10-01', endDate: '2026-10-02', filters: { customer: '<script>alert(1)</script>' }, tables: [{ title: 'النتيجة', columns: [{ key: 'name', label: 'العميل', kind: 'text' }, { key: 'value', label: 'القيمة', kind: 'currency' }], rows: [{ name: '<img src=x onerror=alert(1)>', value: -25 }] }] }
    const html = buildReportPrintHtml(data, 'تقرير <خاص>')
    expect(html).toContain('lang="ar" dir="rtl"')
    expect(html).toContain('تقرير &lt;خاص&gt;')
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;')
    expect(html).toContain('&lt;script&gt;')
    expect(html).not.toContain('<script>')
    expect(html).toContain('-25 ج.م')
    expect(html).toContain('2026-10-01')
    expect(html).toContain('scope="col"')
  })
})
