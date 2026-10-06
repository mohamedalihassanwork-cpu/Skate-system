/**
 * KOSHK SKATE ERP — App Shell
 * Phase 05 — Rental POS Core (updated from Phase 04)
 *
 * Changes from Phase 03.5:
 *   - /customers route → CustomersPage (replaces PlaceholderPage)
 *   - /customers/:id route → CustomerProfilePage (new)
 *   - Both routes gated by customers.view PermissionGate
 */

import { useState, useEffect, useRef, type ReactNode } from 'react'
import { Routes, Route, Navigate, NavLink, useNavigate } from 'react-router-dom'
import {
  Calendar,
  LayoutDashboard,
  Package,
  Users,
  Ticket,
  Landmark,
  Wrench,
  BarChart2,
  AlertTriangle,
  UserCog,
  KeyRound,
  Settings,
  Activity,
  LogOut,
  Menu,
  X,
  PanelRightClose,
  PanelRightOpen,
  ShieldOff,
  ShoppingCart,
  ListOrdered,
  Tags,
} from 'lucide-react'
import { useAuth } from './contexts/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { PermissionGate } from './components/PermissionGate'
import { EmptyState } from './components/ui/EmptyState'
import { NotificationBell } from './components/ui/NotificationBell'
import LoginPage from './modules/auth/LoginPage'
import UsersPage from './modules/users/UsersPage'
import RolesPage from './modules/users/RolesPage'
import SkatesPage from './modules/skates/SkatesPage'
import CustomersPage from './modules/customers/CustomersPage'
import CustomerProfilePage from './modules/customers/CustomerProfilePage'
// Phase 05 — Rental POS
import RentalsPage from './modules/rentals/RentalsPage'
import ActiveRentalsPage from './modules/rentals/ActiveRentalsPage'
import RentalPOSPage from './modules/rentals/RentalPOSPage'
import RentalDetailPage from './modules/rentals/RentalDetailPage'
import DamagesPage from './modules/damage/DamagesPage'
import MaintenancePage from './modules/maintenance/MaintenancePage'
import { ReservationsPage } from './modules/reservations/ReservationsPage'

// Phase 11 — Sales POS
import ProductsPage from './modules/products/ProductsPage'
import SalesPOSPage from './modules/sales/SalesPOSPage'
import SalesPage from './modules/sales/SalesPage'

// Phase 16 — Audit
import AuditLogsPage from './modules/audit/AuditLogsPage'

// Phase 12 — Treasury & Shifts
import TreasuryPage from './modules/treasury/TreasuryPage'

// Phase 13 — Reports
import ReportsPage from './modules/reports/ReportsPage'

// Phase 14 — Settings & Invoices
import SettingsPage from './modules/settings/SettingsPage'

// Phase 17 — Dashboard
import DashboardPage from './modules/dashboard/DashboardPage'

// ---------------------------------------------------------------------------
// NoAccessPage — shown when an authenticated user lacks route-level permission
// Uses EmptyState so no new shared component is needed (GAP-RBAC-013)
// ---------------------------------------------------------------------------

function NoAccessPage({ permission }: { permission: string }) {
  return (
    <div className="page-container">
      <EmptyState
        icon={ShieldOff}
        title="غير مصرح"
        description={`ليس لديك صلاحية "${permission}" للوصول إلى هذه الصفحة. يرجى التواصل مع المسؤول.`}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Nav items — Lucide icons replacing emoji (OD-003)
// ---------------------------------------------------------------------------

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'لوحة التحكم', to: '/', exact: true },
  { icon: Package, label: 'الاسكيتات', to: '/skates', permission: 'skates.view' },
  { icon: Tags, label: 'المنتجات', to: '/products', permission: 'products.view' },
  { icon: ShoppingCart, label: 'نقطة البيع', to: '/sales-pos', permission: 'sales.create' },
  { icon: ListOrdered, label: 'سجل المبيعات', to: '/sales', permission: 'sales.view' },
  { icon: Users, label: 'العملاء', to: '/customers', permission: 'customers.view' },
  { icon: Calendar, label: 'الحجوزات', to: '/reservations', permission: 'reservations.view' },
  { icon: Ticket, label: 'الإيجارات', to: '/rentals', permission: 'rentals.view' },
  { icon: AlertTriangle, label: 'أضرار الاسكيتات', to: '/damages', permission: 'damage.view' },
  { icon: Landmark, label: 'الخزينة', to: '/treasury', permission: 'shifts.manage' },
  { icon: Wrench, label: 'الصيانة', to: '/maintenance', permission: 'maintenance.view' },
  { icon: BarChart2, label: 'التقارير', to: '/reports', permission: 'reports.view' },
]

