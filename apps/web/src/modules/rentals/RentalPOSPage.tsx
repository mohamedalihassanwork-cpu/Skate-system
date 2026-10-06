/**
 * KOSHK SKATE ERP — Rental POS Page
 * Phase 05 — Rental POS Core
 *
 * Multi-step rental creation flow (DEC-060, DEC-065):
 *   Step 1: Select Skate (available only)
 *   Step 2: Select Duration + automatic price preview
 *   Step 3: Select / Create Customer
 *   Step 4: Review → Start Rental
 *
 * No Payment step in Phase 05 (DEC-060). Phase 06 will extend this flow.
 *
 * DEC-065: Client never calculates price — always fetched from server.
 * DEC-067: Displayed amount is server-rounded whole EGP.
 * DEC-068: Hourly rate comes from settings (displayed to cashier).
 * DEC-069: Standard durations [15,30,45,60,90] + custom (>0, no max).
 */

import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Ticket, ChevronRight, ChevronLeft, Clock, User, Search, Plus, CheckCircle } from 'lucide-react'
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
import { paymentsService, type PaymentMethodDTO } from '../payments/payments.service'
import { invoicesService } from '../invoices/invoices.service'
import { Trash2 } from 'lucide-react'
import { usePrint } from '../../contexts/PrintContext'

// ---------------------------------------------------------------------------
// Step constants
// ---------------------------------------------------------------------------

// Standard durations are loaded from server (GET /api/v1/rentals/config).
// BR-26: Duration options must come from configuration — not hardcoded.
// This constant is intentionally removed in Phase 05 remediation (F-06).

// ---------------------------------------------------------------------------
// Step 1: Skate Selection
// ---------------------------------------------------------------------------

interface SkatePickerProps {
  onSelect: (skate: SkateDTO) => void
}

