/**
 * KOSHK SKATE ERP — Active Rentals Page
 * Phase 06 Redesign — Multi-Skate Rentals
 *
 * Displays all active rentals with per-item operational status.
 * Each Rental card shows its items as individual rows with their own
 * remaining time and operational status (normal / ending_soon / overdue).
 *
 * Partial return: "Return" button per item, not per rental.
 * When the last item is returned → FinalizeRentalModal opens automatically.
 */

import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { RefreshCw, Clock, Eye, ChevronDown, ChevronUp } from 'lucide-react'
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
  type RentalItemDTO,
  type RentalDTO,
  getOperationalStatusLabel,
  operationalStatusToBadge,
} from './rentals.service'
import { ReturnRentalModal } from './ReturnRentalModal'
import { FinalizeRentalModal } from './FinalizeRentalModal'
import { CreateDamageReportModal } from './CreateDamageReportModal'
import { PermissionGate } from '../../components/PermissionGate'
import { formatTime } from '../../utils/date'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------


function formatRemaining(mins: number): string {
  if (mins <= 0) return 'منتهي'
  if (mins < 60) return `${mins} د`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m > 0 ? `${h}س ${m}د` : `${h}س`
}

// ---------------------------------------------------------------------------
// Rental Item Row (inside a card)
// ---------------------------------------------------------------------------

interface ItemRowProps {
  item: RentalItemDTO
  onReturn: (item: RentalItemDTO) => void
}

function RentalItemRow({ item, onReturn }: ItemRowProps) {
  const opStatus = item.operationalStatus ?? 'normal'
  const badgeStatus = operationalStatusToBadge(opStatus)
  const opLabel = getOperationalStatusLabel(opStatus)

  return (
    <div className="active-rental-item" style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '8px 12px',
      background: opStatus === 'overdue' ? 'var(--color-danger-bg)' : opStatus === 'ending_soon' ? 'var(--color-warning-bg)' : 'var(--color-surface-raised)',
      borderRadius: 'var(--radius-md)',
      border: `1px solid ${opStatus === 'overdue' ? 'var(--color-danger-border, #f5c6cb)' : opStatus === 'ending_soon' ? 'var(--color-warning-border, #ffeaa7)' : 'var(--color-border)'}`,
      gap: 8,
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{ fontWeight: 'var(--font-weight-bold)', fontSize: 'var(--font-size-sm)' }}>
          {item.skate.skateCode}
        </span>
        <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
          مقاس {item.skate.size} — {formatTime(item.expectedEndAt)}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ textAlign: 'center' }}>
          <Badge status={badgeStatus}>{opLabel}</Badge>
          {item.remainingMinutes !== undefined && opStatus !== 'overdue' && (
            <div style={{ fontSize: 'var(--font-size-xs)', color: 'inherit', marginTop: 2 }}>
              {formatRemaining(item.remainingMinutes)}
            </div>
          )}
          {opStatus === 'overdue' && (
            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-danger-text)', marginTop: 2 }}>
              تجاوز الوقت
            </div>
          )}
        </div>
        <PermissionGate permission="rentals.return">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onReturn(item)}
            style={{ whiteSpace: 'nowrap' }}
          >
            إرجاع
          </Button>
        </PermissionGate>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Active Rental Card
// ---------------------------------------------------------------------------

interface ActiveRentalCardProps {
  rental: ActiveRentalDTO
  onViewDetail: (id: number) => void
  onReturnItem: (item: RentalItemDTO) => void
}

