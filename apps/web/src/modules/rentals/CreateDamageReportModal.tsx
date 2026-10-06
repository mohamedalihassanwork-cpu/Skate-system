import { useState, useEffect } from 'react'
import { CheckCircle } from 'lucide-react'
import { Modal, Button, Alert, Input, Select, useToast } from '../../components/ui'
import { damageService } from '../damage/damage.service'
import { paymentsService, type PaymentMethodDTO } from '../payments/payments.service'
import type { ActiveRentalDTO } from './rentals.service'

interface CreateDamageReportModalProps {
  isOpen: boolean
  onClose: () => void
  rental: ActiveRentalDTO | null
  inspectionId: number | null
  onSuccess: () => void
}

export function CreateDamageReportModal({ isOpen, onClose, rental, inspectionId, onSuccess }: CreateDamageReportModalProps) {
  const { showToast } = useToast()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [damageType, setDamageType] = useState<'wheel' | 'strap' | 'brake' | 'bearing' | 'body' | 'other'>('wheel')
  const [severity, setSeverity] = useState<'minor' | 'moderate' | 'severe'>('minor')
  const [description, setDescription] = useState('')
  const [customerCharge, setCustomerCharge] = useState(0)
  const [maintenanceRequired, setMaintenanceRequired] = useState(true)

  const [methods, setMethods] = useState<PaymentMethodDTO[]>([])
  const [paymentMethodId, setPaymentMethodId] = useState<string>('')

  useEffect(() => {
    if (isOpen) {
      paymentsService.listMethods().then(res => {
        setMethods(res.data)
        if (res.data.length > 0) setPaymentMethodId(String(res.data[0].id))
      }).catch(console.error)
    }
  }, [isOpen])

  if (!isOpen || !rental || !inspectionId) return null

  const handleSubmit = async () => {
    if (!description.trim()) {
      setError('يرجى إدخال وصف للضرر')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await damageService.create({
        rentalId: rental.id,
        inspectionId,
        skateId: rental.skate.id,
        customerId: rental.customer.id,
        damageType,
        severity,
        description: description.trim(),
        customerCharge,
        maintenanceRequired
      })

      // Attempt to collect charge if set
      if (customerCharge > 0 && paymentMethodId) {
        await damageService.pay(res.data.id, {
          payments: [{ paymentMethodId: Number(paymentMethodId), amount: customerCharge }]
        })
      }

      showToast({ type: 'success', title: 'تم إنشاء تقرير الضرر بنجاح' })
      onSuccess()
      onClose()
    } catch (err: unknown) {
      const errObj = err as { response?: { data?: { error?: { message?: string } } }; message?: string }
      setError(errObj?.response?.data?.error?.message ?? errObj?.message ?? 'حدث خطأ أثناء إنشاء التقرير')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="تقرير ضرر اسكيت" size="base">
      <div className="damage-report-form">
        {error && <Alert variant="danger" style={{ marginBottom: 16 }}>{error}</Alert>}

        <Alert variant="warning" style={{ marginBottom: 16 }}>
          <strong>تنبيه:</strong> تم الإبلاغ عن وجود تلف بالاسكيت أثناء الفحص. يجب إكمال هذا التقرير لتسجيل الضرر.
        </Alert>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 'var(--font-size-xs)', marginBottom: 4 }}>نوع الضرر</label>
            <select
              value={damageType}
              onChange={e => setDamageType(e.target.value as any)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
                background: 'var(--color-surface)',
                fontFamily: 'inherit'
              }}
            >
              <option value="wheel">عجل</option>
              <option value="brake">فرامل</option>
              <option value="strap">أربطة</option>
              <option value="bearing">رولمان بلي</option>
              <option value="body">هيكل</option>
              <option value="other">أخرى</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 'var(--font-size-xs)', marginBottom: 4 }}>مدى الضرر</label>
            <select
              value={severity}
              onChange={e => setSeverity(e.target.value as any)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
                background: 'var(--color-surface)',
                fontFamily: 'inherit'
              }}
            >
              <option value="minor">بسيط</option>
              <option value="moderate">متوسط</option>
              <option value="severe">جسيم</option>
            </select>
          </div>
        </div>

        <Input
          id="damage-description"
          type="text"
          label="الوصف"
          value={description}
          onChange={e => setDescription(e.target.value)}
          required
        />

        <div style={{ marginTop: 16, marginBottom: 16, display: 'grid', gridTemplateColumns: customerCharge > 0 ? '1fr 1fr' : '1fr', gap: 12 }}>
          <Input
            id="customer-charge"
            type="number"
            min="0"
            step="1"
            label="غرامة العميل (ج.م) إن وجدت"
            value={customerCharge}
            onChange={e => setCustomerCharge(Math.max(0, parseFloat(e.target.value) || 0))}
          />
          {customerCharge > 0 && (
            <Select
              id="payment-method"
              label="طريقة الدفع"
              value={paymentMethodId}
              onChange={e => setPaymentMethodId(e.target.value)}
              options={[
                { value: '', label: 'اختر طريقة الدفع...' },
                ...methods.map(m => ({ value: String(m.id), label: m.name }))
              ]}
            />
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 12, background: maintenanceRequired ? 'var(--color-danger-bg)' : 'var(--color-surface-raised)', borderRadius: 'var(--radius-md)' }}>
          <input
            type="checkbox"
            id="damage-maintenance-required"
            checked={maintenanceRequired}
            onChange={e => setMaintenanceRequired(e.target.checked)}
            style={{ width: 18, height: 18 }}
          />
          <label htmlFor="damage-maintenance-required" style={{ fontWeight: 'var(--font-weight-medium)', cursor: 'pointer', color: maintenanceRequired ? 'var(--color-danger-text)' : 'inherit' }}>
            تتطلب صيانة (إيقاف استخدام الاسكيت)
          </label>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
        <Button variant="ghost" onClick={onClose} disabled={loading}>إلغاء وتخطي التقرير</Button>
        <Button
          variant="primary"
          onClick={handleSubmit}
          loading={loading}
        >
          <CheckCircle size={16} style={{ marginInlineEnd: 6 }} /> حفظ التقرير
        </Button>
      </div>
    </Modal>
  )
}
