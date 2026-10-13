/**
 * KOSHK SKATE ERP — Customers List Page
 * Phase 04 — Customers Module
 *
 * Features:
 *   - Paginated, searchable customer list (name, phone, national_id)
 *   - Create customer modal
 *   - Edit customer modal
 *   - Deactivate / Activate customer (with ConfirmDialog)
 *   - Mobile card layout at < 640px (SYS-006)
 *   - National ID masked in list (DEC-056)
 *   - RBAC: customers.create / customers.edit / customers.deactivate (DEC-058)
 *
 * OUT OF SCOPE (DEC-055): Rental history, stats, analytics — Phase 05+
 */

import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { UserPlus, Eye, Pencil, UserX, UserCheck } from 'lucide-react'
import {
  Button,
  IconButton,
  Badge,
  Modal,
  ConfirmDialog,
  Alert,
  DataTable,
  SearchBar,
  Pagination,
  EmptyState,
  PageLoader,
  Input,
  Textarea,
  useToast,
  type TableColumn,
  Card,
} from '../../components/ui'
import { PermissionGate } from '../../components/PermissionGate'
import {
  customersService,
  type CustomerListItemDTO,
  type CreateCustomerBody,
} from './customers.service'

// ---------------------------------------------------------------------------
// Empty form state
// ---------------------------------------------------------------------------

