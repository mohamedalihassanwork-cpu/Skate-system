/**
 * KOSHK SKATE ERP — Skates Management Page
 * Phase 03 — Skates / Asset Management
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
  Modal,
  EmptyState,
  PageLoader,
  SearchBar,
  type BadgeStatus,
} from '../../components/ui'

// ---------------------------------------------------------------------------
// Status badge — uses shared Badge with status → semantic color mapping
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: SkateStatus }) {
  // Map skate statuses to badge semantic variants
  const statusToBadge: Record<SkateStatus, BadgeStatus> = {
    available:   'available',
    rented:      'rented',
    reserved:    'reserved',
    maintenance: 'maintenance',
    damaged:     'damaged',
    lost:        'lost',
  }
  return (
    <Badge status={statusToBadge[status]}>
      {STATUS_LABELS[status]}
    </Badge>
  )
}

// ---------------------------------------------------------------------------
// Form field helper (local — for skates-specific complex form fields)
// ---------------------------------------------------------------------------

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 'var(--space-4)' }}>
      <label style={{
        display: 'block',
        fontSize: 'var(--font-size-sm)',
        fontWeight: 600,
        color: 'var(--color-navy-800)',
        marginBottom: 'var(--space-1)',
      }}>
        {label}
      </label>
      {children}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: 'var(--space-2) var(--space-3)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-base)',
  fontSize: 'var(--font-size-sm)',
  fontFamily: "'Cairo', sans-serif",
  color: 'var(--color-text-primary)',
  backgroundColor: 'var(--color-white)',
  boxSizing: 'border-box',
  outline: 'none',
}

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
        type:      form.type?.trim() || undefined,
        notes:     form.notes?.trim() || undefined,
      })
      onCreated()
      onClose()
    } catch (e: unknown) {
      setError((e as { message?: string })?.message ?? 'حدث خطأ أثناء إضافة الزلاجة')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal isOpen onClose={onClose} title="إضافة زلاجة جديدة" size="base"
      footer={
        <>
          <Button type="submit" form="create-skate-form" variant="primary" loading={saving} id="create-skate-submit-btn">
            إضافة الزلاجة
          </Button>
          <Button type="button" variant="secondary" onClick={onClose} id="create-skate-cancel-btn">
            إلغاء
          </Button>
        </>
      }
    >
      <form id="create-skate-form" onSubmit={handleSubmit} noValidate>
          <Field label="رمز الزلاجة (اختياري — يُولَّد تلقائياً إذا تُرك فارغاً)">
            <input
              id="create-skate-code"
              style={inputStyle}
              type="text"
              placeholder="مثال: SK-025 (اتركه فارغاً للتوليد التلقائي)"
              value={form.skateCode ?? ''}
              onChange={e => set('skateCode', e.target.value)}
            />
          </Field>

          <Field label="المقاس *">
            <input
              id="create-skate-size"
              style={inputStyle}
              type="text"
              placeholder="مثال: 42"
              value={form.size}
              onChange={e => set('size', e.target.value)}
              required
            />
          </Field>

          {/* DEC-033: free-text input — no dropdown */}
          <Field label="النوع">
            <input
              id="create-skate-type"
              style={inputStyle}
              type="text"
              placeholder="نوع الزلاجة (اختياري)"
              value={form.type ?? ''}
              onChange={e => set('type', e.target.value)}
            />
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
            <Field label="الحالة">
              <select
                id="create-skate-status"
                style={inputStyle}
                value={form.status}
                onChange={e => set('status', e.target.value as SkateStatus)}
              >
                {ADMIN_SETTABLE_STATUSES.map(s => (
                  <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                ))}
              </select>
            </Field>

            <Field label="الحالة الفنية">
              <select
                id="create-skate-condition"
                style={inputStyle}
                value={form.condition}
                onChange={e => set('condition', e.target.value as SkateCondition)}
              >
                {(['good', 'fair', 'poor'] as SkateCondition[]).map(c => (
                  <option key={c} value={c}>{CONDITION_LABELS[c]}</option>
                ))}
              </select>
            </Field>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
            <Field label="تاريخ الشراء">
              <input
                id="create-skate-purchase-date"
                style={inputStyle}
                type="date"
                value={form.purchaseDate ?? ''}
                onChange={e => set('purchaseDate', e.target.value || undefined)}
              />
            </Field>

            <Field label="تكلفة الشراء (ر.س)">
              <input
                id="create-skate-purchase-cost"
                style={inputStyle}
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={form.purchaseCost ?? ''}
                onChange={e => set('purchaseCost', e.target.value ? parseFloat(e.target.value) : undefined)}
              />
            </Field>
          </div>

          <Field label="ملاحظات">
            <textarea
              id="create-skate-notes"
              style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }}
              placeholder="ملاحظات إضافية (اختياري)"
              value={form.notes ?? ''}
              onChange={e => set('notes', e.target.value)}
            />
          </Field>

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
    size:         skate.size,
    type:         skate.type ?? '',
    status:       skate.status,
    condition:    skate.condition,
    purchaseDate: skate.purchaseDate ?? '',
    purchaseCost: skate.purchaseCost ? parseFloat(skate.purchaseCost) : undefined,
    notes:        skate.notes ?? '',
    qrCode:       skate.qrCode ?? '',
    barcode:      skate.barcode ?? '',
    isActive:     skate.isActive,
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
        type:         form.type?.toString().trim() || null,
        notes:        form.notes?.toString().trim() || null,
        qrCode:       form.qrCode?.toString().trim() || null,
        barcode:      form.barcode?.toString().trim() || null,
        purchaseDate: form.purchaseDate?.toString().trim() || null,
      })
      onUpdated()
      onClose()
    } catch (e: unknown) {
      setError((e as { message?: string })?.message ?? 'حدث خطأ أثناء تحديث الزلاجة')
    } finally {
      setSaving(false)
    }
  }

  // Only show admin-settable statuses (not rented/reserved — DEC-031)
  const statusOptions: SkateStatus[] = skate.status === 'rented' || skate.status === 'reserved'
    ? [skate.status, ...ADMIN_SETTABLE_STATUSES]
    : ADMIN_SETTABLE_STATUSES

  return (
    <Modal isOpen onClose={onClose} title="تعديل الزلاجة" size="base"
      footer={
        <>
          <Button type="submit" form="edit-skate-form" variant="primary" loading={saving} id="edit-skate-submit-btn" style={{ backgroundColor: 'var(--color-gold-500)', color: 'var(--color-navy-900)' } as React.CSSProperties}>
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
          <Field label="المقاس *">
            <input id="edit-skate-size" style={inputStyle} type="text" value={form.size ?? ''} onChange={e => set('size', e.target.value)} required />
          </Field>

          {/* DEC-033: free-text input */}
          <Field label="النوع">
            <input id="edit-skate-type" style={inputStyle} type="text" placeholder="نوع الزلاجة" value={form.type ?? ''} onChange={e => set('type', e.target.value)} />
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
            <Field label="الحالة">
              <select id="edit-skate-status" style={inputStyle} value={form.status} onChange={e => set('status', e.target.value as SkateStatus)}>
                {statusOptions.map(s => (
                  <option key={s} value={s} disabled={s === 'rented' || s === 'reserved'}>
                    {STATUS_LABELS[s]}{(s === 'rented' || s === 'reserved') ? ' (آلي فقط)' : ''}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="الحالة الفنية">
              <select id="edit-skate-condition" style={inputStyle} value={form.condition} onChange={e => set('condition', e.target.value as SkateCondition)}>
                {(['good', 'fair', 'poor'] as SkateCondition[]).map(c => (
                  <option key={c} value={c}>{CONDITION_LABELS[c]}</option>
                ))}
              </select>
            </Field>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
            <Field label="تاريخ الشراء">
              <input id="edit-skate-purchase-date" style={inputStyle} type="date" value={form.purchaseDate ?? ''} onChange={e => set('purchaseDate', e.target.value || null)} />
            </Field>
            <Field label="تكلفة الشراء (ر.س)">
              <input id="edit-skate-purchase-cost" style={inputStyle} type="number" min="0" step="0.01" value={form.purchaseCost ?? ''} onChange={e => set('purchaseCost', e.target.value ? parseFloat(e.target.value) : null)} />
            </Field>
          </div>

          {/* DEC-032: QR code and barcode are user-editable strings */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
            <Field label="قيمة رمز QR">
              <input id="edit-skate-qr" style={inputStyle} type="text" value={form.qrCode ?? ''} onChange={e => set('qrCode', e.target.value || null)} />
            </Field>
            <Field label="قيمة الباركود">
              <input id="edit-skate-barcode" style={inputStyle} type="text" value={form.barcode ?? ''} onChange={e => set('barcode', e.target.value || null)} />
            </Field>
          </div>

          <Field label="ملاحظات">
            <textarea id="edit-skate-notes" style={{ ...inputStyle, minHeight: 70, resize: 'vertical' }} value={form.notes ?? ''} onChange={e => set('notes', e.target.value)} />
          </Field>

          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
            <input
              id="edit-skate-active"
              type="checkbox"
              checked={form.isActive ?? true}
              onChange={e => set('isActive', e.target.checked)}
              style={{ width: 16, height: 16, cursor: 'pointer' }}
            />
            <label htmlFor="edit-skate-active" style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)', cursor: 'pointer' }}>
              زلاجة نشطة
            </label>
          </div>

          {error && <Alert variant="danger" style={{ marginBottom: 'var(--space-4)' } as React.CSSProperties}>{error}</Alert>}
      </form>
    </Modal>
  )
}

// ---------------------------------------------------------------------------
// Main SkatesPage
// ---------------------------------------------------------------------------

export default function SkatesPage() {
  const [skatesList, setSkatesList]   = useState<SkateDTO[]>([])
  const [total, setTotal]             = useState(0)
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState<string | null>(null)
  const [search, setSearch]           = useState('')
  const [statusFilter, setStatusFilter] = useState<SkateStatus | 'all'>('all')
  const [showCreate, setShowCreate]   = useState(false)
  const [editSkate, setEditSkate]     = useState<SkateDTO | null>(null)

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
      setError('تعذر تحميل قائمة الزلاجات')
    } finally {
      setLoading(false)
    }
  }, [statusFilter, search])

  useEffect(() => { load() }, [load])

  const statusFilterOptions: Array<{ value: SkateStatus | 'all'; label: string }> = [
    { value: 'all', label: 'جميع الحالات' },
    { value: 'available',   label: STATUS_LABELS.available },
    { value: 'maintenance', label: STATUS_LABELS.maintenance },
    { value: 'damaged',     label: STATUS_LABELS.damaged },
    { value: 'lost',        label: STATUS_LABELS.lost },
    { value: 'rented',      label: STATUS_LABELS.rented },
    { value: 'reserved',    label: STATUS_LABELS.reserved },
  ]

  return (
    <div style={{ padding: 'var(--space-8)', maxWidth: 'var(--content-max-width)', margin: '0 auto' }}>
      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-6)' }}>
        <div>
          <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800, color: 'var(--color-navy-800)', margin: 0 }}>
            إدارة الزلاجات
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)', margin: 'var(--space-1) 0 0' }}>
            {loading ? '...' : `${total} زلاجة إجمالاً`}
          </p>
        </div>
        <PermissionGate permission="skates.create">
          <Button
            id="add-skate-btn"
            variant="primary"
            onClick={() => setShowCreate(true)}
          >
            <Plus size={16} aria-hidden="true" />
            إضافة زلاجة
          </Button>
        </PermissionGate>
      </div>

      {/* Filters row */}
      <div style={{
        display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-6)',
        flexWrap: 'wrap', alignItems: 'center',
      }}>
        {/* Search */}
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="بحث برمز أو مقاس..."
          onClear={() => setSearch('')}
        />

        {/* Status filter */}
        <select
          id="skates-status-filter"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as SkateStatus | 'all')}
          style={{ ...inputStyle, flex: '0 0 auto', width: 'auto', minWidth: 160 }}
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
      {loading && <PageLoader label="جارٍ تحميل الزلاجات" />}

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
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 'var(--space-4)',
        }}>
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
    </div>
  )
}

