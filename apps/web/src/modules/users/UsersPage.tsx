/**
 * KOSHK SKATE ERP — Users Management Page
 * Phase 02 — Authentication & Permissions
 *
 * Lists all users, allows creating new users and deactivating existing ones.
 * Requires permission: users.view (list), users.create, users.delete
 * Arabic RTL, KOSHK SKATE design.
 */

import { useState, useEffect } from 'react'
import { usersService, rolesService, type UserDTO, type RoleDTO } from './users.service'
import { PermissionGate } from '../../components/PermissionGate'

export default function UsersPage() {
  const [users, setUsers] = useState<UserDTO[]>([])
  const [roles, setRoles] = useState<RoleDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState({ name: '', email: '', password: '', roleIds: [] as number[] })
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

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
      await load()
    } catch (e: unknown) {
      setFormError((e as { message?: string })?.message ?? 'حدث خطأ أثناء إنشاء المستخدم')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeactivate(id: number, name: string) {
    if (!confirm(`هل تريد تعطيل حساب "${name}"؟`)) return
    try {
      await usersService.deactivate(id)
      await load()
    } catch {
      alert('تعذر تعطيل الحساب')
    }
  }

  return (
    <div style={{ padding: 'var(--space-8)', maxWidth: 'var(--content-max-width)', margin: '0 auto' }}>
      {/* Page header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
        <div>
          <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, color: 'var(--color-navy-800)', margin: 0 }}>
            إدارة المستخدمين
          </h1>
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', margin: 'var(--space-1) 0 0' }}>
            حسابات موظفي النظام
          </p>
        </div>
        <PermissionGate permission="users.create">
          <button
            id="add-user-btn"
            onClick={() => setShowModal(true)}
            style={btnPrimaryStyle}
          >
            + إضافة مستخدم
          </button>
        </PermissionGate>
      </div>

      {/* Error state */}
      {error && (
        <div style={errorBoxStyle} role="alert">{error}</div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: 'center', padding: 'var(--space-12)', color: 'var(--color-text-muted)' }}>
          جارٍ التحميل...
        </div>
      )}

      {/* Users table */}
      {!loading && !error && (
        <div style={cardStyle}>
          {users.length === 0 ? (
            <div style={{ padding: 'var(--space-12)', textAlign: 'center', color: 'var(--color-text-muted)' }}>
              لا يوجد مستخدمون بعد
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                  {['الاسم', 'البريد الإلكتروني', 'الأدوار', 'الحالة', 'إجراءات'].map(h => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={tdStyle}>{user.name}</td>
                    <td style={{ ...tdStyle, direction: 'ltr', textAlign: 'left' }}>{user.email}</td>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', gap: 'var(--space-1)', flexWrap: 'wrap' }}>
                        {user.roles.map(r => (
                          <span key={r.id} style={roleBadgeStyle}>{r.nameAr}</span>
                        ))}
                      </div>
                    </td>
                    <td style={tdStyle}>
                      <span style={{
                        ...statusBadgeStyle,
                        backgroundColor: user.isActive ? 'var(--color-success-bg)' : 'var(--color-gray-100)',
                        color: user.isActive ? 'var(--color-success)' : 'var(--color-text-muted)',
                      }}>
                        {user.isActive ? 'نشط' : 'معطّل'}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <PermissionGate permission="users.delete">
                        {user.isActive && (
                          <button
                            onClick={() => handleDeactivate(user.id, user.name)}
                            style={btnDangerStyle}
                          >
                            تعطيل
                          </button>
                        )}
                      </PermissionGate>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Create User Modal */}
      {showModal && (
        <div style={modalOverlayStyle} onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}>
          <div style={modalStyle} role="dialog" aria-modal="true" aria-labelledby="modal-title">
            <h2 id="modal-title" style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, color: 'var(--color-navy-800)', margin: '0 0 var(--space-6)' }}>
              إضافة مستخدم جديد
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <div style={fieldGroupStyle}>
                <label style={labelStyle}>الاسم</label>
                <input style={inputStyle} value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} placeholder="اسم الموظف" />
              </div>
              <div style={fieldGroupStyle}>
                <label style={labelStyle}>البريد الإلكتروني</label>
                <input style={inputStyle} type="email" dir="ltr" value={formData.email} onChange={e => setFormData(p => ({ ...p, email: e.target.value }))} placeholder="email@example.com" />
              </div>
              <div style={fieldGroupStyle}>
                <label style={labelStyle}>كلمة المرور</label>
                <input style={inputStyle} type="password" dir="ltr" value={formData.password} onChange={e => setFormData(p => ({ ...p, password: e.target.value }))} placeholder="••••••••" />
              </div>
              <div style={fieldGroupStyle}>
                <label style={labelStyle}>الأدوار</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                  {roles.map(role => (
                    <label key={role.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', cursor: 'pointer', fontSize: 'var(--font-size-sm)' }}>
                      <input
                        type="checkbox"
                        checked={formData.roleIds.includes(role.id)}
                        onChange={e => {
                          setFormData(p => ({
                            ...p,
                            roleIds: e.target.checked
                              ? [...p.roleIds, role.id]
                              : p.roleIds.filter(id => id !== role.id)
                          }))
                        }}
                      />
                      {role.nameAr}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {formError && (
              <div style={{ ...errorBoxStyle, marginTop: 'var(--space-4)' }} role="alert">{formError}</div>
            )}

            <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-6)', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowModal(false)} style={btnSecondaryStyle} disabled={saving}>إلغاء</button>
              <button onClick={handleCreate} style={btnPrimaryStyle} disabled={saving} id="create-user-save-btn">
                {saving ? 'جارٍ الحفظ...' : 'إنشاء المستخدم'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Shared styles
const cardStyle: React.CSSProperties = {
  backgroundColor: 'var(--color-white)',
  borderRadius: 'var(--radius-lg)',
  boxShadow: 'var(--shadow-card)',
  border: '1px solid var(--color-border)',
  overflow: 'hidden',
}
const thStyle: React.CSSProperties = {
  padding: 'var(--space-4)',
  textAlign: 'right',
  fontSize: 'var(--font-size-xs)',
  fontWeight: 600,
  color: 'var(--color-text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
}
const tdStyle: React.CSSProperties = {
  padding: 'var(--space-4)',
  fontSize: 'var(--font-size-sm)',
  color: 'var(--color-text-primary)',
  verticalAlign: 'middle',
}
const roleBadgeStyle: React.CSSProperties = {
  padding: '2px var(--space-2)',
  backgroundColor: 'var(--color-navy-50)',
  color: 'var(--color-navy-700)',
  borderRadius: 'var(--radius-full)',
  fontSize: '0.7rem',
  fontWeight: 600,
}
const statusBadgeStyle: React.CSSProperties = {
  padding: 'var(--space-1) var(--space-3)',
  borderRadius: 'var(--radius-full)',
  fontSize: 'var(--font-size-xs)',
  fontWeight: 600,
}
const btnPrimaryStyle: React.CSSProperties = {
  padding: 'var(--space-2) var(--space-5)',
  backgroundColor: 'var(--color-navy-800)',
  color: 'white',
  border: 'none',
  borderRadius: 'var(--radius-base)',
  cursor: 'pointer',
  fontSize: 'var(--font-size-sm)',
  fontWeight: 600,
  fontFamily: "'Cairo', sans-serif",
}
const btnSecondaryStyle: React.CSSProperties = {
  padding: 'var(--space-2) var(--space-5)',
  backgroundColor: 'transparent',
  color: 'var(--color-text-secondary)',
  border: '1.5px solid var(--color-border)',
  borderRadius: 'var(--radius-base)',
  cursor: 'pointer',
  fontSize: 'var(--font-size-sm)',
  fontFamily: "'Cairo', sans-serif",
}
const btnDangerStyle: React.CSSProperties = {
  padding: 'var(--space-1) var(--space-3)',
  backgroundColor: 'transparent',
  color: 'var(--color-danger)',
  border: '1px solid var(--color-danger)',
  borderRadius: 'var(--radius-base)',
  cursor: 'pointer',
  fontSize: 'var(--font-size-xs)',
  fontFamily: "'Cairo', sans-serif",
}
const errorBoxStyle: React.CSSProperties = {
  padding: 'var(--space-3) var(--space-4)',
  backgroundColor: 'var(--color-danger-bg)',
  border: '1px solid rgba(220,53,69,0.2)',
  borderRadius: 'var(--radius-base)',
  fontSize: 'var(--font-size-sm)',
  color: 'var(--color-danger)',
}
const modalOverlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  backgroundColor: 'rgba(0,0,0,0.45)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
  padding: 'var(--space-4)',
}
const modalStyle: React.CSSProperties = {
  backgroundColor: 'var(--color-white)',
  borderRadius: 'var(--radius-xl)',
  padding: 'var(--space-8)',
  width: '100%',
  maxWidth: 480,
  boxShadow: '0 16px 48px rgba(0,0,0,0.2)',
}
const fieldGroupStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }
const labelStyle: React.CSSProperties = { fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--color-text-primary)' }
const inputStyle: React.CSSProperties = {
  padding: 'var(--space-3) var(--space-4)',
  border: '1.5px solid var(--color-border)',
  borderRadius: 'var(--radius-base)',
  fontSize: 'var(--font-size-sm)',
  fontFamily: "'Cairo', sans-serif",
  color: 'var(--color-text-primary)',
}
