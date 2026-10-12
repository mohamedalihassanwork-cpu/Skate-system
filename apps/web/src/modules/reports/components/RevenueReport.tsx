import { useEffect, useState } from 'react'
import {
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
import { TrendingUp } from 'lucide-react'

interface Props {
  startDate: string
  endDate: string
}

export default function RevenueReport({ startDate, endDate }: Props) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const res = await reportsApi.getRevenue({ startDate, endDate })
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

  if (loading) return <PageLoader label="جارٍ تحميل تقرير الإيرادات" />
  if (error || !data) return <Alert variant="danger">{error || 'تعذر تحميل البيانات'}</Alert>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Hero Card */}
      <div className="report-hero" style={{
        padding: 'var(--space-8)',
        borderRadius: 'var(--radius-lg)',
        backgroundColor: 'var(--color-navy-800)',
        color: 'var(--color-white)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ color: 'rgba(255,255,255,0.8)', fontWeight: 'var(--font-weight-medium)', marginBottom: 'var(--space-1)' }}>إجمالي الإيرادات</p>
            <h2 style={{ fontSize: 'var(--font-size-4xl)', fontWeight: 'var(--font-weight-bold)', margin: 0 }}>
              {formatCurrency(data.totalRevenue)}
            </h2>
          </div>
          <div className="report-hero-icon" style={{ padding: 'var(--space-4)', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 'var(--radius-full)' }}>
            <TrendingUp size={40} style={{ color: 'var(--color-gold-400)' }} />
          </div>
        </div>
      </div>

      {/* Timeline Chart */}
      <div style={{
        padding: 'var(--space-6)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--color-border)',
        boxShadow: 'var(--shadow-card)',
        backgroundColor: 'var(--color-white)'
      }}>
        <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-navy-800)', marginBottom: 'var(--space-6)' }}>
          الإيرادات عبر الزمن
        </h3>
        <div style={{ height: '300px' }}>
          {data.chartData && data.chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                <XAxis dataKey="date" tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 'var(--radius-base)', border: '1px solid var(--color-border)' }} />
                <Line type="monotone" dataKey="value" stroke="var(--color-success-500)" strokeWidth={3} dot={{ r: 4, fill: 'var(--color-success-500)' }} name="الإيرادات" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--color-text-muted)' }}>لا توجد بيانات مخطط</div>
          )}
        </div>
      </div>
    </div>
  )
}