// ---------------------------------------------------------------------------
// Skate card
// ---------------------------------------------------------------------------

function SkateCard({ skate, onEdit }: { skate: SkateDTO; onEdit: () => void }) {
  return (
    <div style={{
      backgroundColor: skate.isActive ? 'var(--color-white)' : 'var(--color-page-bg)',
      borderRadius: 'var(--radius-lg)',
      boxShadow: 'var(--shadow-card)',
      border: `1px solid ${skate.isActive ? 'var(--color-border)' : 'var(--color-border)'}`,
      padding: 'var(--space-5)',
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-3)',
      opacity: skate.isActive ? 1 : 0.65,
      transition: 'box-shadow var(--transition-fast), transform var(--transition-fast)',
    }}
    onMouseEnter={e => {
      if (skate.isActive) {
        (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow-md)'
        ;(e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'
      }
    }}
    onMouseLeave={e => {
      (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow-card)'
      ;(e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'
    }}
    >
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
            <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{parseFloat(skate.purchaseCost).toLocaleString('ar-SA')} ر.س</span>
          </div>
        )}
      </div>

      {/* Notes */}
      {skate.notes && (
        <p style={{ margin: 0, fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-2)' }}>
          {skate.notes}
        </p>
      )}

      {/* Action */}
      <PermissionGate permission="skates.edit">
        <Button
          id={`edit-skate-${skate.id}-btn`}
          variant="secondary"
          size="sm"
          onClick={onEdit}
          fullWidth
          style={{ marginTop: 'auto' } as React.CSSProperties}
        >
          <Pencil size={14} aria-hidden="true" />
          تعديل
        </Button>
      </PermissionGate>
    </div>
  )
}
