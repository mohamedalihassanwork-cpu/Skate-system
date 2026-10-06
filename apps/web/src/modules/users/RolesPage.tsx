/**
 * KOSHK SKATE ERP — Roles Management Page
 * Phase 02 Remediation — OD-RBAC-001 / OD-RBAC-002 / OD-RBAC-003
 *
 * Replaces the read-only Phase 02 / Phase 03.5 implementation with a full
 * Role Management interface.
 *
 * Capabilities added:
 *   - Add custom role (name, Arabic name, initial permissions)
 *   - Edit custom role name / Arabic name
 *   - Edit permissions for any role (system or custom — OD-RBAC-002)
 *   - Delete custom role (blocked if assigned to active users — OD-RBAC-003)
 *   - System roles: name read-only, cannot be deleted (OD-RBAC-002)
 *   - Route-level permission gating via PermissionGate in App.tsx
 *
 * Design system: all components from /components/ui — no new components created.
 * Icons: Lucide only. No hardcoded colors.
 */

import { useState, useEffect, useCallback } from 'react'
import { Plus, Pencil, Trash2, Key, ShieldCheck, ShieldAlert } from 'lucide-react'

import { rolesService, type RoleDTO, type PermissionDTO } from './users.service'
import {
  Alert,
  Badge,
  Button,
  Card,
  CheckboxField,
  EmptyState,
  Input,
  Modal,
  PageLoader,
  useToast,
} from '../../components/ui'
import { PermissionGate } from '../../components/PermissionGate'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Group a flat permission list by module key */
function groupPermissions(perms: PermissionDTO[]): Record<string, PermissionDTO[]> {
  const groups: Record<string, PermissionDTO[]> = {}
  for (const p of perms) {
    if (!groups[p.module]) groups[p.module] = []
    groups[p.module].push(p)
  }
  return groups
}

