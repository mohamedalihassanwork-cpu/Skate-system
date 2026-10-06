import { useState, useEffect, useRef } from 'react'
import { CheckCircle } from 'lucide-react'
import { Modal, Button, Alert, Input, LoadingSpinner, Badge, useToast } from '../../components/ui'
import { rentalsService, type ActiveRentalDTO, type ReturnRentalBody } from './rentals.service'
import { paymentsService, type PaymentMethodDTO } from '../payments/payments.service'
import { formatCurrency } from '../../utils/currency'

import { Trash2, Plus } from 'lucide-react'

interface ReturnRentalModalProps {
  isOpen: boolean
  onClose: () => void
  rental: ActiveRentalDTO | null
  onSuccess: (hasDamage?: boolean, inspectionId?: number) => void
}

export function ReturnRentalModal({ isOpen, onClose, rental, onSuccess }: ReturnRentalModalProps) {
  const { showToast } = useToast()


  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [lateFeePerMinute, setLateFeePerMinute] = useState<number>(0)
  const [methods, setMethods] = useState<PaymentMethodDTO[]>([])
  const [methodsLoading, setMethodsLoading] = useState(false)

  // Inspection state
  const [wheelsCondition, setWheelsCondition] = useState<'good' | 'minor_damage' | 'damaged' | 'broken'>('good')
  const [brakeCondition, setBrakeCondition] = useState<'good' | 'minor_damage' | 'damaged' | 'broken'>('good')
  const [strapCondition, setStrapCondition] = useState<'good' | 'minor_damage' | 'damaged' | 'broken'>('good')
  const [bearingsCondition, setBearingsCondition] = useState<'good' | 'minor_damage' | 'damaged' | 'broken'>('good')
  const [bodyCondition, setBodyCondition] = useState<'good' | 'minor_damage' | 'damaged' | 'broken'>('good')
  const [maintenanceRequired, setMaintenanceRequired] = useState(false)
  const [otherNotes, setOtherNotes] = useState('')

  // Fee state
  const [waivedFee, setWaivedFee] = useState(0)
  const [waiverReason, setWaiverReason] = useState('')
  const [payments, setPayments] = useState<{ methodId: number; amount: string }[]>([])
  const modalBodyRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen) {
      setLoading(false)
      setError(null)

      // Reset form
      setWheelsCondition('good')
      setBrakeCondition('good')
      setStrapCondition('good')
      setBearingsCondition('good')
      setBodyCondition('good')
      setMaintenanceRequired(false)
      setOtherNotes('')
      setWaivedFee(0)
      setWaiverReason('')

      // Fetch config & methods
      let active = true
      setMethodsLoading(true)

      Promise.all([
        rentalsService.getConfig(),
        paymentsService.listMethods()
      ]).then(([configRes, methodsRes]) => {
        if (!active) return
        const lateFeePerMin = configRes.data.lateFeePerMinute || 0
        setLateFeePerMinute(lateFeePerMin)

        let initialLateFee = 0
        if (rental && rental.operationalStatus === 'overdue' && lateFeePerMin > 0) {
          const endMs = new Date(rental.expectedEndAt).getTime()
          const nowMs = Date.now()
          const diffMs = nowMs - endMs
          if (diffMs > 0) {
            const lateMinutes = Math.ceil(diffMs / 60000)
            initialLateFee = lateMinutes * lateFeePerMin
          }
        }

        const fetchedMethods = methodsRes.data || []
        setMethods(fetchedMethods)
        if (fetchedMethods.length > 0 && initialLateFee > 0) {
          setPayments([{ methodId: fetchedMethods[0].id, amount: initialLateFee.toString() }])
        } else {
          setPayments([])
        }
        setMethodsLoading(false)
      }).catch(() => {
        if (active) {
          setError('تعذر تحميل إعدادات الدفع ورسوم التأخير')
          setMethodsLoading(false)
        }
      })

      return () => { active = false }
    }
  }, [isOpen])

  const [nowMs, setNowMs] = useState(Date.now())

  useEffect(() => {
    if (!isOpen) return
    const interval = setInterval(() => setNowMs(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [isOpen])

  // Calculate Late Fee locally
  let expectedLateFee = 0
  if (rental && rental.operationalStatus === 'overdue' && lateFeePerMinute > 0) {
    const endMs = new Date(rental.expectedEndAt).getTime()
    const diffMs = nowMs - endMs
    if (diffMs > 0) {
      const lateMinutes = Math.ceil(diffMs / 60000)
      expectedLateFee = lateMinutes * lateFeePerMinute
    }
  }

  // Update default payment amount when waived fee changes manually
  const handleWaivedFeeChange = (valStr: string) => {
    const val = Math.min(expectedLateFee, Math.max(0, parseFloat(valStr) || 0))
    setWaivedFee(val)

    const remainingToPay = Math.max(0, expectedLateFee - val)
    if (payments.length === 1 && remainingToPay > 0) {
      setPayments([{ ...payments[0], amount: remainingToPay.toString() }])
    } else if (remainingToPay === 0) {
      setPayments([])
    }
  }

  if (!isOpen || !rental) return null

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

  const totalPayments = payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0)
  const remainingToPay = Math.max(0, expectedLateFee - waivedFee)
  const isExact = expectedLateFee === 0 || Math.abs(totalPayments - remainingToPay) < 0.01

  const handleSubmit = async () => {
    if (expectedLateFee > 0 && !isExact) {
      setError('إجمالي المدفوعات لا يساوي رسوم التأخير المتبقية')
      modalBodyRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    if (waivedFee > 0 && !waiverReason.trim()) {
      setError('يرجى ذكر سبب التنازل عن الرسوم')
      modalBodyRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    setLoading(true)
    setError(null)

    const formattedPayments = payments.map(p => ({
      paymentMethodId: p.methodId,
      amount: parseFloat(p.amount) || 0
    }))

    const payload: ReturnRentalBody = {
      waivedFee,
      waiverReason: waiverReason.trim() || undefined,
      payments: formattedPayments,
      inspection: {
        wheelsCondition,
        brakeCondition,
        strapCondition,
        bearingsCondition,
        bodyCondition,
        maintenanceRequired,
        otherNotes: otherNotes.trim() || undefined
      }
    }

    try {
      const res = await rentalsService.return(rental.id, payload)
      showToast({ type: 'success', title: 'تم إنهاء الإيجار وإعادة الاسكيت بنجاح' })

      // Auto-print disabled per user request

      const hasDamage = [wheelsCondition, brakeCondition, strapCondition, bearingsCondition, bodyCondition].some(c => c === 'minor_damage' || c === 'damaged' || c === 'broken')
      onSuccess(hasDamage, res.data.lastInspectionId)
      onClose()
    } catch (err: unknown) {
      const errObj = err as { response?: { data?: { error?: { message?: string } } }; message?: string }
      setError(errObj?.response?.data?.error?.message ?? errObj?.message ?? 'حدث خطأ أثناء إنهاء الإيجار')
      modalBodyRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="تسجيل إعادة الاسكيت" size="lg">
      <div className="return-rental-form" ref={modalBodyRef} style={{ maxHeight: '70vh', overflowY: 'auto', padding: '2px' }}>
        {error && <Alert variant="danger" style={{ marginBottom: 16 }}>{error}</Alert>}

        <div className="summary-section">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div>
              <label style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>العميل</label>
              <div style={{ fontWeight: 'var(--font-weight-medium)' }}>{rental.customer.name}</div>
            </div>
            <div>
              <label style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>الاسكيت</label>
              <div style={{ fontWeight: 'var(--font-weight-medium)' }}>{rental.skate.skateCode} - مقاس {rental.skate.size}</div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', marginBottom: 16 }}>
            <span style={{ fontWeight: 'var(--font-weight-bold)', fontSize: 'var(--font-size-sm)' }}>سعر الإيجار الأساسي:</span>
            <span style={{ fontWeight: 'var(--font-weight-bold)', color: 'var(--color-primary)', fontSize: 'var(--font-size-sm)' }}>
              {formatCurrency(rental.rentalAmount)}
            </span>
          </div>
        </div>

        <div className="fee-section" style={{ background: 'var(--color-surface-raised)', padding: 16, borderRadius: 'var(--radius-md)', marginBottom: 16 }}>
          <h3 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-bold)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            رسوم التأخير
            {expectedLateFee > 0 && <Badge status="overdue">متأخر</Badge>}
          </h3>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <span>الرسوم المحسوبة:</span>
            <span style={{ fontWeight: 'var(--font-weight-bold)', color: expectedLateFee > 0 ? 'var(--color-danger-text)' : 'var(--color-success-text)' }}>
              {formatCurrency(expectedLateFee)}
            </span>
          </div>

          {expectedLateFee > 0 && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Input
                  id="waived-fee"
                  type="number"
                  label="المبلغ المعفى (ج.م)"
                  min="0"
                  max={expectedLateFee}
                  value={waivedFee}
                  onChange={e => handleWaivedFeeChange(e.target.value)}
                />
                <Input
                  id="waiver-reason"
                  type="text"
                  label="سبب الإعفاء"
                  value={waiverReason}
                  onChange={e => setWaiverReason(e.target.value)}
                  disabled={waivedFee <= 0}
                  required={waivedFee > 0}
                />
              </div>

              {remainingToPay > 0 && (
                <div style={{ marginTop: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <h4 style={{ fontSize: 'var(--font-size-xs)', margin: 0, color: 'var(--color-text-secondary)' }}>دفع الرسوم المتبقية</h4>
                    <Button variant="ghost" onClick={handleAddPayment} style={{ padding: '4px 8px', fontSize: 'var(--font-size-xs)', height: 'auto', minHeight: 'unset' }}>
                      <Plus size={14} style={{ marginInlineEnd: 4 }} /> تقسيم الدفع
                    </Button>
                  </div>

                  {methodsLoading ? (
                    <LoadingSpinner size="sm" />
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
                        <span>المطلوب: {formatCurrency(remainingToPay)}</span>
                      </div>
                      {!isExact && (
                        <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-danger-text)' }}>يجب أن يتطابق الإجمالي مع المبلغ المتبقي بالضبط.</span>
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        <div className="inspection-section" style={{ border: '1px solid var(--color-border)', padding: 16, borderRadius: 'var(--radius-md)' }}>
          <h3 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-bold)', marginBottom: 12 }}>الفحص الفني</h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <ConditionSelect label="العجلات" value={wheelsCondition} onChange={setWheelsCondition} />
            <ConditionSelect label="الفرامل" value={brakeCondition} onChange={setBrakeCondition} />
            <ConditionSelect label="الأربطة" value={strapCondition} onChange={setStrapCondition} />
            <ConditionSelect label="الرولمان بلي" value={bearingsCondition} onChange={setBearingsCondition} />
            <ConditionSelect label="الهيكل" value={bodyCondition} onChange={setBodyCondition} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, padding: 12, background: maintenanceRequired ? 'var(--color-danger-bg)' : 'var(--color-surface-raised)', borderRadius: 'var(--radius-md)' }}>
            <input
              type="checkbox"
              id="maintenance-required"
              checked={maintenanceRequired}
              onChange={e => setMaintenanceRequired(e.target.checked)}
              style={{ width: 18, height: 18 }}
            />
            <label htmlFor="maintenance-required" style={{ fontWeight: 'var(--font-weight-medium)', cursor: 'pointer', color: maintenanceRequired ? 'var(--color-danger-text)' : 'inherit' }}>
              تتطلب صيانة (سيتم تحويل حالة الاسكيت إلى "صيانة")
            </label>
          </div>

          <Input
            id="inspection-notes"
            label="ملاحظات أخرى (اختياري)"
            value={otherNotes}
            onChange={e => setOtherNotes(e.target.value)}
          />
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
        <Button variant="ghost" onClick={onClose} disabled={loading}>إلغاء</Button>
        <Button
          variant="primary"
          onClick={handleSubmit}
          loading={loading}
          disabled={!isExact && expectedLateFee > 0}
        >
          <CheckCircle size={16} style={{ marginInlineEnd: 6 }} /> تأكيد وإنهاء الإيجار
        </Button>
      </div>
    </Modal>
  )
}

function ConditionSelect({ label, value, onChange }: { label: string, value: string, onChange: (v: any) => void }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 'var(--font-size-xs)', marginBottom: 4, color: 'var(--color-text-secondary)' }}>{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          width: '100%',
          padding: '8px 12px',
          borderRadius: 'var(--radius-md)',
          border: `1px solid ${value !== 'good' ? 'var(--color-warning-border)' : 'var(--color-border)'}`,
          fontSize: 'var(--font-size-sm)',
          fontFamily: 'var(--font-family)',
          background: value !== 'good' ? 'var(--color-warning-bg)' : 'var(--color-surface)'
        }}
      >
        <option value="good">سليمة</option>
        <option value="minor_damage">تلف بسيط</option>
        <option value="damaged">تالفة</option>
        <option value="broken">مكسورة</option>
      </select>
    </div>
  )
}
