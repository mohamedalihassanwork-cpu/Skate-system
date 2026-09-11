/**
 * KOSHK SKATE ERP — App Shell
 * Phase 03.5 — Design System (updated from Phase 03)
 *
 * Changes from Phase 03:
 *   - All emoji icons replaced with Lucide SVG (OD-003 / DEC-036 / UI-003)
 *   - Prototype "المرحلة 03 ✓" badge removed from Topbar
 *   - Active nav indicator bar added (left edge in RTL)
 *   - Avatar + role added to sidebar user block
 *   - Notification bell placeholder added to Topbar
 *   - Sidebar collapse toggle (desktop) — OD-005 / DEC-038
 *   - Mobile sidebar drawer (hamburger + overlay) — OD-005 / DEC-038
 *   - PlaceholderPage uses EmptyState component
 *   - All structural styles moved to CSS — no inline style objects for design props
 *
 * Routing (unchanged from Phase 03):
 *   /login        → LoginPage (public)
 *   /             → Dashboard placeholder (Phase 17)
 *   /skates       → SkatesPage (protected, requires skates.view)
 *   /users        → UsersPage (protected, requires users.view)
 *   /roles        → RolesPage (protected, requires roles.view)
 *   /*            → 404 redirect to /
 *
 * Phase 04+ will add: /customers, /rentals, etc.
 */

import { useState, useEffect, type ReactNode } from 'react'
import { Routes, Route, Navigate, NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Package,
  Users,
  Ticket,
  Landmark,
  Wrench,
  BarChart2,
  UserCog,
  KeyRound,
  Settings,
  LogOut,
  Bell,
  Menu,
  X,
  PanelRightClose,
  PanelRightOpen,
  Construction,
} from 'lucide-react'
import { useAuth } from './contexts/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { PermissionGate } from './components/PermissionGate'
import { EmptyState } from './components/ui/EmptyState'
import LoginPage from './modules/auth/LoginPage'
import UsersPage from './modules/users/UsersPage'
import RolesPage from './modules/users/RolesPage'
import SkatesPage from './modules/skates/SkatesPage'

// ---------------------------------------------------------------------------
// Nav items — Lucide icons replacing emoji (OD-003)
// ---------------------------------------------------------------------------

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'لوحة التحكم', to: '/', exact: true },
  { icon: Package,         label: 'الزلاجات',    to: '/skates',      permission: 'skates.view' },
  { icon: Users,           label: 'العملاء',     to: '/customers',   permission: 'customers.view' },
  { icon: Ticket,          label: 'الإيجارات',   to: '/rentals',     permission: 'rentals.view' },
  { icon: Landmark,        label: 'الخزينة',     to: '/treasury',    permission: 'treasury.view' },
  { icon: Wrench,          label: 'الصيانة',     to: '/maintenance', permission: 'maintenance.view' },
  { icon: BarChart2,       label: 'التقارير',    to: '/reports',     permission: 'reports.view' },
]

const ADMIN_NAV_ITEMS = [
  { icon: UserCog,  label: 'المستخدمون', to: '/users',    permission: 'users.view' },
  { icon: KeyRound, label: 'الأدوار',    to: '/roles',    permission: 'roles.view' },
  { icon: Settings, label: 'الإعدادات', to: '/settings', permission: 'settings.view' },
]

// ---------------------------------------------------------------------------
// Sidebar — RTL, right-side fixed, collapse support, mobile drawer
// ---------------------------------------------------------------------------

const SIDEBAR_COLLAPSED_KEY = 'koshk_sidebar_collapsed'

interface SidebarProps {
  collapsed: boolean
  onToggleCollapse: () => void
  mobileOpen: boolean
  onMobileClose: () => void
  onLogout: () => void
}