/** Friendly Arabic labels for module keys */
const MODULE_LABELS: Record<string, string> = {
  users: 'المستخدمون',
  roles: 'الأدوار',
  skates: 'الاسكيتات',
  customers: 'العملاء',
  rentals: 'الإيجارات',
  treasury: 'الخزينة',
  maintenance: 'الصيانة',
  damage: 'الأضرار',
  reports: 'التقارير',
  settings: 'الإعدادات',
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function RolesPage() {
  // ── List state ────────────────────────────────────────────────────────────
  const [roles, setRoles] = useState<RoleDTO[]>([])
  const [allPerms, setAllPerms] = useState<PermissionDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [pageError, setPageError] = useState<string | null>(null)

  // ── Modal visibility ──────────────────────────────────────────────────────
  const [showAdd, setShowAdd] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [showPerms, setShowPerms] = useState(false)
  const [showDelete, setShowDelete] = useState(false)

  // ── Selected role (for edit / perms / delete) ─────────────────────────────
  const [selected, setSelected] = useState<RoleDTO | null>(null)

  // ── Add Role form ─────────────────────────────────────────────────────────
  const [addName, setAddName] = useState('')
  const [addNameAr, setAddNameAr] = useState('')
  const [addPermIds, setAddPermIds] = useState<number[]>([])
  const [addError, setAddError] = useState<string | null>(null)
  const [addSaving, setAddSaving] = useState(false)

  // ── Edit Role form ────────────────────────────────────────────────────────
  const [editName, setEditName] = useState('')
  const [editNameAr, setEditNameAr] = useState('')
  const [editError, setEditError] = useState<string | null>(null)
  const [editSaving, setEditSaving] = useState(false)

  // ── Permission edit ───────────────────────────────────────────────────────
  const [permIds, setPermIds] = useState<number[]>([])
  const [permError, setPermError] = useState<string | null>(null)
  const [permSaving, setPermSaving] = useState(false)

  // ── Delete ────────────────────────────────────────────────────────────────
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const { showToast } = useToast()

  // ── Data loading ──────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    setLoading(true)
    setPageError(null)
    try {
      const [rolesData, permsData] = await Promise.all([
        rolesService.list(),
        rolesService.listPermissions(),
      ])
      setRoles(rolesData)
      setAllPerms(permsData)
    } catch {
      setPageError('تعذر تحميل البيانات. يرجى إعادة المحاولة.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // ── Add Role ──────────────────────────────────────────────────────────────

  function openAdd() {
    setAddName('')
    setAddNameAr('')
    setAddPermIds([])
    setAddError(null)
    setShowAdd(true)
  }

  async function handleAdd() {
    setAddError(null)
    if (!addName.trim()) { setAddError('اسم الدور مطلوب'); return }
    if (!addNameAr.trim()) { setAddError('الاسم العربي مطلوب'); return }
    setAddSaving(true)
    try {
      // Step 1: create role
      const createRes = await rolesService.create({ name: addName.trim(), nameAr: addNameAr.trim() })
      const newRole = createRes
      // Step 2: set initial permissions if any selected
      if (addPermIds.length > 0) {
        await rolesService.setPermissions(newRole.id, addPermIds)
      }
      setShowAdd(false)
      showToast({ type: 'success', title: `تمت إضافة الدور "${addNameAr.trim()}" بنجاح` })
      load()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setAddError(msg ?? 'حدث خطأ أثناء إضافة الدور')
    } finally {
      setAddSaving(false)
    }
  }

  // ── Edit Role ─────────────────────────────────────────────────────────────

  function openEdit(role: RoleDTO) {
    setSelected(role)
    setEditName(role.name)
    setEditNameAr(role.nameAr)
    setEditError(null)
    setShowEdit(true)
  }

  async function handleEdit() {
    if (!selected) return
    setEditError(null)
    if (!selected.isSystem) {
      if (!editName.trim()) { setEditError('اسم الدور مطلوب'); return }
      if (!editNameAr.trim()) { setEditError('الاسم العربي مطلوب'); return }
    }
    setEditSaving(true)
    try {
      await rolesService.update(selected.id, {
        name: editName.trim(),
        nameAr: editNameAr.trim(),
      })
      setShowEdit(false)
      showToast({ type: 'success', title: 'تم تحديث بيانات الدور بنجاح' })
      load()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setEditError(msg ?? 'حدث خطأ أثناء تحديث الدور')
    } finally {
      setEditSaving(false)
    }
  }

  // ── Permission Management ─────────────────────────────────────────────────

  function openPerms(role: RoleDTO) {
    setSelected(role)
    setPermIds(role.permissions.map(p => p.id))
    setPermError(null)
    setShowPerms(true)
  }

  function togglePerm(id: number) {
    setPermIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  async function handleSavePerms() {
    if (!selected) return
    setPermError(null)
    setPermSaving(true)
    try {
      await rolesService.setPermissions(selected.id, permIds)
      setShowPerms(false)
      showToast({ type: 'success', title: 'تم تحديث صلاحيات الدور بنجاح' })
      load()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setPermError(msg ?? 'حدث خطأ أثناء تحديث الصلاحيات')
    } finally {
      setPermSaving(false)
    }
  }

  // ── Delete Role ───────────────────────────────────────────────────────────

  function openDelete(role: RoleDTO) {
    setSelected(role)
    setDeleteError(null)
    setShowDelete(true)
  }

  async function handleDelete() {
    if (!selected) return
    setDeleteError(null)
    setDeleting(true)
    try {
      await rolesService.delete(selected.id)
      setShowDelete(false)
      showToast({ type: 'success', title: `تم حذف الدور "${selected.nameAr}" بنجاح` })
      load()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      // OD-RBAC-003: 422 = role has active users — show inline alert in the dialog
      setDeleteError(msg ?? 'حدث خطأ أثناء حذف الدور')
      setDeleting(false)
    }
  }

  // ── Grouped permissions for the UI ────────────────────────────────────────

  const groupedPerms = groupPermissions(allPerms)

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="page-container">

      {/* ── Page header ────────────────────────────────────────────────── */}
      <div className="page-header">
        <div className="page-header-text">
          <h1 className="page-header-title">الأدوار والصلاحيات</h1>
          <p className="page-header-subtitle">إدارة أدوار المستخدمين وصلاحياتهم</p>
        </div>
        <PermissionGate permission="roles.create">
          <Button
            id="btn-add-role"
            variant="primary"
            onClick={openAdd}
          >
            <Plus size={16} />
            إضافة دور
          </Button>
        </PermissionGate>
      </div>

      {/* ── Page-level error ───────────────────────────────────────────── */}
      {pageError && (
        <Alert variant="danger" style={{ marginBottom: 'var(--space-6)' } as React.CSSProperties}>
          {pageError}
        </Alert>
      )}

      {/* ── Loading ────────────────────────────────────────────────────── */}
      {loading && <PageLoader label="جارٍ تحميل الأدوار" />}

      {/* ── Empty state ────────────────────────────────────────────────── */}
      {!loading && !pageError && roles.length === 0 && (
        <EmptyState
          icon={ShieldCheck}
          title="لا توجد أدوار"
          description="لم يتم إنشاء أي أدوار بعد"
        />
      )}

      {/* ── Role cards ─────────────────────────────────────────────────── */}
      {!loading && !pageError && roles.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {roles.map(role => (
            <Card key={role.id}>
              {/* Card header */}
              <div className="roles-card-header">
                {/* Role name + system badge */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                    <h2 style={{
                      fontSize: 'var(--font-size-lg)',
                      fontWeight: 700,
                      color: 'var(--color-navy-800)',
                      margin: 0,
                    }}>
                      {role.nameAr}
                    </h2>
                    {role.isSystem && (
                      <Badge status="system">نظامي</Badge>
                    )}
                  </div>
                  <p style={{
                    fontSize: 'var(--font-size-sm)',
                    color: 'var(--color-text-muted)',
                    margin: 'var(--space-1) 0 0',
                  }}>
                    {role.name}
                  </p>
                  {/* OD-RBAC-002: Inform user system role names are immutable */}
                  {role.isSystem && (
                    <p style={{
                      fontSize: 'var(--font-size-xs)',
                      color: 'var(--color-text-muted)',
                      margin: 'var(--space-1) 0 0',
                    }}>
                      الأدوار الأساسية لا يمكن تغيير اسمها أو حذفها
                    </p>
                  )}
                </div>

                {/* Badges + Actions */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-2)',
                  flexWrap: 'wrap',
                }}>
                  <Badge status="role">
                    {role.permissions.length} صلاحية
                  </Badge>

                  {/* Edit permissions — available for ALL roles (OD-RBAC-002) */}
                  <PermissionGate permission="roles.edit">
                    <Button
                      id={`btn-perms-${role.id}`}
                      variant="ghost"
                      size="sm"
                      onClick={() => openPerms(role)}
                      title="تعديل الصلاحيات"
                    >
                      <Key size={14} />
                      الصلاحيات
                    </Button>
                  </PermissionGate>

                  {/* Edit name — custom roles only (OD-RBAC-002) */}
                  {!role.isSystem && (
                    <PermissionGate permission="roles.edit">
                      <Button
                        id={`btn-edit-${role.id}`}
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(role)}
                        title="تعديل الدور"
                      >
                        <Pencil size={14} />
                        تعديل
                      </Button>
                    </PermissionGate>
                  )}

                  {/* Delete — custom roles only (OD-RBAC-002) */}
                  {!role.isSystem && (
                    <PermissionGate permission="roles.edit">
                      <Button
                        id={`btn-delete-${role.id}`}
                        variant="danger"
                        size="sm"
                        onClick={() => openDelete(role)}
                        title="حذف الدور"
                      >
                        <Trash2 size={14} />
                        حذف
                      </Button>
                    </PermissionGate>
                  )}
                </div>
              </div>

              {/* Permission chips */}
              {role.permissions.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', marginTop: 'var(--space-3)' }}>
                  {role.permissions.map(p => (
                    <span key={p.id} title={p.key} style={{ display: 'contents' }}>
                      <Badge variant="neutral" className="permission-chip">
                        {p.labelAr}
                      </Badge>
                    </span>
                  ))}
                </div>
              ) : (
                <p style={{
                  color: 'var(--color-text-muted)',
                  fontSize: 'var(--font-size-sm)',
                  margin: 'var(--space-3) 0 0',
                }}>
                  لا توجد صلاحيات محددة
                </p>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* ADD ROLE MODAL                                                     */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <Modal
        isOpen={showAdd}
        onClose={() => setShowAdd(false)}
        title="إضافة دور جديد"
        size="lg"
        footer={
          <>
            <Button
              id="btn-add-role-save"
              variant="primary"
              loading={addSaving}
              onClick={handleAdd}
            >
              حفظ الدور
            </Button>
            <Button
              variant="secondary"
              onClick={() => setShowAdd(false)}
              disabled={addSaving}
            >
              إلغاء
            </Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {addError && (
            <Alert variant="danger">{addError}</Alert>
          )}
          <Input
            id="add-role-name"
            label="اسم الدور (إنجليزي)"
            required
            value={addName}
            onChange={e => setAddName(e.target.value)}
            placeholder="مثال: supervisor"
            disabled={addSaving}
          />
          <Input
            id="add-role-name-ar"
            label="الاسم بالعربية"
            required
            value={addNameAr}
            onChange={e => setAddNameAr(e.target.value)}
            placeholder="مثال: مشرف"
            disabled={addSaving}
          />

          {allPerms.length > 0 && (
            <div>
              <p style={{
                fontSize: 'var(--font-size-sm)',
                fontWeight: 'var(--font-weight-semibold)',
                color: 'var(--color-text-primary)',
                marginBottom: 'var(--space-3)',
              }}>
                الصلاحيات (اختياري)
              </p>
              <PermissionGroupSelector
                grouped={groupedPerms}
                selectedIds={addPermIds}
                onToggle={id => setAddPermIds(prev =>
                  prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
                )}
                disabled={addSaving}
              />
            </div>
          )}
        </div>
      </Modal>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* EDIT ROLE MODAL (name/nameAr only — custom roles)                  */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <Modal
        isOpen={showEdit}
        onClose={() => setShowEdit(false)}
        title="تعديل الدور"
        size="base"
        footer={
          <>
            <Button
              id="btn-edit-role-save"
              variant="primary"
              loading={editSaving}
              onClick={handleEdit}
            >
              حفظ التعديلات
            </Button>
            <Button
              variant="secondary"
              onClick={() => setShowEdit(false)}
              disabled={editSaving}
            >
              إلغاء
            </Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {editError && (
            <Alert variant="danger">{editError}</Alert>
          )}
          {selected?.isSystem ? (
            <Alert variant="info">
              الأدوار الأساسية للنظام لا يمكن تغيير اسمها. يمكنك فقط تعديل صلاحياتها من زر "الصلاحيات".
            </Alert>
          ) : (
            <>
              <Input
                id="edit-role-name"
                label="اسم الدور (إنجليزي)"
                required
                value={editName}
                onChange={e => setEditName(e.target.value)}
                disabled={editSaving}
              />
              <Input
                id="edit-role-name-ar"
                label="الاسم بالعربية"
                required
                value={editNameAr}
                onChange={e => setEditNameAr(e.target.value)}
                disabled={editSaving}
              />
            </>
          )}
        </div>
      </Modal>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* PERMISSION EDIT MODAL                                              */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <Modal
        isOpen={showPerms}
        onClose={() => setShowPerms(false)}
        title={`صلاحيات: ${selected?.nameAr ?? ''}`}
        size="lg"
        footer={
          <>
            <Button
              id="btn-perms-save"
              variant="primary"
              loading={permSaving}
              onClick={handleSavePerms}
            >
              حفظ الصلاحيات
            </Button>
            <Button
              variant="secondary"
              onClick={() => setShowPerms(false)}
              disabled={permSaving}
            >
              إلغاء
            </Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {permError && (
            <Alert variant="danger">{permError}</Alert>
          )}
          <PermissionGroupSelector
            grouped={groupedPerms}
            selectedIds={permIds}
            onToggle={togglePerm}
            disabled={permSaving}
          />
        </div>
      </Modal>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* DELETE CONFIRM DIALOG (OD-RBAC-003)                                */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* We use a Modal instead of ConfirmDialog to support inline error   */}
      <Modal
        isOpen={showDelete}
        onClose={() => { if (!deleting) setShowDelete(false) }}
        title="حذف الدور"
        size="sm"
        footer={
          <>
            <Button
              id="btn-delete-role-confirm"
              variant="danger"
              loading={deleting}
              onClick={handleDelete}
            >
              حذف الدور
            </Button>
            <Button
              variant="secondary"
              onClick={() => setShowDelete(false)}
              disabled={deleting}
            >
              إلغاء
            </Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {deleteError ? (
            /* OD-RBAC-003: Show business error inline — do NOT close dialog */
            <Alert variant="danger">
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-2)' }}>
                <ShieldAlert size={18} style={{ flexShrink: 0, marginTop: 2 }} />
                <span>{deleteError}</span>
              </div>
            </Alert>
          ) : (
            <p style={{ color: 'var(--color-text-secondary)', margin: 0 }}>
              هل أنت متأكد من حذف الدور{' '}
              <strong style={{ color: 'var(--color-text-primary)' }}>
                "{selected?.nameAr}"
              </strong>
              ؟ لا يمكن التراجع عن هذا الإجراء.
            </p>
          )}
        </div>
      </Modal>

      {/* ── Scoped styles ──────────────────────────────────────────────── */}
      <style>{`
        .roles-card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: var(--space-3);
          flex-wrap: wrap;
        }

        @media (max-width: 600px) {
          .roles-card-header {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  )
}

// ---------------------------------------------------------------------------
// PermissionGroupSelector — internal, module-scoped (not a shared component)
// Used in both Add and Edit Permission modals.
// ---------------------------------------------------------------------------

interface PermissionGroupSelectorProps {
  grouped: Record<string, PermissionDTO[]>
  selectedIds: number[]
  onToggle: (id: number) => void
  disabled?: boolean
}

function PermissionGroupSelector({
  grouped,
  selectedIds,
  onToggle,
  disabled = false,
}: PermissionGroupSelectorProps) {
  const modules = Object.keys(grouped).sort()

  if (modules.length === 0) {
    return (
      <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>
        لا توجد صلاحيات متاحة
      </p>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      {modules.map(mod => (
        <div key={mod}>
          {/* Module header */}
          <p style={{
            fontSize: 'var(--font-size-xs)',
            fontWeight: 'var(--font-weight-semibold)',
            color: 'var(--color-text-muted)',
            textTransform: 'none',
            letterSpacing: 'normal',
            margin: '0 0 var(--space-2)',
            padding: 'var(--space-1) var(--space-2)',
            backgroundColor: 'var(--color-gray-50)',
            borderRadius: 'var(--radius-sm)',
          }}>
            {MODULE_LABELS[mod] ?? mod}
          </p>
          {/* Permission checkboxes */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', paddingRight: 'var(--space-2)' }}>
            {grouped[mod].map(perm => (
              <CheckboxField
                key={perm.id}
                id={`perm-${perm.id}`}
                label={perm.labelAr}
                checked={selectedIds.includes(perm.id)}
                onChange={() => onToggle(perm.id)}
                disabled={disabled}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
