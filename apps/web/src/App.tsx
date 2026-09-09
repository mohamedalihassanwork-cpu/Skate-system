/**
 * KOSHK SKATE ERP — App Shell
 * Phase 01 — Foundation
 *
 * This is a layout scaffold only. No routing or business logic yet.
 * Phase 02 will add authentication; subsequent phases will add module routing.
 */

import type { ReactNode } from 'react'

// ---------------------------------------------------------------------------
// Inline shell styles — kept here because they are pure layout primitives.
// Feature-level styles will live in their respective module CSS files.
// ---------------------------------------------------------------------------
const shellStyles: Record<string, React.CSSProperties> = {
  appShell: {
    display: 'flex',
    minHeight: '100vh',
    backgroundColor: 'var(--color-gray-50)',
  },
  sidebar: {
    width: 'var(--sidebar-width)',
    minHeight: '100vh',
    backgroundColor: 'var(--color-navy-800)',
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0,
    position: 'fixed',
    top: 0,
    right: 0, // RTL — sidebar on the right
    bottom: 0,
    zIndex: 'var(--z-sticky)' as unknown as number,
    boxShadow: '-4px 0 20px rgba(0,0,0,0.15)',
  },
  sidebarLogo: {
    padding: 'var(--space-6) var(--space-4)',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 'var(--space-2)',
  },
  logoIcon: {
    width: 48,
    height: 48,
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'var(--color-gold-400)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.5rem',
    fontWeight: 'var(--font-weight-extrabold)' as unknown as number,
    color: 'var(--color-navy-900)',
    letterSpacing: '-0.03em',
  },
  logoText: {
    color: 'var(--color-white)',
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-semibold)' as unknown as number,
    textAlign: 'center',
    letterSpacing: '0.05em',
    opacity: 0.85,
  },
  sidebarNav: {
    flex: 1,
    padding: 'var(--space-4) var(--space-3)',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-1)',
    overflowY: 'auto',
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-3)',
    padding: 'var(--space-3) var(--space-4)',
    borderRadius: 'var(--radius-base)',
    color: 'rgba(255,255,255,0.65)',
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-medium)' as unknown as number,
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
  },
  navItemActive: {
    backgroundColor: 'rgba(243,183,53,0.15)',
    color: 'var(--color-gold-400)',
  },
  sidebarFooter: {
    padding: 'var(--space-4)',
    borderTop: '1px solid rgba(255,255,255,0.08)',
  },
  mainArea: {
    flex: 1,
    marginRight: 'var(--sidebar-width)', // RTL offset
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
  },
  topbar: {
    height: 'var(--header-height)',
    backgroundColor: 'var(--color-white)',
    borderBottom: '1px solid var(--color-border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 var(--space-8)',
    position: 'sticky',
    top: 0,
    zIndex: 'var(--z-raised)' as unknown as number,
    boxShadow: 'var(--shadow-xs)',
  },
  topbarTitle: {
    fontSize: 'var(--font-size-lg)',
    fontWeight: 'var(--font-weight-semibold)' as unknown as number,
    color: 'var(--color-navy-800)',
  },
  topbarActions: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-4)',
  },
  statusBadge: {
    padding: 'var(--space-1) var(--space-3)',
    borderRadius: 'var(--radius-full)',
    fontSize: 'var(--font-size-xs)',
    fontWeight: 'var(--font-weight-semibold)' as unknown as number,
    backgroundColor: 'var(--color-success-bg)',
    color: 'var(--color-success)',
    letterSpacing: '0.04em',
  },
  content: {
    flex: 1,
    padding: 'var(--space-8)',
    maxWidth: 'var(--content-max-width)',
    width: '100%',
    margin: '0 auto',
  },
  card: {
    backgroundColor: 'var(--color-white)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow-card)',
    padding: 'var(--space-8)',
    border: '1px solid var(--color-border)',
  },
  cardTitle: {
    fontSize: 'var(--font-size-2xl)',
    fontWeight: 'var(--font-weight-bold)' as unknown as number,
    color: 'var(--color-navy-800)',
    marginBottom: 'var(--space-2)',
  },
  cardSubtitle: {
    color: 'var(--color-text-secondary)',
    fontSize: 'var(--font-size-sm)',
    lineHeight: 'var(--line-height-relaxed)',
    marginBottom: 'var(--space-8)',
  },
  phaseGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: 'var(--space-4)',
  },
  phaseItem: {
    padding: 'var(--space-4)',
    borderRadius: 'var(--radius-base)',
    border: '1px solid var(--color-border)',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-2)',
  },
  phaseLabel: {
    fontSize: 'var(--font-size-xs)',
    fontWeight: 'var(--font-weight-semibold)' as unknown as number,
    color: 'var(--color-text-muted)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.08em',
  },
  phaseName: {
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-medium)' as unknown as number,
    color: 'var(--color-text-primary)',
  },
  phaseBadge: {
    alignSelf: 'flex-start',
    padding: '2px var(--space-2)',
    borderRadius: 'var(--radius-full)',
    fontSize: '0.65rem',
    fontWeight: 'var(--font-weight-bold)' as unknown as number,
    letterSpacing: '0.05em',
  },
}