const EMPTY_FORM: CreateCustomerBody = {
  name:       '',
  phone:      '',
  nationalId: '',
  notes:      '',
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function CustomersPage() {
  const navigate = useNavigate()
  const { showToast } = useToast()

  // List state
  const [customers, setCustomers] = useState<CustomerListItemDTO[]>([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState<string | null>(null)

  // Pagination
  const [page,       setPage]       = useState(1)
  const [perPage]                   = useState(20)
  const [total,      setTotal]      = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  // Search
  const [searchQuery,  setSearchQuery]  = useState('')
  const [activeFilter, setActiveFilter] = useState<'1' | '0' | 'all'>('1')
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Create modal
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createForm,      setCreateForm]      = useState<CreateCustomerBody>(EMPTY_FORM)
  const [createSaving,    setCreateSaving]    = useState(false)
  const [createError,     setCreateError]     = useState<string | null>(null)

  // Edit modal
  const [editTarget,  setEditTarget]  = useState<CustomerListItemDTO | null>(null)
  const [editName,    setEditName]    = useState('')
  const [editPhone,   setEditPhone]   = useState('')
  const [editNotes,   setEditNotes]   = useState('')
  const [editSaving,  setEditSaving]  = useState(false)
  const [editError,   setEditError]   = useState<string | null>(null)

  // Deactivate confirm
  const [deactivateTarget,  setDeactivateTarget]  = useState<CustomerListItemDTO | null>(null)
  const [deactivating,      setDeactivating]      = useState(false)

  // Activate confirm
  const [activateTarget,  setActivateTarget]  = useState<CustomerListItemDTO | null>(null)
  const [activating,      setActivating]      = useState(false)

  // ---------------------------------------------------------------------------
  // Data loading
  // ---------------------------------------------------------------------------

  useEffect(() => {
    load(page, searchQuery, activeFilter)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, activeFilter])

  async function load(p: number, q: string, isActive: '1' | '0' | 'all') {
    setLoading(true)
    setError(null)
    try {
      const res = await customersService.list({
        q:        q.trim() || undefined,
        isActive,
        page:     p,
        perPage,
        sortBy:   'name',
        sortDir:  'asc',
      })
      setCustomers(res.data)
      setTotal(res.pagination.total)
      setTotalPages(res.pagination.totalPages)
    } catch {
      setError('تعذر تحميل قائمة العملاء')
    } finally {
      setLoading(false)
    }
  }

  function handleSearch(q: string) {
    setSearchQuery(q)
    setPage(1)
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => {
      load(1, q, activeFilter)
    }, 350)
  }

  function handleFilterChange(val: '1' | '0' | 'all') {
    setActiveFilter(val)
    setPage(1)
    load(1, searchQuery, val)
  }

  // ---------------------------------------------------------------------------
  // Create
  // ---------------------------------------------------------------------------

  function openCreateModal() {
    setCreateForm(EMPTY_FORM)
    setCreateError(null)
    setShowCreateModal(true)
  }

  async function handleCreate() {
    setCreateError(null)
    if (!createForm.name.trim()) {
      setCreateError('اسم العميل مطلوب')
      return
    }
    if (!createForm.phone.trim()) {
      setCreateError('رقم الهاتف مطلوب')
      return
    }
    setCreateSaving(true)
    try {
      await customersService.create({
        name:       createForm.name.trim(),
        phone:      createForm.phone.trim(),
        nationalId: createForm.nationalId?.trim() || undefined,
        notes:      createForm.notes?.trim() || undefined,
      })
      setShowCreateModal(false)
      showToast({ type: 'success', title: 'تم إضافة العميل بنجاح' })
      load(1, searchQuery, activeFilter)
      setPage(1)
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message
      setCreateError(msg ?? 'حدث خطأ أثناء إضافة العميل')
    } finally {
      setCreateSaving(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Edit
  // ---------------------------------------------------------------------------

  function openEditModal(customer: CustomerListItemDTO) {
    setEditTarget(customer)
    setEditName(customer.name)
    setEditPhone(customer.phone)
    setEditNotes(customer.notes ?? '')
    setEditError(null)
  }

  async function handleEdit() {
    if (!editTarget) return
    setEditError(null)
    if (!editName.trim()) {
      setEditError('اسم العميل لا يمكن أن يكون فارغاً')
      return
    }
    if (!editPhone.trim()) {
      setEditError('رقم الهاتف لا يمكن أن يكون فارغاً')
      return
    }
    setEditSaving(true)
    try {
      await customersService.update(editTarget.id, {
        name:  editName.trim(),
        phone: editPhone.trim(),
        notes: editNotes.trim() || null,
      })
      setEditTarget(null)
      showToast({ type: 'success', title: 'تم تحديث بيانات العميل' })
      load(page, searchQuery, activeFilter)
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message
      setEditError(msg ?? 'حدث خطأ أثناء تحديث بيانات العميل')
    } finally {
      setEditSaving(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Deactivate / Activate
  // ---------------------------------------------------------------------------

  async function handleDeactivate() {
    if (!deactivateTarget) return
    setDeactivating(true)
    try {
      await customersService.deactivate(deactivateTarget.id)
      setDeactivateTarget(null)
      showToast({ type: 'success', title: 'تم تعطيل العميل' })
      load(page, searchQuery, activeFilter)
    } catch {
      showToast({ type: 'error', title: 'حدث خطأ أثناء تعطيل العميل' })
    } finally {
      setDeactivating(false)
    }
  }

  async function handleActivate() {
    if (!activateTarget) return
    setActivating(true)
    try {
      await customersService.activate(activateTarget.id)
      setActivateTarget(null)
      showToast({ type: 'success', title: 'تم تفعيل العميل' })
      load(page, searchQuery, activeFilter)
    } catch {
      showToast({ type: 'error', title: 'حدث خطأ أثناء تفعيل العميل' })
    } finally {
      setActivating(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Table columns — TableColumn<T>.header (not title), render(value, row)
  // ---------------------------------------------------------------------------

  const columns: TableColumn<CustomerListItemDTO>[] = [
    {
      key:    'name',
      header: 'الاسم',
      render: (_v, row) => (
        <span style={{ fontWeight: 600 }}>{row.name}</span>
      ),
    },
    {
      key:    'phone',
      header: 'الهاتف',
      render: (_v, row) => <span dir="ltr">{row.phone}</span>,
    },
    {
      key:    'nationalIdMasked',
      header: 'الرقم القومي',
      render: (_v, row) => (
        <span
          style={{
            fontFamily: 'monospace',
            color: row.nationalIdMasked === '—'
              ? 'var(--color-text-muted)'
              : 'var(--color-text-secondary)',
          }}
          dir="ltr"
        >
          {row.nationalIdMasked}
        </span>
      ),
    },
    {
      key:    'registrationDate',
      header: 'تاريخ التسجيل',
      render: (_v, row) => <span dir="ltr">{row.registrationDate}</span>,
    },
    {
      key:    'isActive',
      header: 'الحالة',
      render: (_v, row) => (
        <Badge status={row.isActive ? 'active' : 'inactive'}>
          {row.isActive ? 'نشط' : 'غير نشط'}
        </Badge>
      ),
    },
    {
      key:    'actions',
      header: 'إجراءات',
      render: (_v, row) => (
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          <IconButton
            icon={Eye}
            label={`عرض ملف العميل: ${row.name}`}
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/customers/${row.id}`)}
          />
          <PermissionGate permission="customers.edit">
            <IconButton
              icon={Pencil}
              label={`تعديل العميل: ${row.name}`}
              variant="ghost"
              size="sm"
              onClick={() => openEditModal(row)}
            />
          </PermissionGate>
          <PermissionGate permission="customers.deactivate">
            {row.isActive ? (
              <IconButton
                icon={UserX}
                label={`تعطيل العميل: ${row.name}`}
                variant="danger"
                size="sm"
                onClick={() => setDeactivateTarget(row)}
              />
            ) : (
              <IconButton
                icon={UserCheck}
                label={`تفعيل العميل: ${row.name}`}
                variant="ghost"
                size="sm"
                onClick={() => setActivateTarget(row)}
              />
            )}
          </PermissionGate>
        </div>
      ),
    },
  ]

  // ---------------------------------------------------------------------------
  // Mobile card renderer
  // ---------------------------------------------------------------------------

  function renderMobileCard(c: CustomerListItemDTO) {
    return (
      <div className="customer-card" key={c.id}>
        <div className="customer-card__header">
          <div className="customer-card__name">{c.name}</div>
          <Badge status={c.isActive ? 'active' : 'inactive'}>
            {c.isActive ? 'نشط' : 'غير نشط'}
          </Badge>
        </div>
        <div className="customer-card__phone" dir="ltr">{c.phone}</div>
        {c.nationalIdMasked !== '—' && (
          <div className="customer-card__nid" dir="ltr">{c.nationalIdMasked}</div>
        )}
        <div className="customer-card__actions">
          <IconButton icon={Eye} label={`عرض ${c.name}`} onClick={() => navigate(`/customers/${c.id}`)} />
          <PermissionGate permission="customers.edit">
            <IconButton icon={Pencil} label={`تعديل ${c.name}`} onClick={() => openEditModal(c)} />
          </PermissionGate>
          <PermissionGate permission="customers.deactivate">
            {c.isActive
              ? <IconButton icon={UserX} label={`تعطيل ${c.name}`} variant="danger" onClick={() => setDeactivateTarget(c)} />
              : <IconButton icon={UserCheck} label={`تفعيل ${c.name}`} onClick={() => setActivateTarget(c)} />
            }
          </PermissionGate>
        </div>
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (loading && customers.length === 0) return <PageLoader />

  return (
    <>
      <div className="page-container">

        {/* ── Page header ── */}
        <div className="page-header">
          <div className="page-header-text">
            <h1 className="page-header-title">العملاء</h1>
            <p className="page-header-subtitle">
              {total > 0 ? `${total} عميل` : 'لا يوجد عملاء'}
            </p>
          </div>
          <PermissionGate permission="customers.create">
            <Button variant="primary" onClick={openCreateModal}>
              <UserPlus size={16} aria-hidden="true" />
              إضافة عميل
            </Button>
          </PermissionGate>
        </div>

        {/* ── Filters ── */}
        <div className="filters-row">
          <SearchBar
            value={searchQuery}
            onChange={handleSearch}
            placeholder="ابحث بالاسم أو الهاتف أو الرقم القومي..."
          />
          <select
            id="customers-filter-active"
            className="field-control customers-filter-select"
            value={activeFilter}
            onChange={(e) => handleFilterChange(e.target.value as '1' | '0' | 'all')}
            aria-label="فلتر حالة العميل"
          >
            <option value="1">العملاء النشطون</option>
            <option value="0">العملاء غير النشطين</option>
            <option value="all">جميع العملاء</option>
          </select>
        </div>

        {/* ── Page error ── */}
        {error && (
          <Alert variant="danger" style={{ marginBottom: 'var(--space-4)' }}>
            {error}
          </Alert>
        )}

        {/* ── Desktop DataTable ── */}
        <div className="customers-desktop">
          <DataTable<CustomerListItemDTO>
            columns={columns}
            data={customers}
            loading={loading}
            emptyIcon={UserPlus}
            emptyMessage={
              searchQuery
                ? 'لا توجد نتائج تطابق بحثك. جرب كلمات مختلفة.'
                : 'لم يتم إضافة أي عملاء بعد.'
            }
          />
        </div>

        {/* ── Mobile Cards ── */}
        <div className="customers-mobile">
          {customers.length === 0 && !loading ? (
            <Card padding="standard">
              <EmptyState
                icon={UserPlus}
                title="لا يوجد عملاء"
                description={
                  searchQuery
                    ? 'لا توجد نتائج تطابق بحثك.'
                    : 'لم يتم إضافة أي عملاء بعد.'
                }
              />
            </Card>
          ) : (
            <div className="customer-cards-list">
              {customers.map(renderMobileCard)}
            </div>
          )}
        </div>

        {/* ── Pagination ── */}
        {totalPages > 1 && (
          <div style={{ marginTop: 'var(--space-6)' }}>
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={(p) => { setPage(p); load(p, searchQuery, activeFilter) }}
            />
          </div>
        )}
      </div>

      {/* ── Create Modal ── */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="إضافة عميل جديد"
      >
        {createError && (
          <Alert variant="danger" style={{ marginBottom: 'var(--space-4)' }}>
            {createError}
          </Alert>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <Input
            id="create-customer-name"
            label="الاسم *"
            value={createForm.name}
            onChange={(e) => setCreateForm(f => ({ ...f, name: e.target.value }))}
            placeholder="اسم العميل"
            required
          />
          <Input
            id="create-customer-phone"
            label="الهاتف *"
            value={createForm.phone}
            onChange={(e) => setCreateForm(f => ({ ...f, phone: e.target.value }))}
            placeholder="01XXXXXXXXX"
            dir="ltr"
            required
          />
          <Input
            id="create-customer-national-id"
            label="الرقم القومي"
            value={createForm.nationalId ?? ''}
            onChange={(e) => setCreateForm(f => ({ ...f, nationalId: e.target.value }))}
            placeholder="اختياري"
            dir="ltr"
          />
          <Textarea
            id="create-customer-notes"
            label="ملاحظات"
            value={createForm.notes ?? ''}
            onChange={(e) => setCreateForm(f => ({ ...f, notes: e.target.value }))}
            placeholder="ملاحظات إضافية (اختياري)"
            rows={3}
          />
        </div>
        <div className="customer-form-actions" style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end', marginTop: 'var(--space-6)' }}>
          <Button variant="secondary" onClick={() => setShowCreateModal(false)}>إلغاء</Button>
          <Button variant="primary" loading={createSaving} onClick={handleCreate}>إضافة</Button>
        </div>
      </Modal>

      {/* ── Edit Modal ── */}
      <Modal
        isOpen={!!editTarget}
        onClose={() => setEditTarget(null)}
        title={`تعديل: ${editTarget?.name ?? ''}`}
      >
        {editError && (
          <Alert variant="danger" style={{ marginBottom: 'var(--space-4)' }}>
            {editError}
          </Alert>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <Input
            id="edit-customer-name"
            label="الاسم *"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            required
          />
          <Input
            id="edit-customer-phone"
            label="الهاتف *"
            value={editPhone}
            onChange={(e) => setEditPhone(e.target.value)}
            dir="ltr"
            required
          />
          <Textarea
            id="edit-customer-notes"
            label="ملاحظات"
            value={editNotes}
            onChange={(e) => setEditNotes(e.target.value)}
            rows={3}
          />
        </div>
        <div className="customer-form-actions" style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end', marginTop: 'var(--space-6)' }}>
          <Button variant="secondary" onClick={() => setEditTarget(null)}>إلغاء</Button>
          <Button variant="primary" loading={editSaving} onClick={handleEdit}>حفظ</Button>
        </div>
      </Modal>

      {/* ── Deactivate Confirm ── */}
      <ConfirmDialog
        isOpen={!!deactivateTarget}
        title="تعطيل العميل"
        description={`هل أنت متأكد من تعطيل "${deactivateTarget?.name}"؟ لن يظهر في نتائج البحث في نقطة الإيجار.`}
        confirmLabel="تعطيل"
        variant="danger"
        loading={deactivating}
        onConfirm={handleDeactivate}
        onCancel={() => setDeactivateTarget(null)}
      />

      {/* ── Activate Confirm ── */}
      <ConfirmDialog
        isOpen={!!activateTarget}
        title="تفعيل العميل"
        description={`هل تريد إعادة تفعيل "${activateTarget?.name}"؟`}
        confirmLabel="تفعيل"
        variant="default"
        loading={activating}
        onConfirm={handleActivate}
        onCancel={() => setActivateTarget(null)}
      />

      {/* ── Styles ── */}
      <style>{`
        .customers-desktop { display: block; }
        .customers-mobile  { display: none;  }

        @media (max-width: 639px) {
          .customers-desktop { display: none;  }
          .customers-mobile  { display: block; }
        }

        .customer-cards-list {
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
        }

        .customer-card {
          background: var(--color-white);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          padding: var(--space-4);
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
        }

        .customer-card__header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: var(--space-2);
        }

        .customer-card__name {
          font-weight: 600;
          font-size: var(--font-size-base);
          color: var(--color-text-primary);
        }

        .customer-card__phone {
          font-size: var(--font-size-sm);
          color: var(--color-text-secondary);
        }

        .customer-card__nid {
          font-size: var(--font-size-xs);
          color: var(--color-text-muted);
          font-family: monospace;
        }

        .customer-card__actions {
          display: flex;
          gap: var(--space-2);
          margin-top: var(--space-2);
          padding-top: var(--space-2);
          border-top: 1px solid var(--color-border);
          flex-wrap: wrap;
        }

        .customers-filter-select {
          height: 40px;
          padding: 0 var(--space-3);
          border: 1.5px solid var(--color-border);
          border-radius: var(--radius-base);
          font-family: var(--font-family-base);
          font-size: var(--font-size-sm);
          color: var(--color-text-primary);
          background-color: var(--color-white);
          cursor: pointer;
          direction: rtl;
          min-width: 160px;
        }

        .customers-filter-select:focus {
          outline: 2px solid var(--color-border-focus);
          outline-offset: 2px;
          border-color: var(--color-border-focus);
        }
      `}</style>
    </>
  )
}
