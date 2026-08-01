import { useMemo, useState } from 'react'
import { CheckCheck, PackageOpen, Trash2 } from 'lucide-react'
import type { StoreApi } from '../hooks/useStore'
import {
  postToDiscord,
  stashClearedEmbed,
  stashPendingEmbed,
} from '../lib/discord'
import { recipeUnitCost } from '../data/seed'
import { formatDate, money } from '../lib/utils'

export function Stash({ store }: { store: StoreApi }) {
  const {
    state,
    addStashBuy,
    clearStashBuy,
    clearAllPendingStash,
    removeStashBuy,
  } = store
  const activeEmps = state.employees.filter((e) => e.active)
  const [employeeId, setEmployeeId] = useState(activeEmps[0]?.id ?? '')
  const [buyerName, setBuyerName] = useState('')
  const [productId, setProductId] = useState(state.products[0]?.id ?? '')
  const [qty, setQty] = useState(1)
  const [amount, setAmount] = useState(
    state.products[0]?.salePrice || state.products[0]?.cost || 0,
  )
  const [note, setNote] = useState('')
  const [craftedThenSold, setCraftedThenSold] = useState(true)
  const [deductMaterials, setDeductMaterials] = useState(true)
  const [discordMsg, setDiscordMsg] = useState<string | null>(null)

  const product = state.products.find((p) => p.id === productId)
  const isCraftable = Boolean(product?.recipeId)

  const unitCost = useMemo(() => {
    if (!product) return 0
    if (product.recipeId) {
      return recipeUnitCost(product.recipeId, state.materials, state.recipes)
    }
    return product.cost
  }, [product, state.materials, state.recipes])

  const previewProfit = amount - unitCost * qty
  const previewComm = Math.max(0, previewProfit) * state.settings.commissionRate

  const pending = state.stashBuys.filter((b) => b.status === 'pending')
  const cleared = state.stashBuys.filter((b) => b.status === 'cleared')
  const pendingTotal = pending.reduce((sum, b) => sum + b.amount, 0)

  function onProductChange(id: string) {
    setProductId(id)
    const p = state.products.find((x) => x.id === id)
    if (p) {
      setAmount((p.salePrice || p.cost || 0) * qty)
      setCraftedThenSold(Boolean(p.recipeId))
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!employeeId || !productId || qty < 1) return

    const emp = state.employees.find((x) => x.id === employeeId)
    const prod = state.products.find((x) => x.id === productId)
    addStashBuy({
      employeeId,
      buyerName,
      productId,
      qty,
      amount,
      note: note || undefined,
      craftedThenSold: isCraftable && craftedThenSold,
      deductMaterials,
    })

    if (
      state.settings.discordPostStash &&
      state.settings.discordWebhookUrl.trim() &&
      emp &&
      prod
    ) {
      const result = await postToDiscord(
        state.settings.discordWebhookUrl,
        stashPendingEmbed({
          businessName: state.settings.businessName,
          employeeName: emp.name,
          buyerName: buyerName.trim() || 'Customer',
          productName: prod.name,
          qty,
          amount,
        }),
      )
      setDiscordMsg(
        result.ok
          ? 'Pending sale logged + Discord'
          : `Discord: ${result.error}`,
      )
    } else {
      setDiscordMsg('Pending sale logged — clear to confirm commission')
    }

    setBuyerName('')
    setNote('')
    setQty(1)
  }

  async function onClear(id: string) {
    const buy = state.stashBuys.find((b) => b.id === id)
    clearStashBuy(id)
    if (
      buy &&
      state.settings.discordPostStash &&
      state.settings.discordWebhookUrl.trim()
    ) {
      const emp = state.employees.find((e) => e.id === buy.employeeId)
      await postToDiscord(
        state.settings.discordWebhookUrl,
        stashClearedEmbed({
          businessName: state.settings.businessName,
          employeeName: emp?.name ?? '—',
          buyerName: buy.buyerName,
          productName: buy.productName,
          qty: buy.qty,
          amount: buy.amount,
        }),
      )
    }
  }

  async function onClearAll() {
    if (pending.length === 0) return
    if (
      !confirm(
        `Clear all ${pending.length} pending stash sales? This confirms them as real sales (commission counts).`,
      )
    ) {
      return
    }
    clearAllPendingStash()
    if (
      state.settings.discordPostStash &&
      state.settings.discordWebhookUrl.trim()
    ) {
      await postToDiscord(state.settings.discordWebhookUrl, {
        content: `✅ **${state.settings.businessName}** — owner cleared **${pending.length}** stash sales (${money(pendingTotal)}). Sales + commissions confirmed.`,
      })
    }
  }

  return (
    <div className="stack">
      <section className="panel">
        <header className="panel-head">
          <h3>
            <PackageOpen size={16} /> Log stash purchase
          </h3>
        </header>
        <p className="muted panel-intro">
          Customer bought from stash → logged as a <strong>pending sale</strong>.
          When you clear it, the sale is confirmed (profit + 15% commission). For
          craftable items you can also log the craft in the same step.
        </p>
        <form className="form-stack" onSubmit={(e) => void submit(e)}>
          <div className="form-row">
            <label className="field grow">
              <span>Employee / who sold</span>
              <select
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                required
              >
                {activeEmps.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field grow">
              <span>Buyer name</span>
              <input
                value={buyerName}
                onChange={(e) => setBuyerName(e.target.value)}
                placeholder="Customer / character name"
              />
            </label>
          </div>
          <div className="form-row">
            <label className="field grow">
              <span>Item</span>
              <select
                value={productId}
                onChange={(e) => onProductChange(e.target.value)}
                required
              >
                {state.products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                    {p.recipeId ? ' (craftable)' : ''}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Qty</span>
              <input
                type="number"
                min={1}
                value={qty}
                onChange={(e) => {
                  const q = Math.max(1, Number(e.target.value) || 1)
                  setQty(q)
                  const p = state.products.find((x) => x.id === productId)
                  if (p) setAmount((p.salePrice || p.cost || 0) * q)
                }}
              />
            </label>
            <label className="field">
              <span>Total paid</span>
              <input
                type="number"
                min={0}
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value) || 0)}
              />
            </label>
            <label className="field grow">
              <span>Note</span>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Optional"
              />
            </label>
          </div>

          {isCraftable && (
            <>
              <label className="check-field">
                <input
                  type="checkbox"
                  checked={craftedThenSold}
                  onChange={(e) => setCraftedThenSold(e.target.checked)}
                />
                Crafted then sold (log craft + pending sale together)
              </label>
              {craftedThenSold && (
                <label className="check-field">
                  <input
                    type="checkbox"
                    checked={deductMaterials}
                    onChange={(e) => setDeductMaterials(e.target.checked)}
                  />
                  Deduct business materials for that craft
                </label>
              )}
              {!craftedThenSold && (
                <p className="muted">
                  Selling from finished stock only (no new craft log).
                </p>
              )}
            </>
          )}

          <div className="preview-grid">
            <div>
              <span className="muted">Pending revenue</span>
              <strong>{money(amount)}</strong>
            </div>
            <div>
              <span className="muted">Cost basis</span>
              <strong>{money(unitCost * qty)}</strong>
            </div>
            <div>
              <span className="muted">Profit (when cleared)</span>
              <strong>{money(previewProfit)}</strong>
            </div>
            <div>
              <span className="muted">Commission (when cleared)</span>
              <strong>{money(previewComm)}</strong>
            </div>
          </div>

          <div className="actions">
            <button type="submit" className="btn primary" disabled={!employeeId}>
              Log pending sale
            </button>
            {discordMsg && <span className="muted">{discordMsg}</span>}
          </div>
        </form>
      </section>

      <section className="panel">
        <header className="panel-head">
          <h3>Pending sales — await owner clear</h3>
          <span className="muted">{money(pendingTotal)} waiting</span>
        </header>
        {pending.length === 0 ? (
          <p className="empty">No pending stash sales.</p>
        ) : (
          <>
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>When</th>
                    <th>Employee</th>
                    <th>Buyer</th>
                    <th>Item</th>
                    <th>Flow</th>
                    <th>Amount</th>
                    <th>Est. profit</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {pending.map((b) => {
                    const emp = state.employees.find(
                      (e) => e.id === b.employeeId,
                    )
                    const cost = (b.unitCost ?? 0) * b.qty
                    const profit = b.amount - cost
                    return (
                      <tr key={b.id} className="warn-row">
                        <td>{formatDate(b.createdAt)}</td>
                        <td>{emp?.name ?? '—'}</td>
                        <td>{b.buyerName}</td>
                        <td>
                          {b.qty}× {b.productName}
                          {b.note ? (
                            <span className="note-tag"> · {b.note}</span>
                          ) : null}
                        </td>
                        <td>
                          <span className="note-tag">
                            {b.source === 'crafted_then_sold'
                              ? 'crafted + sold'
                              : 'from stock'}
                          </span>
                        </td>
                        <td>
                          <strong>{money(b.amount)}</strong>
                        </td>
                        <td>{money(profit)}</td>
                        <td className="row-actions">
                          <button
                            type="button"
                            className="btn primary sm"
                            onClick={() => void onClear(b.id)}
                          >
                            Clear → confirm sale
                          </button>
                          <button
                            type="button"
                            className="icon-btn"
                            aria-label="Delete"
                            onClick={() => removeStashBuy(b.id)}
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
            <div className="actions">
              <button
                type="button"
                className="btn discord"
                onClick={() => void onClearAll()}
              >
                <CheckCheck size={16} /> Clear all → confirm sales
              </button>
            </div>
          </>
        )}
      </section>

      <section className="panel">
        <header className="panel-head">
          <h3>Cleared / confirmed sales</h3>
        </header>
        {cleared.length === 0 ? (
          <p className="empty">Cleared stash sales will show here.</p>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Logged</th>
                  <th>Cleared</th>
                  <th>Employee</th>
                  <th>Buyer</th>
                  <th>Item</th>
                  <th>Flow</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {cleared.slice(0, 30).map((b) => {
                  const emp = state.employees.find((e) => e.id === b.employeeId)
                  return (
                    <tr key={b.id}>
                      <td>{formatDate(b.createdAt)}</td>
                      <td>{b.clearedAt ? formatDate(b.clearedAt) : '—'}</td>
                      <td>{emp?.name ?? '—'}</td>
                      <td>{b.buyerName}</td>
                      <td>
                        {b.qty}× {b.productName}
                      </td>
                      <td>
                        <span className="note-tag">
                          {b.source === 'crafted_then_sold'
                            ? 'crafted + sold'
                            : 'from stock'}
                        </span>
                      </td>
                      <td>{money(b.amount)}</td>
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