function Sidebar({ collapsed, onToggleCollapse, mobileOpen, onMobileClose, onLogout }: SidebarProps) {
  const { user } = useAuth()

  const NavItem = ({ icon: Icon, label, to, exact }: { icon: typeof Package; label: string; to: string; exact?: boolean }) => (
    <NavLink
      to={to}
      end={exact}
      className={({ isActive }) => ['nav-item', isActive ? 'nav-item--active' : ''].filter(Boolean).join(' ')}
      title={collapsed ? label : undefined}
      aria-label={collapsed ? label : undefined}
      onClick={mobileOpen ? onMobileClose : undefined}
    >
      <Icon size={18} aria-hidden="true" className="nav-item-icon" />
      {!collapsed && <span className="nav-item-label">{label}</span>}
    </NavLink>
  )

  const sidebarContent = (
    <aside
      className={['sidebar', collapsed ? 'sidebar--collapsed' : ''].filter(Boolean).join(' ')}
      role="navigation"
      aria-label="القائمة الرئيسية"
    >
      {/* Header: Logo + collapse toggle */}
      <div className={['sidebar-header', collapsed ? 'sidebar-header--collapsed' : ''].filter(Boolean).join(' ')}>
        <div className="sidebar-logo" aria-hidden="true">KS</div>
        {!collapsed && <span className="sidebar-brand">KOSHK SKATE ERP</span>}
        {/* Collapse toggle — always visible in both expanded and collapsed state */}
        <button
          type="button"
          className={['sidebar-collapse-btn', collapsed ? 'sidebar-collapse-btn--collapsed' : ''].filter(Boolean).join(' ')}
          onClick={onToggleCollapse}
          aria-label={collapsed ? 'توسيع القائمة' : 'تصغير القائمة'}
          title={collapsed ? 'توسيع القائمة' : 'تصغير القائمة'}
        >
          {collapsed
            ? <PanelRightClose size={16} aria-hidden="true" />
            : <PanelRightOpen  size={16} aria-hidden="true" />
          }
        </button>
      </div>

      {/* Main nav */}
      <nav className="sidebar-nav" aria-label="التنقل الرئيسي">
        {NAV_ITEMS.map(item => (
          item.permission ? (
            <PermissionGate key={item.to} permission={item.permission}>
              <NavItem icon={item.icon} label={item.label} to={item.to} exact={item.exact} />
            </PermissionGate>
          ) : (
            <NavItem key={item.to} icon={item.icon} label={item.label} to={item.to} exact={item.exact} />
          )
        ))}

        {/* Admin section */}
        <div className="sidebar-section-divider">
          {!collapsed && (
            <span className="sidebar-section-label">الإدارة</span>
          )}
        </div>

        {ADMIN_NAV_ITEMS.map(item => (
          <PermissionGate key={item.to} permission={item.permission}>
            <NavItem icon={item.icon} label={item.label} to={item.to} />
          </PermissionGate>
        ))}
      </nav>

      {/* Footer: avatar + user name/role + logout */}
      <div className="sidebar-footer">
        {user && !collapsed && (
          <div className="sidebar-user-block">
            <div className="sidebar-user-avatar" aria-hidden="true">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="sidebar-user-info">
              <p className="sidebar-user-name">{user.name}</p>
              <p className="sidebar-user-role">
                {user.roles?.[0]?.nameAr ?? 'مستخدم'}
              </p>
            </div>
          </div>
        )}
        {user && collapsed && (
          <div className="sidebar-user-avatar sidebar-user-avatar--centered" aria-hidden="true">
            {user.name.charAt(0).toUpperCase()}
          </div>
        )}
        <button
          type="button"
          id="logout-btn"
          className={['nav-item', 'nav-item--logout', collapsed ? 'nav-item--collapsed-logout' : ''].filter(Boolean).join(' ')}
          onClick={onLogout}
          title={collapsed ? 'تسجيل الخروج' : undefined}
          aria-label="تسجيل الخروج"
        >
          <LogOut size={18} aria-hidden="true" className="nav-item-icon" />
          {!collapsed && <span className="nav-item-label">تسجيل الخروج</span>}
        </button>
      </div>
    </aside>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <div className="sidebar-desktop-wrapper">
        {sidebarContent}
      </div>

      {/* Mobile overlay + drawer */}
      {mobileOpen && (
        <>
          <div
            className="sidebar-mobile-backdrop"
            onClick={onMobileClose}
            aria-hidden="true"
          />
          <div className="sidebar-mobile-drawer">
            <button
              type="button"
              className="sidebar-mobile-close"
              onClick={onMobileClose}
              aria-label="إغلاق القائمة"
            >
              <X size={20} aria-hidden="true" />
            </button>
            {sidebarContent}
          </div>
        </>
      )}

      <style>{`
        /* ===== SIDEBAR BASE ===== */
        .sidebar {
          width: var(--sidebar-width);
          height: 100%;
          background-color: var(--color-navy-800);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          transition: width var(--transition-slow);
          flex-shrink: 0;
        }

        .sidebar--collapsed { width: var(--sidebar-collapsed-width); }

        /* ===== SIDEBAR DESKTOP WRAPPER ===== */
        .sidebar-desktop-wrapper {
          position: fixed;
          top: 0;
          right: 0;
          bottom: 0;
          z-index: var(--z-sidebar);
          box-shadow: -4px 0 20px rgba(0,0,0,0.15);
          display: flex;
        }

        /* ===== HEADER ===== */
        .sidebar-header {
          padding: var(--space-4) var(--space-4);
          border-bottom: 1px solid rgba(255,255,255,0.08);
          display: flex;
          align-items: center;
          gap: var(--space-3);
          min-height: var(--header-height);
          flex-shrink: 0;
        }

        /*
         * Collapsed header: switch to column layout so the logo and toggle
         * button both fit within the 64px collapsed width without being clipped.
         * In expanded mode the row layout with margin-auto on the button is fine
         * because there is plenty of horizontal space (240px).
         */
        .sidebar-header--collapsed {
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: var(--space-3) var(--space-2);
          gap: var(--space-2);
        }

        .sidebar-logo {
          width: 36px; height: 36px;
          border-radius: var(--radius-base);
          background-color: var(--color-gold-500);
          display: flex; align-items: center; justify-content: center;
          font-size: var(--font-size-sm); font-weight: var(--font-weight-bold);
          color: var(--color-navy-900);
          flex-shrink: 0;
        }

        .sidebar-brand {
          color: var(--color-white);
          font-size: var(--font-size-xs);
          font-weight: var(--font-weight-semibold);
          opacity: 0.85;
          flex: 1;
          white-space: nowrap;
          overflow: hidden;
        }

        /* Expanded: push button to the trailing (left in RTL) edge */
        .sidebar-collapse-btn {
          background: none; border: none; cursor: pointer;
          padding: var(--space-1); border-radius: var(--radius-sm);
          color: rgba(255,255,255,0.45);
          display: flex; align-items: center; justify-content: center;
          transition: color var(--transition-fast), background-color var(--transition-fast);
          flex-shrink: 0;
          margin-inline-start: auto;
          min-width: 24px; min-height: 24px;
        }

        /* Collapsed: centered, full reset of auto margin */
        .sidebar-collapse-btn--collapsed {
          margin-inline-start: 0;
          width: 36px; height: 36px;
          border-radius: var(--radius-base);
          background-color: rgba(255,255,255,0.06);
          color: rgba(255,255,255,0.65);
        }

        .sidebar-collapse-btn:hover { color: rgba(255,255,255,0.85); background-color: rgba(255,255,255,0.08); }
        .sidebar-collapse-btn--collapsed:hover { background-color: rgba(255,255,255,0.12); color: var(--color-white); }
        .sidebar-collapse-btn:focus-visible { outline: 2px solid var(--color-gold-500); outline-offset: 2px; }

        /* ===== NAV ===== */
        .sidebar-nav {
          flex: 1;
          padding: var(--space-3) var(--space-3);
          display: flex;
          flex-direction: column;
          gap: 2px;
          overflow-y: auto;
          overflow-x: hidden;
        }

        .nav-item {
          display: flex;
          align-items: center;
          gap: var(--space-3);
          padding: var(--space-3) var(--space-3);
          border-radius: var(--radius-base);
          color: rgba(255,255,255,0.65);
          font-size: var(--font-size-sm);
          font-weight: var(--font-weight-regular);
          cursor: pointer;
          text-decoration: none;
          transition: background-color var(--transition-fast), color var(--transition-fast);
          background: none; border: none; font-family: var(--font-family-base);
          width: 100%;
          position: relative;
          overflow: hidden;
          white-space: nowrap;
        }

        /* Active nav item: gold tint bg + gold text + left indicator bar */
        .nav-item--active {
          background-color: rgba(243,183,53,0.12);
          color: var(--color-gold-400);
          font-weight: var(--font-weight-semibold);
        }

        .nav-item--active::after {
          content: '';
          position: absolute;
          left: 0; top: 8px; bottom: 8px;
          width: 3px;
          background-color: var(--color-gold-500);
          border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
        }

        .nav-item:hover:not(.nav-item--active) {
          background-color: rgba(255,255,255,0.06);
          color: rgba(255,255,255,0.9);
        }

        .nav-item:focus-visible { outline: 2px solid var(--color-gold-500); outline-offset: -2px; }

        .nav-item-icon {
          flex-shrink: 0;
          transition: color var(--transition-fast);
        }

        .nav-item--active .nav-item-icon { color: var(--color-gold-400); }

        .nav-item-label {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        /* ===== SECTION DIVIDER ===== */
        .sidebar-section-divider {
          margin: var(--space-3) 0 var(--space-1);
          padding: 0 var(--space-3);
          border-top: 1px solid rgba(255,255,255,0.08);
          padding-top: var(--space-3);
        }

        .sidebar-section-label {
          font-size: 0.65rem;
          color: rgba(255,255,255,0.3);
          letter-spacing: 0.06em;
          display: block;
        }

        /* ===== FOOTER ===== */
        .sidebar-footer {
          padding: var(--space-3) var(--space-3);
          border-top: 1px solid rgba(255,255,255,0.08);
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
          flex-shrink: 0;
        }

        .sidebar-user-block {
          display: flex;
          align-items: center;
          gap: var(--space-3);
          padding: var(--space-3);
          border-radius: var(--radius-base);
          background-color: rgba(255,255,255,0.05);
        }

        .sidebar-user-avatar {
          width: 32px; height: 32px;
          border-radius: var(--radius-full);
          background-color: var(--color-gold-500);
          color: var(--color-navy-900);
          font-size: var(--font-size-sm);
          font-weight: var(--font-weight-bold);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }

        .sidebar-user-avatar--centered {
          margin: 0 auto var(--space-2);
        }

        .sidebar-user-info { flex: 1; min-width: 0; }

        .sidebar-user-name {
          color: var(--color-white);
          font-size: var(--font-size-sm);
          font-weight: var(--font-weight-semibold);
          margin: 0;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }

        .sidebar-user-role {
          color: rgba(255,255,255,0.45);
          font-size: var(--font-size-xs);
          margin: 2px 0 0;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }

        .nav-item--logout { color: rgba(255,255,255,0.5); }
        .nav-item--logout:hover { color: var(--color-danger-text); background-color: var(--color-danger-bg); }

        /* ===== MOBILE ===== */
        .sidebar-mobile-backdrop {
          position: fixed; inset: 0;
          background-color: rgba(14,25,41,0.4);
          z-index: var(--z-overlay);
          animation: fadeIn var(--transition-base);
        }

        .sidebar-mobile-drawer {
          position: fixed;
          top: 0; right: 0; bottom: 0;
          width: 80%; max-width: 320px;
          z-index: var(--z-sidebar);
          box-shadow: var(--shadow-modal);
          animation: drawer-slide-in var(--transition-slow);
          display: flex;
          flex-direction: column;
        }

        @keyframes drawer-slide-in {
          from { transform: translateX(100%); }
          to   { transform: translateX(0); }
        }

        .sidebar-mobile-close {
          position: absolute;
          top: var(--space-4);
          left: var(--space-4);
          background: none; border: none; cursor: pointer;
          color: rgba(255,255,255,0.6);
          padding: var(--space-2); border-radius: var(--radius-sm);
          display: flex; align-items: center; justify-content: center;
          z-index: 1;
          transition: color var(--transition-fast);
        }
        .sidebar-mobile-close:hover { color: var(--color-white); }

        /* Hide desktop sidebar on mobile */
        @media (max-width: 767px) {
          .sidebar-desktop-wrapper { display: none; }
        }

        /* Hide mobile drawer trigger on desktop */
        @media (min-width: 768px) {
          .sidebar-mobile-backdrop,
          .sidebar-mobile-drawer { display: none !important; }
        }
      `}</style>
    </>
  )
}

