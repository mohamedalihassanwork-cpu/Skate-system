/**
 * KOSHK SKATE ERP — Active Rentals Page
 * Phase 05 — Rental POS Core
 *
 * Displays all active rentals with server-computed operational status.
 * DEC-064: Status is persisted as 'active'; display state is computed server-side.
 * DEC-066: ending_soon threshold = 5 minutes.
 *
 * Server provides: operationalStatus, remainingMinutes, expectedEndAt
 * Frontend countdown: visual only between refreshes — server timestamps are authoritative.
 */

import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { RefreshCw, Clock, Eye } from 'lucide-react'
import {
  Badge,
  Alert,
  IconButton,
  Button,
  EmptyState,
  PageLoader,
} from '../../components/ui'
import {
  rentalsService,
  type ActiveRentalDTO,
  getOperationalStatusLabel,
  operationalStatusToBadge,
} from './rentals.service'
import { formatCurrency } from '../../utils/currency'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTime(isoStr: string): string {
  return new Date(isoStr).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
}

function formatDate(isoStr: string): string {
  return new Date(isoStr).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' })
}

function formatRemaining(mins: number): string {
  if (mins <= 0) return 'منتهي'
  if (mins < 60) return `${mins} د`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m > 0 ? `${h}س ${m}د` : `${h}س`
}

import { ReturnRentalModal } from './ReturnRentalModal'
import { CreateDamageReportModal } from './CreateDamageReportModal'
import { PermissionGate } from '../../components/PermissionGate'

// ---------------------------------------------------------------------------
// Active Rental Card
// ---------------------------------------------------------------------------

interface ActiveRentalCardProps {
  rental: ActiveRentalDTO
  onViewDetail: (id: number) => void
  onReturn: (rental: ActiveRentalDTO) => void
}

