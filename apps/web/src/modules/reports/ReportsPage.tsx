import { useState, type FormEvent } from 'react'
import { FileDown, Printer, PieChart, TrendingUp, CreditCard, User, Wrench, AlertTriangle, Clock, Package } from 'lucide-react'
import { format, subDays } from 'date-fns'
import { Button, Input, Select, useToast } from '../../components/ui'
import OverviewReport from './components/OverviewReport'
import FinancialReport from './components/FinancialReport'
import RevenueReport from './components/RevenueReport'
import ExpenseReport from './components/ExpenseReport'
import GenericListReport from './components/GenericListReport'
import type { ReportType } from './reportSchemas'
import type { PaginatedParams } from './reports.api'
import { exportToCSV, exportToExcel, exportToPDF, fetchAllReportData, openReportPrintWindow, exportFilterContext } from './exportUtils'

const REPORT_TABS = [
  { id: 'overview', label: 'نظرة عامة', icon: PieChart },
  { id: 'financial', label: 'النتيجة التشغيلية', icon: TrendingUp },
  { id: 'revenue', label: 'الإيرادات', icon: CreditCard },
  { id: 'rentals', label: 'الإيجارات', icon: Clock },
  { id: 'late', label: 'المتأخرات', icon: AlertTriangle },
  { id: 'damage', label: 'الأضرار', icon: Wrench },
  { id: 'maintenance', label: 'الصيانة', icon: Wrench },
  { id: 'expenses', label: 'المصروفات', icon: CreditCard },
  { id: 'customers', label: 'العملاء', icon: User },
  { id: 'cashiers', label: 'الكاشير', icon: User },
  { id: 'skates', label: 'أداء الاسكيتات', icon: Package },
] as const
type Filters = Omit<PaginatedParams, 'startDate' | 'endDate' | 'page' | 'limit'>
const validDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(new Date(value + 'T00:00:00Z').getTime()) && new Date(value + 'T00:00:00Z').toISOString().slice(0, 10) === value

