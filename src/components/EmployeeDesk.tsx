import { useMemo } from 'react'
import { FlaskConical, Package, PackageOpen, Receipt, UserRound } from 'lucide-react'
import type { StoreApi } from '../hooks/useStore'
import { buildWeekReport } from '../lib/stats'
import { money } from '../lib/utils'
import type { TabId } from '../types'

export function EmployeeDesk({
  store,
  employeeId,
  onPickEmployee,
  onGo,
}: {
  store: StoreApi
  employeeId: string
  onPickEmployee: (id: string) => void
  onGo: (tab: TabId) => void
}) {
  const { state } = store
  const active = state.employees.filter((e) => e.active)
  const me = active.find((e) => e.id === employeeId)
  const report = buildWeekReport(state)
  const myStats = report.employees.find((e) => e.employeeId === employeeId)

  const pendingMine = useMemo(
    () =>
      state.stashBuys.filter(
        (b) => b.status === 'pending' && b.employeeId === employeeId,
      ),
    [state.stashBuys, employeeId],
  )

  return (
    <div className="stack">
      <section className="hero-panel">
        <div>
          <p className="eyebrow">Crew desk</p>
          <h2 className="hero-brand">{state.settings.businessName}</h2>
          <p className="hero-copy">
            Owner: {state.settings.ownerName}. Log your crafts, sales, stash
            buys, and mat purchases — same shared cloud data.
          </p>
        </div>
      </section>

      <section className="panel">
        <header className="panel-head">
          <h3>
            <UserRound size={16} /> Who are you?
          </h3>
        </header>
        {active.length === 0 ? (
          <p className="empty">
            No employees yet — ask {state.settings.ownerName} to add you under
            Crew.
          </p>
        ) : (
          <label className="field">
            <span>Select your name</span>
            <select
              value={employeeId}
              onChange={(e) => onPickEmployee(e.target.value)}
            >
              <option value="">Choose…</option>
              {active.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </label>
        )}
        {me && (
          <p className="muted panel-intro" style={{ marginTop: '0.75rem' }}>
            Signed in as <strong>{me.name}</strong>. Your entries sync for the
            whole business.
          </p>
        )}
      </section>

      {me && myStats && (
        <div className="stat-grid">
          <article className="stat-card">
            <span>Your sales (week)</span>
            <strong>{myStats.salesCount}</strong>
          </article>
          <article className="stat-card">
            <span>Revenue</span>
            <strong>{money(myStats.revenue)}</strong>
          </article>
          <article className="stat-card">
            <span>Commission</span>
            <strong>{money(myStats.commission)}</strong>
          </article>
          <article className="stat-card">
            <span>Bonuses</span>
            <strong>{money(myStats.bonuses)}</strong>
          </article>
          <article className="stat-card">
            <span>Payout</span>
            <strong>{money(myStats.payout)}</strong>
          </article>
          <article className="stat-card">
            <span>Your pending stash</span>
            <strong>{pendingMine.length}</strong>
          </article>
        </div>
      )}

      {me && (
        <section className="panel">
          <header className="panel-head">
            <h3>Quick actions</h3>
          </header>
          <div className="recipe-grid">
            <button
              type="button"
              className="recipe-card"
              onClick={() => onGo('sales')}
            >
              <Receipt size={18} />
              <strong>Log a sale</strong>
              <span className="recipe-cost">Direct sale</span>
            </button>
            <button
              type="button"
              className="recipe-card"
              onClick={() => onGo('stash')}
            >
              <PackageOpen size={18} />
              <strong>Stash purchase</strong>
              <span className="recipe-cost">Pending until owner clears</span>
            </button>
            <button
              type="button"
              className="recipe-card"
              onClick={() => onGo('craft')}
            >
              <FlaskConical size={18} />
              <strong>Log a craft</strong>
              <span className="recipe-cost">Production only</span>
            </button>
            <button
              type="button"
              className="recipe-card"
              onClick={() => onGo('inventory')}
            >
              <Package size={18} />
              <strong>Buy materials</strong>
              <span className="recipe-cost">Store restock for business</span>
            </button>
          </div>
        </section>
      )}
    </div>
  )
}
