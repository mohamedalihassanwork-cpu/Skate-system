/**
 * KOSHK SKATE ERP — Rental Detail Page
 * Phase 06 Redesign — Multi-Skate Rentals
 *
 * Read-only Rental detail view showing:
 *   - Rental summary (code, status, customer, cashier)
 *   - Per-item breakdown (skate, duration, actual amount, status)
 *   - Final invoice section (when completed)
 *   - Actions: Return item / Extend item / Finalize (when all items returned)
 */

import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowRight, Receipt, CheckCircle, RefreshCw } from 'lucide-react'
import {
  Badge,
  Alert,
  PageLoader,
  Button,
} from '../../components/ui'
import { PermissionGate } from '../../components/PermissionGate'
import { ReturnRentalModal } from './ReturnRentalModal'
import { FinalizeRentalModal } from './FinalizeRentalModal'
import { CreateDamageReportModal } from './CreateDamageReportModal'
import {
  rentalsService,
  rentalItemsService,
  type RentalDTO,
  type RentalItemDTO,
  getRentalStatusLabel,
  lifetimeStatusToBadge,
  getOperationalStatusLabel,
  operationalStatusToBadge,
  getItemStatusLabel,
} from './rentals.service'
import { formatCurrency } from '../../utils/currency'
import { formatDateTimeAr } from '../../utils/date'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// formatDateTime uses formatDateTimeAr from shared utils/date
const formatDateTime = formatDateTimeAr


