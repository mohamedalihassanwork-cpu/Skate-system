import { useCallback } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Card, PageLoader, EmptyState } from '../../../components/ui'
import { formatCurrency } from '../../../utils/currency'
import { reportsApi } from '../reports.api'
import { getReportColumns, chartTooltipStyle } from '../reportSchemas'
import { useReportData } from '../useReportData'
import { ReportError, ReportMetrics, ReportTable } from './ReportElements'

export default function TimelineReport({ type, startDate, endDate }: { type: 'revenue' | 'expenses'; startDate: string; endDate: string }) {
  const load = useCallback(() => type === 'revenue' ? reportsApi.getRevenue({ startDate, endDate }) : reportsApi.getExpenses({ startDate, endDate }), [type, startDate, endDate])
  const { data, loading, error, retry } = useReportData(load)
  if (loading) return <PageLoader label="جارٍ تحميل التقرير" />
  if (error || !data) return <ReportError error={error || 'تعذر تحميل البيانات'} retry={retry} />
  const title = type === 'revenue' ? 'صافي الإيرادات المحصلة' : 'المصروفات المسجلة'
  const categories = data.byCategory.map(row => ({ label: row.type || row.category || 'غير مصنف', total: row.total }))
  const breakdowns = [{ title: 'التحليل حسب الفئة', rows: categories }, ...(data.byUser ? [{ title: 'التحليل حسب المستخدم', rows: data.byUser.map(row => ({ label: row.name, total: row.total })) }] : []), ...(data.byAccount ? [{ title: 'التحليل حسب حساب الدفع', rows: data.byAccount.map(row => ({ label: row.name, total: row.total })) }] : [])]
  return <div className="report-stack">
    <ReportMetrics values={[{ label: title, value: type === 'revenue' ? data.totalRevenue : data.totalExpenses, currency: true }]} />
    <p className="report-note">{type === 'revenue' ? 'الإيرادات حسب تاريخ التحصيل، بعد خصم الاسترداد. التحويلات الداخلية والتأمينات خارج هذا الإجمالي.' : 'يشمل حركات المصروفات والصيانة المدفوعة من الخزينة. حساب الدفع لا يعني بالضرورة طريقة الدفع.'}</p>
    <Card><h3 className="report-section-title">{title} حسب اليوم (ج.م)</h3>
      {data.chartData.length ? <><div className="report-chart" role="img" aria-label={title + ' حسب اليوم؛ القيم الدقيقة في الجدول التالي'}>
        <ResponsiveContainer width="100%" height="100%"><LineChart data={data.chartData} accessibilityLayer>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
          <XAxis dataKey="date" minTickGap={35} tick={{ fill: 'var(--color-text-secondary)', fontSize: 12 }} />
          <YAxis width={72} tick={{ fill: 'var(--color-text-secondary)' }} />
          <Tooltip formatter={value => formatCurrency(Number(value))} contentStyle={chartTooltipStyle} />
          <Line type="linear" dataKey="value" name={title} stroke="var(--color-navy-800)" strokeWidth={3} dot={false} isAnimationActive={false} />
        </LineChart></ResponsiveContainer>
      </div><ReportTable columns={getReportColumns(type)} rows={data.chartData} label={title + ' حسب اليوم'} /></> : <EmptyState title="لا توجد حركات في الفترة المحددة" description="جرّب اختيار فترة أخرى" />}
    </Card>
    <div className="report-charts-grid">{breakdowns.map(section => <Card key={section.title}><h3 className="report-section-title">{section.title}</h3><ReportTable columns={[{ key: 'label', label: 'التصنيف', kind: 'text' }, { key: 'total', label: 'القيمة', kind: 'currency' }]} rows={section.rows} label={section.title} /></Card>)}</div>
  </div>
}
