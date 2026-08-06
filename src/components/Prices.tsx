import { useState } from 'react'
import type { StoreApi } from '../hooks/useStore'
import type { ActorCtx } from '../lib/permissions'
import { DiscordPanel } from './DiscordPanel'
import { CostInfo } from './CostInfo'
import { money, pct } from '../lib/utils'

export function Prices({
  store,
  actor,
}: {
  store: StoreApi
  actor: ActorCtx
}) {
  const {
    state,
    setMaterialCost,
    setProductSalePrice,
    updateSettings,
    hardReset,
    freshStartKeepEmployees,
  } = store
  const [commPct, setCommPct] = useState(
    Math.round(state.settings.commissionRate * 100),
  )
  const [resetMsg, setResetMsg] = useState<string | null>(null)

  return (
    <div className="stack">
      <section className="panel">
        <header className="panel-head">
          <h3>Business settings</h3>
        </header>
        <div className="form-row">
          <label className="field grow">
            <span>Business name</span>
            <input
              value={state.settings.businessName}
              onChange={(e) =>
                updateSettings({ businessName: e.target.value })
              }
            />
          </label>
          <label className="field grow">
            <span>Owner</span>
            <input
              value={state.settings.ownerName}
              onChange={(e) => updateSettings({ ownerName: e.target.value })}
            />
          </label>
          <label className="field grow">
            <span>Owner password</span>
            <input
              type="text"
              value={state.settings.ownerPassword}
              onChange={(e) =>
                updateSettings({ ownerPassword: e.target.value })
              }
              placeholder="Static owner PIN"
            />
          </label>
          <label className="field">
            <span>Commission %</span>
            <input
              type="number"
              min={0}
              max={100}
              value={commPct}
              onChange={(e) => {
                const v = Number(e.target.value) || 0
                setCommPct(v)
                updateSettings({ commissionRate: v / 100 })
              }}
            />
          </label>
        </div>
        <p className="muted panel-intro">
          Commission is {pct(state.settings.commissionRate)} of total sale price
          (revenue), not profit. Past sales update automatically. Owner password
          unlocks Owner mode. Create employee accounts under Crew (promote /
          demote grades there).
        </p>
      </section>

      <DiscordPanel store={store} />

      <CostInfo />

      <section className="panel">
        <header className="panel-head">
          <h3>Material / store costs</h3>
          <span className="muted">From White Widow store</span>
        </header>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Cost</th>
              </tr>
            </thead>
            <tbody>
              {state.materials.map((m) => (
                <tr key={m.id}>
                  <td>{m.name}</td>
                  <td>
                    <input
                      className="stock-input"
                      type="number"
                      min={0}
                      value={m.cost}
                      onChange={(e) =>
                        setMaterialCost(m.id, Number(e.target.value) || 0)
                      }
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <header className="panel-head">
          <h3>Product sale prices</h3>
          <span className="muted">
            Set seed / craft sale prices when you know them
          </span>
        </header>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Cost basis</th>
                <th>Sale price</th>
                <th>Margin / unit</th>
              </tr>
            </thead>
            <tbody>
              {state.products.map((p) => (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td>{money(p.cost)}</td>
                  <td>
                    <input
                      className="stock-input"
                      type="number"
                      min={0}
                      value={p.salePrice}
                      onChange={(e) =>
                        setProductSalePrice(p.id, Number(e.target.value) || 0)
                      }
                    />
                  </td>
                  <td className={p.salePrice - p.cost >= 0 ? 'pos' : 'neg'}>
                    {money(p.salePrice - p.cost)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel danger-panel">
        <header className="panel-head">
          <h3>Reset data</h3>
        </header>
        <p className="muted">
          <strong>Fresh start</strong> clears sales, crafts, stash, orders,
          bonuses, material purchases, audit history, and sets all stock to 0.
          Employees stay the same (same logins / ids). Use this before
          re-entering raw materials.
        </p>
        <div className="actions">
          <button
            type="button"
            className="btn danger"
            onClick={() => {
              if (
                !confirm(
                  'Fresh start? Clears all sales, crafts, stock, and history. Employees and passwords stay the same. This writes to the shared cloud DB.',
                )
              ) {
                return
              }
              freshStartKeepEmployees(actor)
              setResetMsg(
                'Fresh start applied — stock is 0 and history is cleared. Everyone should refresh.',
              )
            }}
          >
            Fresh start (keep employees)
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => {
              if (
                !confirm(
                  'Full reset to app defaults (including default employee roster)? Prefer Fresh start unless you really want seed defaults.',
                )
              ) {
                return
              }
              hardReset(actor)
              setResetMsg('Reset to seed defaults.')
            }}
          >
            Reset to seed defaults
          </button>
          {resetMsg && <span className="muted">{resetMsg}</span>}
        </div>
      </section>
    </div>
  )
}
