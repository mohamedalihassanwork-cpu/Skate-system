/**
 * KOSHK SKATE ERP — Settings Page
 * Phase 05.5 — Settings Administration
 *
 * Provides the administrator UI for configuring the five supported settings:
 *   1. rental_hourly_rate       — pricing
 *   2. rental_duration_options  — POS duration picker
 *   3. late_fee_per_minute      — late fee
 *   4. print_invoices_enabled   — auto-print toggle
 *   5. notification_sound_enabled — notification sound toggle
 *
 * Permission model (SETT-002):
 *   - Route protected by settings.view (in App.tsx)
 *   - Save action gated by settings.manage (PermissionGate below)
 *   - Backend PATCH enforces settings.manage independently (Rule 13)
 *
 * Save behavior (SETT-006 — Option 2):
 *   - Computes a diff between initialSettings and currentForm
 *   - Only sends changed keys in the PATCH body
 *   - No PATCH issued if nothing has changed
 *   - initialSettings snapshot updated only on server success
 *
 * Design system:
 *   - Card component replaces raw <div style> containers (UI-007 fix)
 *   - CheckboxField replaces raw <input type="checkbox"> (UI-002 fix)
 *   - TagInput (SETT-005) for rental_duration_options
 *   - Input[type=number] for numeric settings
 *   - All labels in Arabic (Rule 12)
 *   - RTL-native layout (Rule 12)
 *   - Mobile: single-column stacked (UI-009)
 */

import { useState, useEffect, useCallback } from 'react'
import { DollarSign, Clock, Printer, Bell, Save } from 'lucide-react'
import {
  PageLoader,
  Alert,
  Button,
  Card,
  Input,
  CheckboxField,
  useToast,
} from '../../components/ui'
import { TagInput } from '../../components/ui/TagInput'
import { PermissionGate } from '../../components/PermissionGate'
import { settingsApi, type AppSettings } from './settings.api'

// ---------------------------------------------------------------------------
// Page-level styles (injected once — no structural inline styles, UI-007)
// ---------------------------------------------------------------------------

const PAGE_STYLES = `
  .settings-page-content {
    max-width: 800px;
    display: flex;
    flex-direction: column;
    gap: var(--space-5);
  }

  .settings-section-header {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    margin-bottom: var(--space-5);
    padding-bottom: var(--space-4);
    border-bottom: 1px solid var(--color-border);
  }

  .settings-section-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    background-color: var(--color-navy-50);
    border-radius: var(--radius-base);
    color: var(--color-navy-700);
    flex-shrink: 0;
  }

  .settings-section-title {
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-bold);
    color: var(--color-text-primary);
    line-height: var(--line-height-tight);
    margin: 0;
  }

  .settings-section-subtitle {
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
    margin: var(--space-1) 0 0;
  }

  .settings-field-group {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .settings-dirty-badge {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
    padding: var(--space-1) var(--space-3);
    background-color: var(--color-neutral-bg);
    border-radius: var(--radius-full, 9999px);
    border: 1px solid var(--color-border);
  }

  .settings-dirty-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background-color: var(--color-warning-text);
    flex-shrink: 0;
  }

  .settings-view-only-notice {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
    padding: var(--space-3) var(--space-4);
    background-color: var(--color-neutral-bg);
    border-radius: var(--radius-base);
    border: 1px solid var(--color-border);
  }

  /* Mobile: full-width layout */
  @media (max-width: 640px) {
    .settings-page-content { max-width: 100%; gap: var(--space-4); }
    .settings-section-header { flex-wrap: wrap; }
    .page-header { flex-direction: column; align-items: flex-start; gap: var(--space-3); }
    .page-header-actions { width: 100%; }
    .page-header-actions .btn { width: 100%; justify-content: center; }
  }
`

let settingsStylesInjected = false
function injectSettingsStyles() {
  if (settingsStylesInjected) return
  settingsStylesInjected = true
  const el = document.createElement('style')
  el.textContent = PAGE_STYLES
  document.head.appendChild(el)
}

// ---------------------------------------------------------------------------
// Duration options validator (SETT-003)
// ---------------------------------------------------------------------------