// ---------------------------------------------------------------------------
// Topbar — notification bell, user role badge, no prototype badge
// ---------------------------------------------------------------------------

interface TopbarProps {
  pageTitle?: string
  onMobileMenuOpen: () => void
}

function Topbar({ pageTitle, onMobileMenuOpen }: TopbarProps) {
  const { user } = useAuth()

  return (
    <>
      <header className="topbar">
        {/* Mobile hamburger */}
        <button
          type="button"
          className="topbar-mobile-menu"
          onClick={onMobileMenuOpen}
          aria-label="فتح القائمة"
        >
          <Menu size={20} aria-hidden="true" />
        </button>

        <span className="topbar-title">{pageTitle ?? 'الرئيسية'}</span>

        <div className="topbar-actions">
          {/* Notification bell placeholder */}
          <button
            type="button"
            className="topbar-icon-btn"
            aria-label="الإشعارات"
            id="notifications-btn"
          >
            <Bell size={20} aria-hidden="true" />
          </button>

          {/* User role badge */}
          {user?.roles?.[0] && (
            <span className="topbar-role-badge">
              {user.roles[0].nameAr}
            </span>
          )}
        </div>
      </header>

      <style>{`
        .topbar {
          height: var(--header-height);
          background-color: var(--color-white);
          border-bottom: 1px solid var(--color-border);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 var(--space-8);
          position: sticky; top: 0;
          z-index: var(--z-sticky);
          box-shadow: var(--shadow-xs);
          gap: var(--space-4);
        }

        .topbar-title {
          font-size: var(--font-size-lg);
          font-weight: var(--font-weight-semibold);
          color: var(--color-navy-800);
          flex: 1;
          text-align: right;
        }

        .topbar-actions {
          display: flex;
          align-items: center;
          gap: var(--space-3);
          flex-shrink: 0;
        }

        .topbar-icon-btn {
          display: flex; align-items: center; justify-content: center;
          width: 36px; height: 36px;
          background: none; border: none; cursor: pointer;
          border-radius: var(--radius-base);
          color: var(--color-text-muted);
          transition: background-color var(--transition-fast), color var(--transition-fast);
        }
        .topbar-icon-btn:hover { background-color: var(--color-page-bg); color: var(--color-navy-800); }
        .topbar-icon-btn:focus-visible { outline: 2px solid var(--color-border-focus); outline-offset: 2px; }

        .topbar-role-badge {
          padding: var(--space-1) var(--space-3);
          border-radius: var(--radius-full);
          font-size: var(--font-size-xs);
          font-weight: var(--font-weight-semibold);
          background-color: var(--color-navy-50);
          color: var(--color-navy-700);
          white-space: nowrap;
        }

        /* Mobile hamburger — hidden on desktop */
        .topbar-mobile-menu {
          display: none;
          align-items: center; justify-content: center;
          width: 36px; height: 36px;
          background: none; border: none; cursor: pointer;
          border-radius: var(--radius-base);
          color: var(--color-text-muted);
          transition: background-color var(--transition-fast);
          flex-shrink: 0;
        }
        .topbar-mobile-menu:hover { background-color: var(--color-page-bg); color: var(--color-navy-800); }

        @media (max-width: 767px) {
          .topbar { padding: 0 var(--space-4); }
          .topbar-mobile-menu { display: flex; }
        }
      `}</style>
    </>
  )
}

