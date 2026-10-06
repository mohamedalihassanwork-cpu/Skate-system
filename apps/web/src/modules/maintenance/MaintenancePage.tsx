import { useState, useEffect, useCallback } from 'react'
import { Wrench, Plus, RefreshCw } from 'lucide-react'
import { maintenanceService, type MaintenanceRecord } from './maintenance.service'
import MaintenanceRecordModal from './MaintenanceRecordModal'
import MaintenancePaymentModal from './MaintenancePaymentModal'
import { useAuth } from '../../contexts/AuthContext'
import {
  Button,
  PageLoader,
  Alert,
  Badge,
  Select,
  DataTable,
  type TableColumn
} from '../../components/ui'

export default function MaintenancePage() {
  const { hasPermission } = useAuth()

  const [records, setRecords] = useState<MaintenanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('')

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedRecordId, setSelectedRecordId] = useState<number | undefined>()

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await maintenanceService.getMaintenanceRecords({
        status: statusFilter || undefined,
        limit: 100 // fetch up to 100 for now to simplify pagination handling like SkatesPage
      })
      setRecords(res.records || [])
    } catch (err: any) {
      console.error('Failed to load maintenance records:', err)
      setError(err?.response?.data?.error || 'حدث خطأ أثناء تحميل السجلات')
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    loadData()
  }, [loadData])

  const openModal = (id?: number) => {
    setSelectedRecordId(id)
    setIsModalOpen(true)
  }

  const handleModalClose = () => {
    setIsModalOpen(false)
    setSelectedRecordId(undefined)
  }

  const handleModalSave = () => {
    loadData()
    handleModalClose()
  }

  const renderStatus = (status: string) => {
    switch (status) {
      case 'pending': return <Badge variant="warning">معلق</Badge>
      case 'in_progress': return <Badge variant="info">قيد الصيانة</Badge>
      case 'completed': return <Badge variant="success">مكتمل</Badge>
      default: return <Badge variant="neutral">{status}</Badge>
    }
  }

  const renderPaymentStatus = (status: string) => {
    switch (status) {
      case 'unpaid': return <Badge variant="danger">غير مدفوع</Badge>
      case 'paid': return <Badge variant="success">مدفوع</Badge>
      case 'paid_external': return <Badge variant="info">مدفوع خارجياً</Badge>
      case 'legacy': return <Badge variant="neutral">تاريخي</Badge>
      case 'no_cost': return <Badge variant="neutral">بدون تكلفة</Badge>
      default: return <Badge variant="neutral">{status}</Badge>
    }
  }

  // Payment Modal State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const [paymentRecordId, setPaymentRecordId] = useState<number | undefined>()

  const openPaymentModal = (e: React.MouseEvent, id: number) => {
    e.stopPropagation()
    setPaymentRecordId(id)
    setIsPaymentModalOpen(true)
  }

  const columns: TableColumn<any>[] = [
    { key: 'id', header: 'رقم السجل', render: (_, r: any) => `#${r.id}` },
    { key: 'skate', header: 'كود الاسكيت', render: (_, r: any) => <span className="font-medium text-gold-500">{r.skateCode}</span> },
    { key: 'status', header: 'حالة الصيانة', render: (_, r: any) => renderStatus(r.status) },
    { key: 'paymentStatus', header: 'حالة الدفع', render: (_, r: any) => renderPaymentStatus(r.paymentStatus) },
    { key: 'date', header: 'تاريخ الفتح', render: (_, r: any) => new Date(r.createdAt).toLocaleDateString('ar-EG') },
    { key: 'cost', header: 'إجمالي التكلفة', render: (_, r: any) => `${r.totalCost} ج.م` },
    { key: 'user', header: 'المسؤول', render: (_, r: any) => r.createdByName },
    {
      key: 'actions',
      header: 'إجراءات',
      render: (_, r: any) => {
        if (r.status === 'completed' && r.paymentStatus === 'unpaid' && hasPermission('maintenance.pay')) {
          return (
            <Button size="sm" variant="primary" onClick={(e) => openPaymentModal(e, r.id)}>
              دفع التكلفة
            </Button>
          )
        }
        return null
      }
    }
  ]

  return (
    <div className="page-container flex flex-col h-full">
      <div className="page-header shrink-0">
        <div className="page-header-text">
          <h1 className="page-header-title">سجل الصيانة</h1>
          <p className="page-header-subtitle">إدارة ومتابعة عمليات صيانة الاسكيتات</p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <Button variant="secondary" onClick={loadData} aria-label="تحديث البيانات">
            <RefreshCw size={16} aria-hidden="true" />
            <span className="hidden sm:inline">تحديث</span>
          </Button>
          {hasPermission('maintenance.create') && (
            <Button variant="primary" onClick={() => openModal()}>
              <Plus size={16} aria-hidden="true" />
              <span className="hidden sm:inline">سجل جديد</span>
            </Button>
          )}
        </div>
      </div>

      <div className="filters-row">
        <Select
          id="statusFilter"
          label=""
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          options={[
            { value: '', label: 'جميع الحالات' },
            { value: 'pending', label: 'معلق' },
            { value: 'in_progress', label: 'قيد الصيانة' },
            { value: 'completed', label: 'مكتمل' }
          ]}
        />
      </div>

      {error && (
        <Alert variant="danger" title="خطأ" style={{ marginBottom: 'var(--space-6)' } as React.CSSProperties}>
          {error}
        </Alert>
      )}

      {loading ? (
        <PageLoader label="جارٍ تحميل سجلات الصيانة" />
      ) : (
        <DataTable
          columns={columns}
          data={records as any[]}
          emptyMessage={statusFilter ? "لم يتم العثور على سجلات تطابق الفلتر الحالي." : "لم يتم تسجيل أي عمليات صيانة بعد."}
          emptyIcon={Wrench}
          onRowClick={(r) => openModal(r.id)}
        />
      )}

      {isModalOpen && (
        <MaintenanceRecordModal
          recordId={selectedRecordId}
          onClose={handleModalClose}
          onSave={handleModalSave}
        />
      )}

      {isPaymentModalOpen && paymentRecordId && (
        <MaintenancePaymentModal
          recordId={paymentRecordId}
          onClose={() => {
            setIsPaymentModalOpen(false)
            setPaymentRecordId(undefined)
          }}
          onSave={() => {
            setIsPaymentModalOpen(false)
            setPaymentRecordId(undefined)
            loadData()
          }}
        />
      )}
    </div>
  )
}
