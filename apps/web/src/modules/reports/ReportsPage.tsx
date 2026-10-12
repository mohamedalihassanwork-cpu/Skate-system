import { useState } from 'react'
import {
  FileDown,
  PieChart,
  TrendingUp,
  CreditCard,
  User,
  Wrench,
  AlertTriangle,
  Clock,
  Package
} from 'lucide-react'
import { format, subDays } from 'date-fns'

import { Button, Input } from '../../components/ui'
import OverviewReport from './components/OverviewReport'
import FinancialReport from './components/FinancialReport'
import RevenueReport from './components/RevenueReport'
import ExpenseReport from './components/ExpenseReport'
import GenericListReport from './components/GenericListReport'
import { exportToCSV, exportToExcel, exportToPDF, fetchAllReportData } from './exportUtils'

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
]

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState('overview')
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'))
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = async (fmt: 'csv' | 'excel' | 'pdf') => {
    if (activeTab === 'overview' || activeTab === 'financial') {
      alert('لا يمكن تصدير نظرة عامة أو النتيجة التشغيلية بصيغة جدول، برجاء اختيار تقرير مفصل.')
      return
    }

    setIsExporting(true)
    try {
      const data = await fetchAllReportData(activeTab, startDate, endDate)
      if (data.length === 0) {
        alert('لا توجد بيانات للتصدير')
        return
      }

      const filename = `report_${activeTab}_${startDate}_${endDate}`
      if (fmt === 'csv') exportToCSV(data, filename)
      else if (fmt === 'excel') exportToExcel(data, filename)
      else if (fmt === 'pdf') exportToPDF(data, filename, REPORT_TABS.find(t => t.id === activeTab)?.label || 'تقرير')

    } catch (e: any) {
      alert('حدث خطأ أثناء التصدير: ' + e.message)
    } finally {
      setIsExporting(false)
    }
  }

  const activeTabInfo = REPORT_TABS.find(t => t.id === activeTab)

  return (
    <div className="page-container reports-page" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - var(--header-height))' }}>
      {/* Page Header */}
      <div className="page-header" style={{ flexShrink: 0 }}>
        <div className="page-header-text">
          <h1 className="page-header-title">التقارير التحليلية</h1>
          <p className="page-header-subtitle">عرض وتحليل الأداء والنتائج التشغيلية</p>
        </div>
      </div>

      <div className="reports-layout" style={{ display: 'flex', gap: 'var(--space-6)', flex: 1, minHeight: 0 }}>
        {/* Report Navigation Sidebar */}
        <div className="reports-navigation" style={{ width: '220px', flexShrink: 0, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {REPORT_TABS.map((tab) => {
              const isActive = activeTab === tab.id
              return (
                <button
                  className="reports-navigation-button"
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-3)',
                    padding: 'var(--space-3) var(--space-4)',
                    borderRadius: 'var(--radius-base)',
                    transition: 'all 200ms ease',
                    fontSize: 'var(--font-size-sm)',
                    fontWeight: isActive ? 'var(--font-weight-semibold)' : 'var(--font-weight-regular)',
                    fontFamily: 'var(--font-family-base)',
                    whiteSpace: 'nowrap',
                    cursor: 'pointer',
                    border: 'none',
                    textAlign: 'right',
                    width: '100%',
                    backgroundColor: isActive ? 'var(--color-navy-800)' : 'transparent',
                    color: isActive ? 'var(--color-white)' : 'var(--color-text-secondary)',
                    boxShadow: isActive ? 'var(--shadow-sm)' : 'none',
                  } as any}
                  onMouseEnter={(e) => { if (!isActive) { e.currentTarget.style.backgroundColor = 'var(--color-page-bg)'; e.currentTarget.style.color = 'var(--color-navy-800)' } }}
                  onMouseLeave={(e) => { if (!isActive) { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--color-text-secondary)' } }}
                >
                  <tab.icon size={18} style={{ color: isActive ? 'var(--color-gold-400)' : 'var(--color-text-muted)', flexShrink: 0 }} />
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Main Report Content */}
        <div className="reports-panel" style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          backgroundColor: 'var(--color-white)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-card)',
          overflow: 'hidden',
          height: '100%',
        }}>
          {/* Header Controls */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: 'var(--space-5)',
            borderBottom: '1px solid var(--color-border)',
            gap: 'var(--space-4)',
            backgroundColor: 'var(--color-page-bg)',
            flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <div style={{
                padding: 'var(--space-2)',
                backgroundColor: 'var(--color-navy-50)',
                borderRadius: 'var(--radius-base)',
                color: 'var(--color-navy-700)',
                display: 'flex',
              }}>
                {activeTabInfo && <activeTabInfo.icon size={20} />}
              </div>
              <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-semibold)' as any, color: 'var(--color-navy-800)', margin: 0 }}>
                {activeTabInfo?.label}
              </h2>
            </div>

            <div className="reports-filter-actions" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 'var(--space-4)' }}>
              <div className="reports-date-range" style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-3)',
                backgroundColor: 'var(--color-white)',
                padding: '6px',
                borderRadius: 'var(--radius-base)',
                border: '1px solid var(--color-border)',
                boxShadow: 'var(--shadow-xs)',
              }}>
                <div style={{ width: '144px' }}>
                  <Input
                    id="start-date"
                    type="date"
                    label="من تاريخ"
                    value={startDate}
                    onChange={(e: any) => setStartDate(e.target.value)}
                  />
                </div>
                <div style={{ width: '144px' }}>
                  <Input
                    id="end-date"
                    type="date"
                    label="إلى تاريخ"
                    value={endDate}
                    onChange={(e: any) => setEndDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="reports-exports" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <Button variant="secondary" size="sm" onClick={() => handleExport('excel')} disabled={isExporting}>
                  <FileDown size={16} />
                  Excel
                </Button>
                <Button variant="secondary" size="sm" onClick={() => handleExport('csv')} disabled={isExporting}>
                  <FileDown size={16} />
                  CSV
                </Button>
                <Button variant="secondary" size="sm" onClick={() => handleExport('pdf')} disabled={isExporting}>
                  <FileDown size={16} />
                  PDF
                </Button>
              </div>
            </div>
          </div>

          {/* Report Canvas */}
          <div className="reports-canvas" style={{ flex: 1, overflowY: 'auto', padding: 'var(--space-6)', backgroundColor: 'var(--color-page-bg)' }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
              {activeTab === 'overview' && <OverviewReport startDate={startDate} endDate={endDate} />}
              {activeTab === 'financial' && <FinancialReport startDate={startDate} endDate={endDate} />}
              {activeTab === 'revenue' && <RevenueReport startDate={startDate} endDate={endDate} />}
              {activeTab === 'expenses' && <ExpenseReport startDate={startDate} endDate={endDate} />}
              {activeTab !== 'overview' && activeTab !== 'financial' && activeTab !== 'revenue' && activeTab !== 'expenses' && (
                <GenericListReport type={activeTab} startDate={startDate} endDate={endDate} />
              )}
            </div>
          </div>
        </div>
      </div>
      <style>{`
        /* Keep existing tablet/mobile presentation; desktop uses the page scroll. */
        @media screen and (min-width: 1024px) {
          .reports-page { height: auto !important; min-height: calc(100vh - var(--header-height)); }
          .reports-layout {
            display: grid !important;
            grid-template-columns: minmax(160px, 190px) minmax(0, 1fr);
            align-items: start;
          }
          .reports-navigation {
            width: auto !important;
            position: sticky;
            top: calc(var(--header-height) + var(--space-4));
            max-height: calc(100vh - var(--header-height) - var(--space-8));
          }
          .reports-navigation-button:focus-visible {
            outline: 2px solid var(--color-border-focus);
            outline-offset: -2px;
          }
          .reports-panel { height: auto !important; min-width: 0; }
          .reports-filter-actions { flex: 1 1 32rem; min-width: 0; }
          .reports-date-range { flex: 1 1 19rem; min-width: 0; }
          .reports-date-range > div { flex: 1; min-width: 0; width: auto !important; }
          .reports-exports { flex-wrap: wrap; }
          .reports-canvas { overflow: visible !important; min-width: 0; }
          .report-charts-grid {
            grid-template-columns: repeat(auto-fit, minmax(min(100%, 400px), 1fr)) !important;
          }
          .report-charts-grid > div { min-width: 0; }
          .reports-page .recharts-legend-item-text { color: var(--color-text-secondary) !important; }
          .reports-page .recharts-cartesian-axis-tick-value { fill: var(--color-text-secondary) !important; }
          .report-kpi-grid {
            grid-template-columns: repeat(auto-fit, minmax(min(100%, 200px), 1fr)) !important;
          }
          .report-kpi-card > div { gap: var(--space-2); }
          .report-kpi-card > div > div:first-child { min-width: 0; }
          .report-kpi-card h3 { overflow-wrap: anywhere; font-variant-numeric: tabular-nums; }
          .report-hero > div { gap: var(--space-4); }
          .report-hero > div > div:first-child { min-width: 0; }
          .report-hero h2 {
            font-size: clamp(var(--font-size-2xl), 2.5vw, var(--font-size-4xl)) !important;
            overflow-wrap: anywhere;
            font-variant-numeric: tabular-nums;
            flex-wrap: wrap;
          }
          .report-hero-icon { flex-shrink: 0; }
          .report-hero--positive { background-color: var(--color-success-bg) !important; }
          .report-hero--negative { background-color: var(--color-danger-bg) !important; }
          .report-hero--financial { color: var(--color-text-primary) !important; }
          .report-hero--financial p { color: var(--color-text-secondary) !important; }
          .report-hero--financial svg { color: var(--color-text-primary) !important; }
        }
      `}</style>
    </div>
  )
}
