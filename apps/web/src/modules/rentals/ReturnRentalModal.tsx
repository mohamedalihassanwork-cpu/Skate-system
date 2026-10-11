/**
 * KOSHK SKATE ERP — Return Rental Item Modal
 * Phase 06 Redesign — Multi-Skate Rentals
 *
 * Handles returning a SINGLE Rental Item.
 * Billing is captured server-side when the request is sent (§11).
 *
 * If this is the last active item (isLastItem=true from server), the caller
 * should open the FinalizeRentalModal to collect payment.
 *
 * NO payment is collected here — billing moves to FinalizeRentalModal.
 * NO late-fee calculation in the browser — billing is actual-duration based.
 * NO browser timestamps — server captures returned_at authoritatively.
 */

import { useState, useEffect, useRef } from 'react'
import { CheckCircle } from 'lucide-react'
import { Modal, Button, Alert, Input } from '../../components/ui'
import { rentalItemsService, type RentalItemDTO, type ReturnRentalItemBody } from './rentals.service'

interface ReturnRentalItemModalProps {
  isOpen: boolean
  onClose: () => void
  item: RentalItemDTO | null
  onSuccess: (result: { isLastItem: boolean; rentalId: number; inspectionId: number; hasDamage: boolean }) => void
}

type ConditionValue = 'good' | 'minor_damage' | 'damaged' | 'broken'

export function ReturnRentalModal({ isOpen, onClose, item, onSuccess }: ReturnRentalItemModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [wheelsCondition, setWheelsCondition] = useState<ConditionValue>('good')
  const [brakeCondition, setBrakeCondition] = useState<ConditionValue>('good')
  const [strapCondition, setStrapCondition] = useState<ConditionValue>('good')
  const [bearingsCondition, setBearingsCondition] = useState<ConditionValue>('good')
  const [bodyCondition, setBodyCondition] = useState<ConditionValue>('good')
  const [maintenanceRequired, setMaintenanceRequired] = useState(false)
  const [otherNotes, setOtherNotes] = useState('')
  const modalBodyRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen) {
      setLoading(false)
      setError(null)
      setWheelsCondition('good')
      setBrakeCondition('good')
      setStrapCondition('good')
      setBearingsCondition('good')
      setBodyCondition('good')
      setMaintenanceRequired(false)
      setOtherNotes('')
    }
  }, [isOpen, item?.id])

  if (!isOpen || !item) return null

  const handleSubmit = async () => {
    setLoading(true)
    setError(null)

    // §11: Billing is frozen server-side at receipt time — NOT here.
    // We do NOT calculate any amounts on the client.
    const payload: ReturnRentalItemBody = {
      inspection: {
        wheelsCondition,
        brakeCondition,
        strapCondition,
        bearingsCondition,
        bodyCondition,
        maintenanceRequired,
        otherNotes: otherNotes.trim() || undefined,
      },
    }

    try {
      const res = await rentalItemsService.return(item.id, payload)
      const hasDamage = [wheelsCondition, brakeCondition, strapCondition, bearingsCondition, bodyCondition]
        .some(c => c === 'minor_damage' || c === 'damaged' || c === 'broken')

      onSuccess({
        isLastItem: res.data.isLastItem,
        rentalId: item.rentalId,
        inspectionId: res.data.lastInspectionId,
        hasDamage,
      })
      onClose()
    } catch (err: unknown) {
      const errObj = err as { response?: { data?: { error?: { message?: string } } }; message?: string }
      setError(errObj?.response?.data?.error?.message ?? errObj?.message ?? 'حدث خطأ أثناء إعادة الاسكيت')
      modalBodyRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`إعادة الاسكيت: ${item.skate.skateCode}`} size="lg">
      <div ref={modalBodyRef} style={{ maxHeight: '70vh', overflowY: 'auto', padding: '2px' }}>
        {error && <Alert variant="danger" style={{ marginBottom: 16 }}>{error}</Alert>}

        {/* Item summary */}
        <div style={{ background: 'var(--color-surface-raised)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '12px 16px', marginBottom: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', marginBottom: 2 }}>الاسكيت</div>
            <div style={{ fontWeight: 'var(--font-weight-medium)' }}>{item.skate.skateCode} — مقاس {item.skate.size}</div>
          </div>
          <div>
            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', marginBottom: 2 }}>المدة المتوقعة</div>
            <div style={{ fontWeight: 'var(--font-weight-medium)' }}>{item.expectedDurationMinutes} دقيقة</div>
          </div>
        </div>

        {/* Actual billing info note */}
        <div style={{ background: 'var(--color-info-bg, #e8f4fd)', border: '1px solid var(--color-info-border, #90c7f0)', borderRadius: 'var(--radius-md)', padding: '10px 14px', marginBottom: 16, fontSize: 'var(--font-size-sm)', color: 'var(--color-info-text, #1a6fa8)' }}>
          سيُحتسب المبلغ الفعلي بناءً على مدة الاستخدام الحقيقية — الدفع يتم بعد إعادة جميع الاسكيتات.
        </div>

        {/* Inspection form */}
        <div style={{ border: '1px solid var(--color-border)', padding: 16, borderRadius: 'var(--radius-md)' }}>
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
          id="confirm-return-item-btn"
          variant="primary"
          onClick={handleSubmit}
          loading={loading}
        >
          <CheckCircle size={16} style={{ marginInlineEnd: 6 }} /> تأكيد الإعادة
        </Button>
      </div>
    </Modal>
  )
}

function ConditionSelect({ label, value, onChange }: { label: string; value: string; onChange: (v: ConditionValue) => void }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 'var(--font-size-xs)', marginBottom: 4, color: 'var(--color-text-secondary)' }}>{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value as ConditionValue)}
        style={{
          width: '100%',
          padding: '8px 12px',
          borderRadius: 'var(--radius-md)',
          border: `1px solid ${value !== 'good' ? 'var(--color-warning-border)' : 'var(--color-border)'}`,
          fontSize: 'var(--font-size-sm)',
          fontFamily: 'var(--font-family)',
          background: value !== 'good' ? 'var(--color-warning-bg)' : 'var(--color-surface)',
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
