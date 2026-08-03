import { useMemo, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import type { StoreApi } from '../hooks/useStore'
import {
  costAlertEmbed,
  costAlertWebhookUrl,
  postToDiscord,
  saleEmbed,
} from '../lib/discord'
import { canDeleteRecord, type ActorCtx } from '../lib/permissions'
import {
  formatSellRange,
  guideForProduct,
  minSellForSale,
  tierForQty,
} from '../data/priceGuide'
import {
  formatDate,
  money,
  saleCommission,
  saleProfit,
  saleRevenue,
} from '../lib/utils'
import { CostInfo } from './CostInfo'

export function Sales({
  store,
  lockedEmployeeId,
  actor,
}: {
  store: StoreApi
  lockedEmployeeId?: string
  actor: ActorCtx
}) {
  const { state, addSale, removeSale } = store
  const activeEmps = state.employees.filter((e) => e.active)
  const inventoryProducts = state.products.filter(
    (p) => (p.kind ?? 'inventory') !== 'external',
  )
  const externalProducts = state.products.filter((p) => p.kind === 'external')
  const [employeeId, setEmployeeId] = useState(
    lockedEmployeeId || activeEmps[0]?.id || '',
  )
  const [productId, setProductId] = useState(state.products[0]?.id ?? '')
  const [qty, setQty] = useState(1)
  const [unitPrice, setUnitPrice] = useState(
    state.products[0]?.salePrice || state.products[0]?.cost || 0,
  )
  const [note, setNote] = useState('')
  const [discordMsg, setDiscordMsg] = useState<string | null>(null)

  const effectiveEmployeeId = lockedEmployeeId || employeeId
  const product = state.products.find((p) => p.id === productId)
  const rate = state.settings.commissionRate
  const pricingMode = product?.pricingMode ?? 'unit'
  const isExternal = product?.kind === 'external'
  const guide = product ? guideForProduct(product.id) : undefined
  const floor = product ? minSellForSale(product.id, qty) : null
  const underFloor = floor != null && unitPrice < floor.min

  const preview = useMemo(() => {
    const unitCost = product?.cost ?? 0
    if (pricingMode === 'percent') {
      const revenue = (qty * unitPrice) / 100
      const cost = (qty * unitCost) / 100
      const profit = revenue - cost
      const commission = Math.max(0, profit) * rate
      return { revenue, cost, profit, commission, net: profit - commission }
    }
    const revenue = unitPrice * qty
    const cost = unitCost * qty
    const profit = revenue - cost
    const commission = Math.max(0, profit) * rate
    return { revenue, cost, profit, commission, net: profit - commission }
  }, [unitPrice, qty, product, rate, pricingMode])

  function onProductChange(id: string) {
    setProductId(id)
    const p = state.products.find((x) => x.id === id)
    if (!p) return
    const g = guideForProduct(p.id)
    const tier = g ? tierForQty(g, qty) : undefined
    if (tier) {
      setUnitPrice(tier.sellMin)
    } else {
      setUnitPrice(p.salePrice || p.cost || 0)
    }
  }

  function onQtyChange(next: number) {
    const q = Math.max(1, next)
    setQty(q)
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!effectiveEmployeeId || !productId || qty < 1) return

    const emp = state.employees.find((x) => x.id === effectiveEmployeeId)
    const prod = state.products.find((x) => x.id === productId)
    addSale({
      employeeId: effectiveEmployeeId,
      productId,
      qty,
      unitPrice,
      note: note || undefined,
    })

    const messages: string[] = []

    if (
      state.settings.discordPostSales &&
      state.settings.discordWebhookUrl.trim() &&
      emp &&
      prod
    ) {
      const result = await postToDiscord(
        state.settings.discordWebhookUrl,
        saleEmbed({
          businessName: state.settings.businessName,
          employeeName: emp.name,
          productName: prod.name,
          qty,
          revenue: preview.revenue,
          profit: preview.profit,
          commission: preview.commission,
          note: note || undefined,
        }),
      )
      messages.push(
        result.ok ? 'Posted to Discord' : `Discord: ${result.error}`,
      )
    }

    const alertUrl = costAlertWebhookUrl(state.settings)
    if (underFloor && floor && alertUrl && emp && prod) {
      const alert = await postToDiscord(
        alertUrl,
        costAlertEmbed({
          businessName: state.settings.businessName,
          employeeName: emp.name,
          productName: prod.name,
          qty,
          unitPrice,
          floor: floor.min,
          mode: floor.mode,
          revenue: preview.revenue,
          note: note || undefined,
        }),
      )
      messages.push(
        alert.ok
          ? 'Cost alert posted'
          : `Cost alert failed: ${alert.error}`,
      )
    } else if (underFloor && !alertUrl) {
      messages.push('Under floor — set Cost alert webhook in Prices')
    }

    setDiscordMsg(messages.length ? messages.join(' · ') : null)
    setNote('')
    setQty(1)
  }

  const suggested =
    guide && tierForQty(guide, qty)
      ? formatSellRange(tierForQty(guide, qty)!, guide.pricingMode)
      : null

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
              {lockedEmployeeId ? (
                <input
                  value={
                    activeEmps.find((e) => e.id === lockedEmployeeId)?.name ??
                    'Select yourself on My desk'
                  }
                  disabled
                />
              ) : (
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
              )}
            </label>
            <label className="field grow">
              <span>Product / service</span>
              <select
                value={productId}
                onChange={(e) => onProductChange(e.target.value)}
                required
              >
                <optgroup label="Shop stock">
                  {inventoryProducts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                      {p.stock != null ? ` · stock ${p.stock}` : ''}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="External">
                  {externalProducts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </optgroup>
              </select>
            </label>
          </div>
          <div className="form-row">
            <label className="field">
              <span>
                {pricingMode === 'percent' ? 'Amount (principal $)' : 'Qty'}
              </span>
              <input
                type="number"
                min={1}
                value={qty}
                onChange={(e) =>
                  onQtyChange(Math.max(1, Number(e.target.value) || 1))
                }
              />
            </label>
            <label className="field">
              <span>
                {pricingMode === 'percent'
                  ? 'Fee to customer (%)'
                  : 'Unit price ($)'}
              </span>
              <input
                type="number"
                min={0}
                step={pricingMode === 'percent' ? 0.1 : 1}
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

          {isExternal && (
            <p className="muted panel-intro">
              External service — does not change finished product stock.
              {pricingMode === 'percent'
                ? ' Enter the money amount and the % fee charged to the customer (our cost is 2%).'
                : ''}
            </p>
          )}

          {suggested && (
            <p className="muted panel-intro">
              Baseline for this qty: sell {suggested}
              {floor ? ` · floor ${floor.min}${floor.mode === 'percent' ? '%' : ''}` : ''}
            </p>
          )}

          {underFloor && (
            <p className="muted panel-intro" style={{ color: '#c0392b' }}>
              Under floor ({floor!.min}
              {floor!.mode === 'percent' ? '%' : ''}) — sale still saves, and a
              cost alert will post if that webhook is set.
            </p>
          )}

          <div className="preview-grid">
            <div>
              <span className="muted">Revenue</span>
              <strong>{money(preview.revenue)}</strong>
            </div>
            <div>
              <span className="muted">
                {pricingMode === 'percent' ? 'Our cost (2%)' : 'Material cost'}
              </span>
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
            <button
              type="submit"
              className="btn primary"
              disabled={!effectiveEmployeeId}
            >
              Save sale
            </button>
            {discordMsg && <span className="muted">{discordMsg}</span>}
          </div>
        </form>
      </section>

      <CostInfo />

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
                        {s.kind === 'external' ? (
                          <span className="note-tag"> · external</span>
                        ) : null}
                        {s.pricingMode === 'percent' ? (
                          <span className="note-tag">
                            {' '}
                            · {s.unitPrice}% of {money(s.qty)}
                          </span>
                        ) : null}
                        {s.note ? (
                          <span className="note-tag"> · {s.note}</span>
                        ) : null}
                      </td>
                      <td>
                        {s.pricingMode === 'percent' ? money(s.qty) : s.qty}
                      </td>
                      <td>{money(saleRevenue(s))}</td>
                      <td>{money(saleProfit(s))}</td>
                      <td>{money(saleCommission(s, rate))}</td>
                      <td>
                        {canDeleteRecord(actor, s.employeeId) ? (
                          <button
                            type="button"
                            className="icon-btn"
                            aria-label="Delete sale"
                            onClick={() => removeSale(s.id, actor)}
                          >
                            <Trash2 size={16} />
                          </button>
                        ) : null}
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
