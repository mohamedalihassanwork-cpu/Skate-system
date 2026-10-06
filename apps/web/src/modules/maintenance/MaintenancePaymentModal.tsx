import { useState, useEffect } from 'react'
import { Modal, Button, Select, Alert } from '../../components/ui'
import { maintenanceService, type MaintenanceRecord } from './maintenance.service'
import { treasuryApi } from '../treasury/treasury.api'

interface PaymentMethod {
  id: number
  name: string
  nameAr: string
  isActive: boolean
  isDefault: boolean
}

interface Props {
  recordId: number
  onClose: () => void
  onSave: () => void
}

export default function MaintenancePaymentModal({ recordId, onClose, onSave }: Props) {
  const [record, setRecord] = useState<MaintenanceRecord | null>(null)
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])

  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<number | ''>('')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const [rec, methods] = await Promise.all([
          maintenanceService.getMaintenanceRecord(recordId),
          treasuryApi.getPaymentMethods().then(res => res.data)
        ])
        setRecord(rec)
        setPaymentMethods(methods.filter(m => m.isActive))
        if (methods.length > 0) {
          const defaultMethod = methods.find(m => m.isDefault && m.isActive) || methods.find(m => m.isActive)
          if (defaultMethod) {
            setSelectedPaymentMethodId(defaultMethod.id)
          }
        }
      } catch (err: any) {
        setError(err?.response?.data?.error || 'حدث خطأ أثناء تحميل البيانات')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [recordId])

  const handleSystemPayment = async () => {
    if (!selectedPaymentMethodId) {
      setError('يرجى اختيار وسيلة الدفع')
      return
    }

    try {
      setSaving(true)
      setError(null)
      await maintenanceService.payRecord(recordId, Number(selectedPaymentMethodId))
      onSave()
    } catch (err: any) {
      setError(err?.response?.data?.error || 'حدث خطأ أثناء إتمام الدفع')
    } finally {
      setSaving(false)
    }
  }

  const handleExternalPayment = async () => {
    try {
      setSaving(true)
      setError(null)
      await maintenanceService.payRecordExternal(recordId)
      onSave()
    } catch (err: any) {
      setError(err?.response?.data?.error || 'حدث خطأ أثناء إتمام الدفع الخارجي')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal isOpen={true} onClose={onClose} title="دفع تكلفة الصيانة">
      <div className="flex flex-col gap-[var(--space-4)]">
        {loading ? (
          <div className="flex justify-center py-[var(--space-8)]">
            <span className="text-[var(--text-subtle)]">جارٍ التحميل...</span>
          </div>
        ) : error ? (
          <Alert variant="danger" title="خطأ">{error}</Alert>
        ) : record ? (
          <>
            <div className="bg-[var(--surface-sunken)] p-[var(--space-4)] rounded-[var(--radius-md)] mb-[var(--space-4)]">
              <div className="flex justify-between items-center mb-[var(--space-2)]">
                <span className="text-[var(--text-subtle)]">كود الاسكيت:</span>
                <span className="font-medium">{record.skateCode}</span>
              </div>
              <div className="flex justify-between items-center mb-[var(--space-2)]">
                <span className="text-[var(--text-subtle)]">الوصف:</span>
                <span className="font-medium text-right max-w-[200px] truncate">{record.problemDescription || '-'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[var(--text-subtle)]">التكلفة الإجمالية:</span>
                <span className="font-bold text-[var(--text-strong)] text-lg">{record.totalCost} ج.م</span>
              </div>
            </div>

            <Select
              id="paymentMethodId"
              label="وسيلة الدفع (للدفع النظامي)"
              value={selectedPaymentMethodId}
              onChange={(e) => setSelectedPaymentMethodId(Number(e.target.value))}
              options={[
                { value: '', label: 'اختر وسيلة الدفع...' },
                ...paymentMethods.map(m => ({
                  value: m.id.toString(),
                  label: m.name
                }))
              ]}
              disabled={saving}
            />

            <div className="flex flex-col gap-[var(--space-2)] mt-[var(--space-4)]">
              <Button
                variant="primary"
                onClick={handleSystemPayment}
                disabled={saving || !selectedPaymentMethodId}
                loading={saving}
                className="w-full justify-center"
              >
                دفع من النظام
              </Button>
              <Button
                variant="secondary"
                onClick={handleExternalPayment}
                disabled={saving}
                loading={saving}
                className="w-full justify-center"
              >
                مدفوع خارجياً
              </Button>
            </div>
          </>
        ) : null}
      </div>
    </Modal>
  )
}