// ---------------------------------------------------------------------------
// Nav items — placeholder, will be replaced by router in Phase 02+
// ---------------------------------------------------------------------------
const navItems = [
  { icon: '🏠', label: 'لوحة التحكم', active: false },
  { icon: '⛸️', label: 'الزلاجات', active: false },
  { icon: '👥', label: 'العملاء', active: false },
  { icon: '🎫', label: 'الإيجارات', active: true },
  { icon: '💰', label: 'المدفوعات', active: false },
  { icon: '🔧', label: 'الصيانة', active: false },
  { icon: '📊', label: 'التقارير', active: false },
  { icon: '⚙️', label: 'الإعدادات', active: false },
]

const phases = [
  { num: '00', name: 'الحوكمة والتوثيق', status: 'مكتمل', color: 'var(--color-success-bg)', textColor: 'var(--color-success)' },
  { num: '01', name: 'البنية الأساسية', status: 'جاري', color: 'var(--color-gold-100)', textColor: 'var(--color-gold-600)' },
  { num: '02', name: 'المصادقة والصلاحيات', status: 'مخطط', color: 'var(--color-gray-100)', textColor: 'var(--color-gray-600)' },
  { num: '03', name: 'وحدة الزلاجات', status: 'مخطط', color: 'var(--color-gray-100)', textColor: 'var(--color-gray-600)' },
  { num: '04', name: 'وحدة العملاء', status: 'مخطط', color: 'var(--color-gray-100)', textColor: 'var(--color-gray-600)' },
  { num: '05', name: 'نقطة بيع الإيجار', status: 'مخطط', color: 'var(--color-gray-100)', textColor: 'var(--color-gray-600)' },
]

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------
function Sidebar() {
  return (
    <aside style={shellStyles.sidebar} role="navigation" aria-label="القائمة الرئيسية">
      <div style={shellStyles.sidebarLogo}>
        <div style={shellStyles.logoIcon} aria-hidden="true">KS</div>
        <span style={shellStyles.logoText}>KOSHK SKATE ERP</span>
      </div>
      <nav style={shellStyles.sidebarNav}>
        {navItems.map((item) => (
          <div
            key={item.label}
            style={{
              ...shellStyles.navItem,
              ...(item.active ? shellStyles.navItemActive : {}),
            }}
          >
            <span aria-hidden="true">{item.icon}</span>
            <span>{item.label}</span>
          </div>
        ))}
      </nav>
      <div style={shellStyles.sidebarFooter}>
        <div style={{ ...shellStyles.navItem, fontSize: 'var(--font-size-xs)' }}>
          <span aria-hidden="true">🚪</span>
          <span>تسجيل الخروج</span>
        </div>
      </div>
    </aside>
  )
}

function Topbar() {
  return (
    <header style={shellStyles.topbar}>
      <span style={shellStyles.topbarTitle}>الرئيسية</span>
      <div style={shellStyles.topbarActions}>
        <span style={shellStyles.statusBadge}>الخادم يعمل ✓</span>
        <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
          المرحلة 01
        </span>
      </div>
    </header>
  )
}

function PhaseCard({ num, name, status, color, textColor }: {
  num: string; name: string; status: string; color: string; textColor: string;
}) {
  return (
    <div style={shellStyles.phaseItem}>
      <span style={shellStyles.phaseLabel}>المرحلة {num}</span>
      <span style={shellStyles.phaseName}>{name}</span>
      <span style={{ ...shellStyles.phaseBadge, backgroundColor: color, color: textColor }}>
        {status}
      </span>
    </div>
  )
}

function MainContent(): ReactNode {
  return (
    <main style={shellStyles.content} id="main-content">
      <div style={shellStyles.card}>
        <h1 style={shellStyles.cardTitle}>نظام KOSHK SKATE ERP</h1>
        <p style={shellStyles.cardSubtitle}>
          هذه الشاشة هي هيكل المرحلة الأولى — البنية الأساسية للنظام.
          سيتم إضافة المصادقة والوحدات التجارية في المراحل التالية.
        </p>

        <div style={{ marginBottom: 'var(--space-6)' }}>
          <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-navy-700)', marginBottom: 'var(--space-4)' }}>
            حالة المراحل
          </h2>
          <div style={shellStyles.phaseGrid}>
            {phases.map((p) => (
              <PhaseCard key={p.num} {...p} />
            ))}
          </div>
        </div>

        <div style={{
          padding: 'var(--space-4)',
          borderRadius: 'var(--radius-base)',
          backgroundColor: 'var(--color-navy-50)',
          border: '1px solid var(--color-navy-100)',
        }}>
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-navy-700)', fontWeight: 'var(--font-weight-medium)' }}>
            ✅ المرحلة 01 — البنية الأساسية: الواجهة تعمل | نظام التصميم محمّل | الخط Cairo نشط | RTL مفعّل
          </p>
        </div>
      </div>
    </main>
  )
}

// ---------------------------------------------------------------------------
// Root App
// ---------------------------------------------------------------------------
export default function App() {
  return (
    <div style={shellStyles.appShell} id="app-shell">
      <Sidebar />
      <div style={shellStyles.mainArea}>
        <Topbar />
        <MainContent />
      </div>
    </div>
  )
}