function SkatePicker({ onSelect }: SkatePickerProps) {
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
        <h2 className="rental-pos-step-title">اختر الاسكيت</h2>
        <p className="rental-pos-step-subtitle">الاسكيتات المتاحة للإيجار حالياً</p>
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
          {filtered.map(skate => (
            <button
              key={skate.id}
              id={`skate-card-${skate.id}`}
              className="skate-card"
              onClick={() => onSelect(skate)}
              type="button"
            >
              <div className="skate-card-code">{skate.skateCode}</div>
              <div className="skate-card-size">مقاس {skate.size}</div>
              {skate.type && <div className="skate-card-type">{skate.type}</div>}
              <Badge status="available">متاح</Badge>
            </button>
          ))}
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
// Step 2: Duration + Price Preview
// ---------------------------------------------------------------------------

interface DurationPickerProps {
  skate: SkateDTO
  onSelect: (duration: number, pricePerHour: number, rentalAmount: number) => void
  onBack: () => void
}

function DurationPicker({ skate, onSelect, onBack }: DurationPickerProps) {
  const [selectedDuration, setSelectedDuration] = useState<number | null>(null)
  const [customValue, setCustomValue] = useState('')
  const [useCustom, setUseCustom] = useState(false)
  const [preview, setPreview] = useState<{ pricePerHour: number; rentalAmount: number } | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)
  // F-06 / DEC-070: Duration options are authoritative from server — no hardcoded fallback (BR-26)
  const [durationOptions, setDurationOptions] = useState<number[]>([])
  const [configLoading, setConfigLoading] = useState(true)
  const [configError, setConfigError] = useState<string | null>(null)

  // Load configured durations from server on mount (F-06, DEC-070)
  // If configuration is missing, malformed, or unreachable — show error and block continuation.
  // The POS must NOT substitute hardcoded durations when configuration is unavailable.
  const loadConfig = useCallback(() => {
    setConfigLoading(true)
    setConfigError(null)
    rentalsService.getConfig()
      .then(res => {
        const opts = res.data?.durationOptions
        if (Array.isArray(opts) && opts.length > 0) {
          setDurationOptions(opts)
        } else {
          // Server returned a success response but with invalid/empty duration list
          setConfigError('تعذر تحميل خيارات مدة الإيجار — استجابة الخادم غير صالحة')
          setDurationOptions([])
        }
      })
      .catch(() => {
        // Server unreachable or returned a configuration error
        setConfigError('تعذر الاتصال بالخادم لتحميل إعدادات الإيجار. يرجى المحاولة مجدداً.')
        setDurationOptions([])
      })
      .finally(() => setConfigLoading(false))
  }, [])

  useEffect(() => { loadConfig() }, [loadConfig])

  const effectiveDuration = useCustom
    ? (parseInt(customValue, 10) || 0)
    : (selectedDuration ?? 0)

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
        <p className="rental-pos-step-subtitle">الاسكيت: <strong>{skate.skateCode}</strong> — مقاس {skate.size}</p>
      </div>

      {configLoading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '16px 0' }}>
          <LoadingSpinner size="sm" />
          <span style={{ color: 'var(--color-text-secondary)' }}>جاري تحميل خيارات المدة...</span>
        </div>
      ) : configError ? (
        <div style={{ padding: '16px 0' }} id="duration-config-error-container">
          <Alert variant="danger">
            {configError}
          </Alert>
          <Button
            id="duration-config-retry"
            variant="secondary"
            size="sm"
            onClick={loadConfig}
            style={{ marginTop: 8 }}
          >
            إعادة المحاولة
          </Button>
          <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', marginTop: 12 }}>
            لا يمكن المتابعة باستخدام الأزرار القياسية. يمكنك استخدام حقل المدة المخصصة أدناه إذا كنت تعرف المدة.
          </p>
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
          <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', marginTop: 4 }}>
            يجب أن تكون المدة أكبر من صفر — لا يوجد حد أقصى (DEC-069)
          </p>
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
              المبلغ: <strong>{formatCurrency(preview.rentalAmount)}</strong>
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
        <Button id="back-to-skate" variant="ghost" onClick={onBack}>
          <ChevronLeft size={16} /> رجوع
        </Button>
        <Button
          id="proceed-to-customer"
          variant="primary"
          disabled={!canProceed}
          onClick={() => preview && onSelect(effectiveDuration, preview.pricePerHour, preview.rentalAmount)}
        >
          التالي — اختر العميل <ChevronRight size={16} />
        </Button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step 3: Customer Selection
// ---------------------------------------------------------------------------

interface CustomerPickerProps {
  onSelect: (customer: CustomerListItemDTO) => void
  onBack: () => void
}

function CustomerPicker({ onSelect, onBack }: CustomerPickerProps) {
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
          nationalIdMasked: res.data.nationalId ? '***' : '—',
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

      {loading && (
        <div style={{ textAlign: 'center', padding: 16 }}>
          <LoadingSpinner size="sm" />
        </div>
      )}
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
              <Input
                id="new-customer-name"
                label="الاسم"
                value={createForm.name}
                onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))}
                required
              />
              <Input
                id="new-customer-phone"
                label="الهاتف"
                value={createForm.phone}
                onChange={e => setCreateForm(f => ({ ...f, phone: e.target.value }))}
                required
                style={{ marginTop: 8 }}
              />
              <Input
                id="new-customer-national-id"
                label="الرقم القومي (اختياري)"
                value={createForm.nationalId || ''}
                onChange={e => setCreateForm(f => ({ ...f, nationalId: e.target.value }))}
                style={{ marginTop: 8 }}
                dir="ltr"
              />
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <Button id="create-customer-submit" variant="primary" loading={creating} onClick={handleCreate}>
                  إضافة وتحديد
                </Button>
                <Button id="cancel-create-customer" variant="ghost" onClick={() => setShowCreate(false)}>
                  إلغاء
                </Button>
              </div>
            </div>
          )}
        </PermissionGate>
      </div>

      <div className="rental-pos-actions" style={{ marginTop: 24 }}>
        <Button id="back-to-duration" variant="ghost" onClick={onBack}>
          <ChevronLeft size={16} /> رجوع
        </Button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step 4: Review + Start Rental
// ---------------------------------------------------------------------------

interface ReviewStepProps {
  skate: SkateDTO
  customer: CustomerListItemDTO
  durationMinutes: number
  pricePerHour: number
  rentalAmount: number
  notes: string
  onNotesChange: (n: string) => void
  onBack: () => void
  onConfirm: (payments: { paymentMethodId: number; amount: number }[]) => void
  loading: boolean
  error: string | null
}

