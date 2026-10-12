import { useEffect, useState } from 'react'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts'
import { reportsApi } from '../reports.api'
import { formatCurrency } from '../../../utils/currency'
import { PageLoader, Alert } from '../../../components/ui'
import { TrendingDown } from 'lucide-react'

interface Props {
  startDate: string
  endDate: string
}

export default function ExpenseReport({ startDate, endDate }: Props) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const res = await reportsApi.getExpenses({ startDate, endDate })
        setData(res.data)
        setError(null)
      } catch (err: any) {
        setError(err.message || 'حدث خطأ أثناء تحميل البيانات')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [startDate, endDate])

  if (loading) return <PageLoader label="جارٍ تحميل تقرير المصروفات" />
  if (error || !data) return <Alert variant="danger">{error || 'تعذر تحميل البيانات'}</Alert>

  const byCategoryMap = data.byCategory?.map((c: any) => ({
    category: c.category || 'غير مصنف',
    total: c.total
  })) || []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Hero Card */}
      <div className="report-hero" style={{
        padding: 'var(--space-8)',
        borderRadius: 'var(--radius-lg)',
        backgroundColor: 'var(--color-danger-50)',
        border: '1px solid var(--color-danger-200)',
        color: 'var(--color-danger-800)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ fontWeight: 'var(--font-weight-medium)', marginBottom: 'var(--space-1)' }}>إجمالي المصروفات</p>
            <h2 style={{ fontSize: 'var(--font-size-4xl)', fontWeight: 'var(--font-weight-bold)', margin: 0 }}>
              {formatCurrency(data.totalExpenses)}
            </h2>
          </div>
          <div className="report-hero-icon" style={{ padding: 'var(--space-4)', backgroundColor: 'var(--color-danger-100)', borderRadius: 'var(--radius-full)' }}>
            <TrendingDown size={40} style={{ color: 'var(--color-danger-600)' }} />
          </div>
        </div>
      </div>

      <div className="report-charts-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 'var(--space-6)' }}>
        {/* Timeline Chart */}
        <div style={{
          padding: 'var(--space-6)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-card)',
          backgroundColor: 'var(--color-white)'
        }}>
          <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-navy-800)', marginBottom: 'var(--space-6)' }}>
            المصروفات عبر الزمن
          </h3>
          <div style={{ height: '300px' }}>
            {data.chartData && data.chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                  <XAxis dataKey="date" tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 'var(--radius-base)', border: '1px solid var(--color-border)' }} />
                  <Line type="monotone" dataKey="value" stroke="var(--color-danger-500)" strokeWidth={3} dot={{ r: 4, fill: 'var(--color-danger-500)' }} name="المصروفات" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--color-text-muted)' }}>لا توجد بيانات مخطط</div>
            )}
          </div>
        </div>

        {/* Category Breakdown */}
        <div style={{
          padding: 'var(--space-6)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-card)',
          backgroundColor: 'var(--color-white)'
        }}>
          <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-navy-800)', marginBottom: 'var(--space-6)' }}>
            تصنيف المصروفات
          </h3>
          <div style={{ height: '300px' }}>
            {byCategoryMap.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byCategoryMap} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--color-border)" />
                  <XAxis type="number" tick={{ fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
                  <YAxis dataKey="category" type="category" width={100} tick={{ fill: 'var(--color-text-secondary)', fontSize: 13 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 'var(--radius-base)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-md)' }} />
                  <Bar dataKey="total" fill="var(--color-danger-500)" radius={[0, 4, 4, 0]} barSize={24} name="المصروفات" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--color-text-muted)' }}>لا توجد بيانات فئات</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