export default function ReportsPage() {
  const { showToast } = useToast()
  const [activeTab, setActiveTab] = useState<ReportType>('overview')
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'))
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [period, setPeriod] = useState({ startDate, endDate })
  const [draftFilters, setDraftFilters] = useState<Record<string, string>>({})
  const [filters, setFilters] = useState<Filters>({})
  const [revision, setRevision] = useState(0)
  const [isExporting, setIsExporting] = useState(false)
  const [filterError, setFilterError] = useState<string | null>(null)
  const [filterMessage, setFilterMessage] = useState('')
  const activeTabInfo = REPORT_TABS.find(tab => tab.id === activeTab)!
  const isList = !['overview', 'financial', 'revenue', 'expenses'].includes(activeTab)
  const setFilter = (key: string, value: string) => setDraftFilters(current => ({ ...current, [key]: value }))

  const applyFilters = (event: FormEvent) => {
    event.preventDefault()
    if (!validDate(startDate) || !validDate(endDate) || startDate < '1000-01-01' || endDate < '1000-01-01' || startDate > '9999-12-30' || endDate > '9999-12-30') {
      setFilterError('أدخل تاريخ بداية ونهاية صحيحين.')
      return
    }
    const duration = draftFilters.duration?.trim()
    if (duration && (!/^\d+$/.test(duration) || Number(duration) < 1 || Number(duration) > 2147483647 || !Number.isSafeInteger(Number(duration)))) {
      setFilterError('المدة المحجوزة يجب أن تكون عدداً صحيحاً بين 1 و2147483647 دقيقة.')
      return
    }
    const reversed = startDate > endDate
    const nextPeriod = reversed ? { startDate: endDate, endDate: startDate } : { startDate, endDate }
    const nextFilters: Filters = Object.fromEntries(Object.entries(draftFilters).filter(([, value]) => value.trim() !== '').map(([key, value]) => [key, key === 'duration' ? Number(value) : value.trim()]))
    setPeriod(nextPeriod)
    setStartDate(nextPeriod.startDate)
    setEndDate(nextPeriod.endDate)
    setFilters(nextFilters)
    setFilterError(null)
    setFilterMessage(reversed ? 'تم ترتيب تاريخ البداية والنهاية وتطبيق المرشحات.' : 'تم تطبيق الفترة والمرشحات.')
    setRevision(value => value + 1)
  }
  const handleExport = async (fmt: 'csv' | 'excel' | 'pdf') => {
    if (isExporting) return
    let printWindow: Window | undefined
    setIsExporting(true)
    const title = activeTabInfo.label
    try {
      if (fmt === 'pdf') printWindow = openReportPrintWindow()
      const data = await fetchAllReportData(activeTab, period.startDate, period.endDate, filters)
      if (data.rowCount === 0) {
        printWindow?.close()
        showToast({ type: 'info', title: 'لا توجد بيانات للتصدير حسب المرشحات المطبقة' })
        return
      }
      const filename = 'report_' + activeTab + '_' + period.startDate + '_' + period.endDate
      if (fmt === 'csv') exportToCSV(data, filename)
      else if (fmt === 'excel') exportToExcel(data, filename)
      else exportToPDF(data, filename, title, { ...period, filters }, printWindow!)
      showToast({ type: 'success', title: fmt === 'pdf' ? 'تم تجهيز تقرير ' + title + ' للطباعة أو الحفظ بصيغة PDF' : 'تم تجهيز تقرير ' + title + ' للتنزيل' })
    } catch (error: unknown) {
      printWindow?.close()
      showToast({ type: 'error', title: 'تعذر تصدير التقرير', message: error && typeof error === 'object' && 'message' in error ? String(error.message) : 'حاول مرة أخرى' })
    } finally { setIsExporting(false) }
  }
  const statusOptions = activeTab === 'damage'
    ? [['pending', 'معلق'], ['partially_paid', 'مدفوع جزئياً'], ['paid', 'مدفوع'], ['waived', 'معفى']]
    : activeTab === 'maintenance'
      ? [['pending', 'معلق'], ['in_progress', 'قيد التنفيذ'], ['completed', 'مكتمل']]
      : activeTab === 'skates'
        ? [['available', 'متاح'], ['rented', 'مؤجر'], ['reserved', 'محجوز'], ['maintenance', 'في الصيانة'], ['damaged', 'تالف'], ['lost', 'مفقود']]
        : [['active', 'نشط'], ['returned', 'تم الإرجاع'], ['cancelled', 'ملغى']]

  return <div className="page-container reports-page">
    <div className="page-header"><div className="page-header-text"><h1 className="page-header-title">التقارير التحليلية</h1><p className="page-header-subtitle">متابعة الأداء التشغيلي والحركات المالية</p></div></div>
    <div className="reports-layout">
      <nav className="reports-navigation" aria-label="اختيار التقرير"><div>{REPORT_TABS.map(tab => <button key={tab.id} type="button" className="reports-navigation-button" aria-pressed={activeTab === tab.id} aria-controls="report-content" disabled={isExporting} onClick={() => { setActiveTab(tab.id); setFilters({}); setDraftFilters({}); setFilterError(null); setFilterMessage(''); setRevision(value => value + 1) }}><tab.icon size={18} aria-hidden="true" /><span>{tab.label}</span></button>)}</div></nav>
      <section className="reports-panel">
        <div className="reports-controls">
          <h2 className="report-section-title"><activeTabInfo.icon size={20} aria-hidden="true" />{activeTabInfo.label}</h2>
          <form onSubmit={applyFilters} className="reports-filter-form" noValidate>
            <div className="reports-filter-actions">
              <div className="reports-date-range"><div><Input id="start-date" type="date" min="1000-01-01" max="9999-12-30" label="من تاريخ" value={startDate} onChange={event => setStartDate(event.target.value)} required aria-invalid={Boolean(filterError && (!validDate(startDate) || startDate < '1000-01-01' || startDate > '9999-12-30'))} aria-describedby={filterError ? 'report-filter-error' : 'report-period-help'} disabled={isExporting} /></div><div><Input id="end-date" type="date" min="1000-01-01" max="9999-12-30" label="إلى تاريخ" value={endDate} onChange={event => setEndDate(event.target.value)} required aria-invalid={Boolean(filterError && (!validDate(endDate) || endDate < '1000-01-01' || endDate > '9999-12-30'))} aria-describedby={filterError ? 'report-filter-error' : 'report-period-help'} disabled={isExporting} /></div></div>
              <div className="reports-exports"><Button variant="secondary" onClick={() => handleExport('excel')} disabled={isExporting}><FileDown size={16} aria-hidden="true" />Excel</Button><Button variant="secondary" onClick={() => handleExport('csv')} disabled={isExporting}><FileDown size={16} aria-hidden="true" />CSV</Button><Button variant="secondary" onClick={() => handleExport('pdf')} disabled={isExporting}><Printer size={16} aria-hidden="true" />طباعة / PDF</Button></div>
            </div>
            {isList && <div className="report-list-filters">
              {activeTab === 'rentals' ? <>
                <Input id="report-customer" label="اسم العميل" value={draftFilters.customer || ''} onChange={event => setFilter('customer', event.target.value)} disabled={isExporting} />
                <Input id="report-cashier" label="اسم الكاشير" value={draftFilters.cashier || ''} onChange={event => setFilter('cashier', event.target.value)} disabled={isExporting} />
                <Input id="report-skate" label="كود الاسكيت" value={draftFilters.skate || ''} onChange={event => setFilter('skate', event.target.value)} disabled={isExporting} />
                <Input id="report-size" label="المقاس" value={draftFilters.size || ''} onChange={event => setFilter('size', event.target.value)} disabled={isExporting} />
                <Input id="report-duration" label="المدة المحجوزة (دقيقة)" type="number" min={1} max={2147483647} step={1} value={draftFilters.duration || ''} onChange={event => setFilter('duration', event.target.value)} aria-describedby={filterError ? 'report-filter-error' : undefined} disabled={isExporting} />
                <Select id="report-rental-status" label="حالة الإيجار" value={draftFilters.rentalStatus || ''} onChange={event => setFilter('rentalStatus', event.target.value)} disabled={isExporting} options={[{ value: '', label: 'كل الحالات' }, { value: 'active', label: 'نشط' }, { value: 'completed', label: 'مكتمل' }, { value: 'returned', label: 'تم الإرجاع (سجل سابق)' }, { value: 'cancelled', label: 'ملغى' }]} />
              </> : <Input id="report-search" label={activeTab === 'customers' || activeTab === 'cashiers' ? 'البحث بالاسم' : activeTab === 'skates' ? 'كود الاسكيت أو النوع أو المقاس' : 'بحث في التقرير'} value={draftFilters.search || ''} onChange={event => setFilter('search', event.target.value)} disabled={isExporting} />}
              {['rentals', 'damage', 'maintenance', 'skates'].includes(activeTab) && <Select id="report-status" label={activeTab === 'rentals' ? 'حالة الاسكيت في الإيجار' : 'الحالة'} value={draftFilters.status || ''} onChange={event => setFilter('status', event.target.value)} disabled={isExporting} options={[{ value: '', label: 'كل الحالات' }, ...statusOptions.map(([value, label]) => ({ value, label }))]} />}
              {activeTab === 'customers' && <Select id="report-sort" label="ترتيب العملاء" value={draftFilters.sort || 'spending'} onChange={event => setFilter('sort', event.target.value)} disabled={isExporting} options={[{ value: 'spending', label: 'الأعلى إنفاقاً' }, { value: 'frequency', label: 'الأكثر إيجاراً' }]} />}
              {activeTab === 'skates' && <Select id="report-sort" label="ترتيب أداء الاسكيتات" value={draftFilters.sort || 'revenue'} onChange={event => setFilter('sort', event.target.value)} disabled={isExporting} options={[{ value: 'revenue', label: 'الأعلى في قيمة الإيجار' }, { value: 'most-used', label: 'الأكثر استخداماً' }, { value: 'least-used', label: 'الأقل استخداماً' }, { value: 'maintenance', label: 'الأكثر صيانة' }, { value: 'damages', label: 'الأكثر أضراراً' }]} />}
            </div>}
            {filterError && <p id="report-filter-error" className="report-filter-error" role="alert">{filterError}</p>}
            <div className="report-apply-actions"><Button type="submit" disabled={isExporting}>تطبيق المرشحات</Button>{isList && <Button variant="secondary" onClick={() => { setDraftFilters({}); setFilters({}); setRevision(value => value + 1); setFilterError(null); setFilterMessage('تم مسح المرشحات الإضافية.') }} disabled={isExporting}>مسح المرشحات</Button>}<span role="status">{isExporting ? 'جارٍ تجهيز التقرير الكامل...' : filterMessage}</span></div>
          </form>
          <p id="report-period-help" className="report-note">الفترة المطبقة: <bdi>{period.startDate} — {period.endDate}</bdi> · تقويم التقرير UTC+03:00 ثابت</p>
          {isList && <p className="report-note">{exportFilterContext(filters)}</p>}
        </div>
        <div id="report-content" className="reports-canvas" key={activeTab + ':' + period.startDate + ':' + period.endDate + ':' + revision}>
          {activeTab === 'overview' && <OverviewReport {...period} />}
          {activeTab === 'financial' && <FinancialReport {...period} />}
          {activeTab === 'revenue' && <RevenueReport {...period} />}
          {activeTab === 'expenses' && <ExpenseReport {...period} />}
          {isList && <GenericListReport type={activeTab} {...period} filters={filters} />}
        </div>
      </section>
    </div>
    <style>{`
      .reports-page { min-width: 0; }
      .reports-layout { display: grid; grid-template-columns: minmax(160px, 190px) minmax(0, 1fr); gap: var(--space-6); align-items: start; }
      .reports-navigation { min-width: 0; position: sticky; top: calc(var(--header-height) + var(--space-4)); max-height: calc(100dvh - var(--header-height) - var(--space-8)); overflow-y: auto; }
      .reports-navigation > div { display: flex; flex-direction: column; gap: var(--space-2); }
      .reports-navigation-button { display: flex; align-items: center; gap: var(--space-3); width: 100%; min-height: 44px; padding: var(--space-3); background: transparent; border: 0; border-radius: var(--radius-base); color: var(--color-text-secondary); font: inherit; font-size: var(--font-size-sm); text-align: start; cursor: pointer; transition: color var(--transition-fast), background-color var(--transition-fast); }
      .reports-navigation-button > svg { flex-shrink: 0; }
      .reports-navigation-button[aria-pressed=true] { background: var(--color-navy-800); color: var(--color-white); font-weight: var(--font-weight-semibold); }
      .reports-navigation-button[aria-pressed=true] > svg { color: var(--color-gold-400); }
      .reports-navigation-button:hover:not([aria-pressed=true]):not(:disabled) { background: var(--color-navy-50); color: var(--color-navy-800); }
      .reports-navigation-button:disabled { cursor: wait; opacity: .6; }
      .reports-navigation-button:focus-visible { outline: 2px solid var(--color-border-focus); outline-offset: -2px; }
      .reports-panel { min-width: 0; background: var(--color-white); border-radius: var(--radius-lg); border: 1px solid var(--color-border); box-shadow: var(--shadow-card); }
      .reports-controls { padding: var(--space-5); border-bottom: 1px solid var(--color-border); }
      .reports-filter-form { display: flex; flex-direction: column; gap: var(--space-4); }
      .reports-filter-actions { display: flex; flex-wrap: wrap; gap: var(--space-4); align-items: end; }
      .reports-date-range { display: flex; flex: 1 1 20rem; flex-wrap: wrap; gap: var(--space-3); min-width: 0; }
      .reports-date-range > div { flex: 1 1 9rem; min-width: 0; }
      .reports-date-range input { direction: ltr; text-align: start; }
      .reports-exports { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-2); }
      .reports-exports .btn { min-height: 44px; }
      .report-list-filters { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 12rem), 1fr)); gap: var(--space-4); }
      .report-list-filters > div { min-width: 0; }
      .report-apply-actions { display: flex; gap: var(--space-3); flex-wrap: wrap; align-items: center; font-size: var(--font-size-sm); color: var(--color-text-secondary); }
      .report-filter-error { color: var(--color-danger-text); margin: 0; }
      .reports-canvas { min-width: 0; padding: var(--space-6); background: var(--color-page-bg); border-radius: 0 0 var(--radius-lg) var(--radius-lg); }
      .report-stack { display: flex; flex-direction: column; gap: var(--space-6); min-width: 0; }
      .report-section-title { margin: 0 0 var(--space-4); font-size: var(--font-size-lg); font-weight: var(--font-weight-semibold); color: var(--color-navy-800); display: flex; align-items: center; gap: var(--space-2); }
      .report-section-title > svg { flex-shrink: 0; }
      .report-note { color: var(--color-text-secondary); font-size: var(--font-size-sm); line-height: var(--line-height-relaxed); overflow-wrap: anywhere; margin: var(--space-3) 0 0; }
      .report-kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 200px), 1fr)); gap: var(--space-4); }
      .report-kpi-card { min-width: 0; }
      .report-metric-label { color: var(--color-text-secondary); font-size: var(--font-size-sm); margin: 0 0 var(--space-2); }
      .report-metric-value { color: var(--color-navy-800); font-size: var(--font-size-2xl); font-weight: var(--font-weight-bold); font-variant-numeric: tabular-nums; overflow-wrap: anywhere; margin: 0; }
      .report-charts-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 340px), 1fr)); gap: var(--space-6); min-width: 0; }
      .report-charts-grid > div { min-width: 0; }
      .report-chart { height: 280px; min-width: 0; margin-bottom: var(--space-4); }
      .report-hero { padding: var(--space-6); border-radius: var(--radius-lg); color: var(--color-text-primary); }
      .report-hero--positive { background: var(--color-success-bg); }
      .report-hero--negative { background: var(--color-danger-bg); }
      .report-hero h2 { margin: var(--space-2) 0; font-size: var(--font-size-3xl); overflow-wrap: anywhere; font-variant-numeric: tabular-nums; }
      .reports-page .recharts-cartesian-axis-tick-value { fill: var(--color-text-secondary); }
      @media screen and (max-width: 1023px) {
        .reports-page .reports-layout { display: flex; flex-direction: column; }
        .reports-navigation { position: static; width: 100%; max-height: none; }
        .reports-navigation > div { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 9rem), 1fr)); }
        .reports-panel { width: 100%; }
        .reports-page .table-cards > [role="listitem"] { display: flex; flex-direction: column; gap: var(--space-3); padding: var(--space-4); background: var(--color-white); border: 1px solid var(--color-border); border-radius: var(--radius-lg); box-shadow: var(--shadow-card); min-width: 0; }
        .reports-page .reports-canvas { padding: var(--space-4); }
        .report-charts-grid { grid-template-columns: minmax(0, 1fr); }
      }
      @media screen and (max-width: 639px) {
        .reports-page .reports-date-range { display: grid; grid-template-columns: minmax(0, 1fr); }
        .reports-page .reports-date-range > div { width: 100%; }
        .reports-exports { width: 100%; }
        .reports-exports .btn { flex: 1 1 auto; }
        .report-apply-actions .btn { flex: 1 1 auto; }
        .reports-page .report-kpi-grid { grid-template-columns: minmax(0, 1fr) !important; }
      }
      @media (prefers-reduced-motion: reduce) { .reports-navigation-button { transition: none; } }
    `}</style>
  </div>
}
