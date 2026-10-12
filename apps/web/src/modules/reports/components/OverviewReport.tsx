import { useEffect, useState } from 'react'
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts'
import { formatCurrency } from '../../../utils/currency'
import { reportsApi } from '../reports.api'
import type { OverviewData } from '../reports.api'
import { TrendingUp, TrendingDown, Clock, Package } from 'lucide-react'
import { PageLoader, Alert } from '../../../components/ui'

// Use brand-aligned colors for charts
const COLORS = ['#192744', '#58C89A', '#F3B735', '#ED4547', '#4a90d9']

interface Props {
  startDate: string
  endDate: string
}

export default function OverviewReport({ startDate, endDate }: Props) {
  const [data, setData] = useState<OverviewData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const res = await reportsApi.getOverview({ startDate, endDate })
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
    return <PageLoader label="جارٍ تحميل البيانات" />
  }

  if (error || !data) {
    return <Alert variant="danger">{error || 'تعذر تحميل البيانات'}</Alert>
  }

  const statCards = [
    { title: 'إجمالي الإيرادات', value: formatCurrency(data.totalRevenue), icon: TrendingUp, bgColor: 'var(--color-success-bg)', iconColor: 'var(--color-success-text)' },
    { title: 'إجمالي المصروفات', value: formatCurrency(data.totalExpenses), icon: TrendingDown, bgColor: 'var(--color-danger-bg)', iconColor: 'var(--color-danger-text)' },
    { title: 'إجمالي الإيجارات', value: data.totalRentals.toString(), icon: Package, bgColor: 'var(--color-info-bg)', iconColor: 'var(--color-info-text)' },
    { title: 'الإيجارات النشطة', value: data.activeRentals.toString(), icon: Clock, bgColor: 'var(--color-warning-bg)', iconColor: 'var(--color-warning-text)' },
    { title: 'إيجارات متأخرة', value: (data.lateRentals ?? 0).toString(), icon: Clock, bgColor: 'var(--color-danger-bg)', iconColor: 'var(--color-danger-text)' },
    { title: 'الأضرار', value: (data.totalDamages ?? 0).toString(), icon: TrendingDown, bgColor: 'var(--color-danger-bg)', iconColor: 'var(--color-danger-text)' },
  ]

  const pieData = [
    { name: 'إيجارات نشطة', value: data.activeRentals },
    { name: 'إيجارات متأخرة', value: data.lateRentals },
    { name: 'إيجارات مكتملة', value: data.totalRentals - data.activeRentals - data.lateRentals }
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }}>
      {/* KPI Cards */}
      <div className="report-kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-4)' }}>
        {statCards.map((stat, idx) => (
          <div key={idx} className="report-kpi-card" style={{
            padding: 'var(--space-5)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--color-border)',
            boxShadow: 'var(--shadow-card)',
            backgroundColor: 'var(--color-white)',
            position: 'relative',
            overflow: 'hidden',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', fontWeight: 'var(--font-weight-medium)' as any, marginBottom: 'var(--space-1)' }}>{stat.title}</p>
                <h3 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)' as any, color: 'var(--color-navy-800)', margin: 0 }}>{stat.value}</h3>
              </div>
              <div style={{ padding: 'var(--space-2)', borderRadius: 'var(--radius-base)', backgroundColor: stat.bgColor }}>
                <stat.icon size={24} style={{ color: stat.iconColor }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="report-charts-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 'var(--space-6)' }}>
        {/* Pie Chart */}
        <div style={{ padding: 'var(--space-6)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-card)', backgroundColor: 'var(--color-white)' }}>
          <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-semibold)' as any, color: 'var(--color-navy-800)', marginBottom: 'var(--space-6)' }}>حالة الإيجارات</h3>
          <div style={{ height: '256px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData.filter(d => d.value > 0)}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: 'var(--radius-base)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-md)' }}
                />
                <Legend iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bar Chart */}
        <div style={{ padding: 'var(--space-6)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-card)', backgroundColor: 'var(--color-white)' }}>
          <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-semibold)' as any, color: 'var(--color-navy-800)', marginBottom: 'var(--space-6)' }}>الإيرادات مقابل المصروفات</h3>
          <div style={{ height: '256px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[{ name: 'المقارنة المالية', الايرادات: data.totalRevenue, المصروفات: data.totalExpenses }]}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                <XAxis dataKey="name" tick={{ fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} tickFormatter={(val) => `${val} ج`} />
                <Tooltip 
                  contentStyle={{ borderRadius: 'var(--radius-base)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-md)' }}
                />
                <Legend iconType="circle" />
                <Bar dataKey="الايرادات" fill="var(--color-success-500)" radius={[4, 4, 0, 0]} barSize={40} />
                <Bar dataKey="المصروفات" fill="var(--color-danger-500)" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}
