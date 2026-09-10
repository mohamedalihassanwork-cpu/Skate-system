/**
 * KOSHK SKATE ERP — Roles Management Page
 * Phase 03.5 — Design System (updated from Phase 02)
 *
 * Changes from Phase 02:
 *   - Error state uses Alert component (UI-002)
 *   - Loading uses PageLoader (UI-002)
 *   - Role cards use Card component (UI-002)
 *   - Hardcoded --color-danger / --color-gray-100 tokens corrected
 *   - textTransform: uppercase removed (was not present, but letterSpacing on systemBadge corrected)
 *
 * Business logic (roles.service calls) UNCHANGED from Phase 02.
 */

import { useState, useEffect } from 'react'
import { rolesService, type RoleDTO } from './users.service'
import { Alert, Card, PageLoader } from '../../components/ui'

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
        <Alert variant="danger" style={{ marginBottom: 'var(--space-6)' } as React.CSSProperties}>
          {error}
        </Alert>
      )}

      {loading && <PageLoader label="جارٍ تحميل الأدوار" />}

      {!loading && !error && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {roles.map(role => (
            <Card key={role.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-4)' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, color: 'var(--color-navy-800)', margin: 0 }}>
                      {role.nameAr}
                    </h2>
                    {role.isSystem && (
                      <span style={{
                        padding: 'var(--space-1) var(--space-2)',
                        backgroundColor: 'var(--color-gold-100)',
                        color: 'var(--color-gold-600)',
                        borderRadius: 'var(--radius-full)',
                        fontSize: '0.65rem',
                        fontWeight: 700,
                      }}>
                        نظامي
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', margin: 'var(--space-1) 0 0' }}>
                    {role.name}
                  </p>
                </div>
                <span style={{
                  padding: 'var(--space-1) var(--space-3)',
                  backgroundColor: 'var(--color-navy-50)',
                  color: 'var(--color-navy-700)',
                  borderRadius: 'var(--radius-full)',
                  fontSize: 'var(--font-size-xs)',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                }}>
                  {role.permissions.length} صلاحية
                </span>
              </div>

              {role.permissions.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                  {role.permissions.map(p => (
                    <span
                      key={p.id}
                      title={p.key}
                      style={{
                        padding: 'var(--space-1) var(--space-2)',
                        backgroundColor: 'var(--color-neutral-bg)',
                        color: 'var(--color-text-secondary)',
                        borderRadius: 'var(--radius-base)',
                        fontSize: '0.7rem',
                        fontWeight: 500,
                      }}
                    >
                      {p.labelAr}
                    </span>
                  ))}
                </div>
              ) : (
                <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)', margin: 0 }}>
                  لا توجد صلاحيات محددة
                </p>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
