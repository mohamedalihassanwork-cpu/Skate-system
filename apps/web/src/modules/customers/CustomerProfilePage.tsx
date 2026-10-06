/**
 * KOSHK SKATE ERP — Customer Profile Page
 * Phase 04 — Customers Module
 *
 * Displays full customer details.
 * DEC-056: Full National ID shown here (not masked) — authorized users only.
 * DEC-055: NO rental history, stats, or analytics in Phase 04.
 *          Those are Phase 05+ responsibilities.
 */

import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowRight, UserX, UserCheck, Pencil, Ticket } from 'lucide-react'
import {
  Button,
  Badge,
  Alert,
  Modal,
  ConfirmDialog,
  PageLoader,
  Input,
  Textarea,
  useToast,
} from '../../components/ui'
import { PermissionGate } from '../../components/PermissionGate'
import {
  customersService,
  type CustomerDTO,
  type UpdateCustomerBody,
} from './customers.service'
// Phase 05: Customer rental history (DEC-055)
import {
  rentalsService,
  type CustomerRentalHistoryItem,
  getRentalStatusLabel,
  lifetimeStatusToBadge,
} from '../rentals/rentals.service'
import { formatCurrency } from '../../utils/currency'

// ---------------------------------------------------------------------------
// Profile Info Row
// ---------------------------------------------------------------------------

