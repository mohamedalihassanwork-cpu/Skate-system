import { useCallback } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Card, PageLoader, EmptyState } from '../../../components/ui'
import { reportsApi } from '../reports.api'
import { useReportData } from '../useReportData'
import { formatCurrency } from '../../../utils/currency'
import { ReportError, ReportMetrics, ReportTable } from './ReportElements'
import { chartTooltipStyle } from '../reportSchemas'

export default function OverviewReport({ startDate, endDate }: { startDate: string; endDate: string }) {
  const load = useCallback(() => reportsApi.getOverview({ startDate, endDate }), [startDate, endDate])
  const { data, loading, error, retry } = useReportData(load)
  if (loading) return <PageLoader label="جارٍ تحميل النظرة العامة" />
  if (error || !data) return <ReportError error={error || 'تعذر تحميل البيانات'} retry={retry} />
  const comparison = [{ label: 'الفترة المحددة', revenue: data.totalRevenue, expenses: data.totalExpenses }]
  return <div className="report-stack">
    <ReportMetrics values={[
      { label: 'صافي الإيرادات المحصلة في الفترة', value: data.totalRevenue, currency: true },
      { label: 'المصروفات المسجلة في الفترة', value: data.totalExpenses, currency: true },
      { label: 'الإيجارات في الفترة', value: data.totalRentals },
      { label: 'الأضرار في الفترة', value: data.totalDamages },
      { label: 'الإيجارات النشطة حالياً (تشمل المتأخرة)', value: data.activeRentals },
      { label: 'الإيجارات المتأخرة حالياً', value: data.lateRentals },
      { label: 'الصيانة المفتوحة حالياً', value: data.activeMaintenance },
    ]} />
    <p className="report-note">النشطة والمتأخرة والصيانة المفتوحة لقطة للحالة الحالية، مستقلة عن الفترة. عدد الإيجارات يتضمن السجلات الملغاة.</p>
    <Card><h3 className="report-section-title">الإيرادات مقابل المصروفات في الفترة</h3>
      {data.totalRevenue === 0 && data.totalExpenses === 0 ? <EmptyState title="لا توجد قيم مالية للمقارنة في الفترة" description="تظهر القيم الدقيقة في الجدول التالي" /> : <div className="report-chart" role="img" aria-label="مقارنة الإيرادات والمصروفات؛ القيم الدقيقة في الجدول التالي">
        <ResponsiveContainer width="100%" height="100%"><BarChart data={comparison} accessibilityLayer>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
          <XAxis dataKey="label" tick={{ fill: 'var(--color-text-secondary)' }} />
          <YAxis tick={{ fill: 'var(--color-text-secondary)' }} width={72} tickFormatter={value => Number(value).toLocaleString('en-US')} />
          <Tooltip formatter={value => formatCurrency(Number(value))} contentStyle={chartTooltipStyle} />
          <Legend />
          <Bar dataKey="revenue" name="صافي الإيرادات (ج.م)" fill="var(--color-navy-800)" isAnimationActive={false} />
          <Bar dataKey="expenses" name="المصروفات (ج.م)" fill="var(--color-gold-600)" isAnimationActive={false} />
        </BarChart></ResponsiveContainer>
      </div>}
      <ReportTable columns={[{ key: 'label', label: 'الفترة', kind: 'text' }, { key: 'revenue', label: 'صافي الإيرادات', kind: 'currency' }, { key: 'expenses', label: 'المصروفات', kind: 'currency' }]} rows={comparison} label="القيم المالية للنظرة العامة" />
    </Card>
  </div>
}
