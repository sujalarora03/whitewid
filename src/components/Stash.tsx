import { useState } from 'react'
import { CheckCheck, PackageOpen, Trash2 } from 'lucide-react'
import type { StoreApi } from '../hooks/useStore'
import {
  postToDiscord,
  stashClearedEmbed,
  stashPendingEmbed,
} from '../lib/discord'
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
  const [discordMsg, setDiscordMsg] = useState<string | null>(null)

  const pending = state.stashBuys.filter((b) => b.status === 'pending')
  const cleared = state.stashBuys.filter((b) => b.status === 'cleared')
  const pendingTotal = pending.reduce((sum, b) => sum + b.amount, 0)

  function onProductChange(id: string) {
    setProductId(id)
    const p = state.products.find((x) => x.id === id)
    if (p) setAmount((p.salePrice || p.cost || 0) * qty)
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
        result.ok ? 'Logged + posted to Discord' : `Discord: ${result.error}`,
      )
    } else {
      setDiscordMsg(null)
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
    if (!confirm(`Clear all ${pending.length} pending stash buys?`)) return
    clearAllPendingStash()
    if (
      state.settings.discordPostStash &&
      state.settings.discordWebhookUrl.trim()
    ) {
      await postToDiscord(state.settings.discordWebhookUrl, {
        content: `✅ **${state.settings.businessName}** — owner cleared **${pending.length}** stash buys (${money(pendingTotal)}).`,
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
          When someone buys from the shop stash, log it here. It stays{' '}
          <strong>pending</strong> until you (owner) clear it.
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
          <div className="actions">
            <button type="submit" className="btn primary" disabled={!employeeId}>
              Log pending buy
            </button>
            {discordMsg && <span className="muted">{discordMsg}</span>}
          </div>
        </form>
      </section>

      <section className="panel">
        <header className="panel-head">
          <h3>Pending — needs owner clear</h3>
          <span className="muted">{money(pendingTotal)} waiting</span>
        </header>
        {pending.length === 0 ? (
          <p className="empty">No pending stash buys.</p>
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
                    <th>Amount</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {pending.map((b) => {
                    const emp = state.employees.find((e) => e.id === b.employeeId)
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
                          <strong>{money(b.amount)}</strong>
                        </td>
                        <td className="row-actions">
                          <button
                            type="button"
                            className="btn primary sm"
                            onClick={() => void onClear(b.id)}
                          >
                            Clear
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
                <CheckCheck size={16} /> Clear all pending
              </button>
            </div>
          </>
        )}
      </section>

      <section className="panel">
        <header className="panel-head">
          <h3>Cleared history</h3>
        </header>
        {cleared.length === 0 ? (
          <p className="empty">Cleared buys will show here.</p>
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