function InfoRow({ label, value, dir = 'rtl' }: {
  label: string
  value: React.ReactNode
  dir?: 'rtl' | 'ltr'
}) {
  return (
    <div className="profile-info-row">
      <dt className="profile-info-label">{label}</dt>
      <dd className="profile-info-value" dir={dir}>{value}</dd>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function CustomerProfilePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { showToast } = useToast()

  const [customer, setCustomer] = useState<CustomerDTO | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Edit modal
  const [showEdit, setShowEdit] = useState(false)
  const [editForm, setEditForm] = useState<UpdateCustomerBody>({})
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  // Deactivate confirm
  const [showDeactivate, setShowDeactivate] = useState(false)
  const [deactivating, setDeactivating] = useState(false)

  // Activate confirm
  const [showActivate, setShowActivate] = useState(false)
  const [activating, setActivating] = useState(false)

  // Phase 05: Rental history state (DEC-055)
  const [rentals, setRentals] = useState<CustomerRentalHistoryItem[]>([])
  const [rentalsLoading, setRentalsLoading] = useState(false)
  const [rentalsTotal, setRentalsTotal] = useState(0)

  // ---------------------------------------------------------------------------
  // Load
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (id) {
      const numId = parseInt(id, 10)
      load(numId)
      // Phase 05: Load rental history (DEC-055)
      loadRentals(numId)
    }
  }, [id])

  async function load(customerId: number) {
    setLoading(true)
    setError(null)
    try {
      const res = await customersService.get(customerId)
      setCustomer(res.data)
    } catch {
      setError('تعذر تحميل بيانات العميل')
    } finally {
      setLoading(false)
    }
  }

  // Phase 05: Load customer rental history (DEC-055)
  async function loadRentals(customerId: number) {
    setRentalsLoading(true)
    try {
      const res = await rentalsService.getCustomerRentals(customerId, { perPage: 5 })
      setRentals(res.data ?? [])
      setRentalsTotal(res.pagination.total)
    } catch {
      // Non-blocking — rental history failure doesn't break the profile
    } finally {
      setRentalsLoading(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Edit
  // ---------------------------------------------------------------------------

  function openEdit() {
    if (!customer) return
    setEditForm({
      name: customer.name,
      phone: customer.phone,
      nationalId: customer.nationalId ?? '',
      notes: customer.notes ?? '',
    })
    setEditError(null)
    setShowEdit(true)
  }

  async function handleEdit() {
    if (!customer) return
    setEditError(null)
    if (editForm.name !== undefined && !editForm.name?.trim()) {
      setEditError('اسم العميل لا يمكن أن يكون فارغاً')
      return
    }
    if (editForm.phone !== undefined && !editForm.phone?.trim()) {
      setEditError('رقم الهاتف لا يمكن أن يكون فارغاً')
      return
    }
    setEditSaving(true)
    try {
      const res = await customersService.update(customer.id, {
        name: editForm.name?.trim(),
        phone: editForm.phone?.trim(),
        nationalId: typeof editForm.nationalId === 'string'
          ? (editForm.nationalId.trim() || null)
          : editForm.nationalId,
        notes: typeof editForm.notes === 'string'
          ? (editForm.notes.trim() || null)
          : editForm.notes,
      })
      setCustomer(res.data)
      setShowEdit(false)
      showToast({ type: 'success', title: 'تم تحديث بيانات العميل' })
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message
      setEditError(msg ?? 'حدث خطأ أثناء تحديث البيانات')
    } finally {
      setEditSaving(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Deactivate / Activate
  // ---------------------------------------------------------------------------

  async function handleDeactivate() {
    if (!customer) return
    setDeactivating(true)
    try {
      const res = await customersService.deactivate(customer.id)
      setCustomer(res.data)
      setShowDeactivate(false)
      showToast({ type: 'success', title: 'تم تعطيل العميل' })
    } catch {
      showToast({ type: 'error', title: 'حدث خطأ أثناء تحديث البيانات' })
    } finally {
      setDeactivating(false)
    }
  }

  async function handleActivate() {
    if (!customer) return
    setActivating(true)
    try {
      const res = await customersService.activate(customer.id)
      setCustomer(res.data)
      setShowActivate(false)
      showToast({ type: 'success', title: 'تم تفعيل العميل' })
    } catch {
      showToast({ type: 'error', title: 'حدث خطأ أثناء تفعيل العميل' })
    } finally {
      setActivating(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (loading) return <PageLoader />

  if (error || !customer) {
    return (
      <div className="page-container">
        <Alert variant="danger">{error ?? 'العميل غير موجود'}</Alert>
        <div style={{ marginTop: 'var(--space-4)' }}>
          <Button variant="secondary" onClick={() => navigate('/customers')}>
            <ArrowRight size={16} aria-hidden="true" />
            العودة إلى العملاء
          </Button>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="page-container">

        {/* ── Page header ── */}
        <div className="page-header">
          <div className="page-header-text" style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-4)' }}>
            <Button variant="ghost" size="sm" onClick={() => navigate('/customers')} style={{ padding: 'var(--space-2)', marginTop: 'var(--space-1)' }}>
              <ArrowRight size={20} aria-hidden="true" />
            </Button>
            <div>
              <h1 className="page-header-title">{customer.name}</h1>
              <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
                <Badge status={customer.isActive ? 'active' : 'inactive'}>
                  {customer.isActive ? 'نشط' : 'غير نشط'}
                </Badge>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
            <PermissionGate permission="customers.edit">
              <Button variant="secondary" onClick={openEdit}>
                <Pencil size={16} aria-hidden="true" />
                تعديل
              </Button>
            </PermissionGate>

            <PermissionGate permission="customers.deactivate">
              {customer.isActive ? (
                <Button variant="danger" onClick={() => setShowDeactivate(true)}>
                  <UserX size={16} aria-hidden="true" />
                  تعطيل
                </Button>
              ) : (
                <Button variant="primary" onClick={() => setShowActivate(true)}>
                  <UserCheck size={16} aria-hidden="true" />
                  تفعيل
                </Button>
              )}
            </PermissionGate>
          </div>
        </div>

        {/* ── Customer Info Card ── */}
        <div className="profile-card">
          <h2 className="profile-section-title">البيانات الأساسية</h2>
          <dl className="profile-info-list">
            <InfoRow label="الاسم" value={customer.name} />
            <InfoRow label="الهاتف" value={customer.phone} dir="ltr" />
            <InfoRow
              label="الرقم القومي"
              dir="ltr"
              value={
                customer.nationalId
                  ? customer.nationalId
                  : <span style={{ color: 'var(--color-text-muted)' }}>—</span>
              }
            />
            <InfoRow label="تاريخ التسجيل" value={customer.registrationDate} dir="ltr" />
            <InfoRow
              label="الحالة"
              value={
                <Badge status={customer.isActive ? 'active' : 'inactive'}>
                  {customer.isActive ? 'نشط' : 'غير نشط'}
                </Badge>
              }
            />
            {customer.notes && (
              <InfoRow label="ملاحظات" value={customer.notes} />
            )}
          </dl>
        </div>

        {/*
          ── Phase 05: Customer Rental History (DEC-055) ──
          Total rentals and most recent 5 rentals shown on profile.
          Full history available at /rentals?customerId=X
        */}
        <div className="profile-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
            <h2 className="profile-section-title" style={{ marginBottom: 0 }}>
              <Ticket size={16} style={{ display: 'inline', marginInlineEnd: 6 }} />
              سجل الإيجارات ({rentalsTotal})
            </h2>
          </div>
          {rentalsLoading ? (
            <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>جاري التحميل...</p>
          ) : rentals.length === 0 ? (
            <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>لا توجد إيجارات مسجلة لهذا العميل</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--font-size-sm)' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <th style={{ textAlign: 'right', padding: '6px 8px', color: 'var(--color-text-secondary)', fontWeight: 'var(--font-weight-bold)' }}>كود الإيجار</th>
                    <th style={{ textAlign: 'right', padding: '6px 8px', color: 'var(--color-text-secondary)', fontWeight: 'var(--font-weight-bold)' }}>الاسكيت</th>
                    <th style={{ textAlign: 'right', padding: '6px 8px', color: 'var(--color-text-secondary)', fontWeight: 'var(--font-weight-bold)' }}>المدة</th>
                    <th style={{ textAlign: 'right', padding: '6px 8px', color: 'var(--color-text-secondary)', fontWeight: 'var(--font-weight-bold)' }}>المبلغ</th>
                    <th style={{ textAlign: 'right', padding: '6px 8px', color: 'var(--color-text-secondary)', fontWeight: 'var(--font-weight-bold)' }}>الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {rentals.map(r => (
                    <tr key={r.id} style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
                      <td style={{ padding: '8px', fontWeight: 'var(--font-weight-medium)' }}>{r.rentalCode}</td>
                      <td style={{ padding: '8px' }}>{r.skate.skateCode} / {r.skate.size}</td>
                      <td style={{ padding: '8px' }}>{r.durationMinutes} د</td>
                      <td style={{ padding: '8px' }}>{formatCurrency(r.rentalAmount)}</td>
                      <td style={{ padding: '8px' }}>
                        <Badge status={lifetimeStatusToBadge(r.status)}>{getRentalStatusLabel(r.status)}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {rentalsTotal > 5 && (
                <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginTop: 8 }}>
                  يعرض آخر 5 إيجارات من إجمالي {rentalsTotal}
                </p>
              )}
            </div>
          )}
        </div>

      </div>

      {/* ── Edit Modal ── */}
      <Modal isOpen={showEdit} onClose={() => setShowEdit(false)} title="تعديل بيانات العميل">
        {editError && (
          <Alert variant="danger" style={{ marginBottom: 'var(--space-4)' }}>
            {editError}
          </Alert>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <Input
            id="profile-edit-name"
            label="الاسم *"
            value={editForm.name ?? ''}
            onChange={(e) => setEditForm(f => ({ ...f, name: e.target.value }))}
            required
          />
          <Input
            id="profile-edit-phone"
            label="الهاتف *"
            value={editForm.phone ?? ''}
            onChange={(e) => setEditForm(f => ({ ...f, phone: e.target.value }))}
            dir="ltr"
            required
          />
          <Input
            id="profile-edit-national-id"
            label="الرقم القومي"
            value={typeof editForm.nationalId === 'string' ? editForm.nationalId : ''}
            onChange={(e) => setEditForm(f => ({ ...f, nationalId: e.target.value || null }))}
            placeholder="اتركه فارغاً لحذفه"
            dir="ltr"
          />
          <Textarea
            id="profile-edit-notes"
            label="ملاحظات"
            value={typeof editForm.notes === 'string' ? editForm.notes : ''}
            onChange={(e) => setEditForm(f => ({ ...f, notes: e.target.value }))}
            rows={3}
          />
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end', marginTop: 'var(--space-6)' }}>
          <Button variant="secondary" onClick={() => setShowEdit(false)}>إلغاء</Button>
          <Button variant="primary" loading={editSaving} onClick={handleEdit}>حفظ</Button>
        </div>
      </Modal>

      {/* ── Deactivate Confirm ── */}
      <ConfirmDialog
        isOpen={showDeactivate}
        title="تعطيل العميل"
        description={`هل أنت متأكد من تعطيل "${customer.name}"؟`}
        confirmLabel="تعطيل"
        variant="danger"
        loading={deactivating}
        onConfirm={handleDeactivate}
        onCancel={() => setShowDeactivate(false)}
      />

      {/* ── Activate Confirm ── */}
      <ConfirmDialog
        isOpen={showActivate}
        title="تفعيل العميل"
        description={`هل تريد إعادة تفعيل "${customer.name}"؟`}
        confirmLabel="تفعيل"
        variant="default"
        loading={activating}
        onConfirm={handleActivate}
        onCancel={() => setShowActivate(false)}
      />

      {/* ── Styles ── */}
      <style>{`
        .profile-card {
          background: var(--color-white);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          padding: var(--space-6);
          margin-bottom: var(--space-6);
        }

        .profile-section-title {
          font-size: var(--font-size-lg);
          font-weight: var(--font-weight-semibold);
          color: var(--color-navy-800);
          margin-bottom: var(--space-5);
          padding-bottom: var(--space-3);
          border-bottom: 1px solid var(--color-border);
        }

        .profile-info-list {
          display: flex;
          flex-direction: column;
          gap: var(--space-4);
        }

        .profile-info-row {
          display: flex;
          gap: var(--space-4);
          align-items: flex-start;
        }

        .profile-info-label {
          font-size: var(--font-size-sm);
          font-weight: var(--font-weight-semibold);
          color: var(--color-text-secondary);
          min-width: 140px;
          flex-shrink: 0;
        }

        .profile-info-value {
          font-size: var(--font-size-base);
          color: var(--color-text-primary);
          flex: 1;
          word-break: break-word;
        }

        @media (max-width: 480px) {
          .profile-info-row {
            flex-direction: column;
            gap: var(--space-1);
          }

          .profile-info-label {
            min-width: unset;
          }

          .profile-card {
            padding: var(--space-4);
          }
        }
      `}</style>
    </>
  )
}