function InfoRow({ label, value, dir = 'rtl', highlight }: {
  label: string
  value: React.ReactNode
  dir?: 'rtl' | 'ltr'
  highlight?: boolean
}) {
  return (
    <div className={`detail-row ${highlight ? 'detail-row--highlight' : ''}`}>
      <dt className="detail-label">{label}</dt>
      <dd className="detail-value" dir={dir}>{value}</dd>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Rental Item Card (one per skate in the rental)
// ---------------------------------------------------------------------------

interface ItemCardProps {
  item: RentalItemDTO
  isRentalActive: boolean
  onReturn: (item: RentalItemDTO) => void
  onExtend: (item: RentalItemDTO) => void
}

function RentalItemCard({ item, isRentalActive, onReturn, onExtend }: ItemCardProps) {
  const opStatus = item.operationalStatus
  const isActive = item.status === 'active'

  return (
    <div style={{
      background: 'var(--color-surface)',
      border: `1px solid ${opStatus === 'overdue' ? 'var(--color-danger-text)' : opStatus === 'ending_soon' ? 'var(--color-warning-text)' : 'var(--color-border)'}`,
      borderRadius: 'var(--radius-md)',
      overflow: 'hidden',
    }}>
      {/* Item header */}
      <div className="rental-item-header" style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '10px 14px',
        background: 'var(--color-surface-raised)',
        borderBottom: '1px solid var(--color-border)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontWeight: 'var(--font-weight-bold)' }}>{item.skate.skateCode}</span>
          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>مقاس {item.skate.size}</span>
          {item.skate.type && <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>{item.skate.type}</span>}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {isActive && opStatus && (
            <Badge status={operationalStatusToBadge(opStatus)}>{getOperationalStatusLabel(opStatus)}</Badge>
          )}
          {!isActive && (
            <Badge status={item.status === 'returned' ? 'completed' : 'cancelled'}>{getItemStatusLabel(item.status)}</Badge>
          )}
        </div>
      </div>

      {/* Item body */}
      <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px' }}>
          <div>
            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>بداية</div>
            <div style={{ fontSize: 'var(--font-size-sm)', direction: 'ltr' }}>{formatDateTime(item.startedAt)}</div>
          </div>
          <div>
            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>نهاية متوقعة</div>
            <div style={{ fontSize: 'var(--font-size-sm)', direction: 'ltr' }}>{formatDateTime(item.expectedEndAt)}</div>
          </div>
          {item.returnedAt && (
            <div>
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>تاريخ الإعادة</div>
              <div style={{ fontSize: 'var(--font-size-sm)', direction: 'ltr' }}>{formatDateTime(item.returnedAt)}</div>
            </div>
          )}
          {item.actualDurationMinutes != null && (
            <div>
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>المدة الفعلية</div>
              <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)' }}>{item.actualDurationMinutes} دقيقة</div>
            </div>
          )}
          <div>
            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>المدة المتوقعة</div>
            <div style={{ fontSize: 'var(--font-size-sm)' }}>{item.expectedDurationMinutes} دقيقة</div>
          </div>
          <div>
            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>السعر/ساعة</div>
            <div style={{ fontSize: 'var(--font-size-sm)' }}>{formatCurrency(item.pricePerHour)}</div>
          </div>
        </div>

        {/* Amount */}
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--color-border-subtle)',
        }}>
          <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
            {item.actualAmount != null ? 'المبلغ الفعلي' : 'تقدير المبلغ'}
          </span>
          <span style={{ fontWeight: 'var(--font-weight-bold)', color: 'var(--color-primary)' }}>
            {item.actualAmount != null
              ? formatCurrency(item.actualAmount)
              : formatCurrency(Math.round(item.pricePerHour * item.expectedDurationMinutes / 60))
            }
          </span>
        </div>

        {/* Actions for active items */}
        {isActive && isRentalActive && (
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <PermissionGate permission="rentals.return">
              <Button variant="primary" size="sm" onClick={() => onReturn(item)}>
                إرجاع
              </Button>
            </PermissionGate>
            <PermissionGate permission="rentals.create">
              <Button variant="secondary" size="sm" onClick={() => onExtend(item)}>
                تمديد
              </Button>
            </PermissionGate>
          </div>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Extend Item Mini-Modal (inline, no separate file needed)
// ---------------------------------------------------------------------------

function ExtendItemInline({ item, onDone, onCancel }: { item: RentalItemDTO; onDone: () => void; onCancel: () => void }) {
  const [minutes, setMinutes] = useState('30')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    const mins = parseInt(minutes, 10)
    if (!mins || mins <= 0) { setError('مدة التمديد يجب أن تكون أكبر من صفر'); return }
    setLoading(true); setError(null)
    try {
      await rentalItemsService.extend(item.id, { extendByMinutes: mins })
      onDone()
    } catch (err: any) {
      setError(err?.response?.data?.error?.message ?? 'تعذر التمديد')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ background: 'var(--color-surface-raised)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '12px 16px', marginTop: 8 }}>
      <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', marginBottom: 8 }}>
        تمديد اسكيت {item.skate.skateCode}
      </div>
      {error && <Alert variant="danger" style={{ marginBottom: 8 }}>{error}</Alert>}
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
        <div>
          <label style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>
            مدة التمديد (دقائق)
          </label>
          <input
            type="number"
            min={1}
            value={minutes}
            onChange={e => setMinutes(e.target.value)}
            style={{ width: 90, padding: '6px 10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', fontFamily: 'var(--font-family)', fontSize: 'var(--font-size-sm)' }}
          />
        </div>
        <Button variant="primary" size="sm" loading={loading} onClick={handleSubmit}>تأكيد</Button>
        <Button variant="ghost" size="sm" onClick={onCancel} disabled={loading}>إلغاء</Button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function RentalDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [rental, setRental] = useState<RentalDTO | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Modals
  const [returnModalOpen, setReturnModalOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<RentalItemDTO | null>(null)
  const [extendingItem, setExtendingItem] = useState<RentalItemDTO | null>(null)
  const [finalizeModalOpen, setFinalizeModalOpen] = useState(false)
  const [damageModalOpen, setDamageModalOpen] = useState(false)
  const [damageInspectionId, setDamageInspectionId] = useState<number | null>(null)

  const fetchRental = useCallback((isRefresh = false) => {
    const numId = parseInt(id ?? '', 10)
    if (!numId) { setError('معرّف الإيجار غير صالح'); setLoading(false); return }
    if (!isRefresh) setLoading(true)
    rentalsService.get(numId)
      .then(res => setRental(res.data))
      .catch(() => setError('الإيجار غير موجود'))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => { fetchRental() }, [fetchRental])

  const handleReturnSuccess = async (result: {
    isLastItem: boolean
    rentalId: number
    inspectionId: number
    hasDamage: boolean
  }) => {
    fetchRental(true)
    if (result.hasDamage && result.inspectionId) {
      setDamageInspectionId(result.inspectionId)
      setDamageModalOpen(true)
    }
    if (result.isLastItem) {
      // Reload then open finalize
      setTimeout(() => {
        rentalsService.get(result.rentalId)
          .then(res => { setRental(res.data); setFinalizeModalOpen(true) })
          .catch(() => {})
      }, 300)
    }
  }

  if (loading) return <PageLoader />
  if (error || !rental) return (
    <div className="page-container">
      <Alert variant="danger">{error ?? 'تعذر تحميل الإيجار'}</Alert>
      <Button variant="ghost" onClick={() => navigate('/rentals')} style={{ marginTop: 16 }}>
        <ArrowRight size={16} /> العودة للقائمة
      </Button>
    </div>
  )

  const isActive = rental.status === 'active'
  const isCompleted = rental.status === 'completed' || rental.status === 'returned'
  const activeItems = rental.items.filter(i => i.status === 'active')
  const allItemsReturned = activeItems.length === 0 && isActive

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-text" style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-4)' }}>
          <Button id="back-to-rentals" variant="ghost" onClick={() => navigate(-1)} style={{ padding: 'var(--space-2)', marginTop: 'var(--space-1)' }}>
            <ArrowRight size={20} aria-hidden="true" />
          </Button>
          <div>
            <h1 className="page-header-title" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <Receipt size={24} aria-hidden="true" className="text-muted" />
              {rental.rentalCode}
            </h1>
            <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-2)', flexWrap: 'wrap' }}>
              <Badge status={lifetimeStatusToBadge(rental.status)}>{getRentalStatusLabel(rental.status)}</Badge>
              {isActive && (
                <Badge status={rental.items.some(i => i.operationalStatus === 'overdue') ? 'overdue' : rental.items.some(i => i.operationalStatus === 'ending_soon') ? 'rented' : 'active'}>
                  {rental.items.filter(i => i.status === 'active').length} اسكيت نشط
                </Badge>
              )}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="ghost" size="sm" onClick={() => fetchRental(true)}>
            <RefreshCw size={16} />
          </Button>
          {/* Finalize button when all items are returned but rental still active */}
          {allItemsReturned && (
            <PermissionGate permission="rentals.return">
              <Button variant="primary" onClick={() => setFinalizeModalOpen(true)}>
                <CheckCircle size={16} /> إتمام الإيجار وتحصيل الدفع
              </Button>
            </PermissionGate>
          )}
        </div>
      </div>

      {/* Final invoice (completed rentals) */}
      {isCompleted && (
        <div className="invoice-section">
          <h2 className="invoice-title">
            <Receipt size={18} />
            {rental.invoiceNumber ? `فاتورة: ${rental.invoiceNumber}` : 'ملخص الإيجار'}
          </h2>
          <div className="invoice-body">
            {rental.items.filter(i => i.status === 'returned').map(item => (
              <div key={item.id} className="invoice-row">
                <span className="invoice-label">{item.skate.skateCode} — {item.actualDurationMinutes} دقيقة</span>
                <span className="invoice-amount">{formatCurrency(item.actualAmount ?? 0)}</span>
              </div>
            ))}
            <div className="invoice-row invoice-row--total">
              <span className="invoice-label">الإجمالي</span>
              <span className="invoice-amount">{formatCurrency(rental.totalAmount ?? 0)}</span>
            </div>
            {rental.completedAt && (
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', textAlign: 'left', marginTop: 8 }}>
                اكتمل في: {formatDateTime(rental.completedAt)}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Detail grid */}
      <div className="detail-grid">

        {/* Rental summary */}
        <section className="detail-section">
          <h2 className="detail-section-title">بيانات الإيجار</h2>
          <dl className="detail-list">
            <InfoRow label="كود الإيجار" value={rental.rentalCode} />
            <InfoRow label="بداية الإيجار" value={formatDateTime(rental.startedAt)} dir="ltr" />
            {rental.completedAt && <InfoRow label="تاريخ الإتمام" value={formatDateTime(rental.completedAt)} dir="ltr" />}
            {rental.totalAmount != null && (
              <InfoRow label="الإجمالي الفعلي" value={<strong style={{ color: 'var(--color-primary)' }}>{formatCurrency(rental.totalAmount)}</strong>} highlight />
            )}
            {rental.notes && <InfoRow label="الملاحظات" value={rental.notes} />}
          </dl>
        </section>

        {/* Customer */}
        <section className="detail-section">
          <h2 className="detail-section-title">بيانات العميل</h2>
          <dl className="detail-list">
            <InfoRow label="الاسم" value={rental.customer.name} />
            <InfoRow label="الهاتف" value={rental.customer.phone} dir="ltr" />
            <InfoRow label="الرقم القومي" value={rental.customer.nationalIdMasked} dir="ltr" />
          </dl>
          <button
            id="view-customer-profile"
            type="button"
            onClick={() => navigate(`/customers/${rental.customer.id}`)}
            style={{ marginTop: 8, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-primary)', fontSize: 'var(--font-size-sm)' }}
          >
            عرض ملف العميل ←
          </button>
        </section>

        {/* Cashier */}
        <section className="detail-section">
          <h2 className="detail-section-title">الكاشير</h2>
          <dl className="detail-list">
            <InfoRow label="الاسم" value={rental.cashier.name} />
          </dl>
        </section>
      </div>

      {/* Items section */}
      <div style={{ marginTop: 'var(--space-6)' }}>
        <h2 style={{ fontSize: 'var(--font-size-base)', fontWeight: 'var(--font-weight-bold)', marginBottom: 'var(--space-3)' }}>
          الاسكيتات ({rental.items.length})
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 'var(--space-3)' }}>
          {rental.items.map(item => (
            <div key={item.id}>
              <RentalItemCard
                item={item}
                isRentalActive={isActive}
                onReturn={i => { setSelectedItem(i); setReturnModalOpen(true) }}
                onExtend={i => setExtendingItem(i)}
              />
              {extendingItem?.id === item.id && (
                <ExtendItemInline
                  item={item}
                  onDone={() => { setExtendingItem(null); fetchRental(true) }}
                  onCancel={() => setExtendingItem(null)}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Modals */}
      <ReturnRentalModal
        isOpen={returnModalOpen}
        onClose={() => { setReturnModalOpen(false); setSelectedItem(null) }}
        item={selectedItem}
        onSuccess={handleReturnSuccess}
      />

      <FinalizeRentalModal
        isOpen={finalizeModalOpen}
        onClose={() => setFinalizeModalOpen(false)}
        rental={rental}
        onSuccess={updatedRental => {
          setRental(updatedRental)
          setFinalizeModalOpen(false)
        }}
      />

      <CreateDamageReportModal
        isOpen={damageModalOpen}
        onClose={() => setDamageModalOpen(false)}
        rental={rental as any}
        inspectionId={damageInspectionId}
        onSuccess={() => fetchRental()}
      />

      <style>{`
        .remaining-banner {
          display: flex; align-items: center; gap: 10px;
          padding: 14px 20px; border-radius: var(--radius-md);
          font-size: var(--font-size-base); font-weight: var(--font-weight-bold);
          margin-bottom: var(--space-5);
          background: var(--color-info-bg); color: var(--color-info-text);
        }
        .remaining-banner--overdue { background: var(--color-danger-bg); color: var(--color-danger-text); }
        .remaining-banner--ending_soon { background: var(--color-warning-bg); color: var(--color-warning-text); }
        .detail-grid {
          display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: var(--space-4);
        }
        .detail-section {
          background: var(--color-surface); border: 1px solid var(--color-border);
          border-radius: var(--radius-lg); padding: var(--space-5);
        }
        .detail-section-title {
          font-size: var(--font-size-sm); font-weight: var(--font-weight-bold);
          color: var(--color-text-secondary); text-transform: uppercase;
          letter-spacing: 0.05em; margin: 0 0 var(--space-4);
          padding-bottom: var(--space-2); border-bottom: 1px solid var(--color-border);
        }
        .detail-list { margin: 0; padding: 0; display: flex; flex-direction: column; }
        .detail-row {
          display: flex; justify-content: space-between; align-items: flex-start;
          gap: 12px; padding: 8px 0; border-bottom: 1px solid var(--color-border-subtle);
        }
        .detail-row:last-child { border-bottom: none; }
        .detail-row--highlight { background: var(--color-primary-subtle); margin: 0 -4px; padding: 8px 4px; border-radius: var(--radius-sm); }
        .detail-label { font-size: var(--font-size-sm); color: var(--color-text-secondary); white-space: nowrap; }
        .detail-value { font-size: var(--font-size-sm); color: var(--color-text-primary); font-weight: var(--font-weight-medium); text-align: left; }
        .invoice-section {
          background: var(--color-surface); border: 2px dashed var(--color-border);
          border-radius: var(--radius-lg); padding: var(--space-5); margin-bottom: var(--space-6);
        }
        .invoice-title {
          display: flex; align-items: center; gap: 8px;
          font-size: var(--font-size-lg); font-weight: var(--font-weight-bold);
          color: var(--color-text-primary); margin: 0 0 var(--space-4);
          padding-bottom: var(--space-3); border-bottom: 2px solid var(--color-border);
        }
        .invoice-body { display: flex; flex-direction: column; gap: 12px; }
        .invoice-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; }
        .invoice-row--total {
          border-top: 2px solid var(--color-border-subtle); padding-top: 16px;
          margin-top: 4px; font-size: var(--font-size-lg); font-weight: var(--font-weight-bold);
        }
        .invoice-label { font-weight: var(--font-weight-medium); }
        .invoice-amount { font-family: var(--font-family-mono); font-weight: var(--font-weight-bold); }
        @media screen and (min-width: 1024px) {
          .detail-section .detail-section-title { text-transform: none; letter-spacing: normal; }
          .detail-section .detail-value { min-width: 0; overflow-wrap: anywhere; }
          .detail-section .detail-value[dir="rtl"] { text-align: right; }
          .rental-item-header { flex-wrap: wrap; gap: var(--space-2); }
          .rental-item-header > div { min-width: 0; flex-wrap: wrap; overflow-wrap: anywhere; }
          .invoice-section .invoice-row { gap: var(--space-4); }
          .invoice-section .invoice-label { min-width: 0; overflow-wrap: anywhere; }
          .invoice-section .invoice-amount { flex-shrink: 0; font-variant-numeric: tabular-nums; }
        }
      `}</style>
    </div>
  )
}
