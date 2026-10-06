import { useState, useEffect } from 'react'
import { AlertCircle, CheckCircle } from 'lucide-react'
import { Modal, Button, Alert, Input, Badge, useToast } from '../../components/ui'
import { formatCurrency } from '../../utils/currency'
import { damageService, type DamageReportDTO } from './damage.service'
import { paymentsService, type PaymentMethodDTO } from '../payments/payments.service'
import { PermissionGate } from '../../components/PermissionGate'

interface DamageReportModalProps {
  isOpen: boolean
  onClose: () => void
  report: DamageReportDTO
  onSuccess: () => void
}

export function DamageReportModal({ isOpen, onClose, report: initialReport, onSuccess }: DamageReportModalProps) {
  const { showToast } = useToast()

  const [report, setReport] = useState<DamageReportDTO>(initialReport)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [methods, setMethods] = useState<PaymentMethodDTO[]>([])

  // Tab state
  const [activeTab, setActiveTab] = useState<'details' | 'pay' | 'waive'>('details')

  // Pay state
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentMethodId, setPaymentMethodId] = useState<number>(0)

  // Waive state
  const [waiveAmount, setWaiveAmount] = useState('')
  const [waiveReason, setWaiveReason] = useState('')

  const remaining = report.customerCharge - (report.chargeCollected + report.chargeWaived)

  useEffect(() => {
    if (isOpen) {
      setReport(initialReport)
      setActiveTab('details')
      setError(null)

      paymentsService.listMethods().then(res => {
        setMethods(res.data)
        if (res.data.length > 0) setPaymentMethodId(res.data[0].id)
      }).catch(() => { })

      setPaymentAmount(Math.max(0, initialReport.customerCharge - (initialReport.chargeCollected + initialReport.chargeWaived)).toString())
      setWaiveAmount(Math.max(0, initialReport.customerCharge - (initialReport.chargeCollected + initialReport.chargeWaived)).toString())
    }
  }, [isOpen, initialReport])

  const handlePay = async () => {
    const amt = parseFloat(paymentAmount)
    if (!amt || amt <= 0) {
      setError('يرجى إدخال مبلغ صحيح')
      return
    }
    if (amt > remaining) {
      setError('المبلغ المدخل أكبر من الرصيد المتبقي')
      return
    }

    setLoading(true)
    setError(null)
    try {
      const res = await damageService.pay(report.id, {
        payments: [{ paymentMethodId, amount: amt }]
      })
      setReport(res.data)
      showToast({ type: 'success', title: 'تم تحصيل الرسوم بنجاح' })
      onSuccess()
      setPaymentAmount((res.data.customerCharge - (res.data.chargeCollected + res.data.chargeWaived)).toString())
      setWaiveAmount((res.data.customerCharge - (res.data.chargeCollected + res.data.chargeWaived)).toString())
      if (res.data.status === 'paid' || res.data.status === 'waived') setActiveTab('details')
    } catch (err: unknown) {
      const errObj = err as { response?: { data?: { error?: { message?: string } } }; message?: string }
      setError(errObj?.response?.data?.error?.message ?? errObj?.message ?? 'حدث خطأ أثناء الدفع')
    } finally {
      setLoading(false)
    }
  }

  const handleWaive = async () => {
    const amt = parseFloat(waiveAmount)
    if (!amt || amt <= 0) {
      setError('يرجى إدخال مبلغ صحيح')
      return
    }
    if (amt > remaining) {
      setError('مبلغ الإعفاء أكبر من الرصيد المتبقي')
      return
    }
    if (!waiveReason.trim()) {
      setError('يرجى ذكر سبب الإعفاء')
      return
    }

    setLoading(true)
    setError(null)
    try {
      const res = await damageService.waive(report.id, {
        amount: amt,
        reason: waiveReason.trim()
      })
      setReport(res.data)
      showToast({ type: 'success', title: 'تم إعفاء الرسوم بنجاح' })
      onSuccess()
      setPaymentAmount((res.data.customerCharge - (res.data.chargeCollected + res.data.chargeWaived)).toString())
      setWaiveAmount((res.data.customerCharge - (res.data.chargeCollected + res.data.chargeWaived)).toString())
      if (res.data.status === 'paid' || res.data.status === 'waived') setActiveTab('details')
    } catch (err: unknown) {
      const errObj = err as { response?: { data?: { error?: { message?: string } } }; message?: string }
      setError(errObj?.response?.data?.error?.message ?? errObj?.message ?? 'حدث خطأ أثناء الإعفاء')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`تقرير الضرر #${report.id}`} size="base">
      {error && <Alert variant="danger" style={{ marginBottom: 16 }}>{error}</Alert>}

      <div style={{ display: 'flex', gap: 16, marginBottom: 16, borderBottom: '1px solid var(--color-border)' }}>
        <button
          onClick={() => setActiveTab('details')}
          style={{
            background: 'none', border: 'none', padding: '8px 16px', cursor: 'pointer',
            borderBottom: activeTab === 'details' ? '2px solid var(--color-primary)' : '2px solid transparent',
            color: activeTab === 'details' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
            fontWeight: activeTab === 'details' ? 'var(--font-weight-bold)' : 'var(--font-weight-medium)'
          }}
        >
          التفاصيل
        </button>
        {remaining > 0 && (
          <PermissionGate permission="damage.collect_charge">
            <button
              onClick={() => setActiveTab('pay')}
              style={{
                background: 'none', border: 'none', padding: '8px 16px', cursor: 'pointer',
                borderBottom: activeTab === 'pay' ? '2px solid var(--color-primary)' : '2px solid transparent',
                color: activeTab === 'pay' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                fontWeight: activeTab === 'pay' ? 'var(--font-weight-bold)' : 'var(--font-weight-medium)'
              }}
            >
              تحصيل الغرامة
            </button>
          </PermissionGate>
        )}
        {remaining > 0 && (
          <PermissionGate permission="waivers.approve">
            <button
              onClick={() => setActiveTab('waive')}
              style={{
                background: 'none', border: 'none', padding: '8px 16px', cursor: 'pointer',
                borderBottom: activeTab === 'waive' ? '2px solid var(--color-primary)' : '2px solid transparent',
                color: activeTab === 'waive' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                fontWeight: activeTab === 'waive' ? 'var(--font-weight-bold)' : 'var(--font-weight-medium)'
              }}
            >
              إعفاء
            </button>
          </PermissionGate>
        )}
      </div>

      {activeTab === 'details' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>الاسكيت</span>
              <div style={{ fontWeight: 'var(--font-weight-medium)' }} dir="ltr" className="text-right">{report.skateCode}</div>
            </div>
            <div>
              <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>العميل</span>
              <div style={{ fontWeight: 'var(--font-weight-medium)' }}>{report.customerName}</div>
            </div>
            <div>
              <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>رقم الإيجار</span>
              <div style={{ fontWeight: 'var(--font-weight-medium)' }}>#{report.rentalId}</div>
            </div>
            <div>
              <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>الحالة</span>
              <div>
                <Badge status={
                  report.status === 'paid' ? 'completed' :
                    report.status === 'waived' ? 'cancelled' :
                      report.status === 'partially_paid' ? 'rented' : 'reserved'
                }>
                  {report.status === 'paid' ? 'مسدد' : report.status === 'waived' ? 'معفى' : report.status === 'partially_paid' ? 'مدفوع جزئياً' : 'معلق'}
                </Badge>
              </div>
            </div>
            <div>
              <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>نوع الضرر</span>
              <div style={{ fontWeight: 'var(--font-weight-medium)' }}>
                {report.damageType === 'wheel' ? 'عجل' :
                  report.damageType === 'brake' ? 'فرامل' :
                    report.damageType === 'strap' ? 'أربطة' :
                      report.damageType === 'bearing' ? 'رولمان بلي' :
                        report.damageType === 'body' ? 'هيكل' : 'أخرى'}
              </div>
            </div>
            <div>
              <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>الخطورة</span>
              <div style={{ fontWeight: 'var(--font-weight-medium)' }}>
                {report.severity === 'severe' ? 'جسيم' : report.severity === 'moderate' ? 'متوسط' : 'بسيط'}
              </div>
            </div>
          </div>

          <div>
            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>الوصف</span>
            <div style={{ background: 'var(--color-surface-raised)', padding: 12, borderRadius: 'var(--radius-sm)', marginTop: 4 }}>
              {report.description}
            </div>
          </div>

          <div style={{ background: 'var(--color-surface-raised)', padding: 16, borderRadius: 'var(--radius-md)' }}>
            <h4 style={{ fontSize: 'var(--font-size-sm)', margin: '0 0 12px 0' }}>الملخص المالي</h4>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span>الغرامة المقررة:</span>
              <span style={{ fontWeight: 'var(--font-weight-bold)' }}>{formatCurrency(report.customerCharge)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span>تم تحصيله:</span>
              <span style={{ color: 'var(--color-success-text)' }}>{formatCurrency(report.chargeCollected)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span>تم إعفاؤه:</span>
              <span>{formatCurrency(report.chargeWaived)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--color-border)' }}>
              <span style={{ fontWeight: 'var(--font-weight-bold)' }}>المتبقي:</span>
              <span style={{ fontWeight: 'var(--font-weight-bold)', color: remaining > 0 ? 'var(--color-danger-text)' : 'inherit' }}>
                {formatCurrency(Math.max(0, remaining))}
              </span>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'pay' && remaining > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Alert variant="info">
            المبلغ المتبقي للتحصيل هو <strong>{formatCurrency(remaining)}</strong>
          </Alert>

          <Input
            id="pay-amount"
            label="المبلغ المراد تحصيله (ج.م)"
            type="number"
            min="0"
            max={remaining}
            step="1"
            value={paymentAmount}
            onChange={e => setPaymentAmount(e.target.value)}
          />

          <div>
            <label style={{ display: 'block', fontSize: 'var(--font-size-xs)', marginBottom: 4 }}>طريقة الدفع</label>
            <select
              value={paymentMethodId}
              onChange={e => setPaymentMethodId(parseInt(e.target.value, 10))}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
                background: 'var(--color-surface)',
                fontFamily: 'inherit'
              }}
            >
              {methods.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
            <Button variant="primary" onClick={handlePay} loading={loading}>
              <CheckCircle size={16} style={{ marginInlineEnd: 6 }} /> تأكيد التحصيل
            </Button>
          </div>
        </div>
      )}

      {activeTab === 'waive' && remaining > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Alert variant="warning">
            إعفاء الغرامة سيؤدي إلى إسقاط المبلغ المحدد من المديونية.
          </Alert>

          <Input
            id="waive-amount"
            label="المبلغ المراد إعفاؤه (ج.م)"
            type="number"
            min="0"
            max={remaining}
            step="1"
            value={waiveAmount}
            onChange={e => setWaiveAmount(e.target.value)}
          />

          <Input
            id="waive-reason"
            label="سبب الإعفاء"
            type="text"
            value={waiveReason}
            onChange={e => setWaiveReason(e.target.value)}
            required
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
            <Button variant="primary" onClick={handleWaive} loading={loading} style={{ background: 'var(--color-warning-text)', color: 'white', border: 'none' }}>
              <AlertCircle size={16} style={{ marginInlineEnd: 6 }} /> تأكيد الإعفاء
            </Button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--color-border)' }}>
        <Button variant="ghost" onClick={onClose} disabled={loading}>إغلاق</Button>
      </div>
    </Modal>
  )
}