const ADMIN_NAV_ITEMS = [
  { icon: UserCog, label: 'المستخدمون', to: '/users', permission: 'users.view' },
  { icon: KeyRound, label: 'الأدوار', to: '/roles', permission: 'roles.view' },
  { icon: Settings, label: 'الإعدادات', to: '/settings', permission: 'settings.view' },
  { icon: Activity, label: 'سجل التدقيق', to: '/audit-logs', permission: 'audit.view' },
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
  /** When true (mobile drawer), hide the desktop-only collapse toggle */
  isMobile?: boolean
  /** Ref to the hamburger button — used by M-017 focus trap to restore focus on close */
  hamburgerRef?: React.RefObject<HTMLButtonElement | null>
  /** AN-006: true while the drawer exit animation is playing — applies --closing CSS classes */
  isDrawerClosing?: boolean
}

function Sidebar({ collapsed, onToggleCollapse, mobileOpen, onMobileClose, onLogout, isMobile = false, hamburgerRef, isDrawerClosing = false }: SidebarProps) {
  // M-017: ref for the drawer container — used by focus trap
  const drawerRef = useRef<HTMLDivElement>(null)

  // M-017: focus trap — runs whenever the mobile drawer opens
  useEffect(() => {
    if (!mobileOpen) return
    const drawer = drawerRef.current
    if (!drawer) return

    const focusableSelector =
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

    // Focus the first focusable element when drawer opens
    const focusables = Array.from(drawer.querySelectorAll<HTMLElement>(focusableSelector))
    focusables[0]?.focus()

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        onMobileClose()
        // Restore focus to the hamburger button
        requestAnimationFrame(() => hamburgerRef?.current?.focus())
        return
      }

      if (e.key !== 'Tab') return

      // Re-query on each Tab press in case DOM changed
      const els = Array.from(drawer!.querySelectorAll<HTMLElement>(focusableSelector))
      if (els.length === 0) return

      const first = els[0]
      const last = els[els.length - 1]

      if (e.shiftKey) {
        // Shift+Tab: if on first element, wrap to last
        if (document.activeElement === first) {
          e.preventDefault()
          last.focus()
        }
      } else {
        // Tab: if on last element, wrap to first
        if (document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [mobileOpen, onMobileClose, hamburgerRef])
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
      {/* AN-014: always render label — CSS opacity handles the collapsed fade */}
      <span className="nav-item-label">{label}</span>
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
        {/* Collapse toggle — desktop only; hidden inside mobile drawer */}
        {!isMobile && (
          <button
            type="button"
            className={['sidebar-collapse-btn', collapsed ? 'sidebar-collapse-btn--collapsed' : ''].filter(Boolean).join(' ')}
            onClick={onToggleCollapse}
            aria-label={collapsed ? 'توسيع القائمة' : 'تصغير القائمة'}
            title={collapsed ? 'توسيع القائمة' : 'تصغير القائمة'}
          >
            {collapsed
              ? <PanelRightClose size={16} aria-hidden="true" />
              : <PanelRightOpen size={16} aria-hidden="true" />
            }
          </button>
        )}
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
          {/* AN-014: always render label — CSS opacity handles the collapsed fade */}
          <span className="nav-item-label">تسجيل الخروج</span>
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
          {/* AN-006: --closing class triggers drawer-slide-out / fadeOut CSS animations */}
          <div
            className={`sidebar-mobile-backdrop${isDrawerClosing ? ' sidebar-mobile-backdrop--closing' : ''}`}
            onClick={onMobileClose}
            aria-hidden="true"
          />
          {/* M-017: aria-modal + role=dialog for screen readers; drawerRef for focus trap */}
          <div
            ref={drawerRef}
            className={`sidebar-mobile-drawer${isDrawerClosing ? ' sidebar-mobile-drawer--closing' : ''}`}
            role="dialog"
            aria-modal="true"
            aria-label="القائمة الرئيسية"
          >
            <button
              type="button"
              className="sidebar-mobile-close"
              onClick={onMobileClose}
              aria-label="إغلاق القائمة"
            >
              <X size={20} aria-hidden="true" />
            </button>
            {/* Re-render sidebar with isMobile=true to hide desktop-only collapse toggle */}
            <aside
              className="sidebar"
              role="navigation"
              aria-label="القائمة الرئيسية"
            >
              <div className="sidebar-header">
                <div className="sidebar-logo" aria-hidden="true">KS</div>
                <span className="sidebar-brand">KOSHK SKATE ERP</span>
                {/* No collapse toggle on mobile */}
              </div>
              <nav className="sidebar-nav" aria-label="التنقل الرئيسي">
                {NAV_ITEMS.map(item =>
                  item.permission ? (
                    <PermissionGate key={item.to} permission={item.permission}>
                      <NavLink
                        to={item.to}
                        end={item.exact}
                        className={({ isActive }) => ['nav-item', isActive ? 'nav-item--active' : ''].filter(Boolean).join(' ')}
                        onClick={onMobileClose}
                        aria-label={item.label}
                      >
                        <item.icon size={18} aria-hidden="true" className="nav-item-icon" />
                        <span className="nav-item-label">{item.label}</span>
                      </NavLink>
                    </PermissionGate>
                  ) : (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.exact}
                      className={({ isActive }) => ['nav-item', isActive ? 'nav-item--active' : ''].filter(Boolean).join(' ')}
                      onClick={onMobileClose}
                    >
                      <item.icon size={18} aria-hidden="true" className="nav-item-icon" />
                      <span className="nav-item-label">{item.label}</span>
                    </NavLink>
                  )
                )}
                <div className="sidebar-section-divider">
                  <span className="sidebar-section-label">الإدارة</span>
                </div>
                {ADMIN_NAV_ITEMS.map(item => (
                  <PermissionGate key={item.to} permission={item.permission}>
                    <NavLink
                      to={item.to}
                      className={({ isActive }) => ['nav-item', isActive ? 'nav-item--active' : ''].filter(Boolean).join(' ')}
                      onClick={onMobileClose}
                    >
                      <item.icon size={18} aria-hidden="true" className="nav-item-icon" />
                      <span className="nav-item-label">{item.label}</span>
                    </NavLink>
                  </PermissionGate>
                ))}
              </nav>
              <div className="sidebar-footer">
                {user && (
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
                <button
                  type="button"
                  id="logout-btn-mobile"
                  className="nav-item nav-item--logout"
                  onClick={() => { onMobileClose(); onLogout() }}
                  aria-label="تسجيل الخروج"
                >
                  <LogOut size={18} aria-hidden="true" className="nav-item-icon" />
                  <span className="nav-item-label">تسجيل الخروج</span>
                </button>
              </div>
            </aside>
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

        /* AN-010: press/active state — slightly stronger than hover for touch feedback */
        .nav-item:active:not(.nav-item--active) {
          background-color: rgba(255,255,255,0.10);
          color: rgba(255,255,255,0.95);
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
          /* AN-014: fade IN with a delay — text appears after the sidebar width has grown */
          opacity: 1;
          transition: opacity var(--transition-fast) 150ms;
        }

        /* AN-014: fade OUT immediately — text disappears before the space shrinks */
        .sidebar--collapsed .nav-item-label {
          opacity: 0;
          pointer-events: none;
          transition: opacity var(--transition-fast) 0ms;
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
          /* fix(phase-03.5): backdrop must be BELOW the drawer — was var(--z-overlay)=400 which covered nav items */
          z-index: var(--z-sidebar);
          animation: fadeIn var(--transition-base);
        }

        .sidebar-mobile-drawer {
          position: fixed;
          top: 0; right: 0; bottom: 0;
          width: 80%; max-width: 320px;
          /* fix(phase-03.5): drawer must be ABOVE the backdrop — was var(--z-sidebar)=300 which put it under the backdrop */
          z-index: var(--z-modal);
          box-shadow: var(--shadow-modal);
          animation: drawer-slide-in var(--transition-slow);
          display: flex;
          flex-direction: column;
          /* Safe area — notched phones */
          padding-top: env(safe-area-inset-top, 0);
          padding-bottom: env(safe-area-inset-bottom, 0);
          padding-right: env(safe-area-inset-right, 0);
        }

        /* AN-003: drawer-slide-in, drawer-slide-out, fadeOut keyframes are defined
           in design-system.css (centralised motion section). */

        .sidebar-mobile-backdrop--closing {
          animation: fadeOut var(--transition-base) forwards;
          pointer-events: none;
        }

        .sidebar-mobile-drawer--closing {
          animation: drawer-slide-out var(--transition-slow) forwards;
          pointer-events: none;
        }

        .sidebar-mobile-close {
          position: absolute;
          top: var(--space-3);
          left: var(--space-3);
          background: rgba(255,255,255,0.08); border: none; cursor: pointer;
          color: rgba(255,255,255,0.7);
          border-radius: var(--radius-base);
          display: flex; align-items: center; justify-content: center;
          /* 44×44px touch target */
          width: 44px; height: 44px;
          z-index: 1;
          transition: color var(--transition-fast), background-color var(--transition-fast);
        }
        .sidebar-mobile-close:hover { color: var(--color-white); background: rgba(255,255,255,0.14); }
        .sidebar-mobile-close:focus-visible { outline: 2px solid var(--color-gold-500); outline-offset: 2px; }

        /* Hide desktop sidebar on mobile — pointer-events:none is a defensive fix for iOS WebKit
           fixed-position stacking context edge case where display:none alone may briefly allow taps */
        @media (max-width: 767px) {
          .sidebar-desktop-wrapper { display: none; pointer-events: none; }
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
  /** M-017: ref forwarded to the hamburger button for focus restoration on drawer close */
  hamburgerRef: React.RefObject<HTMLButtonElement | null>
}

function Topbar({ pageTitle, onMobileMenuOpen, hamburgerRef }: TopbarProps) {
  const { user } = useAuth()

  return (
    <>
      <header className="topbar">
        {/* Mobile hamburger — M-017: stable id + ref for focus restoration */}
        <button
          ref={hamburgerRef}
          type="button"
          id="topbar-mobile-menu-btn"
          className="topbar-mobile-menu"
          onClick={onMobileMenuOpen}
          aria-label="فتح القائمة"
          aria-expanded={false}
        >
          <Menu size={20} aria-hidden="true" />
        </button>

        <span className="topbar-title">{pageTitle ?? 'الرئيسية'}</span>

        <div className="topbar-actions">
          {/* Notification bell component (polling + UI) */}
          <NotificationBell />

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

        /* M-004: enlarged from 36×36 → 44×44 px to meet WCAG 2.5.5 minimum touch target */
        .topbar-icon-btn {
          display: flex; align-items: center; justify-content: center;
          width: 44px; height: 44px;
          background: none; border: none; cursor: pointer;
          border-radius: var(--radius-base);
          color: var(--color-text-muted);
          transition: background-color var(--transition-fast), color var(--transition-fast);
        }
        .topbar-icon-btn:hover { background-color: var(--color-page-bg); color: var(--color-navy-800); }
        /* AN-009: press/active state — slightly stronger than hover; visible on touch */
        .topbar-icon-btn:active { background-color: var(--color-neutral-bg); color: var(--color-navy-800); }
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
          /* 44×44px touch target (WCAG / design system requirement) */
          width: 44px; height: 44px;
          background: none; border: none; cursor: pointer;
          border-radius: var(--radius-base);
          color: var(--color-text-muted);
          transition: background-color var(--transition-fast);
          flex-shrink: 0;
        }
        .topbar-mobile-menu:hover { background-color: var(--color-page-bg); color: var(--color-navy-800); }
        /* AN-008: press/active state for hamburger — visible on touch (hover doesn’t fire before :active on mobile) */
        .topbar-mobile-menu:active { background-color: var(--color-neutral-bg); color: var(--color-navy-800); }
        .topbar-mobile-menu:focus-visible { outline: 2px solid var(--color-border-focus); outline-offset: 2px; }

        @media (max-width: 767px) {
          .topbar {
            padding: 0 var(--space-4);
            /* Safe area — notched phones */
            padding-top: env(safe-area-inset-top, 0);
            /* Adjust height to include safe area */
            height: calc(var(--header-height) + env(safe-area-inset-top, 0));
          }
          .topbar-mobile-menu { display: flex; }
          .topbar-role-badge {
            max-width: 100px;
            overflow: hidden;
            text-overflow: ellipsis;
          }
        }
      `}</style>
    </>
  )
}

// ---------------------------------------------------------------------------
// Placeholder page — uses EmptyState component
// ---------------------------------------------------------------------------



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
  // AN-006: true while the drawer exit animation is playing (300ms window).
  const [isDrawerClosing, setIsDrawerClosing] = useState(false)

  // M-017: ref to the hamburger button — passed to Topbar AND Sidebar so the
  // focus trap can restore focus when the drawer closes via any mechanism.
  const hamburgerRef = useRef<HTMLButtonElement>(null)

  const handleToggleCollapse = () => {
    const next = !collapsed
    setCollapsed(next)
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next))
  }

  // M-017 / AN-006: animate drawer out, then unmount and restore focus.
  // Guard against double-triggering while the exit animation is already running.
  const handleMobileClose = () => {
    if (isDrawerClosing) return
    setIsDrawerClosing(true)
    setTimeout(() => {
      setMobileOpen(false)
      setIsDrawerClosing(false)
      requestAnimationFrame(() => hamburgerRef.current?.focus())
    }, 300) // matches --transition-slow (drawer-slide-out duration)
  }

  // Close mobile drawer on resize to desktop (instant — no animation needed).
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setMobileOpen(false)
        setIsDrawerClosing(false)
      }
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
          onMobileClose={handleMobileClose}
          onLogout={handleLogout}
          hamburgerRef={hamburgerRef}
          isDrawerClosing={isDrawerClosing}
        />
        <div
          className="app-content"
          style={{ marginRight: contentMargin }}
        >
          <Topbar
            pageTitle={pageTitle}
            onMobileMenuOpen={() => setMobileOpen(true)}
            hamburgerRef={hamburgerRef}
          />
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
                <Route path="/" element={<DashboardPage />} />
                <Route path="/users" element={
                  <PermissionGate
                    permission="users.view"
                    fallback={<NoAccessPage permission="users.view" />}
                  >
                    <UsersPage />
                  </PermissionGate>
                } />
                <Route path="/roles" element={
                  <PermissionGate
                    permission="roles.view"
                    fallback={<NoAccessPage permission="roles.view" />}
                  >
                    <RolesPage />
                  </PermissionGate>
                } />
                <Route path="/skates" element={<SkatesPage />} />
                <Route path="/customers" element={
                  <PermissionGate
                    permission="customers.view"
                    fallback={<NoAccessPage permission="customers.view" />}
                  >
                    <CustomersPage />
                  </PermissionGate>
                } />
                <Route path="/customers/:id" element={
                  <PermissionGate
                    permission="customers.view"
                    fallback={<NoAccessPage permission="customers.view" />}
                  >
                    <CustomerProfilePage />
                  </PermissionGate>
                } />
                <Route path="/rentals" element={
                  <PermissionGate
                    permission="rentals.view"
                    fallback={<NoAccessPage permission="rentals.view" />}
                  >
                    <RentalsPage />
                  </PermissionGate>
                } />
                <Route path="/products" element={
                  <PermissionGate
                    permission="products.view"
                    fallback={<NoAccessPage permission="products.view" />}
                  >
                    <ProductsPage />
                  </PermissionGate>
                } />
                <Route path="/sales-pos" element={
                  <PermissionGate
                    permission="sales.create"
                    fallback={<NoAccessPage permission="sales.create" />}
                  >
                    <SalesPOSPage />
                  </PermissionGate>
                } />
                <Route path="/sales" element={
                  <PermissionGate
                    permission="sales.view"
                    fallback={<NoAccessPage permission="sales.view" />}
                  >
                    <SalesPage />
                  </PermissionGate>
                } />
                <Route path="/reservations" element={
                  <PermissionGate
                    permission="reservations.view"
                    fallback={<NoAccessPage permission="reservations.view" />}
                  >
                    <ReservationsPage />
                  </PermissionGate>
                } />
                <Route path="/rentals/new" element={
                  <PermissionGate
                    permission="rentals.create"
                    fallback={<NoAccessPage permission="rentals.create" />}
                  >
                    <RentalPOSPage />
                  </PermissionGate>
                } />
                <Route path="/rentals/active" element={
                  <PermissionGate
                    permission="rentals.view"
                    fallback={<NoAccessPage permission="rentals.view" />}
                  >
                    <ActiveRentalsPage />
                  </PermissionGate>
                } />
                <Route path="/rentals/:id" element={
                  <PermissionGate
                    permission="rentals.view"
                    fallback={<NoAccessPage permission="rentals.view" />}
                  >
                    <RentalDetailPage />
                  </PermissionGate>
                } />
                <Route path="/damages" element={
                  <PermissionGate
                    permission="damage.view"
                    fallback={<NoAccessPage permission="damage.view" />}
                  >
                    <DamagesPage />
                  </PermissionGate>
                } />
                <Route path="/treasury" element={
                  <PermissionGate
                    permission="shifts.manage"
                    fallback={<NoAccessPage permission="shifts.manage" />}
                  >
                    <TreasuryPage />
                  </PermissionGate>
                } />
                <Route path="/maintenance" element={
                  <PermissionGate
                    permission="maintenance.view"
                    fallback={<NoAccessPage permission="maintenance.view" />}
                  >
                    <MaintenancePage />
                  </PermissionGate>
                } />
                <Route path="/reports" element={
                  <PermissionGate
                    permission="reports.view"
                    fallback={<NoAccessPage permission="reports.view" />}
                  >
                    <ReportsPage />
                  </PermissionGate>
                } />
                <Route path="/settings" element={
                  <PermissionGate
                    permission="settings.view"
                    fallback={<NoAccessPage permission="settings.view" />}
                  >
                    <SettingsPage />
                  </PermissionGate>
                } />
                <Route path="/audit-logs" element={
                  <PermissionGate
                    permission="audit.view"
                    fallback={<NoAccessPage permission="audit.view" />}
                  >
                    <AuditLogsPage />
                  </PermissionGate>
                } />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </AppShell>
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}
