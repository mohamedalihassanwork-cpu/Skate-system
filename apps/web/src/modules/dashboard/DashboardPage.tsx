/**
 * KOSHK SKATE ERP — Dashboard Page
 *
 * Production operational dashboard.
 * Single API: GET /api/v1/dashboard/kpis
 * Financial data gated server-side by reports.view.
 * Return action gated client-side by rentals.return (backend enforced independently).
 *
 * Sections:
 *   1. Header + date filters
 *   2. Primary KPI row (4 cards)
 *   3. Active/expiring rentals (≤5min + overdue)
 *   4. Operational summary
 *   5. Revenue chart + skate status
 *   6. Recent sales
 *   7. Alerts
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  DollarSign,
  Package,
  Activity,
  AlertTriangle,
  Clock,
  Wrench,
  BarChart3,
  RefreshCw,
  TrendingUp,
  ShoppingBag,
  Zap,
  Ticket,
  ShoppingCart,
  RotateCcw,
  UserPlus
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { subDays, format, parseISO } from 'date-fns'
import { ar } from 'date-fns/locale'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { EmptyState } from '../../components/ui/EmptyState'
import { LoadingSpinner } from '../../components/ui/Loading'

import { dashboardService } from './dashboardService'
import type { DashboardResponse, DashboardDateRange } from './dashboard.types'
import { useAuth } from '../../contexts/AuthContext'
import { formatCurrency } from '../../utils/currency'
import { useToast } from '../../components/ui'
import { ReturnRentalModal } from '../rentals/ReturnRentalModal'
import { CreateDamageReportModal } from '../rentals/CreateDamageReportModal'
import { rentalsService, type ActiveRentalDTO } from '../rentals/rentals.service'
import { PermissionGate } from '../../components/PermissionGate'
import '../../styles/pages/dashboard.css'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const STATUS_DOT_COLORS: Record<string, string> = {
  available: 'var(--color-success-text)',
  rented: 'var(--color-info-text)',
  maintenance: 'var(--color-warning-text)',
  damaged: 'var(--color-danger-text)',
  reserved: 'var(--color-gold-500)',
  lost: 'var(--color-neutral-text)',
}

const STATUS_LABELS_AR: Record<string, string> = {
  available: 'متاح',
  rented: 'مؤجر',
  maintenance: 'صيانة',
  damaged: 'تالف',
  reserved: 'محجوز',
  lost: 'مفقود',
}

const ORDERED_STATUSES = ['available', 'rented', 'maintenance', 'damaged', 'reserved', 'lost']

// ---------------------------------------------------------------------------
// Chart Tooltip
// ---------------------------------------------------------------------------
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'var(--color-white)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-base)',
      padding: '8px 12px',
      boxShadow: 'var(--shadow-md)',
      direction: 'rtl',
      fontFamily: 'var(--font-family-base)',
    }}>
      <p style={{ margin: 0, fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginBottom: 4 }}>
        {label}
      </p>
      {payload.map((entry: any, i: number) => (
        <p key={i} style={{ margin: 0, fontSize: 'var(--font-size-sm)', fontWeight: 700, color: 'var(--color-navy-800)' }}>
          {formatCurrency(entry.value)}
        </p>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
export default function DashboardPage() {
  const { hasPermission } = useAuth()
  const canViewReports = hasPermission('reports.view')
  const navigate = useNavigate()

  // Date range — defaults to today
  const todayStr = format(new Date(), 'yyyy-MM-dd')
  const [dateRange, setDateRange] = useState<DashboardDateRange>({
    startDate: todayStr,
    endDate: todayStr,
  })

  // Data state
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<DashboardResponse['data'] | null>(null)

  const { showToast } = useToast()

  // Local clock for countdown — ticks every second, does NOT trigger re-fetch
  const [nowMs, setNowMs] = useState(Date.now())

  // Modal state (return + damage)
  const [returnModalOpen, setReturnModalOpen] = useState(false)
  const [selectedRentalForReturn, setSelectedRentalForReturn] = useState<ActiveRentalDTO | null>(null)
  const [damageModalOpen, setDamageModalOpen] = useState(false)
  const [damageInspectionId, setDamageInspectionId] = useState<number | null>(null)

  // Ref to track whether we already have data (for background refresh logic)
  const hasDataRef = useRef(false)

  // ---------------------------------------------------------------------------
  // Data fetching
  // ---------------------------------------------------------------------------
  const fetchDashboardData = useCallback(async (isBackground: boolean) => {
    try {
      if (!isBackground && !hasDataRef.current) {
        setIsInitialLoad(true)
      }
      setError(null)
      const res = await dashboardService.getDashboardData(dateRange)
      setData(res.data)
      hasDataRef.current = true
    } catch (err: any) {
      console.error('Failed to load dashboard', err)
      // On background refresh failure: keep existing data, don't show full error
      if (!hasDataRef.current) {
        setError(err.response?.data?.message || 'فشل تحميل بيانات لوحة التحكم')
      }
      // Silent failure for background refreshes — existing data stays visible
    } finally {
      setIsInitialLoad(false)
    }
  }, [dateRange])

  // Return click handler — uses existing rentalsService.get
  const handleReturnClick = useCallback(async (rentalId: number) => {
    try {
      const res = await rentalsService.get(rentalId)
      const rentalDto = res.data

      const nMs = Date.now()
      const endMs = new Date(rentalDto.expectedEndAt).getTime()
      const diffMs = endMs - nMs
      const diffMins = Math.ceil(diffMs / 60000)

      let opStatus: 'normal' | 'ending_soon' | 'overdue' = 'normal'
      if (diffMins < 0) opStatus = 'overdue'
      else if (diffMins <= 5) opStatus = 'ending_soon'

      const activeRental = {
        ...rentalDto,
        operationalStatus: opStatus,
        remainingMinutes: diffMins,
      } as ActiveRentalDTO

      setSelectedRentalForReturn(activeRental)
      setReturnModalOpen(true)
    } catch {
      showToast({ type: 'error', title: 'خطأ', message: 'تعذر جلب تفاصيل الإيجار للإرجاع' })
    }
  }, [showToast])

  const handleReturnSuccess = useCallback((hasDamage?: boolean, inspectionId?: number) => {
    fetchDashboardData(true)
    if (hasDamage && inspectionId && selectedRentalForReturn) {
      setDamageInspectionId(inspectionId)
      setDamageModalOpen(true)
    }
  }, [fetchDashboardData, selectedRentalForReturn])

  // ---------------------------------------------------------------------------
  // Effects: fetch + polling + local clock
  // ---------------------------------------------------------------------------
  useEffect(() => {
    fetchDashboardData(false)

    // 30s polling for dashboard data (background)
    const dataInterval = setInterval(() => fetchDashboardData(true), 30000)
    // 1s tick for countdown display
    const timeInterval = setInterval(() => setNowMs(Date.now()), 1000)

    return () => {
      clearInterval(dataInterval)
      clearInterval(timeInterval)
    }
  }, [fetchDashboardData])

  // ---------------------------------------------------------------------------
  // Derived values — all from the single API response
  // ---------------------------------------------------------------------------
  const kpis = data?.kpis
  const skatesByStatus = kpis?.skatesByStatus ?? {}
  const availableSkates = skatesByStatus['available'] ?? 0
  const rentedSkates = skatesByStatus['rented'] ?? 0
  const maintenanceSkates = skatesByStatus['maintenance'] ?? 0
  const totalSkates = kpis?.totalSkates ?? 0
  const activeRentals = kpis?.activeRentals ?? 0
  const lateRentals = kpis?.lateRentals ?? 0
  const rentalsPeriod = kpis?.rentalsPeriod ?? 0
  const revenue = kpis?.revenue ?? 0
  const expenses = kpis?.expenses ?? 0
  const operatingResult = kpis?.operatingResult ?? 0
  const endingSoon = kpis?.endingSoonRentals ?? []
  const recentSales = kpis?.recentSales ?? []

  // Utilization: rented / (total - maintenance) — only if denominator > 0
  const usableskates = totalSkates - maintenanceSkates
  const utilization = usableskates > 0 ? Math.round((rentedSkates / usableskates) * 100) : 0

  // Revenue chart
  const revenueChartData = (data?.charts?.revenueOverTime ?? []).map((d: any) => ({
    date: (() => {
      try { return format(parseISO(d.date), 'EEE d', { locale: ar }) }
      catch { return d.date }
    })(),
    total: Number(d.total ?? 0),
  }))

  // Inventory rows for the status list
  const inventoryRows = ORDERED_STATUSES
    .filter(s => skatesByStatus[s] !== undefined)
    .map(s => ({
      key: s,
      label: STATUS_LABELS_AR[s] || s,
      count: skatesByStatus[s],
      color: STATUS_DOT_COLORS[s] || 'var(--color-neutral-text)',
    }))

  // Alerts — concise, no duplication with Section 3
  const alerts: Array<{ icon: any; title: string; detail: string; bg: string; iconColor: string }> = []
  if (lateRentals > 0) {
    alerts.push({
      icon: Clock,
      title: `${lateRentals} حجز متأخر`,
      detail: 'يجب متابعة العملاء المتأخرين',
      bg: 'var(--color-danger-bg)',
      iconColor: 'var(--color-danger-text)',
    })
  }
  if (maintenanceSkates > 0) {
    alerts.push({
      icon: Wrench,
      title: `${maintenanceSkates} اسكيت في الصيانة`,
      detail: 'تحقق من حالة الصيانة وأعد الاسكيتات للخدمة',
      bg: 'var(--color-warning-bg)',
      iconColor: 'var(--color-warning-text)',
    })
  }
  if (availableSkates === 0 && totalSkates > 0) {
    alerts.push({
      icon: AlertTriangle,
      title: 'لا توجد اسكيتات متاحة',
      detail: 'جميع الاسكيتات مشغولة أو في الصيانة',
      bg: 'var(--color-danger-bg)',
      iconColor: 'var(--color-danger-text)',
    })
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="page-container">
      {/* ════════════════════════════════════════════════════════════════════
          1. HEADER
          ════════════════════════════════════════════════════════════════════ */}
      <div className="page-header">
        <div className="page-header-text">
          <h1 className="page-header-title">لوحة التحكم</h1>
          <p className="page-header-subtitle">نظرة عامة على التشغيل اليومي للمحل</p>
        </div>
        <div className="dashboard-date-controls">
          <Button variant="secondary" size="sm" onClick={() => {
            const t = format(new Date(), 'yyyy-MM-dd')
            setDateRange({ startDate: t, endDate: t })
          }}>اليوم</Button>
          <Button variant="secondary" size="sm" onClick={() => {
            const y = format(subDays(new Date(), 1), 'yyyy-MM-dd')
            setDateRange({ startDate: y, endDate: y })
          }}>الأمس</Button>
          <Button variant="secondary" size="sm" onClick={() => {
            const today = new Date()
            const day = today.getDay()
            const diff = today.getDate() - day + (day === 0 ? -6 : 1)
            const startOfWeek = new Date(today)
            startOfWeek.setDate(diff)
            setDateRange({ startDate: format(startOfWeek, 'yyyy-MM-dd'), endDate: format(today, 'yyyy-MM-dd') })
          }}>هذا الأسبوع</Button>
          <Button variant="secondary" size="sm" onClick={() => {
            const today = new Date()
            const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
            setDateRange({ startDate: format(startOfMonth, 'yyyy-MM-dd'), endDate: format(today, 'yyyy-MM-dd') })
          }}>هذا الشهر</Button>
          <div className="date-inputs">
            <input
              type="date"
              className="input"
              value={dateRange.startDate}
              onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
              max={dateRange.endDate}
            />
            <span className="date-separator">إلى</span>
            <input
              type="date"
              className="input"
              value={dateRange.endDate}
              onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
              min={dateRange.startDate}
            />
          </div>
          <Button variant="ghost" size="sm" onClick={() => fetchDashboardData(true)} title="تحديث">
            <RefreshCw size={16} />
          </Button>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          CONTENT: Initial Load → Error → Data
          ════════════════════════════════════════════════════════════════════ */}
      {isInitialLoad ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-16) 0' }}>
          <LoadingSpinner size="lg" />
        </div>
      ) : error && !data ? (
        <EmptyState
          icon={AlertTriangle}
          title="خطأ في التحميل"
          description={error}
          action={<Button onClick={() => fetchDashboardData(false)}><RefreshCw size={16} /> إعادة المحاولة</Button>}
        />
      ) : data ? (
        <div className="dash-content">

          {/* ════════════════════════════════════════════════════════════════
              NEW: QUICK ACTIONS
              ════════════════════════════════════════════════════════════════ */}
          <div className="dash-section-full" style={{ marginBottom: 'var(--space-6)' }}>
            <Card>
              <div className="dash-section-header" style={{ marginBottom: 'var(--space-3)' }}>
                <Zap size={18} className="dash-section-icon" />
                <h2 className="dash-section-title">إجراءات سريعة</h2>
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
                <PermissionGate permission="rentals.create">
                  <Button variant="secondary" onClick={() => navigate('/rentals/new')}>
                    <Ticket size={16} /> اسكيت جديدة للإيجار
                  </Button>
                </PermissionGate>
                <PermissionGate permission="sales.create">
                  <Button variant="secondary" onClick={() => navigate('/sales-pos')}>
                    <ShoppingCart size={16} /> تسجيل عملية بيع
                  </Button>
                </PermissionGate>
                <PermissionGate permission="rentals.return">
                  <Button variant="secondary" onClick={() => navigate('/rentals/active')}>
                    <RotateCcw size={16} /> إرجاع اسكيت
                  </Button>
                </PermissionGate>
                <PermissionGate permission="maintenance.view">
                  <Button variant="secondary" onClick={() => navigate('/maintenance')}>
                    <Wrench size={16} /> إضافة اسكيت للصيانة
                  </Button>
                </PermissionGate>
                <PermissionGate permission="customers.view">
                  <Button variant="secondary" onClick={() => navigate('/customers')}>
                    <UserPlus size={16} /> إضافة عميل
                  </Button>
                </PermissionGate>
              </div>
            </Card>
          </div>

          {/* ════════════════════════════════════════════════════════════════
              2. PRIMARY KPI ROW — 4 cards
              ════════════════════════════════════════════════════════════════ */}
          <div className="dash-kpi-grid">
            {/* الاسكيتات المتاحة */}
            <Card padding="compact" className="dash-kpi-card">
              <div className="dash-kpi-icon" style={{ background: 'var(--color-success-bg)', color: 'var(--color-success-text)' }}>
                <Package size={22} />
              </div>
              <div className="dash-kpi-body">
                <p className="dash-kpi-value">{availableSkates}</p>
                <p className="dash-kpi-label">الاسكيتات المتاحة</p>
                {usableskates > 0 && (
                  <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', margin: 0, marginTop: 2 }}>
                    نسبة الاستخدام: {utilization}%
                  </p>
                )}
              </div>
            </Card>

            {/* الحجوزات النشطة */}
            <Card padding="compact" className="dash-kpi-card">
              <div className="dash-kpi-icon" style={{ background: 'var(--color-info-bg)', color: 'var(--color-info-text)' }}>
                <Activity size={22} />
              </div>
              <div className="dash-kpi-body">
                <p className="dash-kpi-value">{activeRentals}</p>
                <p className="dash-kpi-label">الحجوزات النشطة</p>
                {lateRentals > 0 && (
                  <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-danger-600)', margin: 0, marginTop: 2, fontWeight: 600 }}>
                    منها {lateRentals} متأخر
                  </p>
                )}
              </div>
            </Card>

            {/* إيرادات اليوم */}
            <Card padding="compact" className="dash-kpi-card">
              <div className="dash-kpi-icon" style={{ background: 'var(--color-gold-100)', color: 'var(--color-gold-600)' }}>
                <DollarSign size={22} />
              </div>
              <div className="dash-kpi-body">
                {canViewReports ? (
                  <>
                    <p className="dash-kpi-value">
                      {formatCurrency(revenue)}
                    </p>
                    <p className="dash-kpi-label">إيرادات الفترة</p>
                    {(kpis?.collectedLateFees || 0) > 0 && (
                      <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', margin: 0, marginTop: 2 }}>
                        تتضمن {formatCurrency(kpis?.collectedLateFees || 0)} غرامات
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    <p className="dash-kpi-value" style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>—</p>
                    <p className="dash-kpi-label">إيرادات الفترة</p>
                  </>
                )}
              </div>
            </Card>

            {/* تحت الصيانة */}
            <Card padding="compact" className="dash-kpi-card">
              <div className="dash-kpi-icon" style={{ background: 'var(--color-warning-bg)', color: 'var(--color-warning-text)' }}>
                <Wrench size={22} />
              </div>
              <div className="dash-kpi-body">
                <p className="dash-kpi-value">{maintenanceSkates}</p>
                <p className="dash-kpi-label">تحت الصيانة</p>
              </div>
            </Card>
          </div>

          {/* ════════════════════════════════════════════════════════════════
              3. ACTIVE / EXPIRING RENTALS
              ════════════════════════════════════════════════════════════════ */}
          <Card>
            <div className="dash-section-header">
              <Clock size={18} className="dash-section-icon" />
              <h2 className="dash-section-title">الحجوزات القريبة من الانتهاء</h2>
            </div>
            {endingSoon.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table className="dash-table">
                  <thead>
                    <tr>
                      <th>كود الاسكيت</th>
                      <th>العميل</th>
                      <th>وقت البدء</th>
                      <th>وقت الانتهاء المتوقع</th>
                      <th>الوقت المتبقي</th>
                      <th>الحالة</th>
                      <th style={{ width: 80 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {endingSoon.map(rental => {
                      const endMs = new Date(rental.expectedEndAt).getTime()
                      const diffMs = endMs - nowMs
                      const diffSecs = Math.floor(diffMs / 1000)
                      const isOverdue = diffSecs < 0

                      let badgeStatus: 'overdue' | 'rented' | 'active'
                      let remainingText: string
                      let stateText: string

                      if (isOverdue) {
                        const absSecs = Math.abs(diffSecs)
                        const m = Math.floor(absSecs / 60)
                        const s = absSecs % 60
                        badgeStatus = 'overdue'
                        remainingText = `متأخر ${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
                        stateText = 'متأخر'
                      } else {
                        const m = Math.floor(diffSecs / 60)
                        const s = diffSecs % 60
                        const formattedTime = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
                        if (diffSecs <= 300) {
                          badgeStatus = 'rented'
                          remainingText = formattedTime
                          stateText = 'قريب'
                        } else {
                          badgeStatus = 'active'
                          remainingText = formattedTime
                          stateText = 'نشط'
                        }
                      }

                      return (
                        <tr key={rental.id} className={isOverdue ? 'dash-table-row-overdue' : ''}>
                          <td style={{ fontWeight: 600 }}>{rental.skateCode}</td>
                          <td>{rental.customerName}</td>
                          <td style={{ direction: 'ltr', textAlign: 'right', fontSize: 'var(--font-size-xs)' }}>
                            {format(new Date(rental.startedAt), 'hh:mm a')}
                          </td>
                          <td style={{ direction: 'ltr', textAlign: 'right', fontSize: 'var(--font-size-xs)' }}>
                            {format(new Date(rental.expectedEndAt), 'hh:mm a')}
                          </td>
                          <td>
                            <span style={{ fontWeight: 600, color: isOverdue ? 'var(--color-danger-600)' : 'inherit', fontVariantNumeric: 'tabular-nums' }}>
                              {remainingText}
                            </span>
                          </td>
                          <td>
                            <Badge status={badgeStatus}>{stateText}</Badge>
                          </td>
                          <td style={{ textAlign: 'left' }}>
                            <PermissionGate permission="rentals.return">
                              <Button variant="primary" size="sm" onClick={() => handleReturnClick(rental.id)}>
                                إرجاع
                              </Button>
                            </PermissionGate>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                icon={Activity}
                title="لا توجد حجوزات قريبة من الانتهاء"
                description="جميع الحجوزات النشطة لا تزال في الوقت المسموح"
              />
            )}
          </Card>

          {/* ════════════════════════════════════════════════════════════════
              4. OPERATIONAL SUMMARY
              ════════════════════════════════════════════════════════════════ */}
          <Card>
            <div className="dash-section-header">
              <TrendingUp size={18} className="dash-section-icon" />
              <h2 className="dash-section-title">ملخص التشغيل</h2>
            </div>
            <div className="dash-summary-grid">
              {/* Inventory Column */}
              <div className="dash-summary-column">
                <p className="dash-summary-column-title">حالة الاسكيتات</p>
                <div className="dash-summary-row">
                  <span>إجمالي</span>
                  <span className="dash-summary-row-value">{totalSkates}</span>
                </div>
                <div className="dash-summary-row">
                  <span style={{ color: 'var(--color-success-600)' }}>متاح</span>
                  <span className="dash-summary-row-value">{availableSkates}</span>
                </div>
                <div className="dash-summary-row">
                  <span style={{ color: 'var(--color-info-600)' }}>مؤجر</span>
                  <span className="dash-summary-row-value">{rentedSkates}</span>
                </div>
                <div className="dash-summary-row">
                  <span style={{ color: 'var(--color-warning-600)' }}>صيانة</span>
                  <span className="dash-summary-row-value">{maintenanceSkates}</span>
                </div>
                {usableskates > 0 && (
                  <div className="dash-summary-row dash-summary-row-divider">
                    <span>نسبة الاستخدام</span>
                    <span className="dash-summary-row-value">{utilization}%</span>
                  </div>
                )}
              </div>

              {/* Performance Column */}
              <div className="dash-summary-column">
                <p className="dash-summary-column-title">أداء الفترة</p>
                <div className="dash-summary-row">
                  <span>الحجوزات</span>
                  <span className="dash-summary-row-value">{rentalsPeriod}</span>
                </div>
                <div className="dash-summary-row">
                  <span>الإيرادات</span>
                  <span className="dash-summary-row-value">{canViewReports ? formatCurrency(revenue) : '—'}</span>
                </div>
                <div className="dash-summary-row">
                  <span>المصروفات</span>
                  <span className="dash-summary-row-value">{canViewReports ? formatCurrency(expenses) : '—'}</span>
                </div>
                <div className="dash-summary-row dash-summary-row-divider">
                  <span style={{ fontWeight: 700 }}>صافي التشغيل</span>
                  <span className="dash-summary-row-value" style={{
                    color: canViewReports
                      ? (operatingResult >= 0 ? 'var(--color-success-600)' : 'var(--color-danger-600)')
                      : 'inherit'
                  }}>
                    {canViewReports ? formatCurrency(operatingResult) : '—'}
                  </span>
                </div>
              </div>
            </div>
          </Card>

          {/* ════════════════════════════════════════════════════════════════
              5. REVENUE CHART + SKATE STATUS
              ════════════════════════════════════════════════════════════════ */}
          <div className="dash-grid-2">
            {/* Revenue Chart */}
            <Card>
              <div className="dash-section-header">
                <BarChart3 size={18} className="dash-section-icon" />
                <h2 className="dash-section-title">الإيرادات</h2>
              </div>
              {canViewReports ? (
                revenueChartData.length > 0 ? (
                  <div className="dash-chart-container">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={revenueChartData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 12, fill: 'var(--color-text-muted)', fontFamily: 'var(--font-family-base)' }}
                          axisLine={{ stroke: 'var(--color-border)' }}
                          tickLine={false}
                          dy={8}
                        />
                        <YAxis
                          tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }}
                          axisLine={false}
                          tickLine={false}
                          width={50}
                          tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
                        />
                        <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--color-gold-50)' }} />
                        <Bar
                          dataKey="total"
                          name="الإيرادات"
                          fill="var(--color-gold-500)"
                          radius={[6, 6, 0, 0]}
                          barSize={32}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <EmptyState icon={BarChart3} title="لا توجد إيرادات خلال الفترة المحددة" />
                )
              ) : (
                <EmptyState icon={BarChart3} title="تحتاج صلاحية عرض التقارير" />
              )}
            </Card>

            {/* Skate Status */}
            <Card>
              <div className="dash-section-header">
                <Package size={18} className="dash-section-icon" />
                <h2 className="dash-section-title">حالة الاسكيتات</h2>
              </div>
              {inventoryRows.length > 0 ? (
                <div className="dash-status-list">
                  {inventoryRows.map(row => (
                    <div key={row.key} className="dash-status-row">
                      <div className="dash-status-row-info">
                        <div className="dash-status-dot" style={{ backgroundColor: row.color }} />
                        <span className="dash-status-label">{row.label}</span>
                      </div>
                      <span className="dash-status-count">{row.count}</span>
                    </div>
                  ))}
                  <div className="dash-status-row dash-status-row-total">
                    <div className="dash-status-row-info">
                      <span className="dash-status-label" style={{ fontWeight: 700 }}>الإجمالي</span>
                    </div>
                    <span className="dash-status-count">{totalSkates}</span>
                  </div>
                </div>
              ) : (
                <EmptyState icon={Package} title="لا توجد اسكيتات مسجلة في النظام" />
              )}
            </Card>
          </div>

          {/* ════════════════════════════════════════════════════════════════
              6. RECENT SALES + 7. ALERTS
              ════════════════════════════════════════════════════════════════ */}
          <div className="dash-grid-2-equal">
            {/* Recent Sales */}
            <Card>
              <div className="dash-section-header">
                <ShoppingBag size={18} className="dash-section-icon" />
                <h2 className="dash-section-title">آخر المبيعات</h2>
              </div>
              {canViewReports ? (
                recentSales.length > 0 ? (
                  <div style={{ overflowX: 'auto' }}>
                    <table className="dash-table">
                      <thead>
                        <tr>
                          <th>العميل</th>
                          <th>المنتج</th>
                          <th>الإجمالي</th>
                          <th>الحالة</th>
                          <th>التاريخ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentSales.map(sale => (
                          <tr key={sale.id}>
                            <td style={{ fontWeight: 600 }}>{sale.customerName || 'عميل نقدي'}</td>
                            <td>{sale.itemName || 'منتجات مختلفة'}</td>
                            <td style={{ direction: 'ltr', textAlign: 'right', fontWeight: 600 }}>
                              {formatCurrency(sale.totalAmount)}
                            </td>
                            <td>
                              <Badge status={sale.status === 'completed' ? 'completed' : 'cancelled'}>
                                {sale.status === 'completed' ? 'مكتمل' : 'ملغى'}
                              </Badge>
                            </td>
                            <td style={{ direction: 'ltr', textAlign: 'right', fontSize: 'var(--font-size-xs)' }}>
                              {format(new Date(sale.createdAt), 'MM/dd hh:mm a')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <EmptyState icon={ShoppingBag} title="لا توجد مبيعات حتى الآن" />
                )
              ) : (
                <EmptyState icon={ShoppingBag} title="تحتاج صلاحية عرض التقارير" />
              )}
            </Card>

            {/* Alerts */}
            <Card>
              <div className="dash-section-header">
                <AlertTriangle size={18} className="dash-section-icon" />
                <h2 className="dash-section-title">التنبيهات</h2>
              </div>
              {alerts.length > 0 ? (
                <div className="dash-alerts-list">
                  {alerts.map((alert, i) => (
                    <div key={i} className="dash-alert-item" style={{ background: alert.bg }}>
                      <div className="dash-alert-icon" style={{ background: alert.bg, color: alert.iconColor }}>
                        <alert.icon size={16} />
                      </div>
                      <div className="dash-alert-body">
                        <p className="dash-alert-title" style={{ color: alert.iconColor }}>{alert.title}</p>
                        <p className="dash-alert-detail">{alert.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState icon={Activity} title="لا توجد تنبيهات حالياً" description="كل شيء يسير بشكل طبيعي" />
              )}
            </Card>
          </div>

        </div>
      ) : null}

      {/* Modals — existing return + damage flow */}
      <ReturnRentalModal
        isOpen={returnModalOpen}
        onClose={() => setReturnModalOpen(false)}
        rental={selectedRentalForReturn}
        onSuccess={handleReturnSuccess}
      />
      {selectedRentalForReturn && damageInspectionId && (
        <CreateDamageReportModal
          isOpen={damageModalOpen}
          onClose={() => setDamageModalOpen(false)}
          rental={selectedRentalForReturn}
          inspectionId={damageInspectionId}
          onSuccess={() => fetchDashboardData(true)}
        />
      )}
    </div>
  )
}
