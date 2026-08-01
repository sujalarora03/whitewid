import type { ReactNode } from 'react'
import type { TabId } from '../types'
import {
  LayoutDashboard,
  FlaskConical,
  Receipt,
  PackageOpen,
  Users,
  Package,
  Tags,
} from 'lucide-react'

const NAV: { id: TabId; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'craft', label: 'Craft', icon: FlaskConical },
  { id: 'sales', label: 'Sales', icon: Receipt },
  { id: 'stash', label: 'Stash', icon: PackageOpen },
  { id: 'employees', label: 'Crew', icon: Users },
  { id: 'inventory', label: 'Stock', icon: Package },
  { id: 'prices', label: 'Prices', icon: Tags },
]

interface Props {
  brand: string
  ownerName: string
  tab: TabId
  onTab: (t: TabId) => void
  pendingStash?: number
  children: ReactNode
}

export function Shell({
  brand,
  ownerName,
  tab,
  onTab,
  pendingStash = 0,
  children,
}: Props) {
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand-block">
          <div className="brand-mark" aria-hidden>
            <span>W</span>
          </div>
          <div>
            <p className="brand-name">{brand}</p>
            <p className="brand-sub">Owner · {ownerName}</p>
          </div>
        </div>
        <nav className="nav">
          {NAV.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              className={`nav-btn ${tab === id ? 'active' : ''}`}
              onClick={() => onTab(id)}
            >
              <Icon size={18} strokeWidth={2} />
              <span className="nav-label">{label}</span>
              {id === 'stash' && pendingStash > 0 ? (
                <span className="nav-badge">{pendingStash}</span>
              ) : null}
            </button>
          ))}
        </nav>
        <p className="sidebar-foot">Local save · Spirit City</p>
      </aside>

      <div className="main-wrap">
        <header className="topbar">
          <h1 className="page-title">
            {NAV.find((n) => n.id === tab)?.label ?? 'Dashboard'}
          </h1>
        </header>
        <main className="content">{children}</main>
      </div>

      <nav className="mobile-nav">
        {NAV.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            className={`mobile-nav-btn ${tab === id ? 'active' : ''}`}
            onClick={() => onTab(id)}
            aria-label={label}
          >
            <span className="mobile-icon-wrap">
              <Icon size={18} strokeWidth={2} />
              {id === 'stash' && pendingStash > 0 ? (
                <span className="nav-badge sm">{pendingStash}</span>
              ) : null}
            </span>
            <span>{label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
