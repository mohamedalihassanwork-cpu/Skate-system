/**
 * KOSHK SKATE ERP — Roles Management Page
 * Phase 02 — Authentication & Permissions
 *
 * Lists all roles with their permissions.
 * Requires permission: roles.view
 * Arabic RTL, KOSHK SKATE design.
 */

import { useState, useEffect } from 'react'
import { rolesService, type RoleDTO } from './users.service'

export default function RolesPage() {
  const [roles, setRoles] = useState<RoleDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const data = await rolesService.list()
      setRoles(data)
    } catch {
      setError('تعذر تحميل قائمة الأدوار')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: 'var(--space-8)', maxWidth: 'var(--content-max-width)', margin: '0 auto' }}>
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, color: 'var(--color-navy-800)', margin: 0 }}>
          الأدوار والصلاحيات
        </h1>
        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', margin: 'var(--space-1) 0 0' }}>
          إدارة أدوار المستخدمين وصلاحياتهم
        </p>
      </div>

      {error && (
        <div style={errorBoxStyle} role="alert">{error}</div>
      )}

      {loading && (
        <div style={{ textAlign: 'center', padding: 'var(--space-12)', color: 'var(--color-text-muted)' }}>
          جارٍ التحميل...
        </div>
      )}

      {!loading && !error && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {roles.map(role => (
            <div key={role.id} style={roleCardStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-4)' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, color: 'var(--color-navy-800)', margin: 0 }}>
                      {role.nameAr}
                    </h2>
                    {role.isSystem && (
                      <span style={systemBadgeStyle}>نظامي</span>
                    )}
                  </div>
                  <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', margin: 'var(--space-1) 0 0' }}>
                    {role.name}
                  </p>
                </div>
                <span style={countBadgeStyle}>{role.permissions.length} صلاحية</span>
              </div>

              {/* Permissions grouped by module */}
              {role.permissions.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                  {role.permissions.map(p => (
                    <span key={p.id} style={permBadgeStyle} title={p.key}>
                      {p.labelAr}
                    </span>
                  ))}
                </div>
              ) : (
                <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>
                  لا توجد صلاحيات محددة
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const errorBoxStyle: React.CSSProperties = {
  padding: 'var(--space-3) var(--space-4)',
  backgroundColor: 'var(--color-danger-bg)',
  border: '1px solid rgba(220,53,69,0.2)',
  borderRadius: 'var(--radius-base)',
  fontSize: 'var(--font-size-sm)',
  color: 'var(--color-danger)',
  marginBottom: 'var(--space-4)',
}
const roleCardStyle: React.CSSProperties = {
  backgroundColor: 'var(--color-white)',
  borderRadius: 'var(--radius-lg)',
  boxShadow: 'var(--shadow-card)',
  border: '1px solid var(--color-border)',
  padding: 'var(--space-6)',
}
const systemBadgeStyle: React.CSSProperties = {
  padding: 'var(--space-1) var(--space-2)',
  backgroundColor: 'var(--color-gold-100)',
  color: 'var(--color-gold-700)',
  borderRadius: 'var(--radius-full)',
  fontSize: '0.65rem',
  fontWeight: 700,
  letterSpacing: '0.04em',
}
const countBadgeStyle: React.CSSProperties = {
  padding: 'var(--space-1) var(--space-3)',
  backgroundColor: 'var(--color-navy-50)',
  color: 'var(--color-navy-700)',
  borderRadius: 'var(--radius-full)',
  fontSize: 'var(--font-size-xs)',
  fontWeight: 600,
}
const permBadgeStyle: React.CSSProperties = {
  padding: 'var(--space-1) var(--space-2)',
  backgroundColor: 'var(--color-gray-100)',
  color: 'var(--color-text-secondary)',
  borderRadius: 'var(--radius-base)',
  fontSize: '0.7rem',
  fontWeight: 500,
}