// ---------------------------------------------------------------------------
// Placeholder page — uses EmptyState component
// ---------------------------------------------------------------------------

function PlaceholderPage({ title, phase }: { title: string; phase: string }) {
  return (
    <div style={{ padding: 'var(--space-8)', maxWidth: 'var(--content-max-width)', margin: '0 auto' }}>
      <div style={{
        backgroundColor: 'var(--color-white)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-card)',
        border: '1px solid var(--color-border)',
      }}>
        <EmptyState
          icon={Construction}
          title={title}
          description={`سيتم تنفيذ هذه الوحدة في ${phase}`}
        />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// AppShell — sidebar collapse state + mobile drawer state
// ---------------------------------------------------------------------------

function AppShell({ children, pageTitle }: { children: ReactNode; pageTitle?: string }) {
  const { logout } = useAuth()
  const navigate = useNavigate()

  // Persist collapse state in localStorage (OD-005)
  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true'
  })
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleToggleCollapse = () => {
    const next = !collapsed
    setCollapsed(next)
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next))
  }

  // Close mobile drawer on resize to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) setMobileOpen(false)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  const contentMargin = collapsed
    ? 'var(--sidebar-collapsed-width)'
    : 'var(--sidebar-width)'

  return (
    <>
      <div className="app-shell">
        <Sidebar
          collapsed={collapsed}
          onToggleCollapse={handleToggleCollapse}
          mobileOpen={mobileOpen}
          onMobileClose={() => setMobileOpen(false)}
          onLogout={handleLogout}
        />
        <div
          className="app-content"
          style={{ marginRight: contentMargin }}
        >
          <Topbar pageTitle={pageTitle} onMobileMenuOpen={() => setMobileOpen(true)} />
          <main className="app-main" style={{ flex: 1 }}>
            {children}
          </main>
        </div>
      </div>

      <style>{`
        .app-shell {
          display: flex;
          min-height: 100vh;
          background-color: var(--color-page-bg);
          direction: rtl;
        }

        .app-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-height: 100vh;
          min-width: 0;
          transition: margin-right var(--transition-slow);
        }

        .app-main { flex: 1; }

        @media (max-width: 767px) {
          .app-content { margin-right: 0 !important; }
        }
      `}</style>
    </>
  )
}

// ---------------------------------------------------------------------------
// Root App — routing (unchanged)
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
                <Route path="/skates" element={<SkatesPage />} />
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
