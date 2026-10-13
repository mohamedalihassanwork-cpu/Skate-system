import { useState, useEffect, useCallback } from 'react'
import { Modal, Button, Alert, Input, Select, useToast, LoadingSpinner } from '../../components/ui'
import { PermissionGate } from '../../components/PermissionGate'
import { reservationsService, type Reservation } from './reservations.service'
import { customersService, type CustomerListItemDTO, type CreateCustomerBody } from '../customers/customers.service'
import api from '../../services/api'
import type { SkateDTO } from '../skates/skates.service'
import { toDatetimeLocal } from '../../utils/date'
import { Search, User, Plus } from 'lucide-react'

interface Props {
  onClose: () => void
  onSaved: () => void
  existingReservation?: Reservation
}

// ---------------------------------------------------------------------------
// Customer picker — inline search + create, mirrors RentalPOSPage pattern
// ---------------------------------------------------------------------------

interface CustomerPickerProps {
  selectedCustomer: CustomerListItemDTO | null
  onSelect: (c: CustomerListItemDTO) => void
}

function CustomerPicker({ selectedCustomer, onSelect }: CustomerPickerProps) {
  const { showToast } = useToast()
  const [search, setSearch] = useState('')
  const [customers, setCustomers] = useState<CustomerListItemDTO[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState<CreateCustomerBody>({ name: '', phone: '', nationalId: '' })
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

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
      onSelect(found ?? ({
        id: res.data.id,
        name: res.data.name,
        phone: res.data.phone,
        nationalIdMasked: '—',
        registrationDate: res.data.registrationDate,
        notes: res.data.notes,
        isActive: res.data.isActive,
        createdAt: res.data.createdAt,
        updatedAt: res.data.updatedAt,
      } as CustomerListItemDTO))
      setShowCreate(false)
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message ?? 'تعذر إضافة العميل'
      setCreateError(msg)
    } finally {
      setCreating(false)
    }
  }

  if (selectedCustomer) {
    return (
      <div className="res-customer-selected" style={{ background: 'var(--color-primary-subtle)', border: '1px solid var(--color-primary)', borderRadius: 'var(--radius-md)', padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <div>
          <div style={{ fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <User size={14} />
            {selectedCustomer.name}
          </div>
          <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginTop: 2 }}>
            {selectedCustomer.phone}
            {selectedCustomer.nationalIdMasked !== '—' && <span> &middot; {selectedCustomer.nationalIdMasked}</span>}
          </div>
        </div>
        <Button variant="ghost" size="sm" type="button" onClick={() => onSelect(null as any)}>
          تغيير
        </Button>
      </div>
    )
  }

  return (
    <div className="res-customer-picker">
      <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', marginBottom: 6, color: 'var(--color-text-primary)' }}>
        العميل *
      </label>
      <div style={{ position: 'relative', marginBottom: 8 }}>
        <Search size={16} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-secondary)', pointerEvents: 'none' }} />
        <input
          id="res-customer-search"
          aria-label="البحث عن عميل بالاسم أو الهاتف أو الرقم القومي"
          type="text"
          placeholder="ابحث بالاسم أو الهاتف أو الرقم القومي..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: '100%', padding: '9px 12px 9px 36px', paddingRight: 40, borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', fontSize: 'var(--font-size-sm)', fontFamily: 'var(--font-family)', boxSizing: 'border-box', background: 'var(--color-input-bg)', color: 'var(--color-text-primary)', outline: 'none' }}
        />
      </div>

      {loading && <div style={{ textAlign: 'center', padding: '8px 0' }}><LoadingSpinner size="sm" /></div>}
      {error && <Alert variant="danger" style={{ marginBottom: 8 }}>{error}</Alert>}

      {!loading && customers.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8, maxHeight: 200, overflowY: 'auto' }}>
          {customers.map(c => (
            <button
              key={c.id}
              type="button"
              onClick={() => { onSelect(c); setSearch(''); setCustomers([]) }}
              style={{ width: '100%', background: 'var(--color-surface-raised)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '10px 14px', cursor: 'pointer', textAlign: 'right', transition: 'all var(--transition-fast)', display: 'block' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-primary)'; (e.currentTarget as HTMLElement).style.background = 'var(--color-primary-subtle)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border)'; (e.currentTarget as HTMLElement).style.background = 'var(--color-surface-raised)' }}
            >
              <div style={{ fontWeight: 'var(--font-weight-medium)', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                <User size={14} /> {c.name}
              </div>
              <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                {c.phone}{c.nationalIdMasked !== '—' && <span> &middot; {c.nationalIdMasked}</span>}
              </div>
            </button>
          ))}
        </div>
      )}

      {!loading && search.trim() && customers.length === 0 && !error && (
        <div style={{ textAlign: 'center', padding: '8px 0', color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>لا توجد نتائج</div>
      )}

      <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 10, marginTop: 4 }}>
        <PermissionGate permission="customers.create">
          {!showCreate ? (
            <Button id="res-show-create-customer" variant="ghost" size="sm" type="button" onClick={() => setShowCreate(true)}>
              <Plus size={14} /> إضافة عميل جديد
            </Button>
          ) : (
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-bold)', marginBottom: 8 }}>بيانات العميل الجديد</div>
              {createError && <Alert variant="danger" style={{ marginBottom: 8 }}>{createError}</Alert>}
              <Input id="res-new-customer-name" label="الاسم" value={createForm.name} onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))} required />
              <Input id="res-new-customer-phone" label="الهاتف" value={createForm.phone} onChange={e => setCreateForm(f => ({ ...f, phone: e.target.value }))} required style={{ marginTop: 8 }} />
              <Input id="res-new-customer-national-id" label="الرقم القومي (اختياري)" value={createForm.nationalId || ''} onChange={e => setCreateForm(f => ({ ...f, nationalId: e.target.value }))} style={{ marginTop: 8 }} dir="ltr" />
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <Button id="res-create-customer-submit" variant="primary" size="sm" loading={creating} type="button" onClick={handleCreate}>إضافة وتحديد</Button>
                <Button variant="ghost" size="sm" type="button" onClick={() => { setShowCreate(false); setCreateError(null) }}>إلغاء</Button>
              </div>
            </div>
          )}
        </PermissionGate>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main ReservationModal