function ReviewStep({
  skate, customer, durationMinutes, pricePerHour, rentalAmount,
  notes, onNotesChange, onBack, onConfirm, loading, error,
}: ReviewStepProps) {
  const now = new Date()
  const expectedEnd = new Date(now.getTime() + durationMinutes * 60000)

  const [methods, setMethods] = useState<PaymentMethodDTO[]>([])
  const [methodsLoading, setMethodsLoading] = useState(true)
  const [payments, setPayments] = useState<{ methodId: number; amount: string }[]>([])

  useEffect(() => {
    let active = true
    paymentsService.listMethods().then(res => {
      if (!active) return
      const fetched = res.data || []
      setMethods(fetched)
      setMethodsLoading(false)
      if (fetched.length > 0) {
        setPayments([{ methodId: fetched[0].id, amount: rentalAmount.toString() }])
      }
    }).catch(() => {
      if (active) setMethodsLoading(false)
    })
    return () => { active = false }
  }, [rentalAmount])

  const totalPayments = payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0)
  const isExact = Math.abs(totalPayments - rentalAmount) < 0.01

  const handleAddPayment = () => {
    if (methods.length === 0) return
    setPayments([...payments, { methodId: methods[0].id, amount: '' }])
  }

  const handleRemovePayment = (idx: number) => {
    setPayments(payments.filter((_, i) => i !== idx))
  }

  const handleUpdatePayment = (idx: number, field: 'methodId' | 'amount', value: string | number) => {
    const next = [...payments]
    next[idx] = { ...next[idx], [field]: value }
    setPayments(next)
  }

  const handleConfirm = () => {
    if (!isExact) return
    const formatted = payments.map(p => ({ paymentMethodId: p.methodId, amount: parseFloat(p.amount) || 0 }))
    onConfirm(formatted)
  }

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
          {customer.nationalIdMasked !== '—' && (
            <div className="review-row"><span className="review-label">الرقم القومي</span><span className="review-value" dir="ltr">{customer.nationalIdMasked}</span></div>
          )}
        </div>

        <div className="review-section">
          <h3 className="review-section-title">بيانات الاسكيت</h3>
          <div className="review-row"><span className="review-label">كود الاسكيت</span><span className="review-value">{skate.skateCode}</span></div>
          <div className="review-row"><span className="review-label">المقاس</span><span className="review-value">{skate.size}</span></div>
          {skate.type && <div className="review-row"><span className="review-label">النوع</span><span className="review-value">{skate.type}</span></div>}
        </div>

        <div className="review-section">
          <h3 className="review-section-title">بيانات الإيجار</h3>
          <div className="review-row"><span className="review-label">المدة</span><span className="review-value">{durationMinutes} دقيقة</span></div>
          <div className="review-row"><span className="review-label">السعر بالساعة</span><span className="review-value">{formatCurrency(pricePerHour)}</span></div>
          <div className="review-row review-row--highlight"><span className="review-label">مبلغ الإيجار</span><span className="review-value review-amount">{formatCurrency(rentalAmount)}</span></div>
          <div className="review-row"><span className="review-label">وقت البداية</span><span className="review-value" dir="ltr">{now.toLocaleTimeString('ar-EG')}</span></div>
          <div className="review-row"><span className="review-label">نهاية متوقعة</span><span className="review-value" dir="ltr">{expectedEnd.toLocaleTimeString('ar-EG')}</span></div>
        </div>

        <div style={{ marginTop: 16 }}>
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
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
              fontSize: 'var(--font-size-sm)',
              fontFamily: 'var(--font-family)',
              resize: 'vertical',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div className="review-section" style={{ marginTop: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 className="review-section-title" style={{ margin: 0 }}>الدفع</h3>
            <Button variant="ghost" onClick={handleAddPayment} style={{ padding: '4px 8px', fontSize: 'var(--font-size-xs)', height: 'auto', minHeight: 'unset' }}>
              <Plus size={14} style={{ marginInlineEnd: 4 }} /> تقسيم
            </Button>
          </div>

          {methodsLoading ? (
            <div style={{ textAlign: 'center', padding: '16px 0' }}><LoadingSpinner /></div>
          ) : methods.length === 0 ? (
            <Alert variant="danger">لا توجد طرق دفع متاحة</Alert>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {payments.map((p, idx) => (
                <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <select
                    className="rental-search-input"
                    value={p.methodId}
                    onChange={e => handleUpdatePayment(idx, 'methodId', parseInt(e.target.value, 10))}
                    style={{ flex: 1, appearance: 'auto' }}
                  >
                    {methods.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                  <Input
                    id={`payment-amount-${idx}`}
                    label=""
                    type="number"
                    min="0"
                    step="1"
                    value={p.amount}
                    onChange={e => handleUpdatePayment(idx, 'amount', e.target.value)}
                    style={{ width: 100 }}
                  />
                  {payments.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemovePayment(idx)}
                      style={{ background: 'none', border: 'none', color: 'var(--color-danger-text)', cursor: 'pointer', padding: 4 }}
                      title="حذف"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--color-border-subtle)', fontWeight: 'var(--font-weight-bold)' }}>
                <span style={{ color: isExact ? 'var(--color-success-text)' : 'var(--color-danger-text)' }}>إجمالي المدفوع: {formatCurrency(totalPayments)}</span>
                <span>المطلوب: {formatCurrency(rentalAmount)}</span>
              </div>
              {!isExact && (
                <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-danger-text)' }}>يجب أن يتطابق الإجمالي مع المبلغ المطلوب بالضبط.</span>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="rental-pos-actions">
        <Button id="back-to-customer" variant="ghost" onClick={onBack} disabled={loading}>
          <ChevronLeft size={16} /> رجوع
        </Button>
        <Button
          id="start-rental-btn"
          variant="primary"
          loading={loading}
          onClick={handleConfirm}
          disabled={!isExact || methodsLoading}
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
  const labels = ['الاسكيت', 'المدة', 'العميل', 'المراجعة']
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
  const { printInvoice } = usePrint()

  const [reservationId, setReservationId] = useState<number | null>(null)
  const [step, setStep] = useState(1)
  const [selectedSkate, setSelectedSkate] = useState<SkateDTO | null>(null)
  const [durationMinutes, setDuration] = useState(0)
  const [pricePerHour, setPricePerHour] = useState(0)
  const [rentalAmount, setRentalAmount] = useState(0)
  const [selectedCustomer, setCustomer] = useState<CustomerListItemDTO | null>(null)
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    const resId = searchParams.get('reservationId')
    if (resId) {
      setReservationId(Number(resId))
      reservationsService.getReservation(Number(resId))
        .then(res => {
          setSelectedSkate(res.skate as unknown as SkateDTO)
          setCustomer(res.customer as unknown as CustomerListItemDTO)
          setStep(2)
        })
        .catch(() => {
          showToast({ type: 'error', title: 'فشل تحميل بيانات الحجز' })
        })
    }
  }, [searchParams])

  const handleConfirm = async (payments: { paymentMethodId: number; amount: number }[]) => {
    if (!selectedSkate || !selectedCustomer) return
    setSubmitting(true); setSubmitError(null)
    try {
      const res = await rentalsService.create({
        skateId: selectedSkate.id,
        customerId: selectedCustomer.id,
        durationMinutes,
        notes: notes.trim() || undefined,
        reservationId: reservationId || undefined,
        payments,
      })
      showToast({ type: 'success', title: `تم بدء الإيجار: ${res.data.rentalCode}` })

      // Auto-print invoice
      try {
        const invoiceData = await invoicesService.getRentalInvoice(res.data.id)
        printInvoice(invoiceData)
      } catch (err) {
        showToast({ type: 'error', title: 'فشلت طباعة الفاتورة' })
      }

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
          <SkatePicker
            onSelect={skate => { setSelectedSkate(skate); setStep(2) }}
          />
        )}
        {step === 2 && selectedSkate && (
          <DurationPicker
            skate={selectedSkate}
            onBack={() => { setSelectedSkate(null); setStep(1) }}
            onSelect={(dur, rate, amount) => {
              setDuration(dur); setPricePerHour(rate); setRentalAmount(amount)
              setStep(3)
            }}
          />
        )}
        {step === 3 && (
          <CustomerPicker
            onSelect={customer => { setCustomer(customer); setStep(4) }}
            onBack={() => setStep(2)}
          />
        )}
        {step === 4 && selectedSkate && selectedCustomer && (
          <ReviewStep
            skate={selectedSkate}
            customer={selectedCustomer}
            durationMinutes={durationMinutes}
            pricePerHour={pricePerHour}
            rentalAmount={rentalAmount}
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
        .rental-pos-container { max-width: 640px; margin: 0 auto; }
        .rental-pos-step { background: var(--color-surface); border-radius: var(--radius-lg); padding: var(--space-6); border: 1px solid var(--color-border); }
        .rental-pos-step-header { margin-bottom: var(--space-5); }
        .rental-pos-step-title { font-size: var(--font-size-lg); font-weight: var(--font-weight-bold); color: var(--color-text-primary); margin: 0 0 4px; }
        .rental-pos-step-subtitle { font-size: var(--font-size-sm); color: var(--color-text-secondary); margin: 0; }
        .rental-pos-search { margin-bottom: var(--space-4); }
        .rental-search-input { width: 100%; padding: 10px 12px; border-radius: var(--radius-md); border: 1px solid var(--color-border); font-size: var(--font-size-sm); font-family: var(--font-family); box-sizing: border-box; background: var(--color-input-bg); color: var(--color-text-primary); outline: none; }
        .rental-search-input:focus { border-color: var(--color-primary); box-shadow: 0 0 0 3px rgba(var(--color-primary-rgb), 0.12); }
        .skate-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: var(--space-3); margin-bottom: var(--space-3); }
        .skate-card { background: var(--color-surface-raised); border: 2px solid var(--color-border); border-radius: var(--radius-md); padding: var(--space-4); cursor: pointer; text-align: center; transition: all var(--transition-fast); display: flex; flex-direction: column; align-items: center; gap: 6px; min-height: 110px; }
        .skate-card:hover { border-color: var(--color-primary); background: var(--color-primary-subtle); }
        .skate-card:focus { outline: 2px solid var(--color-primary); outline-offset: 2px; }
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
        .price-preview-box { background: var(--color-surface-raised); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: var(--space-4); margin: var(--space-4) 0; min-height: 60px; display: flex; flex-direction: column; justify-content: center; gap: 6px; }
        .price-preview-rate { font-size: var(--font-size-sm); color: var(--color-text-secondary); display: flex; align-items: center; gap: 6px; }
        .price-preview-amount { font-size: var(--font-size-xl); font-weight: var(--font-weight-bold); color: var(--color-text-primary); }
        .customer-results { display: flex; flex-direction: column; gap: var(--space-2); }
        .customer-result-item { background: var(--color-surface-raised); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: var(--space-3) var(--space-4); cursor: pointer; text-align: right; transition: all var(--transition-fast); width: 100%; }
        .customer-result-item:hover { border-color: var(--color-primary); background: var(--color-primary-subtle); }
        .customer-result-item:focus { outline: 2px solid var(--color-primary); outline-offset: 2px; }
        .customer-result-name { font-weight: var(--font-weight-medium); color: var(--color-text-primary); display: flex; align-items: center; gap: 6px; }
        .customer-result-info { font-size: var(--font-size-xs); color: var(--color-text-secondary); margin-top: 2px; }
        .create-customer-form { padding: var(--space-4); background: var(--color-surface-raised); border-radius: var(--radius-md); border: 1px solid var(--color-border); }
        .rental-pos-actions { display: flex; justify-content: space-between; margin-top: var(--space-6); padding-top: var(--space-4); border-top: 1px solid var(--color-border); }
        .rental-empty-state { text-align: center; padding: var(--space-8); }
        .review-card { display: flex; flex-direction: column; gap: var(--space-4); }
        .review-section { background: var(--color-surface-raised); border-radius: var(--radius-md); padding: var(--space-4); }
        .review-section-title { font-size: var(--font-size-sm); font-weight: var(--font-weight-bold); color: var(--color-text-secondary); margin: 0 0 12px; text-transform: uppercase; letter-spacing: 0.05em; }
        .review-row { display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid var(--color-border-subtle); }
        .review-row:last-child { border-bottom: none; }
        .review-row--highlight { background: var(--color-primary-subtle); margin: 0 -4px; padding: 8px 4px; border-radius: var(--radius-sm); }
        .review-label { font-size: var(--font-size-sm); color: var(--color-text-secondary); }
        .review-value { font-size: var(--font-size-sm); color: var(--color-text-primary); font-weight: var(--font-weight-medium); }
        .review-amount { font-size: var(--font-size-lg); font-weight: var(--font-weight-bold); color: var(--color-primary); }
        .step-indicator { display: flex; align-items: flex-start; justify-content: center; gap: 0; margin-bottom: var(--space-6); overflow-x: auto; padding: var(--space-2) 0; }
        .step-indicator-item { display: flex; flex-direction: column; align-items: center; position: relative; flex: 1; max-width: 120px; }
        .step-indicator-circle { width: 32px; height: 32px; border-radius: 50%; border: 2px solid var(--color-border); display: flex; align-items: center; justify-content: center; font-size: var(--font-size-sm); font-weight: var(--font-weight-bold); background: var(--color-surface); color: var(--color-text-secondary); position: relative; z-index: 1; }
        .step-indicator-item.active .step-indicator-circle { border-color: var(--color-primary); background: var(--color-primary); color: white; }
        .step-indicator-item.done .step-indicator-circle { border-color: var(--color-success-text); background: var(--color-success-bg); color: var(--color-success-text); }
        .step-indicator-label { font-size: var(--font-size-xs); color: var(--color-text-muted); margin-top: 6px; text-align: center; }
        .step-indicator-item.active .step-indicator-label { color: var(--color-primary); font-weight: var(--font-weight-medium); }
        .step-indicator-item.done .step-indicator-label { color: var(--color-text-secondary); }
        .step-indicator-line { position: absolute; top: 16px; left: -50%; width: 100%; height: 2px; background: var(--color-border); z-index: 0; }
        .step-indicator-item.done .step-indicator-line { background: var(--color-success-text); }
        .step-indicator-item.active .step-indicator-line { background: var(--color-primary); }
      `}</style>
    </div>
  )
}
