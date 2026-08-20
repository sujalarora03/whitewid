import type { ReactNode } from 'react'
import type { AppRole } from '../lib/session'
import type { TabId } from '../types'
import {
  LayoutDashboard,
  FlaskConical,
  Receipt,
  PackageOpen,
  Users,
  Package,
  Tags,
  UserRound,
  HandHeart,
  ClipboardList,
  ScrollText,
} from 'lucide-react'

const OWNER_NAV: { id: TabId; label: string; icon: typeof LayoutDashboard }[] =
  [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'craft', label: 'Craft', icon: FlaskConical },
    { id: 'personal', label: 'Personal', icon: HandHeart },
    { id: 'sales', label: 'Sales', icon: Receipt },
    { id: 'stash', label: 'Stash', icon: PackageOpen },
    { id: 'orders', label: 'Orders', icon: ClipboardList },
    { id: 'employees', label: 'Crew', icon: Users },
    { id: 'inventory', label: 'Stock', icon: Package },
    { id: 'audit', label: 'Audit', icon: ScrollText },
    { id: 'prices', label: 'Rate card', icon: Tags },
  ]

const EMP_NAV: { id: TabId; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'desk', label: 'My desk', icon: UserRound },
  { id: 'craft', label: 'Craft', icon: FlaskConical },
  { id: 'personal', label: 'Personal', icon: HandHeart },
  { id: 'sales', label: 'Sales', icon: Receipt },
  { id: 'stash', label: 'Stash', icon: PackageOpen },
  { id: 'orders', label: 'Orders', icon: ClipboardList },
  { id: 'inventory', label: 'Stock', icon: Package },
]

interface Props {
  brand: string
  ownerName: string
  role: AppRole
  onRole: (role: AppRole) => void
  employeeLabel?: string
  tab: TabId
  onTab: (t: TabId) => void
  pendingStash?: number
  pendingOrders?: number
  syncLabel?: string
  syncTone?: 'ok' | 'warn' | 'err' | 'muted'
  /** Extra sync error/detail under the status pill */
  syncDetail?: string | null
  onRefresh?: () => void
  onLogout?: () => void
  children: ReactNode
}

export function Shell({
  brand,
  ownerName,
  role,
  onRole,
  employeeLabel,
  tab,
  onTab,
  pendingStash = 0,
  pendingOrders = 0,
  syncLabel = 'Local',
  syncTone = 'muted',
  syncDetail = null,
  onRefresh,
  onLogout,
  children,
}: Props) {
  const nav = role === 'owner' ? OWNER_NAV : EMP_NAV
  const title = nav.find((n) => n.id === tab)?.label ?? 'Desk'

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand-block">
          <div className="brand-mark" aria-hidden>
            <span>{(brand || 'S').trim().charAt(0).toUpperCase() || 'S'}</span>
          </div>
          <div>
            <p className="brand-name">{brand}</p>
            <p className="brand-sub">
              {role === 'owner'
                ? `Owner · ${ownerName}`
                : employeeLabel
                  ? `Crew · ${employeeLabel}`
                  : 'Crew desk'}
            </p>
          </div>
        </div>

        <div className="role-switch">
          <button
            type="button"
            className={`role-btn ${role === 'owner' ? 'active' : ''}`}
            onClick={() => onRole('owner')}
          >
            Owner
          </button>
          <button
            type="button"
            className={`role-btn ${role === 'employee' ? 'active' : ''}`}
            onClick={() => onRole('employee')}
          >
            Employee
          </button>
        </div>

        <nav className="nav">
          {nav.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              className={`nav-btn ${tab === id ? 'active' : ''}`}
              onClick={() => onTab(id)}
            >
              <Icon size={18} strokeWidth={2} />
              <span className="nav-label">{label}</span>
              {id === 'stash' && pendingStash > 0 && role === 'owner' ? (
                <span className="nav-badge">{pendingStash}</span>
              ) : null}
              {id === 'orders' && pendingOrders > 0 ? (
                <span className="nav-badge">{pendingOrders}</span>
              ) : null}
            </button>
          ))}
        </nav>
        <div className="sidebar-foot">
          <p className={`sync-pill ${syncTone}`}>{syncLabel}</p>
          {syncDetail ? (
            <p className="sidebar-foot-note sync-detail" title={syncDetail}>
              {syncDetail}
            </p>
          ) : null}
          <div className="form-row">
            {onRefresh ? (
              <button type="button" className="btn ghost sm" onClick={onRefresh}>
                Refresh
              </button>
            ) : null}
            {onLogout ? (
              <button type="button" className="btn ghost sm" onClick={onLogout}>
                Log out
              </button>
            ) : null}
          </div>
          <p className="sidebar-foot-note">Shared cloud DB (D1)</p>
        </div>
      </aside>

      <div className="main-wrap">
        <header className="topbar">
          <h1 className="page-title">{title}</h1>
        </header>
        <main className="content">{children}</main>
      </div>

      <nav className="mobile-nav">
        {nav.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            className={`mobile-nav-btn ${tab === id ? 'active' : ''}`}
            onClick={() => onTab(id)}
            aria-label={label}
          >
            <span className="mobile-icon-wrap">
              <Icon size={18} strokeWidth={2} />
              {id === 'stash' && pendingStash > 0 && role === 'owner' ? (
                <span className="nav-badge sm">{pendingStash}</span>
              ) : null}
              {id === 'orders' && pendingOrders > 0 ? (
                <span className="nav-badge sm">{pendingOrders}</span>
              ) : null}
            </span>
            <span>{label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