// ---------------------------------------------------------------------------

export default function ReservationModal({ onClose, onSaved, existingReservation }: Props) {
  const { showToast } = useToast()

  // For editing: the customer is fixed (cannot be changed on edit — only skate/times)
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerListItemDTO | null>(null)
  const [skateId, setSkateId] = useState(existingReservation?.skate.id.toString() || '')

  // toDatetimeLocal converts a UTC ISO string to datetime-local input format
  const [reservedFrom, setReservedFrom] = useState(toDatetimeLocal(existingReservation?.reservedFrom))
  const [reservedUntil, setReservedUntil] = useState(toDatetimeLocal(existingReservation?.reservedUntil))
  const [notes, setNotes] = useState(existingReservation?.notes || '')

  const [skates, setSkates] = useState<{ value: string, label: string }[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // For new reservations: only `available` active skates are eligible.
    // For editing an existing reservation: also include the currently-selected skate
    // so the existing value remains selectable even if its status changed.
    const statusFilter = existingReservation ? 'available,reserved' : 'available'
    api.get<{ success: boolean; data: SkateDTO[]; pagination: any }>(
      `/api/v1/skates?status=${statusFilter}&isActive=1&perPage=1000`
    )
      .then(res => {
        const list = res.data.map(s => ({
          value: s.id.toString(),
          label: `${s.skateCode} (مقاس ${s.size})`
        }))
        // If editing and the existing skate is not already in list, add it
        if (existingReservation) {
          const existingId = existingReservation.skate.id.toString()
          if (!list.find(o => o.value === existingId)) {
            list.unshift({
              value: existingId,
              label: `${existingReservation.skate.skateCode} (مقاس ${existingReservation.skate.size})`
            })
          }
        }
        setSkates(list)
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

    // For new reservations a customer must be selected via the search picker
    if (!existingReservation && !selectedCustomer) {
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
          customerId: selectedCustomer!.id,
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
      <form className="reservation-form" onSubmit={handleSubmit}>
        {error && <Alert variant="danger" style={{ marginBottom: 16 }}>{error}</Alert>}

        {/* Customer selection — only for new reservations */}
        {!existingReservation && (
          <CustomerPicker
            selectedCustomer={selectedCustomer}
            onSelect={c => setSelectedCustomer(c)}
          />
        )}

        {/* For edit mode: show the fixed customer info */}
        {existingReservation && (
          <div style={{ background: 'var(--color-neutral-bg)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '10px 16px' }}>
            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginBottom: 4 }}>العميل</div>
            <div style={{ fontWeight: 'var(--font-weight-semibold)' }}>{existingReservation.customer.name}</div>
            <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>{existingReservation.customer.phone}</div>
          </div>
        )}

        <Select
          id="res-skate"
          label="الاسكيت"
          value={skateId}
          onChange={(e: any) => setSkateId(e.target.value)}
          options={[{ value: '', label: 'اختر اسكيت...' }, ...skates]}
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
      <style>{`
        @media screen and (min-width: 1024px) {
          .reservation-form { display: flex; flex-direction: column; gap: var(--space-4); }
          .reservation-form > div > .field-wrapper { min-width: 0; }
        }
      `}</style>
    </Modal>
  )
}
