import { useMemo, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import type { StoreApi } from '../hooks/useStore'
import { postToDiscord, saleEmbed } from '../lib/discord'
import {
  formatDate,
  money,
  saleCommission,
  saleProfit,
  saleRevenue,
} from '../lib/utils'

export function Sales({ store }: { store: StoreApi }) {
  const { state, addSale, removeSale } = store
  const activeEmps = state.employees.filter((e) => e.active)
  const [employeeId, setEmployeeId] = useState(activeEmps[0]?.id ?? '')
  const [productId, setProductId] = useState(state.products[0]?.id ?? '')
  const [qty, setQty] = useState(1)
  const [unitPrice, setUnitPrice] = useState(
    state.products[0]?.salePrice || state.products[0]?.cost || 0,
  )
  const [note, setNote] = useState('')
  const [discordMsg, setDiscordMsg] = useState<string | null>(null)

  const product = state.products.find((p) => p.id === productId)
  const rate = state.settings.commissionRate

  const preview = useMemo(() => {
    const revenue = unitPrice * qty
    const cost = (product?.cost ?? 0) * qty
    const profit = revenue - cost
    const commission = Math.max(0, profit) * rate
    return { revenue, cost, profit, commission, net: profit - commission }
  }, [unitPrice, qty, product, rate])

  function onProductChange(id: string) {
    setProductId(id)
    const p = state.products.find((x) => x.id === id)
    if (p) setUnitPrice(p.salePrice || p.cost || 0)
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!employeeId || !productId || qty < 1) return

    const emp = state.employees.find((x) => x.id === employeeId)
    const prod = state.products.find((x) => x.id === productId)
    addSale({ employeeId, productId, qty, unitPrice, note: note || undefined })

    if (
      state.settings.discordPostSales &&
      state.settings.discordWebhookUrl.trim() &&
      emp &&
      prod
    ) {
      const revenue = unitPrice * qty
      const cost = (prod.cost ?? 0) * qty
      const profit = revenue - cost
      const commission = Math.max(0, profit) * rate
      const result = await postToDiscord(
        state.settings.discordWebhookUrl,
        saleEmbed({
          businessName: state.settings.businessName,
          employeeName: emp.name,
          productName: prod.name,
          qty,
          revenue,
          profit,
          commission,
          note: note || undefined,
        }),
      )
      setDiscordMsg(
        result.ok ? 'Posted to Discord' : `Discord: ${result.error}`,
      )
    } else {
      setDiscordMsg(null)
    }

    setNote('')
    setQty(1)
  }

  return (
    <div className="stack">
      <section className="panel">
        <header className="panel-head">
          <h3>
            <Plus size={16} /> Log a sale
          </h3>
        </header>
        <form className="form-stack" onSubmit={(e) => void submit(e)}>
          <div className="form-row">
            <label className="field grow">
              <span>Employee</span>
              <select
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                required
              >
                {activeEmps.length === 0 && (
                  <option value="">Add an employee first</option>
                )}
                {activeEmps.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field grow">
              <span>Product</span>
              <select
                value={productId}
                onChange={(e) => onProductChange(e.target.value)}
                required
              >
                {state.products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="form-row">
            <label className="field">
              <span>Qty</span>
              <input
                type="number"
                min={1}
                value={qty}
                onChange={(e) =>
                  setQty(Math.max(1, Number(e.target.value) || 1))
                }
              />
            </label>
            <label className="field">
              <span>Unit price</span>
              <input
                type="number"
                min={0}
                value={unitPrice}
                onChange={(e) => setUnitPrice(Number(e.target.value) || 0)}
              />
            </label>
            <label className="field grow">
              <span>Note (optional)</span>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Cash / card / customer…"
              />
            </label>
          </div>

          <div className="preview-grid">
            <div>
              <span className="muted">Revenue</span>
              <strong>{money(preview.revenue)}</strong>
            </div>
            <div>
              <span className="muted">Material cost</span>
              <strong>{money(preview.cost)}</strong>
            </div>
            <div>
              <span className="muted">Profit</span>
              <strong>{money(preview.profit)}</strong>
            </div>
            <div>
              <span className="muted">Commission</span>
              <strong>{money(preview.commission)}</strong>
            </div>
            <div>
              <span className="muted">You keep</span>
              <strong className="accent">{money(preview.net)}</strong>
            </div>
          </div>

          <div className="actions">
            <button type="submit" className="btn primary" disabled={!employeeId}>
              Save sale
            </button>
            {discordMsg && <span className="muted">{discordMsg}</span>}
          </div>
        </form>
      </section>

      <section className="panel">
        <header className="panel-head">
          <h3>Recent sales</h3>
        </header>
        {state.sales.length === 0 ? (
          <p className="empty">No sales yet — log the first one above.</p>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Employee</th>
                  <th>Item</th>
                  <th>Qty</th>
                  <th>Revenue</th>
                  <th>Profit</th>
                  <th>Comm.</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {state.sales.slice(0, 40).map((s) => {
                  const emp = state.employees.find((e) => e.id === s.employeeId)
                  return (
                    <tr key={s.id}>
                      <td>{formatDate(s.createdAt)}</td>
                      <td>{emp?.name ?? '—'}</td>
                      <td>
                        {s.productName}
                        {s.note ? (
                          <span className="note-tag"> · {s.note}</span>
                        ) : null}
                      </td>
                      <td>{s.qty}</td>
                      <td>{money(saleRevenue(s))}</td>
                      <td>{money(saleProfit(s))}</td>
                      <td>{money(saleCommission(s, rate))}</td>
                      <td>
                        <button
                          type="button"
                          className="icon-btn"
                          aria-label="Delete sale"
                          onClick={() => removeSale(s.id)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