function validateDurationValue(v: number): string | null {
  if (!Number.isInteger(v) || v <= 0) return 'يجب أن تكون القيمة عدداً صحيحاً موجباً'
  return null
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Compute which settings keys have changed from initial → current */
function computeDiff(
  initial: AppSettings,
  current: AppSettings
): Partial<AppSettings> {
  const diff: Partial<AppSettings> = {}
  const allKeys: (keyof AppSettings)[] = [
    'rental_hourly_rate',
    'rental_duration_options',
    'late_fee_per_minute',
    'print_invoices_enabled',
    'notification_sound_enabled',
  ]
  for (const key of allKeys) {
    const oldVal = initial[key]
    const newVal = current[key]
    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      // Type-safe assignment
      ;(diff as any)[key] = newVal
    }
  }
  return diff
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SettingsPage() {
  injectSettingsStyles()

  const { showToast } = useToast()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /** Snapshot of values as loaded from server — used for dirty detection */
  const [initialSettings, setInitialSettings] = useState<AppSettings>({})

  /** Live form state edited by the user */
  const [form, setForm] = useState<AppSettings>({})

  /** Per-field frontend validation errors */
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof AppSettings, string>>>({})

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await settingsApi.getSettings()
      setInitialSettings(res.data)
      setForm(res.data)
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'فشل تحميل الإعدادات')
    } finally {
      setLoading(false)
    }
  }

  /** Validate all fields — returns true if all valid */
  const validateForm = useCallback((): boolean => {
    const errors: Partial<Record<keyof AppSettings, string>> = {}

    const rate = form.rental_hourly_rate
    if (rate === undefined || rate === null || isNaN(rate as number)) {
      errors.rental_hourly_rate = 'هذا الحقل مطلوب'
    } else if ((rate as number) <= 0) {
      errors.rental_hourly_rate = 'يجب أن يكون سعر الإيجار بالساعة أكبر من صفر'
    }

    const fee = form.late_fee_per_minute
    if (fee === undefined || fee === null || isNaN(fee as number)) {
      errors.late_fee_per_minute = 'هذا الحقل مطلوب'
    } else if ((fee as number) < 0) {
      errors.late_fee_per_minute = 'لا يمكن أن يكون رسم التأخير قيمة سالبة'
    }

    const durations = form.rental_duration_options ?? []
    if (durations.length === 0) {
      errors.rental_duration_options = 'يجب أن يحتوي على قيمة واحدة على الأقل'
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }, [form])

  const handleSave = async () => {
    if (!validateForm()) return

    // SETT-006: only send changed keys
    const diff = computeDiff(initialSettings, form)
    if (Object.keys(diff).length === 0) {
      showToast({ type: 'info', title: 'لا توجد تغييرات للحفظ' })
      return
    }

    setSaving(true)
    setError(null)
    try {
      const res = await settingsApi.updateSettings(diff)
      // Update both snapshots from server response
      setInitialSettings(res.data)
      setForm(res.data)
      showToast({ type: 'success', title: 'تم حفظ الإعدادات بنجاح' })
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'فشل حفظ الإعدادات')
    } finally {
      setSaving(false)
    }
  }

  const isDirty = Object.keys(computeDiff(initialSettings, form)).length > 0

  if (loading) return <PageLoader label="جارٍ تحميل الإعدادات" />

  return (
    <div className="page-container">
      {/* Page Header */}
      <div className="page-header">
        <div className="page-header-text">
          <h1 className="page-header-title">الإعدادات</h1>
          <p className="page-header-subtitle">إدارة إعدادات النظام والتسعير وتفضيلات التشغيل</p>
        </div>
        <div className="page-header-actions">
          {isDirty && (
            <span className="settings-dirty-badge">
              <span className="settings-dirty-dot" aria-hidden="true" />
              توجد تغييرات غير محفوظة
            </span>
          )}
          {/* Save button — hidden for users without settings.manage (SETT-002) */}
          <PermissionGate
            permission="settings.manage"
            fallback={
              <span className="settings-view-only-notice">
                وضع العرض فقط — تواصل مع المسؤول لتعديل الإعدادات
              </span>
            }
          >
            <Button
              variant="primary"
              loading={saving}
              onClick={handleSave}
              id="settings-save-btn"
            >
              <Save size={16} aria-hidden="true" />
              حفظ التغييرات
            </Button>
          </PermissionGate>
        </div>
      </div>

      {/* Error alert */}
      {error && (
        <Alert variant="danger" className="settings-error-alert">
          {error}
        </Alert>
      )}

      {/* Settings sections */}
      <div className="settings-page-content">

        {/* ── 1. Pricing ──────────────────────────────────────────────────── */}
        <Card>
          <div className="settings-section-header">
            <span className="settings-section-icon" aria-hidden="true">
              <DollarSign size={18} />
            </span>
            <div>
              <h2 className="settings-section-title">التسعير</h2>
              <p className="settings-section-subtitle">إعدادات سعر الإيجار والرسوم</p>
            </div>
          </div>

          <div className="settings-field-group">
            <Input
              id="rental-hourly-rate"
              label="سعر الإيجار بالساعة (ج.م)"
              type="number"
              min="0.01"
              step="0.01"
              value={form.rental_hourly_rate ?? ''}
              onChange={(e) => {
                const val = parseFloat(e.target.value)
                setForm((f) => ({ ...f, rental_hourly_rate: isNaN(val) ? undefined : val }))
                if (fieldErrors.rental_hourly_rate) {
                  setFieldErrors((fe) => ({ ...fe, rental_hourly_rate: undefined }))
                }
              }}
              error={fieldErrors.rental_hourly_rate}
              helperText="سيُطبَّق على الإيجارات الجديدة فقط — لا يؤثر على الإيجارات السابقة"
              required
            />

            <Input
              id="late-fee-per-minute"
              label="رسم التأخير لكل دقيقة (ج.م)"
              type="number"
              min="0"
              step="0.01"
              value={form.late_fee_per_minute ?? ''}
              onChange={(e) => {
                const val = parseFloat(e.target.value)
                setForm((f) => ({ ...f, late_fee_per_minute: isNaN(val) ? undefined : val }))
                if (fieldErrors.late_fee_per_minute) {
                  setFieldErrors((fe) => ({ ...fe, late_fee_per_minute: undefined }))
                }
              }}
              error={fieldErrors.late_fee_per_minute}
              helperText="القيمة صفر تعني: لا يُحتسب رسم تأخير. القيم السالبة غير مسموح بها."
              required
            />
          </div>
        </Card>

        {/* ── 2. Duration Options ──────────────────────────────────────────── */}
        <Card>
          <div className="settings-section-header">
            <span className="settings-section-icon" aria-hidden="true">
              <Clock size={18} />
            </span>
            <div>
              <h2 className="settings-section-title">خيارات مدة الإيجار</h2>
              <p className="settings-section-subtitle">المدد المعروضة في نقطة البيع (بالدقائق)</p>
            </div>
          </div>

          <TagInput
            id="rental-duration-options"
            label="خيارات المدة (دقائق)"
            values={form.rental_duration_options ?? []}
            onChange={(vals) => {
              setForm((f) => ({ ...f, rental_duration_options: vals }))
              if (fieldErrors.rental_duration_options) {
                setFieldErrors((fe) => ({ ...fe, rental_duration_options: undefined }))
              }
            }}
            validate={validateDurationValue}
            error={fieldErrors.rental_duration_options}
            helperText="أدخل قيمة (دقائق) ثم اضغط Enter أو فاصلة. اضغط ← لحذف آخر قيمة."
            required
          />
        </Card>

        {/* ── 3. Printing ──────────────────────────────────────────────────── */}
        <Card>
          <div className="settings-section-header">
            <span className="settings-section-icon" aria-hidden="true">
              <Printer size={18} />
            </span>
            <div>
              <h2 className="settings-section-title">الطباعة</h2>
              <p className="settings-section-subtitle">إعدادات طباعة الفواتير</p>
            </div>
          </div>

          <div className="settings-field-group">
            <CheckboxField
              id="print-invoices-enabled"
              label="الطباعة التلقائية مفعّلة"
              checked={form.print_invoices_enabled ?? false}
              onChange={(checked) => setForm((f) => ({ ...f, print_invoices_enabled: checked }))}
              helperText="سيتم طباعة الفاتورة تلقائياً عند إتمام الإيجار أو البيع"
            />
          </div>
        </Card>

        {/* ── 4. Notifications ─────────────────────────────────────────────── */}
        <Card>
          <div className="settings-section-header">
            <span className="settings-section-icon" aria-hidden="true">
              <Bell size={18} />
            </span>
            <div>
              <h2 className="settings-section-title">التنبيهات</h2>
              <p className="settings-section-subtitle">إعدادات إشعارات النظام</p>
            </div>
          </div>

          <div className="settings-field-group">
            <CheckboxField
              id="notification-sound-enabled"
              label="تشغيل صوت التنبيهات"
              checked={form.notification_sound_enabled ?? false}
              onChange={(checked) => setForm((f) => ({ ...f, notification_sound_enabled: checked }))}
              helperText="تنبيه صوتي عند اقتراب أو انتهاء وقت الإيجار"
            />
          </div>
        </Card>

      </div>
    </div>
  )
}
