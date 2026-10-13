/**
 * KOSHK SKATE ERP — Users Management Page
 * Phase 03.5 — Design System (updated from Phase 02)
 * Phase 02 Remediation — added Edit User Roles modal (OD-RBAC-001)
 * Users Remediation — added Activate button + Change Password modal (DEC-048/DEC-049)
 *
 * Changes from Phase 02:
 *   - confirm() replaced with ConfirmDialog (OD-004 / UI-005)
 *   - alert() replaced with useToast() (OD-004 / UI-005)
 *   - Native table replaced with DataTable component (UI-002)
 *   - Page-level error uses Alert component (UI-002)
 *   - Loading state uses PageLoader (UI-002)
 *   - Action buttons use Button component (UI-002)
 *   - Status badges use Badge component with correct semantic tokens (DEC-034)
 *   - Create User modal uses Modal component (UI-002)
 *   - Hardcoded status color tokens corrected (--color-success vs --color-success-bg etc.)
 *   - textTransform: uppercase removed from Arabic table headers (UI-007)
 *
 * Phase 02 Remediation:
 *   - Edit User Roles modal added (PATCH /api/v1/users/:id with roleIds)
 *   - users.edit PermissionGate wraps the edit-roles button
 *
 * Users Remediation:
 *   - Activate button for deactivated users (POST /api/v1/users/:id/activate)
 *   - users.delete PermissionGate wraps activate (same permission as deactivate — lifecycle)
 *   - Change Password modal (POST /api/v1/users/:id/change-password)
 *   - users.change_password PermissionGate wraps change-password button
 */

import { useState, useEffect } from 'react'
import { UserPlus, Users, UserCog, KeyRound, UserCheck } from 'lucide-react'
import { usersService, rolesService, type UserDTO, type RoleDTO } from './users.service'
import { PermissionGate } from '../../components/PermissionGate'
import {
  Button,
  Badge,
  Alert,
  Modal,
  ConfirmDialog,
  EmptyState,
  CheckboxField,
  DataTable,
  Input,
  PageLoader,
  useToast,
  type TableColumn,
} from '../../components/ui'


// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function UsersPage() {
  const { showToast } = useToast()

  const [users, setUsers] = useState<UserDTO[]>([])
  const [roles, setRoles] = useState<RoleDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Create modal
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState({ name: '', email: '', password: '', roleIds: [] as number[] })
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Confirm deactivate dialog
  const [confirmTarget, setConfirmTarget] = useState<{ id: number; name: string } | null>(null)
  const [deactivating, setDeactivating] = useState(false)

  // Confirm activate dialog (DEC-048)
  const [activateTarget, setActivateTarget] = useState<{ id: number; name: string } | null>(null)
  const [activating, setActivating] = useState(false)

  // Edit User Roles modal (Phase 02 remediation)
  const [editRolesTarget, setEditRolesTarget] = useState<UserDTO | null>(null)
  const [editRoleIds, setEditRoleIds] = useState<number[]>([])
  const [editRolesSaving, setEditRolesSaving] = useState(false)
  const [editRolesError, setEditRolesError] = useState<string | null>(null)

  // Change Password modal (DEC-049)
  const [changePwdTarget, setChangePwdTarget] = useState<UserDTO | null>(null)
  const [changePwdData, setChangePwdData] = useState({ newPassword: '', confirmPassword: '' })
  const [changePwdSaving, setChangePwdSaving] = useState(false)
  const [changePwdError, setChangePwdError] = useState<string | null>(null)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const [usersData, rolesData] = await Promise.all([usersService.list(), rolesService.list()])
      setUsers(usersData)
      setRoles(rolesData)
    } catch {
      setError('تعذر تحميل قائمة المستخدمين')
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate() {
    setFormError(null)
    if (!formData.name.trim()) { setFormError('الاسم مطلوب'); return }
    if (!formData.email.trim()) { setFormError('البريد الإلكتروني مطلوب'); return }
    if (!formData.password) { setFormError('كلمة المرور مطلوبة'); return }
    setSaving(true)
    try {
      await usersService.create(formData)
      setShowModal(false)
      setFormData({ name: '', email: '', password: '', roleIds: [] })
      showToast({ type: 'success', title: 'تم إنشاء المستخدم بنجاح' })
      await load()
    } catch (e: unknown) {
      setFormError((e as { message?: string })?.message ?? 'حدث خطأ أثناء إنشاء المستخدم')
    } finally {
      setSaving(false)
    }
  }

  // Trigger ConfirmDialog instead of native confirm()
  function handleDeactivateClick(user: UserDTO) {
    setConfirmTarget({ id: user.id, name: user.name })
  }

  // Actual deactivate — called after user confirms
  async function handleDeactivateConfirm() {
    if (!confirmTarget) return
    setDeactivating(true)
    try {
      await usersService.deactivate(confirmTarget.id)
      showToast({ type: 'success', title: `تم تعطيل حساب "${confirmTarget.name}"` })
      setConfirmTarget(null)
      await load()
    } catch {
      showToast({ type: 'error', title: 'تعذر تعطيل الحساب', message: 'يرجى المحاولة مجدداً' })
      setConfirmTarget(null)
    } finally {
      setDeactivating(false)
    }
  }

  // Trigger activate ConfirmDialog (DEC-048)
  function handleActivateClick(user: UserDTO) {
    setActivateTarget({ id: user.id, name: user.name })
  }

  // Actual activate — called after user confirms (DEC-048)
  async function handleActivateConfirm() {
    if (!activateTarget) return
    setActivating(true)
    try {
      await usersService.activate(activateTarget.id)
      showToast({ type: 'success', title: `تم تفعيل حساب "${activateTarget.name}"` })
      setActivateTarget(null)
      await load()
    } catch {
      showToast({ type: 'error', title: 'تعذر تفعيل الحساب', message: 'يرجى المحاولة مجدداً' })
      setActivateTarget(null)
    } finally {
      setActivating(false)
    }
  }

  // Open edit-roles modal
  function handleEditRolesClick(user: UserDTO) {
    setEditRolesTarget(user)
    setEditRoleIds(user.roles.map(r => r.id))
    setEditRolesError(null)
  }

  // Save updated role assignment
  async function handleEditRolesSave() {
    if (!editRolesTarget) return
    setEditRolesError(null)
    setEditRolesSaving(true)
    try {
      await usersService.update(editRolesTarget.id, { roleIds: editRoleIds })
      showToast({ type: 'success', title: `تم تحديث أدوار "${editRolesTarget.name}" بنجاح` })
      setEditRolesTarget(null)
      await load()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setEditRolesError(msg ?? 'حدث خطأ أثناء تحديث الأدوار')
    } finally {
      setEditRolesSaving(false)
    }
  }

  // Open Change Password modal (DEC-049)
  function handleChangePwdClick(user: UserDTO) {
    setChangePwdTarget(user)
    setChangePwdData({ newPassword: '', confirmPassword: '' })
    setChangePwdError(null)
  }

  // Save password change (DEC-049)
  async function handleChangePwdSave() {
    if (!changePwdTarget) return
    setChangePwdError(null)

    // Frontend validation (server also validates — Rule 13)
    if (!changePwdData.newPassword) {
      setChangePwdError('كلمة المرور الجديدة مطلوبة')
      return
    }
    if (!changePwdData.confirmPassword) {
      setChangePwdError('تأكيد كلمة المرور مطلوب')
      return
    }
    if (changePwdData.newPassword !== changePwdData.confirmPassword) {
      setChangePwdError('كلمتا المرور غير متطابقتين')
      return
    }
    if (changePwdData.newPassword.length < 6) {
      setChangePwdError('كلمة المرور يجب أن تكون 6 أحرف على الأقل')
      return
    }

    setChangePwdSaving(true)
    try {
      await usersService.changePassword(changePwdTarget.id, {
        newPassword: changePwdData.newPassword,
        confirmPassword: changePwdData.confirmPassword,
      })
      showToast({ type: 'success', title: `تم تغيير كلمة مرور "${changePwdTarget.name}" بنجاح` })
      setChangePwdTarget(null)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setChangePwdError(msg ?? 'حدث خطأ أثناء تغيير كلمة المرور')
    } finally {
      setChangePwdSaving(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Table columns — SYS-004: DataTable migration
  // TableColumn uses default generic (Record<string,unknown>); row is cast to
  // UserDTO inside each render fn so all field access remains type-safe.
  // ---------------------------------------------------------------------------

  const usersColumns: TableColumn[] = [
    {
      key: 'name',
      header: 'الاسم',
      render: (_v, row) => {
        const u = row as unknown as UserDTO
        return (
          <span style={{ fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-navy-800)' }}>
            {u.name}
          </span>
        )
      },
    },
    {
      key: 'email',
      header: 'البريد الإلكتروني',
      render: (_v, row) => {
        const u = row as unknown as UserDTO
        return (
          <span style={{ direction: 'ltr', display: 'inline-block', color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-xs)' }}>
            {u.email}
          </span>
        )
      },
    },
    {
      key: 'roles',
      header: 'الأدوار',
      render: (_v, row) => {
        const u = row as unknown as UserDTO
        return (
          /* D-002: role name pills using shared Badge */
          <div style={{ display: 'flex', gap: 'var(--space-1)', flexWrap: 'wrap' }}>
            {u.roles.map(r => (
              <Badge key={r.id} status="role">{r.nameAr}</Badge>
            ))}
          </div>
        )
      },
    },
    {
      key: 'isActive',
      header: 'الحالة',
      render: (_v, row) => {
        const u = row as unknown as UserDTO
        return (
          <Badge status={u.isActive ? 'active' : 'inactive'}>
            {u.isActive ? 'نشط' : 'معطّل'}
          </Badge>
        )
      },
    },
    {
      key: 'actions',
      header: 'إجراءات',
      align: 'center',
      render: (_v, row) => {
        const u = row as unknown as UserDTO
        return (
          <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'center', flexWrap: 'wrap' }}>
            <PermissionGate permission="users.edit">
              <Button
                id={`btn-edit-roles-${u.id}`}
                variant="ghost"
                size="sm"
                onClick={() => handleEditRolesClick(u)}
                title="تعديل الأدوار"
              >
                <UserCog size={14} />
                الأدوار
              </Button>
            </PermissionGate>
            <PermissionGate permission="users.change_password">
              <Button
                id={`btn-change-pwd-${u.id}`}
                variant="ghost"
                size="sm"
                onClick={() => handleChangePwdClick(u)}
                title="تغيير كلمة المرور"
              >
                <KeyRound size={14} />
                كلمة المرور
              </Button>
            </PermissionGate>
            <PermissionGate permission="users.delete">
              {u.isActive ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeactivateClick(u)}
                  style={{ color: 'var(--color-danger-text)' }}
                >
                  تعطيل
                </Button>
              ) : (
                <Button
                  id={`btn-activate-${u.id}`}
                  variant="ghost"
                  size="sm"
                  onClick={() => handleActivateClick(u)}
                  style={{ color: 'var(--color-success-text)' }}
                >
                  <UserCheck size={14} />
                  تفعيل
                </Button>
              )}
            </PermissionGate>
          </div>
        )
      },
    },
  ]

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="page-container">

      {/* Page header */}
      <div className="page-header">
        <div className="page-header-text">
          <h1 className="page-header-title">إدارة المستخدمين</h1>
          <p className="page-header-subtitle">حسابات موظفي النظام</p>
        </div>
        <PermissionGate permission="users.create">
          <Button
            id="add-user-btn"
            variant="primary"
            onClick={() => { setShowModal(true); setFormError(null) }}
          >
            <UserPlus size={16} aria-hidden="true" />
            إضافة مستخدم
          </Button>
        </PermissionGate>
      </div>

      {/* Error */}
      {error && (
        <Alert variant="danger" style={{ marginBottom: 'var(--space-6)' } as React.CSSProperties}>
          {error}
        </Alert>
      )}

      {/* Loading */}
      {loading && <PageLoader label="جارٍ تحميل المستخدمين" />}

      {/* Users table — desktop/tablet (>= 640px) */}
      {!loading && !error && (
        <>
          {/* Desktop/tablet: DataTable — SYS-004: migrated from raw <table className="ds-table"> */}
          <div className="users-desktop-table">
            <DataTable
              columns={usersColumns}
              data={users as unknown as Record<string, unknown>[]}
              emptyMessage="لا يوجد مستخدمون"
              emptyIcon={Users}
            />
          </div>

          {/* Mobile: card-list view (< 640px) — OD-MOBILE-001 Option B */}
          <div className="users-mobile-cards">
            {users.length === 0 ? (
              <div style={{
                backgroundColor: 'var(--color-white)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--color-border)',
              }}>
                {/* D-008: EmptyState component instead of raw div with text */}
                <EmptyState
                  icon={Users}
                  title="لا يوجد مستخدمون"
                  description="لم يتم إضافة أي مستخدمين بعد"
                />
              </div>
            ) : (
              users.map(user => (
                <div key={user.id} style={{
                  backgroundColor: 'var(--color-white)',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--color-border)',
                  boxShadow: 'var(--shadow-xs)',
                  padding: 'var(--space-4)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--space-3)',
                }}>
                  {/* User identity row */}
                  <div className="user-card-identity" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                    {/* Avatar */}
                    <div style={{
                      width: 40, height: 40, flexShrink: 0,
                      borderRadius: 'var(--radius-full)',
                      backgroundColor: 'var(--color-navy-100)',
                      color: 'var(--color-navy-800)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 'var(--font-weight-bold)',
                      fontSize: 'var(--font-size-sm)',
                    }} aria-hidden="true">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-navy-800)', fontSize: 'var(--font-size-sm)' }}>
                        {user.name}
                      </p>
                      <p className="user-card-email" style={{ margin: '2px 0 0', direction: 'ltr', textAlign: 'right', color: 'var(--color-text-muted)', fontSize: 'var(--font-size-xs)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {user.email}
                      </p>
                    </div>
                    <Badge status={user.isActive ? 'active' : 'inactive'}>
                      {user.isActive ? 'نشط' : 'معطّل'}
                    </Badge>
                  </div>

                  {/* Roles */}
                  {/* D-002: replaced raw <span> (inline navy-50/navy-700) with shared <Badge status="role"> */}
                  {user.roles.length > 0 && (
                    <div style={{ display: 'flex', gap: 'var(--space-1)', flexWrap: 'wrap' }}>
                      {user.roles.map(r => (
                        <Badge key={r.id} status="role">{r.nameAr}</Badge>
                      ))}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="user-card-actions" style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                    <PermissionGate permission="users.edit">
                      <Button
                        id={`btn-edit-roles-mobile-${user.id}`}
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditRolesClick(user)}
                        style={{ flex: 1 }}
                      >
                        <UserCog size={14} />
                        الأدوار
                      </Button>
                    </PermissionGate>
                    <PermissionGate permission="users.change_password">
                      <Button
                        id={`btn-change-pwd-mobile-${user.id}`}
                        variant="ghost"
                        size="sm"
                        onClick={() => handleChangePwdClick(user)}
                        style={{ flex: 1 }}
                      >
                        <KeyRound size={14} />
                        كلمة المرور
                      </Button>
                    </PermissionGate>
                    <PermissionGate permission="users.delete">
                      {user.isActive ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeactivateClick(user)}
                          style={{ flex: 1, color: 'var(--color-danger-text)', borderColor: 'var(--color-danger-bg)', backgroundColor: 'var(--color-danger-bg)' }}
                        >
                          تعطيل الحساب
                        </Button>
                      ) : (
                        <Button
                          id={`btn-activate-mobile-${user.id}`}
                          variant="ghost"
                          size="sm"
                          onClick={() => handleActivateClick(user)}
                          style={{ flex: 1, color: 'var(--color-success-text)', borderColor: 'var(--color-success-bg)', backgroundColor: 'var(--color-success-bg)' }}
                        >
                          <UserCheck size={14} />
                          تفعيل الحساب
                        </Button>
                      )}
                    </PermissionGate>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      <style>{`
        /* Desktop/tablet table — show above 640px */
        .users-desktop-table { display: block; }
        .users-mobile-cards  { display: none; }

        @media (max-width: 639px) {
          .users-desktop-table { display: none; }
          .users-mobile-cards  {
            display: flex;
            flex-direction: column;
            gap: var(--space-3);
          }
        }
      `}</style>

      {/* Create User Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => !saving && setShowModal(false)}
        title="إضافة مستخدم جديد"
        size="base"
        footer={
          <>
            <Button
              id="create-user-save-btn"
              variant="primary"
              onClick={handleCreate}
              loading={saving}
            >
              إنشاء المستخدم
            </Button>
            <Button
              variant="secondary"
              onClick={() => setShowModal(false)}
              disabled={saving}
            >
              إلغاء
            </Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <Input
            id="user-name"
            label="الاسم"
            value={formData.name}
            onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
            placeholder="اسم الموظف"
            required
          />
          <Input
            id="user-email"
            label="البريد الإلكتروني"
            type="email"
            dir="ltr"
            value={formData.email}
            onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
            placeholder="email@example.com"
            required
          />
          <Input
            id="user-password"
            label="كلمة المرور"
            type="password"
            dir="ltr"
            value={formData.password}
            onChange={e => setFormData(p => ({ ...p, password: e.target.value }))}
            placeholder="••••••••"
            required
          />

          {/* Role checkboxes — D-012: replaced raw <input type="checkbox"> + inline styles */}
          {/* fieldset/legend provides semantic grouping for screen readers */}
          <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
            <legend
              style={{
                fontSize: 'var(--font-size-sm)',
                fontWeight: 'var(--font-weight-semibold)',
                color: 'var(--color-text-primary)',
                marginBottom: 'var(--space-1)',
                padding: 0,
              }}
            >
              الأدوار
            </legend>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {roles.map(role => (
                <CheckboxField
                  key={role.id}
                  id={`user-role-${role.id}`}
                  label={role.nameAr}
                  checked={formData.roleIds.includes(role.id)}
                  onChange={checked =>
                    setFormData(p => ({
                      ...p,
                      roleIds: checked
                        ? [...p.roleIds, role.id]
                        : p.roleIds.filter(id => id !== role.id),
                    }))
                  }
                />
              ))}
            </div>
          </fieldset>

          {formError && (
            <Alert variant="danger">{formError}</Alert>
          )}
        </div>
      </Modal>

      {/* Confirm Deactivate Dialog — replaces native confirm() */}
      <ConfirmDialog
        isOpen={Boolean(confirmTarget)}
        onConfirm={handleDeactivateConfirm}
        onCancel={() => setConfirmTarget(null)}
        title="تعطيل الحساب"
        description={`هل تريد تعطيل حساب "${confirmTarget?.name ?? ''}"؟ يمكن إعادة تفعيله لاحقاً.`}
        confirmLabel="تعطيل"
        variant="danger"
        loading={deactivating}
      />

      {/* Confirm Activate Dialog (DEC-048) */}
      <ConfirmDialog
        isOpen={Boolean(activateTarget)}
        onConfirm={handleActivateConfirm}
        onCancel={() => setActivateTarget(null)}
        title="تفعيل الحساب"
        description={`هل تريد تفعيل حساب "${activateTarget?.name ?? ''}"؟ سيتمكن المستخدم من تسجيل الدخول مجدداً.`}
        confirmLabel="تفعيل"
        variant="default"
        loading={activating}
      />

      {/* Edit User Roles Modal (Phase 02 Remediation — OD-RBAC-001) */}
      <Modal
        isOpen={Boolean(editRolesTarget)}
        onClose={() => { if (!editRolesSaving) setEditRolesTarget(null) }}
        title={`تعديل أدوار: ${editRolesTarget?.name ?? ''}`}
        size="base"
        footer={
          <>
            <Button
              id="btn-edit-roles-save"
              variant="primary"
              loading={editRolesSaving}
              onClick={handleEditRolesSave}
            >
              حفظ الأدوار
            </Button>
            <Button
              variant="secondary"
              onClick={() => setEditRolesTarget(null)}
              disabled={editRolesSaving}
            >
              إلغاء
            </Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {editRolesError && (
            <Alert variant="danger">{editRolesError}</Alert>
          )}
          <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
            <legend
              style={{
                fontSize: 'var(--font-size-sm)',
                fontWeight: 'var(--font-weight-semibold)',
                color: 'var(--color-text-primary)',
                marginBottom: 'var(--space-2)',
                padding: 0,
              }}
            >
              اختر الأدوار
            </legend>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {roles.map(role => (
                <CheckboxField
                  key={role.id}
                  id={`edit-role-${role.id}`}
                  label={role.nameAr}
                  checked={editRoleIds.includes(role.id)}
                  onChange={checked =>
                    setEditRoleIds(prev =>
                      checked ? [...prev, role.id] : prev.filter(id => id !== role.id)
                    )
                  }
                  disabled={editRolesSaving}
                />
              ))}
            </div>
          </fieldset>
        </div>
      </Modal>

      {/* Change Password Modal (DEC-049) */}
      <Modal
        isOpen={Boolean(changePwdTarget)}
        onClose={() => { if (!changePwdSaving) setChangePwdTarget(null) }}
        title={`تغيير كلمة المرور: ${changePwdTarget?.name ?? ''}`}
        size="base"
        footer={
          <>
            <Button
              id="btn-change-pwd-save"
              variant="primary"
              loading={changePwdSaving}
              onClick={handleChangePwdSave}
            >
              تغيير كلمة المرور
            </Button>
            <Button
              variant="secondary"
              onClick={() => setChangePwdTarget(null)}
              disabled={changePwdSaving}
            >
              إلغاء
            </Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {changePwdError && (
            <Alert variant="danger">{changePwdError}</Alert>
          )}
          <Input
            id="change-pwd-new"
            label="كلمة المرور الجديدة"
            type="password"
            dir="ltr"
            value={changePwdData.newPassword}
            onChange={e => setChangePwdData(p => ({ ...p, newPassword: e.target.value }))}
            placeholder="••••••••"
            required
            disabled={changePwdSaving}
          />
          <Input
            id="change-pwd-confirm"
            label="تأكيد كلمة المرور الجديدة"
            type="password"
            dir="ltr"
            value={changePwdData.confirmPassword}
            onChange={e => setChangePwdData(p => ({ ...p, confirmPassword: e.target.value }))}
            placeholder="••••••••"
            required
            disabled={changePwdSaving}
          />
          <p style={{
            margin: 0,
            fontSize: 'var(--font-size-xs)',
            color: 'var(--color-text-muted)',
          }}>
            لا يلزم إدخال كلمة المرور الحالية. كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل.
          </p>
        </div>
      </Modal>
    </div>
  )
}
