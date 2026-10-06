/**
 * KOSHK SKATE ERP — Rentals List Page
 * Phase 05 — Rental POS Core
 *
 * Paginated list of all rentals (active, returned, cancelled).
 * Entry point for the /rentals route.
 * Links to:
 *   - Rental POS (/rentals/new)
 *   - Active Rentals (/rentals/active)
 *   - Rental Detail (/rentals/:id)
 */

import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Ticket, Plus, Eye, Clock } from 'lucide-react'
import {
  Badge,
  Alert,
  PageLoader,
  Button,
  IconButton,
  Pagination,
  DataTable,
  type TableColumn,
} from '../../components/ui'
import { PermissionGate } from '../../components/PermissionGate'
import {
  rentalsService,
  type RentalDTO,
  getRentalStatusLabel,
  lifetimeStatusToBadge,
} from './rentals.service'
import { formatCurrency } from '../../utils/currency'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDateTime(isoStr: string): string {
  return new Date(isoStr).toLocaleString('ar-EG', {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function RentalsPage() {
  const navigate = useNavigate()

  const [rentals, setRentals] = useState<RentalDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [statusFilter, setStatus] = useState<string>('')

  const perPage = 20

  const load = useCallback(async (p: number, status: string) => {
    setLoading(true); setError(null)
    try {
      const params: Record<string, any> = { page: p, perPage }
      if (status) params.status = status
      const res = await rentalsService.list(params)
      setRentals(res.data ?? [])
      setTotal(res.pagination.total)
      setTotalPages(res.pagination.totalPages)
    } catch {
      setError('تعذر تحميل الإيجارات')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load(page, statusFilter) }, [load, page, statusFilter])

  const handleStatusChange = (s: string) => { setStatus(s); setPage(1) }

  const columns: TableColumn<any>[] = [
    { key: 'rentalCode', header: 'كود الإيجار', render: (_, r: any) => <span style={{ fontWeight: 'var(--font-weight-bold)' }}>{r.rentalCode}</span> },
    { key: 'customer', header: 'العميل', render: (_, r: any) => r.customer.name },
    { key: 'skate', header: 'الاسكيت', render: (_, r: any) => `${r.skate.skateCode} / ${r.skate.size}` },
    { key: 'duration', header: 'المدة', render: (_, r: any) => `${r.durationMinutes} د` },
    { key: 'amount', header: 'المبلغ', render: (_, r: any) => formatCurrency(r.rentalAmount) },
    { key: 'startedAt', header: 'البداية', render: (_, r: any) => <span dir="ltr">{formatDateTime(r.startedAt)}</span> },
    { key: 'status', header: 'الحالة', render: (_, r: any) => <Badge status={lifetimeStatusToBadge(r.status)}>{getRentalStatusLabel(r.status)}</Badge> },
    {
      key: 'actions', header: '', align: 'left', render: (_, r: any) => (
        <IconButton
          icon={Eye}
          label="عرض التفاصيل"
          onClick={() => navigate(`/rentals/${r.id}`)}
          size="sm"
          variant="ghost"
        />
      )
    },
  ]

  if (loading && rentals.length === 0) return <PageLoader label="جارٍ تحميل الإيجارات" />

  return (
    <div className="page-container">
      {/* Page header */}
      <div className="page-header">
        <div className="page-header-text">
          <h1 className="page-header-title">الإيجارات</h1>
          <p className="page-header-subtitle">{total} إيجار إجمالاً</p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <Button
            id="go-active-rentals"
            variant="secondary"
            onClick={() => navigate('/rentals/active')}
          >
            <Clock size={16} aria-hidden="true" />
            النشطة
          </Button>
          <PermissionGate permission="rentals.create">
            <Button id="new-rental-btn" variant="primary" onClick={() => navigate('/rentals/new')}>
              <Plus size={16} aria-hidden="true" />
              إيجار جديد
            </Button>
          </PermissionGate>
        </div>
      </div>

      {/* Filters row */}
      <div className="filters-row">
        <select
          id="rentals-status-filter"
          value={statusFilter}
          onChange={e => handleStatusChange(e.target.value)}
          className="field-control"
          style={{ width: '200px' }}
        >
          <option value="">جميع الحالات</option>
          <option value="active">نشط</option>
          <option value="returned">مُعاد</option>
          <option value="cancelled">ملغي</option>
        </select>
      </div>

      {error && <Alert variant="danger" style={{ marginBottom: 'var(--space-6)' } as React.CSSProperties}>{error}</Alert>}

      {!loading && !error && (
        <>
          <DataTable
            columns={columns}
            data={rentals as any}
            emptyMessage={statusFilter ? 'لا توجد إيجارات بهذه الحالة' : 'لم يتم تسجيل أي إيجار بعد'}
            emptyIcon={Ticket}
          />

          {totalPages > 1 && (
            <div style={{ marginTop: 'var(--space-4)' }}>
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={setPage}
              />
            </div>
          )}
        </>
      )}
    </div>
  )
}
