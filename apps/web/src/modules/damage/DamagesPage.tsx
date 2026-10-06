import { useState, useEffect, useCallback } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import {
  Badge,
  Alert,
  PageLoader,
  Button,
  DataTable,
  type TableColumn
} from '../../components/ui'
import { formatCurrency } from '../../utils/currency'
import { damageService, type DamageReportDTO } from './damage.service'
import { DamageReportModal } from './DamageReportModal'

export default function DamagesPage() {
  const [reports, setReports] = useState<DamageReportDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [selectedReport, setSelectedReport] = useState<DamageReportDTO | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await damageService.list()
      setReports(res.data)
    } catch (err: unknown) {
      setError('تعذر تحميل تقارير الضرر')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleRowClick = (report: DamageReportDTO) => {
    setSelectedReport(report)
    setModalOpen(true)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <Badge status="reserved">معلق</Badge>
      case 'partially_paid': return <Badge status="rented">مدفوع جزئياً</Badge>
      case 'paid': return <Badge status="completed">مسدد</Badge>
      case 'waived': return <Badge status="cancelled">معفى</Badge>
      default: return <Badge status="inactive">{status}</Badge>
    }
  }

  const columns: TableColumn<any>[] = [
    { key: 'id', header: 'رقم التقرير', render: (_, r: any) => `#${r.id}` },
    { key: 'skate', header: 'الاسكيت', render: (_, r: any) => <span dir="ltr">{r.skateCode || `ID: ${r.skateId}`}</span> },
    { key: 'customer', header: 'العميل', render: (_, r: any) => r.customerName || `ID: ${r.customerId}` },
    { key: 'rental', header: 'رقم الإيجار', render: (_, r: any) => `#${r.rentalId}` },
    { key: 'charge', header: 'الغرامة المقررة', render: (_, r: any) => formatCurrency(r.customerCharge) },
    {
      key: 'remaining',
      header: 'الرصيد المتبقي',
      render: (_, r: any) => {
        const remaining = r.customerCharge - (r.chargeCollected + r.chargeWaived)
        return (
          <span style={{ fontWeight: remaining > 0 ? 'var(--font-weight-bold)' : 'normal', color: remaining > 0 ? 'var(--color-danger-text)' : 'inherit' }}>
            {formatCurrency(Math.max(0, remaining))}
          </span>
        )
      }
    },
    { key: 'status', header: 'الحالة', render: (_, r: any) => getStatusBadge(r.status) },
    { key: 'date', header: 'تاريخ التقرير', render: (_, r: any) => <span dir="ltr">{new Date(r.createdAt).toLocaleString('ar-EG')}</span> }
  ]

  if (loading) return <PageLoader label="جارٍ تحميل تقارير الضرر" />

  return (
    <div className="page-container flex flex-col h-full">
      <div className="page-header shrink-0">
        <div className="page-header-text">
          <h1 className="page-header-title">تقارير الضرر</h1>
          <p className="page-header-subtitle">إدارة أضرار الاسكيتات والرسوم المحصلة</p>
        </div>
        <Button variant="secondary" onClick={() => load()}>
          <RefreshCw size={16} aria-hidden="true" />
          تحديث
        </Button>
      </div>

      {error && <Alert variant="danger" style={{ marginBottom: 'var(--space-6)' } as React.CSSProperties}>{error}</Alert>}

      {!loading && !error && (
        <DataTable
          columns={columns}
          data={reports as any[]}
          emptyMessage="لم يتم تسجيل أي تقارير ضرر للزلاجات حتى الآن."
          emptyIcon={AlertTriangle}
          onRowClick={handleRowClick}
        />
      )}

      {selectedReport && (
        <DamageReportModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          report={selectedReport}
          onSuccess={() => load()}
        />
      )}
    </div>
  )
}
