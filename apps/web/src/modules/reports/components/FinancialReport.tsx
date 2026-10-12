import { useEffect, useState } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts'
import { formatCurrency } from '../../../utils/currency'
import { reportsApi } from '../reports.api'
import type { FinancialData } from '../reports.api'
import { DollarSign, ArrowDownRight, ArrowUpRight } from 'lucide-react'
import { PageLoader, Alert } from '../../../components/ui'

interface Props {
  startDate: string
  endDate: string
}

export default function FinancialReport({ startDate, endDate }: Props) {
  const [data, setData] = useState<FinancialData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const res = await reportsApi.getOperatingFinancial({ startDate, endDate })
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

  if (loading) {
    return <PageLoader label="جارٍ تحميل البيانات المالية" />
  }

  if (error || !data) {
    return <Alert variant="danger">{error || 'تعذر تحميل البيانات'}</Alert>
  }

  const isPositiveResult = data.operatingResult >= 0

  const cardStyle: React.CSSProperties = {
    padding: 'var(--space-6)',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--color-border)',
    boxShadow: 'var(--shadow-card)',
    backgroundColor: 'var(--color-white)',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }}>
      
      {/* Operating Result Hero Card */}
      <div className={`report-hero report-hero--financial report-hero--${isPositiveResult ? 'positive' : 'negative'}`} style={{
        padding: 'var(--space-8)',
        borderRadius: 'var(--radius-lg)',
        backgroundColor: isPositiveResult ? 'var(--color-success-500)' : 'var(--color-danger-500)',
        color: 'var(--color-white)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', zIndex: 1 }}>
          <div>
            <p style={{ color: 'rgba(255,255,255,0.8)', fontWeight: 'var(--font-weight-medium)' as any, marginBottom: 'var(--space-1)' }}>النتيجة التشغيلية (Operating Result)</p>
            <h2 style={{ fontSize: 'var(--font-size-4xl)', fontWeight: 'var(--font-weight-bold)' as any, margin: 0, display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              {formatCurrency(Math.abs(data.operatingResult))}
              {isPositiveResult ? (
                <ArrowUpRight size={32} style={{ color: 'rgba(255,255,255,0.7)' }} />
              ) : (
                <ArrowDownRight size={32} style={{ color: 'rgba(255,255,255,0.7)' }} />
              )}
            </h2>
          </div>
          <div className="report-hero-icon" style={{ padding: 'var(--space-4)', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 'var(--radius-full)' }}>
            <DollarSign size={40} style={{ color: 'var(--color-white)' }} />
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="report-charts-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 'var(--space-6)' }}>
        <div style={cardStyle}>
          <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-semibold)' as any, color: 'var(--color-navy-800)', marginBottom: 'var(--space-6)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <ArrowUpRight size={20} style={{ color: 'var(--color-success-text)' }} />
            تحليل الإيرادات
          </h3>
          <div style={{ height: '288px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.revenueByCategory} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--color-border)" />
                <XAxis type="number" tick={{ fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
                <YAxis dataKey="type" type="category" width={100} tick={{ fill: 'var(--color-text-secondary)', fontSize: 13 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 'var(--radius-base)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-md)' }} />
                <Bar dataKey="total" fill="var(--color-success-500)" radius={[0, 4, 4, 0]} barSize={24} name="الإيرادات" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={cardStyle}>
          <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-semibold)' as any, color: 'var(--color-navy-800)', marginBottom: 'var(--space-6)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <ArrowDownRight size={20} style={{ color: 'var(--color-danger-text)' }} />
            تحليل المصروفات
          </h3>
          <div style={{ height: '288px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.expensesByCategory} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--color-border)" />
                <XAxis type="number" tick={{ fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
                <YAxis dataKey="category" type="category" width={100} tick={{ fill: 'var(--color-text-secondary)', fontSize: 13 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 'var(--radius-base)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-md)' }} />
                <Bar dataKey="total" fill="var(--color-danger-500)" radius={[0, 4, 4, 0]} barSize={24} name="المصروفات" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}
