/**
 * KOSHK SKATE ERP — Skates Management Page
 * Phase 03.5 — Skates / Asset Management
 *
 * Phase 04 Mobile UX Fix (M-001 / M-002 / M-009 / M-014 / M-020):
 *   - Removed local Field component and inputStyle object (design system compliance)
 *   - CreateSkateModal and EditSkateModal form fields now use shared Input, Select, Textarea
 *   - Filter-row <select> replaced with field-control class + dedicated .skates-filter-select
 *     layout class (removes inline width:'auto' that broke the <479px column mode fix)
 *   - All business logic, validation, IDs, and data flow preserved exactly.
 *
 * Features:
 *   - List all skates with status badges (design reference §13, §31)
 *   - Filter by status and free-text search by code / size
 *   - Create skate modal (skate_code optional — auto-generated per DEC-030)
 *   - Edit skate modal (all editable fields including qr_code, barcode per DEC-032)
 *   - Soft-disable action (DEC-009)
 *   - Arabic RTL, KOSHK SKATE design, Cairo font
 *
 * Permissions:
 *   - View: skates.view
 *   - Create: skates.create (PermissionGate)
 *   - Edit: skates.edit (PermissionGate)
 */

import { useState, useEffect, useCallback } from 'react'
import { Package, RefreshCw, Plus, Pencil } from 'lucide-react'
import {
  skatesService,
  STATUS_LABELS,
  CONDITION_LABELS,
  ADMIN_SETTABLE_STATUSES,
  type SkateDTO,
  type CreateSkateRequest,
  type UpdateSkateRequest,
  type SkateStatus,
  type SkateCondition,
} from './skates.service'
import { PermissionGate } from '../../components/PermissionGate'
import {
  Badge,
  Button,
  Alert,
  Card,
  Modal,
  EmptyState,
  PageLoader,
  SearchBar,
  Input,
  Select,
  Textarea,
  CheckboxField,
  type BadgeStatus,
} from '../../components/ui'
import { formatCurrency } from '../../utils/currency'

// ---------------------------------------------------------------------------
// Status badge — uses shared Badge with status → semantic color mapping
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: SkateStatus }) {
  // Map skate statuses to badge semantic variants
  const statusToBadge: Record<SkateStatus, BadgeStatus> = {
    available: 'available',
    rented: 'rented',
    reserved: 'reserved',
    maintenance: 'maintenance',
    damaged: 'damaged',
    lost: 'lost',
  }
  return (
    <Badge status={statusToBadge[status]}>
      {STATUS_LABELS[status]}
    </Badge>
  )
}

// ---------------------------------------------------------------------------
// Shared option arrays — used by the shared Select component
// ---------------------------------------------------------------------------

const CONDITION_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'good', label: CONDITION_LABELS.good },
  { value: 'fair', label: CONDITION_LABELS.fair },
  { value: 'poor', label: CONDITION_LABELS.poor },
]

const ADMIN_STATUS_OPTIONS: Array<{ value: string; label: string }> =
  ADMIN_SETTABLE_STATUSES.map(s => ({ value: s, label: STATUS_LABELS[s] }))

// ---------------------------------------------------------------------------
// Create Modal
// ---------------------------------------------------------------------------

function CreateSkateModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState<CreateSkateRequest>({
    size: '',
    condition: 'good',
    status: 'available',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function set(field: keyof CreateSkateRequest, value: unknown) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!form.size?.trim()) { setError('المقاس مطلوب'); return }
    setSaving(true)
    try {
      await skatesService.create({
        ...form,
        skateCode: form.skateCode?.trim() || undefined,
        type: form.type?.trim() || undefined,
        notes: form.notes?.trim() || undefined,
      })
      onCreated()
      onClose()
    } catch (e: unknown) {
      setError((e as { message?: string })?.message ?? 'حدث خطأ أثناء إضافة الاسكيت')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal isOpen onClose={onClose} title="إضافة اسكيت جديدة" size="base"
      footer={
        <>
          <Button type="submit" form="create-skate-form" variant="primary" loading={saving} id="create-skate-submit-btn">
            إضافة الاسكيت
          </Button>
          <Button type="button" variant="secondary" onClick={onClose} id="create-skate-cancel-btn">
            إلغاء
          </Button>
        </>
      }
    >
      <form id="create-skate-form" onSubmit={handleSubmit} noValidate>
        {/* M-001/M-009: replaced local Field + inputStyle + raw <input> with shared <Input> */}
        <Input
          id="create-skate-code"
          label="رمز الاسكيت (اختياري — يُولَّد تلقائياً إذا تُرك فارغاً)"
          type="text"
          placeholder="مثال: SK-025 (اتركه فارغاً للتوليد التلقائي)"
          value={form.skateCode ?? ''}
          onChange={e => set('skateCode', e.target.value)}
        />

        <Input
          id="create-skate-size"
          label="المقاس *"
          type="text"
          placeholder="مثال: 42"
          value={form.size}
          onChange={e => set('size', e.target.value)}
          required
        />

        {/* DEC-033: free-text input — no dropdown */}
        <Input
          id="create-skate-type"
          label="النوع"
          type="text"
          placeholder="نوع الاسكيت (اختياري)"
          value={form.type ?? ''}
          onChange={e => set('type', e.target.value)}
        />

        <div className="form-grid-2col">
          {/* M-001/M-009: raw <select> → shared <Select> component */}
          <Select
            id="create-skate-status"
            label="الحالة"
            options={ADMIN_STATUS_OPTIONS}
            value={form.status}
            onChange={e => set('status', e.target.value as SkateStatus)}
          />

          <Select
            id="create-skate-condition"
            label="الحالة الفنية"
            options={CONDITION_OPTIONS}
            value={form.condition}
            onChange={e => set('condition', e.target.value as SkateCondition)}
          />
        </div>

        <div className="form-grid-2col">
          <Input
            id="create-skate-purchase-date"
            label="تاريخ الشراء"
            type="date"
            value={form.purchaseDate ?? ''}
            onChange={e => set('purchaseDate', e.target.value || undefined)}
          />

          <Input
            id="create-skate-purchase-cost"
            label="تكلفة الشراء (EGP)"
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            value={form.purchaseCost ?? ''}
            onChange={e => set('purchaseCost', e.target.value ? parseFloat(e.target.value) : undefined)}
          />
        </div>

        {/* M-001/M-009: raw <textarea> → shared <Textarea> component */}
        <Textarea
          id="create-skate-notes"
          label="ملاحظات"
          placeholder="ملاحظات إضافية (اختياري)"
          value={form.notes ?? ''}
          onChange={e => set('notes', e.target.value)}
        />

        {error && <Alert variant="danger" style={{ marginBottom: 'var(--space-4)' } as React.CSSProperties}>{error}</Alert>}
      </form>
    </Modal>
  )
}

// ---------------------------------------------------------------------------
// Edit Modal
// ---------------------------------------------------------------------------

