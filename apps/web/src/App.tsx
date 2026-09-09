/**
 * KOSHK SKATE ERP — App Shell
 * Phase 02 — Authentication & Permissions (updated)
 *
 * Routing:
 *   /login        → LoginPage (public)
 *   /             → Dashboard (protected — placeholder until Phase 17)
 *   /users        → UsersPage (protected, requires users.view)
 *   /roles        → RolesPage (protected, requires roles.view)
 *   /*            → 404 redirect to /
 *
 * Phase 03+ will add: /skates, /customers, /rentals, etc.
 */

import { Routes, Route, Navigate, NavLink, useNavigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from './contexts/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { PermissionGate } from './components/PermissionGate'
import LoginPage from './modules/auth/LoginPage'
import UsersPage from './modules/users/UsersPage'
import RolesPage from './modules/users/RolesPage'

// ---------------------------------------------------------------------------
// Nav items
// ---------------------------------------------------------------------------

const NAV_ITEMS = [
  { icon: '🏠', label: 'لوحة التحكم', to: '/', exact: true },
  { icon: '⛸️', label: 'الزلاجات', to: '/skates', permission: 'skates.view' },
  { icon: '👥', label: 'العملاء', to: '/customers', permission: 'customers.view' },
  { icon: '🎫', label: 'الإيجارات', to: '/rentals', permission: 'rentals.view' },
  { icon: '💰', label: 'الخزينة', to: '/treasury', permission: 'treasury.view' },
  { icon: '🔧', label: 'الصيانة', to: '/maintenance', permission: 'maintenance.view' },
  { icon: '📊', label: 'التقارير', to: '/reports', permission: 'reports.view' },
]

const ADMIN_NAV_ITEMS = [
  { icon: '👤', label: 'المستخدمون', to: '/users', permission: 'users.view' },
  { icon: '🔑', label: 'الأدوار', to: '/roles', permission: 'roles.view' },
  { icon: '⚙️', label: 'الإعدادات', to: '/settings', permission: 'settings.view' },
]

// ---------------------------------------------------------------------------
// Sidebar
// ---------------------------------------------------------------------------

function Sidebar({ onLogout }: { onLogout: () => void }) {
  const { user } = useAuth()

  const navLinkStyle = ({ isActive }: { isActive: boolean }): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-3)',
    padding: 'var(--space-3) var(--space-4)',
    borderRadius: 'var(--radius-base)',
    color: isActive ? 'var(--color-gold-400)' : 'rgba(255,255,255,0.65)',
    fontSize: 'var(--font-size-sm)',
    fontWeight: isActive ? 600 : 400,
    cursor: 'pointer',
    textDecoration: 'none',
    transition: 'all var(--transition-fast)',
    backgroundColor: isActive ? 'rgba(243,183,53,0.15)' : 'transparent',
  })

  return (
    <aside
      style={{
        width: 'var(--sidebar-width)',
        minHeight: '100vh',
        backgroundColor: 'var(--color-navy-800)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        zIndex: 'var(--z-sticky)' as unknown as number,
        boxShadow: '-4px 0 20px rgba(0,0,0,0.15)',
      }}
      role="navigation"
      aria-label="القائمة الرئيسية"
    >
      {/* Logo */}
      <div style={{
        padding: 'var(--space-6) var(--space-4)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 'var(--space-2)',
      }}>
        <div style={{
          width: 48, height: 48,
          borderRadius: 'var(--radius-md)',
          backgroundColor: 'var(--color-gold-400)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.5rem', fontWeight: 800,
          color: 'var(--color-navy-900)',
        }} aria-hidden="true">KS</div>
        <span style={{ color: 'var(--color-white)', fontSize: 'var(--font-size-sm)', fontWeight: 600, opacity: 0.85 }}>
          KOSHK SKATE ERP
        </span>
      </div>

      {/* Main nav */}
      <nav style={{ flex: 1, padding: 'var(--space-4) var(--space-3)', display: 'flex', flexDirection: 'column', gap: 'var(--space-1)', overflowY: 'auto' }}>
        {NAV_ITEMS.map(item => (
          item.permission ? (
            <PermissionGate key={item.to} permission={item.permission}>
              <NavLink to={item.to} end={item.exact} style={navLinkStyle}>
                <span aria-hidden="true">{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            </PermissionGate>
          ) : (
            <NavLink key={item.to} to={item.to} end={item.exact} style={navLinkStyle}>
              <span aria-hidden="true">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          )
        ))}

        {/* Admin section */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', marginTop: 'var(--space-4)', paddingTop: 'var(--space-4)' }}>
          <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.35)', paddingRight: 'var(--space-4)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            الإدارة
          </span>
          {ADMIN_NAV_ITEMS.map(item => (
            <PermissionGate key={item.to} permission={item.permission}>
              <NavLink to={item.to} style={navLinkStyle}>
                <span aria-hidden="true">{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            </PermissionGate>
          ))}
        </div>
      </nav>

      {/* Footer: user info + logout */}
      <div style={{ padding: 'var(--space-4)', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        {user && (
          <div style={{ marginBottom: 'var(--space-3)', padding: 'var(--space-3) var(--space-4)', borderRadius: 'var(--radius-base)', backgroundColor: 'rgba(255,255,255,0.06)' }}>
            <p style={{ color: 'white', fontSize: 'var(--font-size-sm)', fontWeight: 600, margin: 0 }}>{user.name}</p>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem', margin: 'var(--space-1) 0 0', direction: 'ltr' }}>{user.email}</p>
          </div>
        )}
        <button
          onClick={onLogout}
          style={{
            display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
            width: '100%', padding: 'var(--space-3) var(--space-4)',
            background: 'none', border: 'none', cursor: 'pointer',
            borderRadius: 'var(--radius-base)',
            color: 'rgba(255,255,255,0.55)', fontSize: 'var(--font-size-sm)',
            fontFamily: "'Cairo', sans-serif",
          }}
          id="logout-btn"
        >
          <span aria-hidden="true">🚪</span>
          <span>تسجيل الخروج</span>
        </button>
      </div>
    </aside>
  )
}

// ---------------------------------------------------------------------------
// Topbar
// ---------------------------------------------------------------------------

function Topbar({ pageTitle }: { pageTitle?: string }) {
  const { user } = useAuth()
  return (
    <header style={{
      height: 'var(--header-height)',
      backgroundColor: 'var(--color-white)',
      borderBottom: '1px solid var(--color-border)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 var(--space-8)',
      position: 'sticky', top: 0,
      zIndex: 'var(--z-raised)' as unknown as number,
      boxShadow: 'var(--shadow-xs)',
    }}>
      <span style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, color: 'var(--color-navy-800)' }}>
        {pageTitle ?? 'الرئيسية'}
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
        {user?.roles[0] && (
          <span style={{
            padding: 'var(--space-1) var(--space-3)',
            borderRadius: 'var(--radius-full)',
            fontSize: 'var(--font-size-xs)',
            fontWeight: 600,
            backgroundColor: 'var(--color-navy-50)',
            color: 'var(--color-navy-700)',
          }}>
            {user.roles[0].nameAr}
          </span>
        )}
        <span style={{
          padding: 'var(--space-1) var(--space-3)',
          borderRadius: 'var(--radius-full)',
          fontSize: 'var(--font-size-xs)',
          fontWeight: 600,
          backgroundColor: 'var(--color-success-bg)',
          color: 'var(--color-success)',
        }}>
          المرحلة 02 ✓
        </span>
      </div>
    </header>
  )
}

// ---------------------------------------------------------------------------
// Placeholder page for modules not yet implemented
// ---------------------------------------------------------------------------

function PlaceholderPage({ title, phase }: { title: string; phase: string }) {
  return (
    <div style={{ padding: 'var(--space-8)', maxWidth: 'var(--content-max-width)', margin: '0 auto' }}>
      <div style={{
        backgroundColor: 'var(--color-white)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-card)',
        border: '1px solid var(--color-border)',
        padding: 'var(--space-12)',
        textAlign: 'center',
      }}>
        <p style={{ fontSize: 'var(--font-size-3xl)', margin: '0 0 var(--space-4)' }}>🚧</p>
        <h1 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, color: 'var(--color-navy-800)', margin: '0 0 var(--space-2)' }}>{title}</h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>
          سيتم تنفيذ هذه الوحدة في {phase}
        </p>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// App Shell (authenticated layout)
// ---------------------------------------------------------------------------

function AppShell({ children }: { children: ReactNode }) {
  const { logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--color-gray-50)' }}>
      <Sidebar onLogout={handleLogout} />
      <div style={{ flex: 1, marginRight: 'var(--sidebar-width)', display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Topbar />
        <main style={{ flex: 1 }}>
          {children}
        </main>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Root App — routing
// ---------------------------------------------------------------------------

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<LoginPage />} />

      {/* Protected */}
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <AppShell>
              <Routes>
                <Route path="/" element={<PlaceholderPage title="لوحة التحكم" phase="المرحلة 17" />} />
                <Route path="/users" element={<UsersPage />} />
                <Route path="/roles" element={<RolesPage />} />
                <Route path="/skates" element={<PlaceholderPage title="الزلاجات" phase="المرحلة 03" />} />
                <Route path="/customers" element={<PlaceholderPage title="العملاء" phase="المرحلة 04" />} />
                <Route path="/rentals" element={<PlaceholderPage title="الإيجارات" phase="المرحلة 05" />} />
                <Route path="/treasury" element={<PlaceholderPage title="الخزينة" phase="المرحلة 06" />} />
                <Route path="/maintenance" element={<PlaceholderPage title="الصيانة" phase="المرحلة 09" />} />
                <Route path="/reports" element={<PlaceholderPage title="التقارير" phase="المرحلة 13" />} />
                <Route path="/settings" element={<PlaceholderPage title="الإعدادات" phase="المرحلة متأخرة" />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </AppShell>
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}
