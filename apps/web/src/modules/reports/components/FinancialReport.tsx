import { useCallback } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Card, PageLoader, EmptyState } from '../../../components/ui'
import { formatCurrency } from '../../../utils/currency'
import { reportsApi } from '../reports.api'
import { useReportData } from '../useReportData'
import { getReportColumns, chartTooltipStyle } from '../reportSchemas'
import { ReportError, ReportTable } from './ReportElements'

export default function FinancialReport({ startDate, endDate }: { startDate: string; endDate: string }) {
  const load = useCallback(() => reportsApi.getOperatingFinancial({ startDate, endDate }), [startDate, endDate])
  const { data, loading, error, retry } = useReportData(load)
  if (loading) return <PageLoader label="جارٍ تحميل النتيجة التشغيلية" />
  if (error || !data) return <ReportError error={error || 'تعذر تحميل البيانات'} retry={retry} />
  const breakdowns = [
    { title: 'تحليل الإيرادات والاسترداد', rows: data.revenueByCategory.map(row => ({ label: row.type, total: row.total })), color: 'var(--color-navy-800)' },
    { title: 'تحليل المصروفات المسجلة', rows: data.expensesByCategory.map(row => ({ label: row.category, total: row.total })), color: 'var(--color-gold-600)' },
  ]
  return <div className="report-stack">
    <div className={'report-hero report-hero--financial report-hero--' + (data.operatingResult >= 0 ? 'positive' : 'negative')}>
      <p>النتيجة التشغيلية — {data.operatingResult < 0 ? 'عجز تشغيلي' : data.operatingResult > 0 ? 'فائض تشغيلي' : 'تعادل'}</p>
      <h2><bdi>{formatCurrency(data.operatingResult)}</bdi></h2>
      <p className="report-note">صافي الإيرادات المحصلة بعد الاسترداد − المصروفات المسجلة. هذه نتيجة تشغيلية وليست صافي ربح محاسبي.</p>
    </div>
    <ReportTable columns={getReportColumns('financial')} rows={[{ ...data }]} label="تسوية النتيجة التشغيلية" />
    <div className="report-charts-grid">{breakdowns.map(section => <Card key={section.title}>
      <h3 className="report-section-title">{section.title}</h3>
      {section.rows.some(row => row.total !== 0) ? <><div className="report-chart" role="img" aria-label={section.title + '؛ القيم بالجنيه المصري في الجدول التالي'}>
        <ResponsiveContainer width="100%" height="100%"><BarChart data={section.rows} layout="vertical" accessibilityLayer>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--color-border)" />
          <XAxis type="number" tick={{ fill: 'var(--color-text-secondary)' }} />
          <YAxis dataKey="label" type="category" width={105} tick={{ fill: 'var(--color-text-secondary)', fontSize: 12 }} />
          <Tooltip formatter={value => formatCurrency(Number(value))} contentStyle={chartTooltipStyle} />
          <Bar dataKey="total" name="القيمة (ج.م)" fill={section.color} isAnimationActive={false} />
        </BarChart></ResponsiveContainer></div>
        <ReportTable columns={[{ key: 'label', label: 'الفئة', kind: 'text' }, { key: 'total', label: 'القيمة', kind: 'currency' }]} rows={section.rows} label={section.title} />
      </> : <EmptyState title="لا توجد حركات مالية في الفترة" description="اختر فترة أخرى لعرض التحليل" />}
    </Card>)}</div>
  </div>
}