function EditSkateModal({ skate, onClose, onUpdated }: { skate: SkateDTO; onClose: () => void; onUpdated: () => void }) {
  const [form, setForm] = useState<UpdateSkateRequest>({
    size: skate.size,
    type: skate.type ?? '',
    status: skate.status,
    condition: skate.condition,
    purchaseDate: skate.purchaseDate ?? '',
    purchaseCost: skate.purchaseCost ? parseFloat(skate.purchaseCost) : undefined,
    notes: skate.notes ?? '',
    qrCode: skate.qrCode ?? '',
    barcode: skate.barcode ?? '',
    isActive: skate.isActive,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function set(field: keyof UpdateSkateRequest, value: unknown) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!form.size?.trim()) { setError('المقاس مطلوب'); return }
    setSaving(true)
    try {
      await skatesService.update(skate.id, {
        ...form,
        type: form.type?.toString().trim() || null,
        notes: form.notes?.toString().trim() || null,
        qrCode: form.qrCode?.toString().trim() || null,
        barcode: form.barcode?.toString().trim() || null,
        purchaseDate: form.purchaseDate?.toString().trim() || null,
      })
      onUpdated()
      onClose()
    } catch (e: unknown) {
      setError((e as { message?: string })?.message ?? 'حدث خطأ أثناء تحديث الاسكيت')
    } finally {
      setSaving(false)
    }
  }

  // Only show admin-settable statuses (not rented/reserved — DEC-031)
  const statusOptions: SkateStatus[] = skate.status === 'rented' || skate.status === 'reserved'
    ? [skate.status, ...ADMIN_SETTABLE_STATUSES]
    : ADMIN_SETTABLE_STATUSES

  return (
    <Modal isOpen onClose={onClose} title="تعديل الاسكيت" size="base"
      footer={
        <>
          {/* D-004: removed gold inline style — standard variant="primary" uses navy-800 */}
          <Button type="submit" form="edit-skate-form" variant="primary" loading={saving} id="edit-skate-submit-btn">
            حفظ التعديلات
          </Button>
          <Button type="button" variant="secondary" onClick={onClose} id="edit-skate-cancel-btn">
            إلغاء
          </Button>
        </>
      }
    >
      <p style={{ marginTop: 0, marginBottom: 'var(--space-4)', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>{skate.skateCode}</p>
      <form id="edit-skate-form" onSubmit={handleSubmit} noValidate>
        {/* M-001/M-009: replaced local Field + inputStyle + raw <input> with shared <Input> */}
        <Input
          id="edit-skate-size"
          label="المقاس *"
          type="text"
          value={form.size ?? ''}
          onChange={e => set('size', e.target.value)}
          required
        />

        {/* DEC-033: free-text input */}
        <Input
          id="edit-skate-type"
          label="النوع"
          type="text"
          placeholder="نوع الاسكيت"
          value={form.type ?? ''}
          onChange={e => set('type', e.target.value)}
        />

        <div className="form-grid-2col">
          {/*
             * DEC-031: status may include rented/reserved (read-only) for display.
             * The shared Select component does not support disabled options, so we use
             * the raw <select> with field-control CSS class to keep design-system styling
             * while still rendering disabled option entries (M-001 exception).
             */}
          <div className="field-wrapper">
            <label htmlFor="edit-skate-status" className="field-label">الحالة</label>
            <select
              id="edit-skate-status"
              className="field-control"
              value={form.status}
              onChange={e => set('status', e.target.value as SkateStatus)}
            >
              {statusOptions.map(s => (
                <option key={s} value={s} disabled={s === 'rented' || s === 'reserved'}>
                  {STATUS_LABELS[s]}{(s === 'rented' || s === 'reserved') ? ' (آلي فقط)' : ''}
                </option>
              ))}
            </select>
          </div>

          <Select
            id="edit-skate-condition"
            label="الحالة الفنية"
            options={CONDITION_OPTIONS}
            value={form.condition}
            onChange={e => set('condition', e.target.value as SkateCondition)}
          />
        </div>

        <div className="form-grid-2col">
          <Input
            id="edit-skate-purchase-date"
            label="تاريخ الشراء"
            type="date"
            value={form.purchaseDate ?? ''}
            onChange={e => set('purchaseDate', e.target.value || null)}
          />
          <Input
            id="edit-skate-purchase-cost"
            label="تكلفة الشراء (EGP)"
            type="number"
            min="0"
            step="0.01"
            value={form.purchaseCost ?? ''}
            onChange={e => set('purchaseCost', e.target.value ? parseFloat(e.target.value) : null)}
          />
        </div>

        {/* DEC-032: QR code and barcode are user-editable strings */}
        <div className="form-grid-2col">
          <Input
            id="edit-skate-qr"
            label="قيمة رمز QR"
            type="text"
            value={form.qrCode ?? ''}
            onChange={e => set('qrCode', e.target.value || null)}
          />
          <Input
            id="edit-skate-barcode"
            label="قيمة الباركود"
            type="text"
            value={form.barcode ?? ''}
            onChange={e => set('barcode', e.target.value || null)}
          />
        </div>

        {/* M-001/M-009: raw <textarea> → shared <Textarea> component */}
        <Textarea
          id="edit-skate-notes"
          label="ملاحظات"
          value={form.notes ?? ''}
          onChange={e => set('notes', e.target.value)}
        />

        {/* SYS-010: replaced raw <input type="checkbox"> + inline <label> with shared <CheckboxField> */}
        <CheckboxField
          id="edit-skate-active"
          label="اسكيت نشطة"
          checked={form.isActive ?? true}
          onChange={checked => set('isActive', checked)}
        />

        {error && <Alert variant="danger" style={{ marginBottom: 'var(--space-4)' } as React.CSSProperties}>{error}</Alert>}
      </form>
    </Modal>
  )
}

// ---------------------------------------------------------------------------
// Main SkatesPage
// ---------------------------------------------------------------------------

export default function SkatesPage() {
  const [skatesList, setSkatesList] = useState<SkateDTO[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<SkateStatus | 'all'>('all')
  const [showCreate, setShowCreate] = useState(false)
  const [editSkate, setEditSkate] = useState<SkateDTO | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params: Record<string, string> = {}
      if (statusFilter !== 'all') params['status'] = statusFilter
      const res = await skatesService.list(params)
      let data: SkateDTO[] = res.data ?? []
      // Client-side search filter (code / size)
      if (search.trim()) {
        const q = search.trim().toLowerCase()
        data = data.filter(s =>
          s.skateCode.toLowerCase().includes(q) ||
          s.size.toLowerCase().includes(q),
        )
      }
      setSkatesList(data)
      setTotal(res.pagination?.total ?? data.length)
    } catch {
      setError('تعذر تحميل قائمة الاسكيتات')
    } finally {
      setLoading(false)
    }
  }, [statusFilter, search])

  useEffect(() => { load() }, [load])

  const statusFilterOptions: Array<{ value: string; label: string }> = [
    { value: 'all', label: 'جميع الحالات' },
    { value: 'available', label: STATUS_LABELS.available },
    { value: 'maintenance', label: STATUS_LABELS.maintenance },
    { value: 'damaged', label: STATUS_LABELS.damaged },
    { value: 'lost', label: STATUS_LABELS.lost },
    { value: 'rented', label: STATUS_LABELS.rented },
    { value: 'reserved', label: STATUS_LABELS.reserved },
  ]

  return (
    <div className="page-container">
      {/* Page header */}
      <div className="page-header">
        <div className="page-header-text">
          <h1 className="page-header-title">إدارة الاسكيتات</h1>
          <p className="page-header-subtitle">
            {loading ? '...' : `${total} اسكيت إجمالاً`}
          </p>
        </div>
        <PermissionGate permission="skates.create">
          <Button
            id="add-skate-btn"
            variant="primary"
            onClick={() => setShowCreate(true)}
          >
            <Plus size={16} aria-hidden="true" />
            إضافة اسكيت
          </Button>
        </PermissionGate>
      </div>

      {/* Filters row */}
      <div className="filters-row">
        {/* Search */}
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="بحث برمز أو مقاس..."
          onClear={() => setSearch('')}
        />

        {/*
         * M-002/M-014: replaced raw <select> with inputStyle (width:'auto' broke
         * the <479px column-mode CSS rule) with field-control class + dedicated
         * .skates-filter-select class that handles flex-row vs stretch correctly.
         */}
        <select
          id="skates-status-filter"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as SkateStatus | 'all')}
          className="field-control skates-filter-select"
        >
          {statusFilterOptions.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>

        {/* Refresh */}
        <Button
          id="skates-refresh-btn"
          variant="secondary"
          size="base"
          onClick={load}
          aria-label="تحديث القائمة"
        >
          <RefreshCw size={16} aria-hidden="true" />
        </Button>
      </div>

      {/* Loading state */}
      {loading && <PageLoader label="جارٍ تحميل الاسكيتات" />}

      {/* Error state */}
      {!loading && error && (
        <Alert variant="danger">{error}</Alert>
      )}

      {/* Empty state */}
      {!loading && !error && skatesList.length === 0 && (
        <div style={{
          backgroundColor: 'var(--color-white)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-card)',
        }}>
          <EmptyState
            icon={Package}
            title="لا توجد زلاجات"
            description={search || statusFilter !== 'all' ? 'لا توجد نتائج تطابق معايير البحث' : 'لم يتم إضافة أي زلاجات بعد'}
          />
        </div>
      )}

      {/* Skates grid */}
      {!loading && !error && skatesList.length > 0 && (
        <div className="skates-grid">
          {skatesList.map(skate => (
            <SkateCard
              key={skate.id}
              skate={skate}
              onEdit={() => setEditSkate(skate)}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      {showCreate && (
        <CreateSkateModal
          onClose={() => setShowCreate(false)}
          onCreated={load}
        />
      )}
      {editSkate && (
        <EditSkateModal
          skate={editSkate}
          onClose={() => setEditSkate(null)}
          onUpdated={load}
        />
      )}

      <style>{`
        /*
         * M-002/M-014: .skates-filter-select
         * In the flex row: fixed 160px width (overrides field-control's width:100%).
         * At <479px column mode: full width, no fixed basis.
         */
        .skates-filter-select {
          flex: 0 0 auto;
          width: 160px;
        }
        @media (max-width: 479px) {
          .skates-filter-select {
            flex: none;
            width: 100%;
          }
        }
      `}</style>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Skate card — D-010: uses shared <Card> component
// ---------------------------------------------------------------------------

function SkateCard({ skate, onEdit }: { skate: SkateDTO; onEdit: () => void }) {
  return (
    <>
      {/*
       * D-010: outer div replaced with shared <Card padding="compact" hover>.
       *  - Removes 8+ inline styles and JS onMouseEnter/Leave hover handlers.
       *  - card--hover CSS handles hover (translateY(-1px), shadow-md) per design system.
       *  - card--inactive class handles inactive skate opacity / background.
       *  - height:100% on inner wrapper resolves D-014 (uneven row heights in CSS grid).
       */}
      <Card
        padding="compact"
        hover={skate.isActive}
        className={skate.isActive ? '' : 'card--inactive'}
        as="article"
      >
        <div className="skate-card-inner">
          {/* Header row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ margin: 0, fontSize: 'var(--font-size-lg)', fontWeight: 800, color: 'var(--color-navy-800)', fontFamily: 'monospace, Cairo', letterSpacing: '0.05em' }}>
                {skate.skateCode}
              </p>
              {!skate.isActive && (
                <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                  معطّلة
                </span>
              )}
            </div>
            <StatusBadge status={skate.status} />
          </div>

          {/* Attributes */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-2)', fontSize: 'var(--font-size-sm)' }}>
            <div>
              <span style={{ color: 'var(--color-text-muted)' }}>المقاس: </span>
              <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{skate.size}</span>
            </div>
            {skate.type && (
              <div>
                <span style={{ color: 'var(--color-text-muted)' }}>النوع: </span>
                <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{skate.type}</span>
              </div>
            )}
            <div>
              <span style={{ color: 'var(--color-text-muted)' }}>الحالة الفنية: </span>
              <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{CONDITION_LABELS[skate.condition]}</span>
            </div>
            {skate.purchaseCost && (
              <div>
                <span style={{ color: 'var(--color-text-muted)' }}>التكلفة: </span>
                {/* D-009: formatCurrency — EGP, Western numerals, ج.م suffix */}
                <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{formatCurrency(skate.purchaseCost)}</span>
              </div>
            )}
          </div>

          {/* Notes */}
          {skate.notes && (
            <p style={{ margin: 0, fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-2)' }}>
              {skate.notes}
            </p>
          )}

          {/* Action — pushed to bottom via flex */}
          <PermissionGate permission="skates.edit">
            <Button
              id={`edit-skate-${skate.id}-btn`}
              variant="secondary"
              size="sm"
              onClick={onEdit}
              fullWidth
            >
              <Pencil size={14} aria-hidden="true" />
              تعديل
            </Button>
          </PermissionGate>
        </div>
      </Card>

      <style>{`
        /*
         * D-010: SkateCard-specific card styles.
         * card--inactive: muted background + reduced opacity for soft-disabled skates.
         * skate-card-inner: flex column that fills the full Card height — resolves D-014.
         */
        .card--inactive {
          background-color: var(--color-page-bg) !important;
          opacity: 0.65;
        }
        .skate-card-inner {
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
          height: 100%;
        }
        /* Push edit button to bottom when card height is set by grid row */
        .skate-card-inner .btn {
          margin-top: auto;
        }
      `}</style>
    </>
  )
}

