/**
 * KOSHK SKATE ERP — Rental POS Page
 * Phase 06 Redesign — Multi-Skate Rentals
 *
 * Redesigned multi-skate rental creation flow:
 *   Step 1: Select Customer
 *   Step 2: Select 1..N Skates (multi-select from available)
 *   Step 3: Select Duration + price preview
 *   Step 4: Review → Start Rental (NO payment at creation — §7)
 *
 * Key design decisions:
 *   - §6: Select customer first, then skates for their session
 *   - §7: NO payment at rental creation — payment deferred to finalization
 *   - DEC-065: Client never calculates price — always fetched from server
 *   - DEC-067: Displayed amount is server-rounded whole EGP
 *   - DEC-069: Duration options from server config — no hardcoded fallback
 *   - §12: Server timestamps are authoritative — no browser Date.now() for billing
 *   - RTL-first design, Arabic UI, no emoji
 */

import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Ticket, ChevronRight, ChevronLeft, Clock, User, Search, Plus, CheckCircle, X } from 'lucide-react'
import {
  Button,
  Badge,
  Alert,
  Input,
  PageLoader,
  useToast,
  LoadingSpinner,
} from '../../components/ui'
import { PermissionGate } from '../../components/PermissionGate'
import { rentalsService } from './rentals.service'
import { customersService, type CustomerListItemDTO, type CreateCustomerBody } from '../customers/customers.service'
import { skatesService, type SkateDTO } from '../skates/skates.service'
import { reservationsService } from '../reservations/reservations.service'
import { formatCurrency } from '../../utils/currency'

// ---------------------------------------------------------------------------
// Step 1: Customer Selection
// ---------------------------------------------------------------------------

interface CustomerPickerProps {
  onSelect: (customer: CustomerListItemDTO) => void
}

