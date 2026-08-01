import { useState } from 'react'
import type { StoreApi } from '../hooks/useStore'
import { DiscordPanel } from './DiscordPanel'
import { money, pct } from '../lib/utils'

export function Prices({ store }: { store: StoreApi }) {
  const {
    state,
    setMaterialCost,
    setProductSalePrice,
    updateSettings,
    hardReset,
  } = store
  const [commPct, setCommPct] = useState(
    Math.round(state.settings.commissionRate * 100),
  )

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
          Commission is {pct(state.settings.commissionRate)} of profit (sale −
          material cost). Bonuses are tracked separately and added to employee
          payout.
        </p>
      </section>

      <DiscordPanel store={store} />

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
          Clears sales, bonuses, and stock — restores default recipes &amp;
          prices from your screenshots.
        </p>
        <button
          type="button"
          className="btn danger"
          onClick={() => {
            if (
              confirm(
                'Reset all local data to defaults? This cannot be undone.',
              )
            ) {
              hardReset()
            }
          }}
        >
          Reset to defaults
        </button>
      </section>
    </div>
  )
}
