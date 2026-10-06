import { useState, useEffect } from 'react'
import { Modal, Button, Alert, Input, Select, useToast } from '../../components/ui'
import { reservationsService, type Reservation } from './reservations.service'
import api from '../../services/api'
import type { SkateDTO } from '../skates/skates.service'

interface Props {
  onClose: () => void
  onSaved: () => void
  existingReservation?: Reservation
}

export default function ReservationModal({ onClose, onSaved, existingReservation }: Props) {
  const { showToast } = useToast()

  const [customerId, setCustomerId] = useState(existingReservation?.customer.id.toString() || '')
  const [skateId, setSkateId] = useState(existingReservation?.skate.id.toString() || '')

  const toLocal = (d: string | undefined) => {
    if (!d) return ''
    const dt = new Date(d)
    const tzoffset = dt.getTimezoneOffset() * 60000
    return new Date(dt.getTime() - tzoffset).toISOString().slice(0, 16)
  }

  const [reservedFrom, setReservedFrom] = useState(toLocal(existingReservation?.reservedFrom))
  const [reservedUntil, setReservedUntil] = useState(toLocal(existingReservation?.reservedUntil))
  const [notes, setNotes] = useState(existingReservation?.notes || '')

  const [skates, setSkates] = useState<{ value: string, label: string }[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.get<{ success: boolean; data: SkateDTO[]; pagination: any }>('/api/v1/skates?status=available,rented,reserved&perPage=1000')
      .then(res => {
        setSkates(res.data.map(s => ({
          value: s.id.toString(),
          label: `${s.skateCode} (مقاس ${s.size})`
        })))
      })
      .catch(() => showToast({ type: 'error', title: 'فشل تحميل الاسكيتات' }))
  }, [showToast])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!skateId || !reservedFrom || !reservedUntil) {
      setError('يرجى تعبئة الحقول المطلوبة')
      return
    }

    if (!existingReservation && !customerId) {
      setError('يرجى تحديد العميل')
      return
    }

    const fromDate = new Date(reservedFrom)
    const untilDate = new Date(reservedUntil)

    if (fromDate >= untilDate) {
      setError('وقت البداية يجب أن يكون قبل وقت النهاية')
      return
    }

    setLoading(true)
    try {
      if (existingReservation) {
        await reservationsService.updateReservation(existingReservation.id, {
          skateId: Number(skateId),
          reservedFrom: fromDate.toISOString(),
          reservedUntil: untilDate.toISOString(),
          notes: notes.trim() || undefined,
        })
        showToast({ type: 'success', title: 'تم التعديل بنجاح' })
      } else {
        await reservationsService.createReservation({
          customerId: Number(customerId),
          skateId: Number(skateId),
          reservedFrom: fromDate.toISOString(),
          reservedUntil: untilDate.toISOString(),
          notes: notes.trim() || undefined,
        })
        showToast({ type: 'success', title: 'تم الحجز بنجاح' })
      }
      onSaved()
      onClose()
    } catch (err: any) {
      setError(err.message || 'حدث خطأ')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      isOpen={true}
      title={existingReservation ? 'تعديل الحجز' : 'حجز اسكيت'}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit}>
        {error && <Alert variant="danger" style={{ marginBottom: 16 }}>{error}</Alert>}

        {!existingReservation && (
          <Input
            id="res-customer"
            label="معرف العميل (ID)"
            type="number"
            value={customerId}
            onChange={(e: any) => setCustomerId(e.target.value)}
            required
          />
        )}

        <Select
          id="res-skate"
          label="الاسكيت"
          value={skateId}
          onChange={(e: any) => setSkateId(e.target.value)}
          options={skates}
          required
        />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Input
            id="res-from"
            label="من"
            type="datetime-local"
            value={reservedFrom}
            onChange={(e: any) => setReservedFrom(e.target.value)}
            required
          />
          <Input
            id="res-until"
            label="إلى"
            type="datetime-local"
            value={reservedUntil}
            onChange={(e: any) => setReservedUntil(e.target.value)}
            required
          />
        </div>

        <Input
          id="res-notes"
          label="ملاحظات"
          type="text"
          value={notes}
          onChange={(e: any) => setNotes(e.target.value)}
        />

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 24 }}>
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
            إلغاء
          </Button>
          <Button type="submit" variant="primary" loading={loading}>
            {existingReservation ? 'حفظ التعديلات' : 'تأكيد الحجز'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