function CustomerPicker({ onSelect }: CustomerPickerProps) {
  const [search, setSearch] = useState('')
  const [customers, setCustomers] = useState<CustomerListItemDTO[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState<CreateCustomerBody>({ name: '', phone: '', nationalId: '' })
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const { showToast } = useToast()

  const searchCustomers = useCallback(async (q: string) => {
    if (q.trim().length < 1) { setCustomers([]); return }
    setLoading(true); setError(null)
    try {
      const res = await customersService.list({ q: q.trim(), isActive: '1', perPage: 20 })
      setCustomers(res.data ?? [])
    } catch {
      setError('تعذر البحث عن العملاء')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const t = setTimeout(() => searchCustomers(search), 300)
    return () => clearTimeout(t)
  }, [search, searchCustomers])

  const handleCreate = async () => {
    if (!createForm.name.trim() || !createForm.phone.trim()) {
      setCreateError('الاسم ورقم الهاتف مطلوبان')
      return
    }
    if (createForm.nationalId && createForm.nationalId.trim() !== '') {
      if (!/^\d{14}$/.test(createForm.nationalId.trim())) {
        setCreateError('الرقم القومي يجب أن يتكون من 14 رقمًا')
        return
      }
    }
    setCreating(true); setCreateError(null)
    try {
      const payload: CreateCustomerBody = {
        name: createForm.name.trim(),
        phone: createForm.phone.trim(),
        nationalId: createForm.nationalId?.trim() || undefined,
      }
      const res = await customersService.create(payload)
      showToast({ type: 'success', title: `تم إضافة العميل: ${res.data.name}` })
      const listRes = await customersService.list({ q: res.data.phone, isActive: '1' })
      const found = listRes.data.find(c => c.id === res.data.id)
      if (found) {
        onSelect(found)
      } else {
        onSelect({
          id: res.data.id,
          name: res.data.name,
          phone: res.data.phone,
          nationalIdMasked: '—',
          registrationDate: res.data.registrationDate,
          notes: res.data.notes,
          isActive: res.data.isActive,
          createdAt: res.data.createdAt,
          updatedAt: res.data.updatedAt,
        } as CustomerListItemDTO)
      }
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message ?? 'تعذر إضافة العميل'
      setCreateError(msg)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="rental-pos-step">
      <div className="rental-pos-step-header">
        <h2 className="rental-pos-step-title">اختر العميل</h2>
        <p className="rental-pos-step-subtitle">ابحث عن عميل نشط أو أضف عميلاً جديداً</p>
      </div>

      <div className="rental-pos-search">
        <div style={{ position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-secondary)' }} />
          <input
            id="customer-search"
            type="text"
            placeholder="ابحث بالاسم أو الهاتف أو الرقم القومي..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="rental-search-input"
            style={{ paddingRight: 36 }}
          />
        </div>
      </div>

      {loading && <div style={{ textAlign: 'center', padding: 16 }}><LoadingSpinner size="sm" /></div>}
      {error && <Alert variant="danger">{error}</Alert>}

      {!loading && customers.length > 0 && (
        <div className="customer-results">
          {customers.map(c => (
            <button
              key={c.id}
              id={`customer-item-${c.id}`}
              type="button"
              className="customer-result-item"
              onClick={() => onSelect(c)}
            >
              <div className="customer-result-name">
                <User size={14} /> {c.name}
              </div>
              <div className="customer-result-info">
                <span>{c.phone}</span>
                {c.nationalIdMasked !== '—' && <span> • {c.nationalIdMasked}</span>}
              </div>
            </button>
          ))}
        </div>
      )}

      {!loading && search.trim() && customers.length === 0 && !error && (
        <div className="rental-empty-state">
          <p style={{ color: 'var(--color-text-secondary)' }}>لا توجد نتائج</p>
        </div>
      )}

      <div style={{ marginTop: 24, borderTop: '1px solid var(--color-border)', paddingTop: 16 }}>
        <PermissionGate permission="customers.create">
          {!showCreate ? (
            <Button id="show-create-customer" variant="ghost" onClick={() => setShowCreate(true)}>
              <Plus size={16} /> إضافة عميل جديد
            </Button>
          ) : (
            <div className="create-customer-form">
              <h3 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-bold)', marginBottom: 12 }}>
                بيانات العميل الجديد
              </h3>
              {createError && <Alert variant="danger" style={{ marginBottom: 12 }}>{createError}</Alert>}
              <Input id="new-customer-name" label="الاسم" value={createForm.name} onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))} required />
              <Input id="new-customer-phone" label="الهاتف" value={createForm.phone} onChange={e => setCreateForm(f => ({ ...f, phone: e.target.value }))} required style={{ marginTop: 8 }} />
              <Input id="new-customer-national-id" label="الرقم القومي (اختياري)" value={createForm.nationalId || ''} onChange={e => setCreateForm(f => ({ ...f, nationalId: e.target.value }))} style={{ marginTop: 8 }} dir="ltr" />
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <Button id="create-customer-submit" variant="primary" loading={creating} onClick={handleCreate}>إضافة وتحديد</Button>
                <Button id="cancel-create-customer" variant="ghost" onClick={() => setShowCreate(false)}>إلغاء</Button>
              </div>
            </div>
          )}
        </PermissionGate>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step 2: Multi-Skate Selection
// ---------------------------------------------------------------------------

interface SkatePickerProps {
  selectedIds: number[]
  onToggle: (skate: SkateDTO) => void
}

function SkatePicker({ selectedIds, onToggle }: SkatePickerProps) {
  const [skates, setSkates] = useState<SkateDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const res = await skatesService.list({ status: 'available', isActive: '1', perPage: '200' })
      setSkates(res.data ?? [])
    } catch {
      setError('تعذر تحميل الاسكيتات المتاحة')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = skates.filter(s =>
    search.trim() === '' ||
    s.skateCode.toLowerCase().includes(search.trim().toLowerCase()) ||
    s.size.includes(search.trim())
  )

  if (loading) return <PageLoader />
  if (error) return <Alert variant="danger">{error}</Alert>

  return (
    <div className="rental-pos-step">
      <div className="rental-pos-step-header">
        <h2 className="rental-pos-step-title">اختر الاسكيتات</h2>
        <p className="rental-pos-step-subtitle">
          يمكنك تحديد أكثر من اسكيت —
          <strong style={{ color: 'var(--color-primary)', marginRight: 4 }}>
            {selectedIds.length > 0 ? `${selectedIds.length} محدد` : 'لم يُحدد شيء'}
          </strong>
        </p>
      </div>

      <div className="rental-pos-search">
        <div style={{ position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-secondary)' }} />
          <input
            id="skate-search"
            type="text"
            placeholder="ابحث بالكود أو المقاس..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="rental-search-input"
            style={{ paddingRight: 36 }}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rental-empty-state">
          <Ticket size={48} style={{ color: 'var(--color-text-muted)', margin: '0 auto 12px' }} />
          <p style={{ color: 'var(--color-text-secondary)' }}>لا توجد زلاجات متاحة</p>
        </div>
      ) : (
        <div className="skate-grid">
          {filtered.map(skate => {
            const isSelected = selectedIds.includes(skate.id)
            return (
              <button
                key={skate.id}
                id={`skate-card-${skate.id}`}
                className={`skate-card ${isSelected ? 'skate-card--selected' : ''}`}
                onClick={() => onToggle(skate)}
                type="button"
              >
                {isSelected && (
                  <div className="skate-selected-badge">
                    <CheckCircle size={16} />
                  </div>
                )}
                <div className="skate-card-code">{skate.skateCode}</div>
                <div className="skate-card-size">مقاس {skate.size}</div>
                {skate.type && <div className="skate-card-type">{skate.type}</div>}
                <Badge status={isSelected ? 'rented' : 'available'}>{isSelected ? 'محدد' : 'متاح'}</Badge>
              </button>
            )
          })}
        </div>
      )}

      <button
        id="refresh-skates"
        type="button"
        onClick={load}
        style={{ marginTop: 12, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}
      >
        <Clock size={14} /> تحديث
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step 3: Duration + Price Preview
// ---------------------------------------------------------------------------

interface DurationPickerProps {
  skateCount: number
  onSelect: (duration: number, pricePerHour: number, rentalAmountPerSkate: number) => void
  onBack: () => void
}

function DurationPicker({ skateCount, onSelect, onBack }: DurationPickerProps) {
  const [selectedDuration, setSelectedDuration] = useState<number | null>(null)
  const [customValue, setCustomValue] = useState('')
  const [useCustom, setUseCustom] = useState(false)
  const [preview, setPreview] = useState<{ pricePerHour: number; rentalAmount: number } | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [durationOptions, setDurationOptions] = useState<number[]>([])
  const [configLoading, setConfigLoading] = useState(true)
  const [configError, setConfigError] = useState<string | null>(null)

  const loadConfig = useCallback(() => {
    setConfigLoading(true); setConfigError(null)
    rentalsService.getConfig()
      .then(res => {
        const opts = res.data?.durationOptions
        if (Array.isArray(opts) && opts.length > 0) {
          setDurationOptions(opts)
        } else {
          setConfigError('تعذر تحميل خيارات مدة الإيجار — استجابة الخادم غير صالحة')
        }
      })
      .catch(() => setConfigError('تعذر الاتصال بالخادم لتحميل إعدادات الإيجار. يرجى المحاولة مجدداً.'))
      .finally(() => setConfigLoading(false))
  }, [])

  useEffect(() => { loadConfig() }, [loadConfig])

  const effectiveDuration = useCustom ? (parseInt(customValue, 10) || 0) : (selectedDuration ?? 0)

  const fetchPreview = useCallback(async (mins: number) => {
    if (!mins || mins <= 0) { setPreview(null); return }
    setPreviewLoading(true); setPreviewError(null)
    try {
      const res = await rentalsService.calculatePrice(mins)
      setPreview({ pricePerHour: res.data.pricePerHour, rentalAmount: res.data.rentalAmount })
    } catch {
      setPreviewError('تعذر حساب السعر')
      setPreview(null)
    } finally {
      setPreviewLoading(false)
    }
  }, [])

  useEffect(() => {
    const d = effectiveDuration
    if (d > 0) {
      const t = setTimeout(() => fetchPreview(d), 300)
      return () => clearTimeout(t)
    } else {
      setPreview(null)
    }
  }, [effectiveDuration, fetchPreview])

  const canProceed = effectiveDuration > 0 && preview !== null

  return (
    <div className="rental-pos-step">
      <div className="rental-pos-step-header">
        <h2 className="rental-pos-step-title">اختر مدة الإيجار</h2>
        <p className="rental-pos-step-subtitle">
          {skateCount} اسكيت محدد — نفس المدة لجميع الاسكيتات
        </p>
      </div>

      {configLoading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '16px 0' }}>
          <LoadingSpinner size="sm" />
          <span style={{ color: 'var(--color-text-secondary)' }}>جاري تحميل خيارات المدة...</span>
        </div>
      ) : configError ? (
        <div style={{ padding: '16px 0' }} id="duration-config-error-container">
          <Alert variant="danger">{configError}</Alert>
          <Button id="duration-config-retry" variant="secondary" size="sm" onClick={loadConfig} style={{ marginTop: 8 }}>
            إعادة المحاولة
          </Button>
        </div>
      ) : (
        <div className="duration-grid">
          {durationOptions.map(d => (
            <button
              key={d}
              id={`duration-btn-${d}`}
              type="button"
              className={`duration-btn ${!useCustom && selectedDuration === d ? 'duration-btn--active' : ''}`}
              onClick={() => { setUseCustom(false); setSelectedDuration(d) }}
            >
              <span className="duration-btn-num">{d}</span>
              <span className="duration-btn-unit">دقيقة</span>
            </button>
          ))}
          <button
            id="duration-btn-custom"
            type="button"
            className={`duration-btn ${useCustom ? 'duration-btn--active' : ''}`}
            onClick={() => setUseCustom(true)}
          >
            <span className="duration-btn-num">مخصص</span>
          </button>
        </div>
      )}

      {useCustom && (
        <div style={{ marginTop: 16 }}>
          <Input
            id="custom-duration"
            label="مدة مخصصة (بالدقائق)"
            type="number"
            min={1}
            value={customValue}
            onChange={e => setCustomValue(e.target.value)}
            placeholder="أدخل عدد الدقائق"
          />
        </div>
      )}

      <div className="price-preview-box">
        {previewLoading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <LoadingSpinner size="sm" />
            <span style={{ color: 'var(--color-text-secondary)' }}>جاري حساب السعر...</span>
          </div>
        )}
        {previewError && <Alert variant="danger" style={{ marginTop: 0 }}>{previewError}</Alert>}
        {!previewLoading && !previewError && preview && effectiveDuration > 0 && (
          <>
            <div className="price-preview-rate">
              <Clock size={14} /> السعر: {formatCurrency(preview.pricePerHour)} / ساعة
            </div>
            <div className="price-preview-amount">
              المبلغ لكل اسكيت: <strong>{formatCurrency(preview.rentalAmount)}</strong>
            </div>
            {skateCount > 1 && (
              <div className="price-preview-total">
                الإجمالي المتوقع ({skateCount} اسكيتات): <strong>{formatCurrency(preview.rentalAmount * skateCount)}</strong>
              </div>
            )}
            <div style={{ marginTop: 8, fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
              يُسدَّد المبلغ بعد الإعادة بناءً على المدة الفعلية
            </div>
          </>
        )}
        {!previewLoading && !preview && effectiveDuration <= 0 && (
          <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>
            اختر مدة لعرض السعر
          </p>
        )}
      </div>

      <div className="rental-pos-actions">
        <Button id="back-to-skates" variant="ghost" onClick={onBack}>
          <ChevronLeft size={16} /> رجوع
        </Button>
        <Button
          id="proceed-to-review"
          variant="primary"
          disabled={!canProceed}
          onClick={() => preview && onSelect(effectiveDuration, preview.pricePerHour, preview.rentalAmount)}
        >
          التالي — مراجعة <ChevronRight size={16} />
        </Button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step 4: Review + Start Rental (NO payment — §7)
// ---------------------------------------------------------------------------

interface ReviewStepProps {
  customer: CustomerListItemDTO
  skates: SkateDTO[]
  durationMinutes: number
  pricePerHour: number
  rentalAmountPerSkate: number
  notes: string
  onNotesChange: (n: string) => void
  onBack: () => void
  onConfirm: () => void
  loading: boolean
  error: string | null
}

function ReviewStep({
  customer, skates, durationMinutes, pricePerHour, rentalAmountPerSkate,
  notes, onNotesChange, onBack, onConfirm, loading, error,
}: ReviewStepProps) {
  const totalEstimate = rentalAmountPerSkate * skates.length

  return (
    <div className="rental-pos-step">
      <div className="rental-pos-step-header">
        <h2 className="rental-pos-step-title">مراجعة الإيجار</h2>
        <p className="rental-pos-step-subtitle">تأكد من بيانات الإيجار قبل البدء</p>
      </div>

      {error && <Alert variant="danger" style={{ marginBottom: 16 }}>{error}</Alert>}

      <div className="review-card">
        <div className="review-section">
          <h3 className="review-section-title">بيانات العميل</h3>
          <div className="review-row"><span className="review-label">الاسم</span><span className="review-value">{customer.name}</span></div>
          <div className="review-row"><span className="review-label">الهاتف</span><span className="review-value" dir="ltr">{customer.phone}</span></div>
        </div>

        <div className="review-section">
          <h3 className="review-section-title">الاسكيتات المحددة ({skates.length})</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {skates.map(s => (
              <div key={s.id} style={{ background: 'var(--color-primary-subtle)', border: '1px solid var(--color-primary)', borderRadius: 'var(--radius-md)', padding: '4px 12px', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)' }}>
                {s.skateCode} — مقاس {s.size}
              </div>
            ))}
          </div>
        </div>

        <div className="review-section">
          <h3 className="review-section-title">بيانات الإيجار</h3>
          <div className="review-row"><span className="review-label">المدة المتوقعة</span><span className="review-value">{durationMinutes} دقيقة</span></div>
          <div className="review-row"><span className="review-label">السعر بالساعة</span><span className="review-value">{formatCurrency(pricePerHour)}</span></div>
          <div className="review-row"><span className="review-label">تقدير لكل اسكيت</span><span className="review-value">{formatCurrency(rentalAmountPerSkate)}</span></div>
          {skates.length > 1 && (
            <div className="review-row review-row--highlight"><span className="review-label">الإجمالي المتوقع</span><span className="review-value review-amount">{formatCurrency(totalEstimate)}</span></div>
          )}
        </div>

        <div style={{ background: 'var(--color-info-bg, #e8f4fd)', border: '1px solid var(--color-info-border, #90c7f0)', borderRadius: 'var(--radius-md)', padding: '12px 16px', marginBottom: 16, fontSize: 'var(--font-size-sm)', color: 'var(--color-info-text, #1a6fa8)' }}>
          المبلغ المعروض تقديري — يُحتسب المبلغ الفعلي بناءً على مدة الاستخدام الحقيقية عند الإعادة.
        </div>

        <div style={{ marginTop: 8 }}>
          <label htmlFor="rental-notes" style={{ display: 'block', fontSize: 'var(--font-size-sm)', marginBottom: 6, color: 'var(--color-text-secondary)' }}>
            ملاحظات (اختياري)
          </label>
          <textarea
            id="rental-notes"
            value={notes}
            onChange={e => onNotesChange(e.target.value)}
            placeholder="أي ملاحظات إضافية..."
            rows={2}
            maxLength={1000}
            style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', fontSize: 'var(--font-size-sm)', fontFamily: 'var(--font-family)', resize: 'vertical', boxSizing: 'border-box' }}
          />
        </div>
      </div>

      <div className="rental-pos-actions">
        <Button id="back-to-duration" variant="ghost" onClick={onBack} disabled={loading}>
          <ChevronLeft size={16} /> رجوع
        </Button>
        <Button
          id="start-rental-btn"
          variant="primary"
          loading={loading}
          onClick={onConfirm}
        >
          <CheckCircle size={16} /> بدء الإيجار
        </Button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step indicator
// ---------------------------------------------------------------------------

function StepIndicator({ current, total }: { current: number; total: number }) {
  const labels = ['العميل', 'الاسكيتات', 'المدة', 'المراجعة']
  return (
    <div className="step-indicator">
      {labels.map((label, i) => (
        <div key={i} className={`step-indicator-item ${i + 1 < current ? 'done' : i + 1 === current ? 'active' : ''}`}>
          <div className="step-indicator-circle">{i + 1 < current ? <CheckCircle size={14} /> : i + 1}</div>
          <span className="step-indicator-label">{label}</span>
          {i < total - 1 && <div className="step-indicator-line" />}
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main RentalPOSPage
// ---------------------------------------------------------------------------

export default function RentalPOSPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { showToast } = useToast()

  const [reservationId, setReservationId] = useState<number | null>(null)
  const [step, setStep] = useState(1)

  // State per step
  const [selectedCustomer, setCustomer] = useState<CustomerListItemDTO | null>(null)
  const [selectedSkates, setSelectedSkates] = useState<SkateDTO[]>([])
  const [durationMinutes, setDuration] = useState(0)
  const [pricePerHour, setPricePerHour] = useState(0)
  const [rentalAmountPerSkate, setRentalAmountPerSkate] = useState(0)
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Handle reservation prefill
  useEffect(() => {
    const resId = searchParams.get('reservationId')
    if (resId) {
      setReservationId(Number(resId))
      reservationsService.getReservation(Number(resId))
        .then(res => {
          setSelectedSkates([res.skate as unknown as SkateDTO])
          setCustomer(res.customer as unknown as CustomerListItemDTO)
          setStep(3) // skip to duration when reservation prefills customer + skate
        })
        .catch(() => {
          showToast({ type: 'error', title: 'فشل تحميل بيانات الحجز' })
        })
    }
  }, [searchParams])

  const toggleSkate = (skate: SkateDTO) => {
    setSelectedSkates(prev => {
      const exists = prev.find(s => s.id === skate.id)
      if (exists) return prev.filter(s => s.id !== skate.id)
      return [...prev, skate]
    })
  }

  const handleConfirm = async () => {
    if (!selectedCustomer || selectedSkates.length === 0) return
    setSubmitting(true); setSubmitError(null)
    try {
      const res = await rentalsService.create({
        skateIds: selectedSkates.map(s => s.id),
        customerId: selectedCustomer.id,
        durationMinutes,
        notes: notes.trim() || undefined,
        reservationId: reservationId || undefined,
      })
      showToast({ type: 'success', title: `تم بدء الإيجار: ${res.data.rentalCode}` })
      navigate('/rentals/active')
    } catch (err: unknown) {
      const errObj = err as { response?: { data?: { error?: { message?: string } } }; message?: string }
      const msg = errObj?.response?.data?.error?.message ?? errObj?.message ?? 'تعذر بدء الإيجار'
      setSubmitError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="page-container">
      <div className="page-header shrink-0">
        <div className="page-header-text">
          <h1 className="page-header-title" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <Ticket size={24} aria-hidden="true" className="text-muted" />
            نقطة إيجار الاسكيتات
          </h1>
          <p className="page-header-subtitle">إنشاء إيجار جديد</p>
        </div>
      </div>

      <StepIndicator current={step} total={4} />

      <div className="rental-pos-container">
        {step === 1 && (
          <CustomerPicker
            onSelect={customer => { setCustomer(customer); setStep(2) }}
          />
        )}

        {step === 2 && (
          <div className="rental-pos-step">
            <SkatePicker
              selectedIds={selectedSkates.map(s => s.id)}
              onToggle={toggleSkate}
            />
            {/* Selected summary bar */}
            {selectedSkates.length > 0 && (
              <div style={{ marginTop: 16, padding: '12px 16px', background: 'var(--color-primary-subtle)', border: '1px solid var(--color-primary)', borderRadius: 'var(--radius-md)', display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                <span style={{ fontWeight: 'var(--font-weight-medium)', fontSize: 'var(--font-size-sm)' }}>محدد:</span>
                {selectedSkates.map(s => (
                  <span key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', padding: '2px 8px', fontSize: 'var(--font-size-xs)' }}>
                    {s.skateCode}
                    <button type="button" onClick={() => toggleSkate(s)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--color-danger-text)', display: 'flex' }}>
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="rental-pos-actions" style={{ marginTop: 16 }}>
              <Button id="back-to-customer" variant="ghost" onClick={() => { setCustomer(null); setStep(1) }}>
                <ChevronLeft size={16} /> رجوع
              </Button>
              <Button
                id="proceed-to-duration"
                variant="primary"
                disabled={selectedSkates.length === 0}
                onClick={() => setStep(3)}
              >
                التالي — اختر المدة <ChevronRight size={16} />
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <DurationPicker
            skateCount={selectedSkates.length}
            onBack={() => setStep(2)}
            onSelect={(dur, rate, amountPerSkate) => {
              setDuration(dur); setPricePerHour(rate); setRentalAmountPerSkate(amountPerSkate)
              setStep(4)
            }}
          />
        )}

        {step === 4 && selectedCustomer && (
          <ReviewStep
            customer={selectedCustomer}
            skates={selectedSkates}
            durationMinutes={durationMinutes}
            pricePerHour={pricePerHour}
            rentalAmountPerSkate={rentalAmountPerSkate}
            notes={notes}
            onNotesChange={setNotes}
            onBack={() => setStep(3)}
            onConfirm={handleConfirm}
            loading={submitting}
            error={submitError}
          />
        )}
      </div>

      <style>{`
        .rental-pos-container { max-width: 680px; margin: 0 auto; }
        .rental-pos-step { background: var(--color-surface); border-radius: var(--radius-lg); padding: var(--space-6); border: 1px solid var(--color-border); }
        .rental-pos-step-header { margin-bottom: var(--space-5); }
        .rental-pos-step-title { font-size: var(--font-size-lg); font-weight: var(--font-weight-bold); color: var(--color-text-primary); margin: 0 0 4px; }
        .rental-pos-step-subtitle { font-size: var(--font-size-sm); color: var(--color-text-secondary); margin: 0; }
        .rental-pos-search { margin-bottom: var(--space-4); }
        .rental-search-input { width: 100%; padding: 10px 12px; border-radius: var(--radius-md); border: 1px solid var(--color-border); font-size: var(--font-size-sm); font-family: var(--font-family); box-sizing: border-box; background: var(--color-input-bg); color: var(--color-text-primary); outline: none; }
        .rental-search-input:focus { border-color: var(--color-primary); box-shadow: 0 0 0 3px rgba(var(--color-primary-rgb), 0.12); }
        .skate-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: var(--space-3); margin-bottom: var(--space-3); }
        .skate-card { background: var(--color-surface-raised); border: 2px solid var(--color-border); border-radius: var(--radius-md); padding: var(--space-4); cursor: pointer; text-align: center; transition: all var(--transition-fast); display: flex; flex-direction: column; align-items: center; gap: 6px; min-height: 110px; position: relative; }
        .skate-card:hover { border-color: var(--color-primary); background: var(--color-primary-subtle); }
        .skate-card:focus { outline: 2px solid var(--color-primary); outline-offset: 2px; }
        .skate-card--selected { border-color: var(--color-primary) !important; background: var(--color-primary-subtle) !important; box-shadow: 0 0 0 3px rgba(var(--color-primary-rgb), 0.18); }
        .skate-selected-badge { position: absolute; top: 6px; left: 6px; color: var(--color-primary); }
        .skate-card-code { font-size: var(--font-size-lg); font-weight: var(--font-weight-bold); color: var(--color-text-primary); }
        .skate-card-size { font-size: var(--font-size-xs); color: var(--color-text-secondary); }
        .skate-card-type { font-size: var(--font-size-xs); color: var(--color-text-muted); }
        .duration-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-3); margin-bottom: var(--space-5); }
        .duration-btn { background: var(--color-surface-raised); border: 2px solid var(--color-border); border-radius: var(--radius-md); padding: var(--space-4) var(--space-2); cursor: pointer; text-align: center; transition: all var(--transition-fast); display: flex; flex-direction: column; align-items: center; gap: 4px; min-height: 72px; justify-content: center; }
        .duration-btn:hover { border-color: var(--color-primary); }
        .duration-btn--active { border-color: var(--color-primary); background: var(--color-primary-subtle); }
        .duration-btn:focus { outline: 2px solid var(--color-primary); outline-offset: 2px; }
        .duration-btn-num { font-size: var(--font-size-xl); font-weight: var(--font-weight-bold); color: var(--color-text-primary); }
        .duration-btn-unit { font-size: var(--font-size-xs); color: var(--color-text-secondary); }
        .price-preview-box { background: var(--color-surface-raised); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: var(--space-4); margin-top: var(--space-4); min-height: 72px; display: flex; flex-direction: column; gap: 8px; }
        .price-preview-rate { font-size: var(--font-size-sm); color: var(--color-text-secondary); display: flex; align-items: center; gap: 6px; }
        .price-preview-amount { font-size: var(--font-size-lg); color: var(--color-text-primary); }
        .price-preview-total { font-size: var(--font-size-base); color: var(--color-primary); font-weight: var(--font-weight-bold); }
        .customer-results { display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; max-height: 280px; overflow-y: auto; }
        .customer-result-item { width: 100%; background: var(--color-surface-raised); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 12px 16px; cursor: pointer; text-align: right; transition: all var(--transition-fast); }
        .customer-result-item:hover { border-color: var(--color-primary); background: var(--color-primary-subtle); }
        .customer-result-name { font-weight: var(--font-weight-medium); display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
        .customer-result-info { font-size: var(--font-size-sm); color: var(--color-text-secondary); }
        .rental-empty-state { text-align: center; padding: 32px 16px; }
        .rental-pos-actions { display: flex; justify-content: space-between; align-items: center; margin-top: 24px; padding-top: 16px; border-top: 1px solid var(--color-border-subtle); }
        .review-card { background: var(--color-surface-raised); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: var(--space-5); display: flex; flex-direction: column; gap: 16px; }
        .review-section { display: flex; flex-direction: column; gap: 8px; }
        .review-section-title { font-size: var(--font-size-sm); font-weight: var(--font-weight-bold); color: var(--color-text-secondary); margin: 0 0 8px; text-transform: uppercase; letter-spacing: 0.05em; }
        .review-row { display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid var(--color-border-subtle); }
        .review-row:last-child { border-bottom: none; }
        .review-label { font-size: var(--font-size-sm); color: var(--color-text-secondary); }
        .review-value { font-size: var(--font-size-sm); font-weight: var(--font-weight-medium); }
        .review-row--highlight .review-label, .review-row--highlight .review-value { font-weight: var(--font-weight-bold); }
        .review-amount { font-size: var(--font-size-base); color: var(--color-primary); }
        .create-customer-form { background: var(--color-surface-raised); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: var(--space-4); }
        .step-indicator { display: flex; align-items: flex-start; justify-content: center; gap: 0; margin-bottom: var(--space-6); padding: 0 var(--space-4); overflow-x: auto; }
        .step-indicator-item { display: flex; flex-direction: column; align-items: center; gap: 6px; position: relative; flex: 1; min-width: 0; }
        .step-indicator-circle { width: 32px; height: 32px; border-radius: 50%; background: var(--color-surface-raised); border: 2px solid var(--color-border); display: flex; align-items: center; justify-content: center; font-size: var(--font-size-sm); font-weight: var(--font-weight-bold); color: var(--color-text-secondary); flex-shrink: 0; z-index: 1; }
        .step-indicator-item.active .step-indicator-circle { background: var(--color-primary); border-color: var(--color-primary); color: white; }
        .step-indicator-item.done .step-indicator-circle { background: var(--color-success-text); border-color: var(--color-success-text); color: white; }
        .step-indicator-label { font-size: var(--font-size-xs); color: var(--color-text-secondary); text-align: center; white-space: nowrap; }
        .step-indicator-item.active .step-indicator-label { color: var(--color-primary); font-weight: var(--font-weight-medium); }
        .step-indicator-line { position: absolute; top: 16px; inset-inline-start: calc(50% + 16px); width: calc(100% - 32px); height: 2px; background: var(--color-border); z-index: 0; }
        .step-indicator-item.done .step-indicator-line { background: var(--color-success-text); }
      `}</style>
    </div>
  )
}
