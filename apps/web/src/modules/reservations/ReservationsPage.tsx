import { useState, useEffect, useCallback } from 'react'
import { Calendar, Plus, Ticket, Pencil, XCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import {
  Badge,
  Button,
  Alert,
  PageLoader,
  Select,
  useToast,
  DataTable,
  type TableColumn,
  type BadgeStatus,
} from '../../components/ui'
import {
  reservationsService,
  type Reservation,
  type ReservationStatus,
} from './reservations.service'
import { PermissionGate } from '../../components/PermissionGate'
import ReservationModal from './ReservationModal'

function ReservationStatusBadge({ status }: { status: ReservationStatus }) {
  const statusToBadge: Record<ReservationStatus, BadgeStatus> = {
    pending: 'system',
    confirmed: 'reserved',
    fulfilled: 'completed',
    cancelled: 'cancelled',
  }
  const statusLabels: Record<ReservationStatus, string> = {
    pending: 'معلق',
    confirmed: 'مؤكد',
    fulfilled: 'منفذ',
    cancelled: 'ملغي',
  }
  return <Badge status={statusToBadge[status]}>{statusLabels[status]}</Badge>
}

export function ReservationsPage() {
  const navigate = useNavigate()
  const { showToast } = useToast()

  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [statusFilter, setStatusFilter] = useState<string>('active')

  const [modalOpen, setModalOpen] = useState(false)
  const [editingReservation, setEditingReservation] = useState<Reservation | undefined>()

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const queryStatus = statusFilter === 'all' ? undefined : (statusFilter as 'active' | ReservationStatus)
      const res = await reservationsService.getReservations({
        status: queryStatus,
        perPage: 50,
      })
      setReservations(res.data)
    } catch (err: any) {
      setError(err.message || 'فشل في تحميل الحجوزات')
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => { load() }, [load])

  const handleCancel = async (id: number) => {
    if (!window.confirm('هل أنت متأكد من إلغاء الحجز؟')) return
    try {
      await reservationsService.cancelReservation(id)
      showToast({ type: 'success', title: 'تم إلغاء الحجز بنجاح' })
      load()
    } catch (err: any) {
      showToast({ type: 'error', title: err.message || 'حدث خطأ' })
    }
  }

  const handleOpenCreate = () => {
    setEditingReservation(undefined)
    setModalOpen(true)
  }

  const handleOpenEdit = (res: Reservation) => {
    setEditingReservation(res)
    setModalOpen(true)
  }

  const columns: TableColumn<any>[] = [
    { key: 'id', header: 'رقم', render: (_, r: any) => `#${r.id}` },
    { key: 'skate', header: 'الاسكيت', render: (_, r: any) => `${r.skate.skateCode} (مقاس ${r.skate.size})` },
    { key: 'customer', header: 'العميل', render: (_, r: any) => `${r.customer.name} - ${r.customer.phone}` },
    { key: 'from', header: 'من', render: (_, r: any) => <span dir="ltr">{new Date(r.reservedFrom).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' })}</span> },
    { key: 'to', header: 'إلى', render: (_, r: any) => <span dir="ltr">{new Date(r.reservedUntil).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' })}</span> },
    { key: 'status', header: 'الحالة', render: (_, r: any) => <ReservationStatusBadge status={r.status} /> },
    {
      key: 'actions', header: 'الإجراءات', width: '140px', align: 'left', render: (_, res: any) => {
        const isActive = res.status === 'pending' || res.status === 'confirmed'
        return isActive ? (
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <PermissionGate permission="rentals.create">
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate(`/rentals/new?reservationId=${res.id}`)}
                title="تنفيذ الإيجار"
              >
                <Ticket size={14} aria-hidden="true" />
              </Button>
            </PermissionGate>
            <PermissionGate permission="reservations.edit">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleOpenEdit(res)}
                title="تعديل"
              >
                <Pencil size={14} aria-hidden="true" />
              </Button>
            </PermissionGate>
            <PermissionGate permission="reservations.cancel">
              <Button
                variant="danger"
                size="sm"
                onClick={() => handleCancel(res.id)}
                title="إلغاء"
              >
                <XCircle size={14} aria-hidden="true" />
              </Button>
            </PermissionGate>
          </div>
        ) : null
      }
    }
  ]

  if (loading && reservations.length === 0) return <PageLoader label="جارٍ تحميل الحجوزات" />

  return (
    <div className="page-container flex flex-col h-full">
      <div className="page-header shrink-0">
        <div className="page-header-text">
          <h1 className="page-header-title" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <Calendar size={24} aria-hidden="true" className="text-muted" />
            الحجوزات
          </h1>
          <p className="page-header-subtitle">إدارة الحجوزات</p>
        </div>

        <PermissionGate permission="reservations.create">
          <Button variant="primary" onClick={handleOpenCreate}>
            <Plus size={16} aria-hidden="true" /> حجز جديد
          </Button>
        </PermissionGate>
      </div>

      <div className="filters-row">
        <Select
          id="statusFilter"
          label=""
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="field-control"
          style={{ width: 200 }}
          options={[
            { value: 'active', label: 'نشط (معلق / مؤكد)' },
            { value: 'pending', label: 'معلق' },
            { value: 'confirmed', label: 'مؤكد' },
            { value: 'fulfilled', label: 'منفذ' },
            { value: 'cancelled', label: 'ملغي' },
            { value: 'all', label: 'جميع الحالات' },
          ]}
        />
      </div>

      {error && <Alert variant="danger" style={{ marginBottom: 'var(--space-6)' } as React.CSSProperties}>{error}</Alert>}

      {!loading && !error && (
        <DataTable
          columns={columns}
          data={reservations as any[]}
          emptyMessage="لم يتم العثور على أي حجوزات تطابق البحث."
          emptyIcon={Calendar}
        />
      )}

      {modalOpen && (
        <ReservationModal
          onClose={() => setModalOpen(false)}
          onSaved={load}
          existingReservation={editingReservation}
        />
      )}
    </div>
  )
}