function ActiveRentalCard({ rental, onViewDetail, onReturnItem }: ActiveRentalCardProps) {
  const [expanded, setExpanded] = useState(true)
  const activeItems = rental.items.filter(i => i.status === 'active')

  // Card-level badge — worst status among active items
  const hasOverdue = rental.hasOverdueItems
  const hasEndingSoon = rental.hasEndingSoonItems
  const cardStatus = hasOverdue ? 'overdue' : hasEndingSoon ? 'ending_soon' : 'normal'
  const badgeStatus = operationalStatusToBadge(cardStatus)

  return (
    <div className={`rental-card rental-card--${cardStatus}`} id={`rental-card-${rental.id}`}>
      <div className="rental-card-header">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span className="rental-card-code">{rental.rentalCode}</span>
          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
            {rental.customer.name}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Badge status={badgeStatus}>
            {hasOverdue ? 'متأخر' : hasEndingSoon ? 'ينتهي قريباً' : 'عادي'}
          </Badge>
          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', padding: '2px 6px' }}>
            {activeItems.length} نشط
          </span>
          <button type="button" aria-label={expanded ? 'طي الاسكيتات' : 'عرض الاسكيتات'} aria-expanded={expanded} onClick={() => setExpanded(e => !e)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)', padding: 2 }}>
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {expanded && (
        <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginBottom: 4 }}>
            <Clock size={12} style={{ display: 'inline', marginInlineEnd: 4 }} />
            بدأ {formatTime(rental.startedAt)} — {rental.cashier.name}
          </div>
          {activeItems.map(item => (
            <RentalItemRow key={item.id} item={item} onReturn={onReturnItem} />
          ))}
        </div>
      )}

      <div className="rental-card-footer">
        <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
          {rental.items.length} اسكيت إجمالاً
        </span>
        <IconButton
          icon={Eye}
          label="عرض التفاصيل"
          onClick={() => onViewDetail(rental.id)}
          size="sm"
          variant="ghost"
        />
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

  // Return Item Modal
  const [returnModalOpen, setReturnModalOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<RentalItemDTO | null>(null)

  // Finalize Modal (shown when last item returned)
  const [finalizeModalOpen, setFinalizeModalOpen] = useState(false)
  const [rentalToFinalize, setRentalToFinalize] = useState<RentalDTO | null>(null)

  // Damage Modal
  const [damageModalOpen, setDamageModalOpen] = useState(false)
  const [damageInspectionId, setDamageInspectionId] = useState<number | null>(null)
  const [damageRental, setDamageRental] = useState<ActiveRentalDTO | null>(null)

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

  const handleReturnClick = (item: RentalItemDTO) => {
    setSelectedItem(item)
    setReturnModalOpen(true)
  }

  const handleReturnSuccess = async (result: {
    isLastItem: boolean
    rentalId: number
    inspectionId: number
    hasDamage: boolean
  }) => {
    // Always reload the list
    await load(true)

    // If damage, open damage modal
    if (result.hasDamage && result.inspectionId) {
      const rental = rentals.find(r => r.id === result.rentalId)
      if (rental) {
        setDamageRental(rental)
        setDamageInspectionId(result.inspectionId)
        setDamageModalOpen(true)
      }
    }

    // If last item, open finalize modal
    if (result.isLastItem) {
      try {
        const rentalRes = await rentalsService.get(result.rentalId)
        setRentalToFinalize(rentalRes.data)
        setFinalizeModalOpen(true)
      } catch {
        // Still show a reload — user can finalize from detail page
        load(true)
      }
    }
  }

  const handleFinalizeSuccess = (rental: RentalDTO) => {
    setFinalizeModalOpen(false)
    setRentalToFinalize(null)
    load(true)
    navigate(`/rentals/${rental.id}`)
  }

  const overdue      = rentals.filter(r => r.hasOverdueItems)
  const endingSoon   = rentals.filter(r => !r.hasOverdueItems && r.hasEndingSoonItems)
  const normal       = rentals.filter(r => !r.hasOverdueItems && !r.hasEndingSoonItems)

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
        <Button variant="secondary" onClick={() => load(true)} id="active-rentals-refresh">
          <RefreshCw size={16} aria-hidden="true" /> تحديث
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
          {overdue.length > 0 && (
            <div className="active-rentals-section">
              <h2 className="active-rentals-section-title active-rentals-section-title--overdue">
                متأخر ({overdue.length})
              </h2>
              <div className="rental-cards-grid">
                {overdue.map(r => (
                  <ActiveRentalCard key={r.id} rental={r} onViewDetail={id => navigate(`/rentals/${id}`)} onReturnItem={handleReturnClick} />
                ))}
              </div>
            </div>
          )}

          {endingSoon.length > 0 && (
            <div className="active-rentals-section">
              <h2 className="active-rentals-section-title active-rentals-section-title--ending-soon">
                ينتهي قريباً ({endingSoon.length})
              </h2>
              <div className="rental-cards-grid">
                {endingSoon.map(r => (
                  <ActiveRentalCard key={r.id} rental={r} onViewDetail={id => navigate(`/rentals/${id}`)} onReturnItem={handleReturnClick} />
                ))}
              </div>
            </div>
          )}

          {normal.length > 0 && (
            <div className="active-rentals-section">
              <h2 className="active-rentals-section-title">عادي ({normal.length})</h2>
              <div className="rental-cards-grid">
                {normal.map(r => (
                  <ActiveRentalCard key={r.id} rental={r} onViewDetail={id => navigate(`/rentals/${id}`)} onReturnItem={handleReturnClick} />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <ReturnRentalModal
        isOpen={returnModalOpen}
        onClose={() => { setReturnModalOpen(false); setSelectedItem(null) }}
        item={selectedItem}
        onSuccess={handleReturnSuccess}
      />

      <FinalizeRentalModal
        isOpen={finalizeModalOpen}
        onClose={() => setFinalizeModalOpen(false)}
        rental={rentalToFinalize}
        onSuccess={handleFinalizeSuccess}
      />

      <CreateDamageReportModal
        isOpen={damageModalOpen}
        onClose={() => setDamageModalOpen(false)}
        rental={damageRental as any}
        inspectionId={damageInspectionId}
        onSuccess={() => load()}
      />

      <style>{`
        .active-rentals-section { margin-bottom: var(--space-6); }
        .active-rentals-section-title {
          font-size: var(--font-size-base); font-weight: var(--font-weight-bold);
          color: var(--color-text-primary); margin-bottom: var(--space-3);
          padding-bottom: var(--space-2); border-bottom: 2px solid var(--color-border);
        }
        .active-rentals-section-title--overdue { color: var(--color-danger-text); border-color: var(--color-danger-text); }
        .active-rentals-section-title--ending-soon { color: var(--color-warning-text); border-color: var(--color-warning-text); }
        .rental-cards-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: var(--space-4); }
        .rental-card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); overflow: hidden; transition: box-shadow var(--transition-fast); }
        .rental-card:hover { box-shadow: var(--shadow-md); }
        .rental-card--overdue { border-color: var(--color-danger-text); }
        .rental-card--ending_soon { border-color: var(--color-warning-text); }
        .rental-card-header { display: flex; justify-content: space-between; align-items: center; padding: var(--space-3) var(--space-4); background: var(--color-surface-raised); border-bottom: 1px solid var(--color-border); }
        .rental-card-code { font-weight: var(--font-weight-bold); color: var(--color-text-primary); }
        .rental-card-footer { display: flex; justify-content: space-between; align-items: center; padding: var(--space-2) var(--space-4); background: var(--color-surface-raised); border-top: 1px solid var(--color-border); }
        @media screen and (min-width: 1024px) {
          .rental-card .rental-card-header { align-items: flex-start; gap: var(--space-3); }
          .rental-card-header > div:first-child { min-width: 0; overflow-wrap: anywhere; }
          .rental-card-header > div:last-child { flex-shrink: 0; justify-content: flex-end; }
          .rental-card .active-rental-item { flex-wrap: wrap; }
          .active-rental-item > div:first-child { min-width: 0; overflow-wrap: anywhere; }
          .active-rental-item > div:last-child { margin-inline-start: auto; }
          .rental-card-header button { min-width: var(--space-8); min-height: var(--space-8); }
        }
      `}</style>
    </div>
  )
}
