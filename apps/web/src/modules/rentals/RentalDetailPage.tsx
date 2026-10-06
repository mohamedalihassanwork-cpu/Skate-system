/**
 * KOSHK SKATE ERP — Rental Detail Page
 * Phase 05 — Rental POS Core
 *
 * Read-only rental detail view.
 * No Return, Damage, Payment, or Waiver controls in Phase 05.
 * DEC-060: Payment deferred to Phase 06.
 * Phase 07 will add return controls.
 */

import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowRight, Clock, Receipt } from 'lucide-react'
import {
  Badge,
  Alert,
  PageLoader,
  Button,
} from '../../components/ui'
import { PermissionGate } from '../../components/PermissionGate'
import { ReturnRentalModal } from './ReturnRentalModal'
import { CreateDamageReportModal } from './CreateDamageReportModal'
import {
  rentalsService,
  type RentalDTO,
  type ActiveRentalDTO,
  getRentalStatusLabel,
  lifetimeStatusToBadge,
  getOperationalStatusLabel,
  operationalStatusToBadge,
  type RentalOperationalStatus,
} from './rentals.service'
import { formatCurrency } from '../../utils/currency'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDateTime(isoStr: string): string {
  return new Date(isoStr).toLocaleString('ar-EG', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function computeOperational(expectedEndAt: string): { opStatus: RentalOperationalStatus; remainingMinutes: number } {
  const endMs = new Date(expectedEndAt).getTime()
  const nowMs = Date.now()
  const diffMs = endMs - nowMs
  const diffMin = diffMs / 60000

  if (diffMin <= 0) return { opStatus: 'overdue', remainingMinutes: 0 }
  const remaining = Math.ceil(diffMin)
  if (remaining <= 5) return { opStatus: 'ending_soon', remainingMinutes: remaining }
  return { opStatus: 'normal', remainingMinutes: remaining }
}

function formatRemaining(mins: number, opStatus: RentalOperationalStatus): string {
  if (opStatus === 'overdue') return 'متأخر'
  if (mins < 60) return `${mins} دقيقة`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m > 0 ? `${h}س ${m}د` : `${h} ساعة`
}

// ---------------------------------------------------------------------------
// Info Row component
// ---------------------------------------------------------------------------

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
// Main Page
// ---------------------------------------------------------------------------

export default function RentalDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [rental, setRental] = useState<RentalDTO | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Modals state
  const [returnModalOpen, setReturnModalOpen] = useState(false)
  const [damageModalOpen, setDamageModalOpen] = useState(false)
  const [damageInspectionId, setDamageInspectionId] = useState<number | null>(null)

  const fetchRental = (isRefresh = false) => {
    const numId = parseInt(id ?? '', 10)
    if (!numId) { setError('معرّف الإيجار غير صالح'); setLoading(false); return }

    if (!isRefresh) setLoading(true)

    rentalsService.get(numId)
      .then(res => setRental(res.data))
      .catch(() => setError('الإيجار غير موجود'))
      .finally(() => { setLoading(false) })
  }

  useEffect(() => {
    fetchRental()
  }, [id])

  const handleReturnSuccess = (hasDamage?: boolean, inspectionId?: number) => {
    fetchRental(true)
    if (hasDamage && inspectionId) {
      setDamageInspectionId(inspectionId)
      setDamageModalOpen(true)
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
  const { opStatus, remainingMinutes } = isActive ? computeOperational(rental.expectedEndAt) : { opStatus: 'normal' as const, remainingMinutes: 0 }

  const activeRentalDTO: ActiveRentalDTO | null = isActive ? {
    ...rental,
    operationalStatus: opStatus,
    remainingMinutes: remainingMinutes
  } : null

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-text" style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-4)' }}>
          <Button
            id="back-to-rentals"
            variant="ghost"
            onClick={() => navigate(-1)}
            style={{ padding: 'var(--space-2)', marginTop: 'var(--space-1)' }}
          >
            <ArrowRight size={20} aria-hidden="true" />
          </Button>
          <div>
            <h1 className="page-header-title" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <Receipt size={24} aria-hidden="true" className="text-muted" />
              {rental.rentalCode}
            </h1>
            <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
              <Badge status={lifetimeStatusToBadge(rental.status)}>
                {getRentalStatusLabel(rental.status)}
              </Badge>
              {isActive && (
                <Badge status={operationalStatusToBadge(opStatus)}>
                  {getOperationalStatusLabel(opStatus)}
                </Badge>
              )}
            </div>
          </div>
        </div>
        {isActive && (
          <PermissionGate permission="rentals.return">
            <Button
              variant="primary"
              onClick={() => setReturnModalOpen(true)}
            >
              إرجاع الاسكيت
            </Button>
          </PermissionGate>
        )}
      </div>

      {/* Remaining time banner — active rentals only */}
      {isActive && (
        <div className={`remaining-banner remaining-banner--${opStatus}`} id="remaining-time-banner">
          <Clock size={18} />
          <span>
            {opStatus === 'overdue'
              ? 'تجاوز الإيجار الوقت المحدد'
              : `الوقت المتبقي: ${formatRemaining(remainingMinutes, opStatus)}`}
          </span>
        </div>
      )}

      {/* Return Invoice (Returned Rentals Only) */}
      {rental.status === 'returned' && (
        <div className="invoice-section">
          <h2 className="invoice-title"><Receipt size={18} /> إيصال / فاتورة إرجاع</h2>

          <div className="invoice-body">
            {/* Base Amount */}
            <div className="invoice-row">
              <span className="invoice-label">المبلغ الأساسي للإيجار</span>
              <span className="invoice-amount">{formatCurrency(rental.rentalAmount)}</span>
            </div>

            {/* Late Fee */}
            {rental.lateFeeDetails && rental.lateFeeDetails.calculatedFee > 0 && (
              <div className="invoice-row invoice-row--late">
                <div className="invoice-label-stack">
                  <span className="invoice-label">رسوم التأخير</span>
                  <span className="invoice-subtext">مدة التأخير: {rental.lateFeeDetails.lateMinutes} دقيقة</span>
                </div>
                <span className="invoice-amount">{formatCurrency(rental.lateFeeDetails.calculatedFee)}</span>
              </div>
            )}

            {/* Total */}
            <div className="invoice-row invoice-row--total">
              <span className="invoice-label">الإجمالي</span>
              <span className="invoice-amount">
                {formatCurrency(rental.rentalAmount + (rental.lateFeeDetails?.calculatedFee || 0))}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Detail sections */}
      <div className="detail-grid">

        {/* Rental info */}
        <section className="detail-section">
          <h2 className="detail-section-title">بيانات الإيجار</h2>
          <dl className="detail-list">
            <InfoRow label="كود الإيجار" value={rental.rentalCode} />
            <InfoRow label="المدة" value={`${rental.durationMinutes} دقيقة`} />
            <InfoRow label="السعر بالساعة" value={formatCurrency(rental.pricePerHour)} />
            <InfoRow label="مبلغ الإيجار" value={<strong style={{ color: 'var(--color-primary)' }}>{formatCurrency(rental.rentalAmount)}</strong>} highlight />
            <InfoRow label="بداية الإيجار" value={formatDateTime(rental.startedAt)} dir="ltr" />
            <InfoRow label="نهاية متوقعة" value={formatDateTime(rental.expectedEndAt)} dir="ltr" />
            {rental.returnedAt && <InfoRow label="تاريخ الإعادة" value={formatDateTime(rental.returnedAt)} dir="ltr" />}
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

        {/* Skate */}
        <section className="detail-section">
          <h2 className="detail-section-title">بيانات الاسكيت</h2>
          <dl className="detail-list">
            <InfoRow label="كود الاسكيت" value={rental.skate.skateCode} />
            <InfoRow label="المقاس" value={rental.skate.size} />
            {rental.skate.type && <InfoRow label="النوع" value={rental.skate.type} />}
          </dl>
        </section>

        {/* Cashier */}
        <section className="detail-section">
          <h2 className="detail-section-title">الكاشير</h2>
          <dl className="detail-list">
            <InfoRow label="الاسم" value={rental.cashier.name} />
          </dl>
        </section>

      </div>

      <ReturnRentalModal
        isOpen={returnModalOpen}
        onClose={() => setReturnModalOpen(false)}
        rental={activeRentalDTO}
        onSuccess={handleReturnSuccess}
      />

      <CreateDamageReportModal
        isOpen={damageModalOpen}
        onClose={() => setDamageModalOpen(false)}
        rental={activeRentalDTO}
        inspectionId={damageInspectionId}
        onSuccess={() => fetchRental()}
      />

      <style>{`
        .remaining-banner {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 14px 20px;
          border-radius: var(--radius-md);
          font-size: var(--font-size-base);
          font-weight: var(--font-weight-bold);
          margin-bottom: var(--space-5);
          background: var(--color-info-bg);
          color: var(--color-info-text);
        }
        .remaining-banner--overdue { background: var(--color-danger-bg); color: var(--color-danger-text); }
        .remaining-banner--ending_soon { background: var(--color-warning-bg); color: var(--color-warning-text); }
        .detail-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: var(--space-4);
        }
        .detail-section {
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          padding: var(--space-5);
        }
        .detail-section-title {
          font-size: var(--font-size-sm);
          font-weight: var(--font-weight-bold);
          color: var(--color-text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin: 0 0 var(--space-4);
          padding-bottom: var(--space-2);
          border-bottom: 1px solid var(--color-border);
        }
        .detail-list { margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0; }
        .detail-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
          padding: 8px 0;
          border-bottom: 1px solid var(--color-border-subtle);
        }
        .detail-row:last-child { border-bottom: none; }
        .detail-row--highlight { background: var(--color-primary-subtle); margin: 0 -4px; padding: 8px 4px; border-radius: var(--radius-sm); }
        .detail-label { font-size: var(--font-size-sm); color: var(--color-text-secondary); white-space: nowrap; }
        .detail-value { font-size: var(--font-size-sm); color: var(--color-text-primary); font-weight: var(--font-weight-medium); text-align: left; }
        
        .invoice-section {
          background: var(--color-surface);
          border: 2px dashed var(--color-border);
          border-radius: var(--radius-lg);
          padding: var(--space-5);
          margin-bottom: var(--space-6);
        }
        .invoice-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: var(--font-size-lg);
          font-weight: var(--font-weight-bold);
          color: var(--color-text-primary);
          margin: 0 0 var(--space-4);
          padding-bottom: var(--space-3);
          border-bottom: 2px solid var(--color-border);
        }
        .invoice-body {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .invoice-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 0;
        }
        .invoice-row--late {
          color: var(--color-danger-text);
        }
        .invoice-row--total {
          border-top: 2px solid var(--color-border-subtle);
          padding-top: 16px;
          margin-top: 4px;
          font-size: var(--font-size-lg);
          font-weight: var(--font-weight-bold);
        }
        .invoice-label {
          font-weight: var(--font-weight-medium);
        }
        .invoice-label-stack {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .invoice-subtext {
          font-size: var(--font-size-xs);
          color: var(--color-danger-text);
          opacity: 0.8;
        }
        .invoice-amount {
          font-family: var(--font-family-mono);
          font-weight: var(--font-weight-bold);
        }
      `}</style>
    </div>
  )
}