function ActiveRentalCard({ rental, onViewDetail, onReturn }: ActiveRentalCardProps) {
  const badgeStatus = operationalStatusToBadge(rental.operationalStatus)
  const opLabel = getOperationalStatusLabel(rental.operationalStatus)

  return (
    <div className={`rental-card rental-card--${rental.operationalStatus}`} id={`rental-card-${rental.id}`}>
      <div className="rental-card-header">
        <div className="rental-card-code">{rental.rentalCode}</div>
        <Badge status={badgeStatus}>{opLabel}</Badge>
      </div>

      <div className="rental-card-body">
        <div className="rental-card-info-grid">
          <div className="rental-info-item">
            <span className="rental-info-label">العميل</span>
            <span className="rental-info-value">{rental.customer.name}</span>
          </div>
          <div className="rental-info-item">
            <span className="rental-info-label">الاسكيت</span>
            <span className="rental-info-value">{rental.skate.skateCode} — {rental.skate.size}</span>
          </div>
          <div className="rental-info-item">
            <span className="rental-info-label">البداية</span>
            <span className="rental-info-value" dir="ltr">{formatTime(rental.startedAt)}</span>
          </div>
          <div className="rental-info-item">
            <span className="rental-info-label">النهاية</span>
            <span className="rental-info-value" dir="ltr">{formatTime(rental.expectedEndAt)}</span>
          </div>
          <div className="rental-info-item">
            <span className="rental-info-label">المبلغ</span>
            <span className="rental-info-value">{formatCurrency(rental.rentalAmount)}</span>
          </div>
          <div className="rental-info-item">
            <span className="rental-info-label">الكاشير</span>
            <span className="rental-info-value">{rental.cashier.name}</span>
          </div>
        </div>

        {/* Remaining time — prominent display */}
        <div className={`rental-remaining rental-remaining--${rental.operationalStatus}`}>
          <Clock size={16} />
          <span>
            {rental.operationalStatus === 'overdue'
              ? 'متأخر — تجاوز الوقت المحدد'
              : `الوقت المتبقي: ${formatRemaining(rental.remainingMinutes)}`}
          </span>
        </div>
      </div>

      <div className="rental-card-footer">
        <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
          {formatDate(rental.startedAt)}
        </span>
        <div style={{ display: 'flex', gap: 8 }}>
          <PermissionGate permission="rentals.return">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onReturn(rental)}
            >
              إرجاع الاسكيت
            </Button>
          </PermissionGate>
          <IconButton
            icon={Eye}
            label="عرض التفاصيل"
            onClick={() => onViewDetail(rental.id)}
            size="sm"
            variant="ghost"
          />
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function ActiveRentalsPage() {
  const navigate = useNavigate()

  const [rentals, setRentals] = useState<ActiveRentalDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  // Return Modal State
  const [returnModalOpen, setReturnModalOpen] = useState(false)
  const [selectedRentalForReturn, setSelectedRentalForReturn] = useState<ActiveRentalDTO | null>(null)

  // Damage Report Modal State
  const [damageModalOpen, setDamageModalOpen] = useState(false)
  const [damageInspectionId, setDamageInspectionId] = useState<number | null>(null)

  const handleReturnClick = (rental: ActiveRentalDTO) => {
    setSelectedRentalForReturn(rental)
    setReturnModalOpen(true)
  }

  const handleReturnSuccess = (hasDamage?: boolean, inspectionId?: number) => {
    load(true)
    if (hasDamage && inspectionId && selectedRentalForReturn) {
      setDamageInspectionId(inspectionId)
      setDamageModalOpen(true)
    }
  }

  const load = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true)
    setError(null)
    try {
      const res = await rentalsService.getActive()
      setRentals(res.data ?? [])
      setLastUpdated(new Date())
    } catch {
      setError('تعذر تحميل الإيجارات النشطة')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => load(true), 30000)
    return () => clearInterval(interval)
  }, [load])

  const overdue = rentals.filter(r => r.operationalStatus === 'overdue')
  const endingSoon = rentals.filter(r => r.operationalStatus === 'ending_soon')
  const normal = rentals.filter(r => r.operationalStatus === 'normal')

  if (loading) return <PageLoader />

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-header-text">
          <h1 className="page-header-title">الإيجارات النشطة</h1>
          <p className="page-header-subtitle">
            {rentals.length} إيجار نشط
            {lastUpdated && (
              <span style={{ marginInlineStart: 'var(--space-2)' }}>
                — آخر تحديث {lastUpdated.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </p>
        </div>
        <Button
          variant="secondary"
          onClick={() => load(true)}
          id="active-rentals-refresh"
        >
          <RefreshCw size={16} aria-hidden="true" />
          تحديث
        </Button>
      </div>

      {error && <Alert variant="danger" style={{ marginBottom: 16 }}>{error}</Alert>}

      {rentals.length === 0 ? (
        <EmptyState
          icon={Clock}
          title="لا توجد إيجارات نشطة"
          description="لا يوجد أي إيجار نشط في الوقت الحالي"
          action={
            <Button variant="primary" size="sm" onClick={() => navigate('/rentals/new')}>
              إيجار جديد
            </Button>
          }
        />
      ) : (
        <>
          {/* Overdue section */}
          {overdue.length > 0 && (
            <div className="active-rentals-section">
              <h2 className="active-rentals-section-title active-rentals-section-title--overdue">
                متأخر ({overdue.length})
              </h2>
              <div className="rental-cards-grid">
                {overdue.map(r => (
                  <ActiveRentalCard key={r.id} rental={r} onViewDetail={id => navigate(`/rentals/${id}`)} onReturn={handleReturnClick} />
                ))}
              </div>
            </div>
          )}

          {/* Ending Soon section */}
          {endingSoon.length > 0 && (
            <div className="active-rentals-section">
              <h2 className="active-rentals-section-title active-rentals-section-title--ending-soon">
                ينتهي قريباً ({endingSoon.length})
              </h2>
              <div className="rental-cards-grid">
                {endingSoon.map(r => (
                  <ActiveRentalCard key={r.id} rental={r} onViewDetail={id => navigate(`/rentals/${id}`)} onReturn={handleReturnClick} />
                ))}
              </div>
            </div>
          )}

          {/* Normal section */}
          {normal.length > 0 && (
            <div className="active-rentals-section">
              <h2 className="active-rentals-section-title">
                عادي ({normal.length})
              </h2>
              <div className="rental-cards-grid">
                {normal.map(r => (
                  <ActiveRentalCard key={r.id} rental={r} onViewDetail={id => navigate(`/rentals/${id}`)} onReturn={handleReturnClick} />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <ReturnRentalModal
        isOpen={returnModalOpen}
        onClose={() => setReturnModalOpen(false)}
        rental={selectedRentalForReturn}
        onSuccess={handleReturnSuccess}
      />

      <CreateDamageReportModal
        isOpen={damageModalOpen}
        onClose={() => setDamageModalOpen(false)}
        rental={selectedRentalForReturn}
        inspectionId={damageInspectionId}
        onSuccess={() => load()}
      />

      <style>{`
        .active-rentals-section { margin-bottom: var(--space-6); }
        .active-rentals-section-title {
          font-size: var(--font-size-base);
          font-weight: var(--font-weight-bold);
          color: var(--color-text-primary);
          margin-bottom: var(--space-3);
          padding-bottom: var(--space-2);
          border-bottom: 2px solid var(--color-border);
        }
        .active-rentals-section-title--overdue { color: var(--color-danger-text); border-color: var(--color-danger-text); }
        .active-rentals-section-title--ending-soon { color: var(--color-warning-text); border-color: var(--color-warning-text); }
        .rental-cards-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: var(--space-4);
        }
        .rental-card {
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          overflow: hidden;
          transition: box-shadow var(--transition-fast);
        }
        .rental-card:hover { box-shadow: var(--shadow-md); }
        .rental-card--overdue { border-color: var(--color-danger-text); }
        .rental-card--ending_soon { border-color: var(--color-warning-text); }
        .rental-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: var(--space-3) var(--space-4);
          background: var(--color-surface-raised);
          border-bottom: 1px solid var(--color-border);
        }
        .rental-card-code { font-weight: var(--font-weight-bold); color: var(--color-text-primary); }
        .rental-card-body { padding: var(--space-4); }
        .rental-card-info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          margin-bottom: var(--space-3);
        }
        .rental-info-item { display: flex; flex-direction: column; gap: 2px; }
        .rental-info-label { font-size: var(--font-size-xs); color: var(--color-text-muted); }
        .rental-info-value { font-size: var(--font-size-sm); color: var(--color-text-primary); font-weight: var(--font-weight-medium); }
        .rental-remaining {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: var(--space-2) var(--space-3);
          border-radius: var(--radius-md);
          font-size: var(--font-size-sm);
          font-weight: var(--font-weight-medium);
          background: var(--color-info-bg);
          color: var(--color-info-text);
        }
        .rental-remaining--overdue { background: var(--color-danger-bg); color: var(--color-danger-text); }
        .rental-remaining--ending_soon { background: var(--color-warning-bg); color: var(--color-warning-text); }
        .rental-card-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: var(--space-2) var(--space-4);
          background: var(--color-surface-raised);
          border-top: 1px solid var(--color-border);
        }
      `}</style>
    </div>
  )
}
