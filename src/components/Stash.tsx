import { useMemo, useState } from 'react'
import { CheckCheck, PackageOpen, Trash2 } from 'lucide-react'
import type { StoreApi } from '../hooks/useStore'
import {
  postToDiscord,
  stashClearedEmbed,
  stashPendingEmbed,
} from '../lib/discord'
import { recipeUnitCost } from '../data/seed'
import { canDeleteRecord, type ActorCtx } from '../lib/permissions'
import { formatDate, money } from '../lib/utils'

/**
 * Optional tab: sales that wait for owner clear before commission counts.
 * Crafting is logged separately under Craft — sellers do not need to know who crafted.
 */
export function Stash({
  store,
  lockedEmployeeId,
  employeeMode = false,
  actor,
}: {
  store: StoreApi
  lockedEmployeeId?: string
  employeeMode?: boolean
  actor: ActorCtx
}) {
  const {
    state,
    addStashBuy,
    clearStashBuy,
    clearAllPendingStash,
    removeStashBuy,
  } = store
  const activeEmps = state.employees.filter((e) => e.active)
  const [sellerId, setSellerId] = useState(
    lockedEmployeeId || activeEmps[0]?.id || '',
  )
  const [buyerName, setBuyerName] = useState('')
  const [productId, setProductId] = useState(state.products[0]?.id ?? '')
  const [qty, setQty] = useState(1)
  const [amount, setAmount] = useState(
    state.products[0]?.salePrice || state.products[0]?.cost || 0,
  )
  const [note, setNote] = useState('')
  const [discordMsg, setDiscordMsg] = useState<string | null>(null)

  const effectiveSellerId = lockedEmployeeId || sellerId
  const product = state.products.find((p) => p.id === productId)

  const unitCost = useMemo(() => {
    if (!product) return 0
    if (product.recipeId) {
      return recipeUnitCost(product.recipeId, state.materials, state.recipes)
    }
    return product.cost
  }, [product, state.materials, state.recipes])

  const previewComm = Math.max(0, amount) * state.settings.commissionRate

  const pending = state.stashBuys.filter(
    (b) =>
      b.status === 'pending' &&
      (!employeeMode ||
        !lockedEmployeeId ||
        b.employeeId === lockedEmployeeId),
  )
  const cleared = state.stashBuys.filter(
    (b) =>
      b.status === 'cleared' &&
      (!employeeMode ||
        !lockedEmployeeId ||
        b.employeeId === lockedEmployeeId),
  )
  const pendingTotal = pending.reduce((sum, b) => sum + b.amount, 0)

  function onProductChange(id: string) {
    setProductId(id)
    const p = state.products.find((x) => x.id === id)
    if (p) setAmount((p.salePrice || p.cost || 0) * qty)
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!effectiveSellerId || !productId || qty < 1) return

    const seller = state.employees.find((x) => x.id === effectiveSellerId)
    const prod = state.products.find((x) => x.id === productId)
    addStashBuy({
      employeeId: effectiveSellerId,
      buyerName,
      productId,
      qty,
      amount,
      note: note || undefined,
      craftedThenSold: false,
      deductMaterials: false,
    })

    if (
      state.settings.discordPostStash &&
      state.settings.discordWebhookUrl.trim() &&
      seller &&
      prod
    ) {
      const result = await postToDiscord(
        state.settings.discordWebhookUrl,
        stashPendingEmbed({
          businessName: state.settings.businessName,
          sellerName: seller.name,
          buyerName: buyerName.trim() || 'Customer',
          productName: prod.name,
          qty,
          amount,
          unitCost,
          source: 'from_stock',
          commissionRate: state.settings.commissionRate,
        }),
      )
      setDiscordMsg(
        result.ok
          ? 'Pending sale logged + Discord'
          : `Discord: ${result.error}`,
      )
    } else {
      setDiscordMsg('Pending sale logged — owner clears to confirm commission')
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
      const seller = state.employees.find((e) => e.id === buy.employeeId)
      await postToDiscord(
        state.settings.discordWebhookUrl,
        stashClearedEmbed({
          businessName: state.settings.businessName,
          sellerName: seller?.name ?? '—',
          buyerName: buy.buyerName,
          productName: buy.productName,
          qty: buy.qty,
          amount: buy.amount,
          unitCost: buy.unitCost ?? 0,
          source: buy.source ?? 'from_stock',
          commissionRate: state.settings.commissionRate,
        }),
      )
    }
  }

  async function onClearAll() {
    if (pending.length === 0) return
    if (
      !confirm(
        `Clear all ${pending.length} pending sales? Confirms them as real sales (seller commission counts).`,
      )
    ) {
      return
    }
    clearAllPendingStash()
  }

  return (
    <div className="stack">
      <section className="panel tip-panel">
        <h3>Optional — most crews can skip this tab</h3>
        <p className="muted panel-intro">
          Day-to-day: crafters use <strong>Craft</strong>, sellers use{' '}
          <strong>Sales</strong>. Your Dashboard adds them up (top crafter / top
          seller / commission). Use <strong>Stash</strong> only if you want a
          sale held until you personally clear it before commission counts.
        </p>
      </section>

      <section className="panel">
        <header className="panel-head">
          <h3>
            <PackageOpen size={16} /> Pending sale (needs owner clear)
          </h3>
        </header>
        <form className="form-stack" onSubmit={(e) => void submit(e)}>
          <div className="form-row">
            <label className="field grow">
              <span>Seller</span>
              {lockedEmployeeId ? (
                <input
                  value={
                    activeEmps.find((e) => e.id === lockedEmployeeId)?.name ??
                    '—'
                  }
                  disabled
                />
              ) : (
                <select
                  value={sellerId}
                  onChange={(e) => setSellerId(e.target.value)}
                  required
                >
                  {activeEmps.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name}
                    </option>
                  ))}
                </select>
              )}
            </label>
            <label className="field grow">
              <span>Buyer</span>
              <input
                value={buyerName}
                onChange={(e) => setBuyerName(e.target.value)}
                placeholder="Customer name"
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

          <div className="preview-grid">
            <div>
              <span className="muted">Pending revenue</span>
              <strong>{money(amount)}</strong>
            </div>
            <div>
              <span className="muted">Est. commission</span>
              <strong>{money(previewComm)}</strong>
            </div>
          </div>

          <div className="actions">
            <button
              type="submit"
              className="btn primary"
              disabled={!effectiveSellerId}
            >
              Log pending sale
            </button>
            {discordMsg && <span className="muted">{discordMsg}</span>}
          </div>
        </form>
      </section>

      <section className="panel">
        <header className="panel-head">
          <h3>Waiting for owner clear</h3>
          <span className="muted">{money(pendingTotal)}</span>
        </header>
        {pending.length === 0 ? (
          <p className="empty">Nothing pending.</p>
        ) : (
          <>
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>When</th>
                    <th>Seller</th>
                    <th>Buyer</th>
                    <th>Item</th>
                    <th>Amount</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {pending.map((b) => {
                    const seller = state.employees.find(
                      (e) => e.id === b.employeeId,
                    )
                    return (
                      <tr key={b.id} className="warn-row">
                        <td>{formatDate(b.createdAt)}</td>
                        <td>{seller?.name ?? '—'}</td>
                        <td>{b.buyerName}</td>
                        <td>
                          {b.qty}× {b.productName}
                        </td>
                        <td>
                          <strong>{money(b.amount)}</strong>
                        </td>
                        <td className="row-actions">
                          {!employeeMode && (
                            <button
                              type="button"
                              className="btn primary sm"
                              onClick={() => void onClear(b.id)}
                            >
                              Clear → confirm
                            </button>
                          )}
                          {canDeleteRecord(actor, b.employeeId) && (
                            <button
                              type="button"
                              className="icon-btn"
                              aria-label="Delete"
                              onClick={() => removeStashBuy(b.id, actor)}
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                          {employeeMode &&
                            !canDeleteRecord(actor, b.employeeId) && (
                              <span className="note-tag">waiting</span>
                            )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {!employeeMode && (
              <div className="actions">
                <button
                  type="button"
                  className="btn discord"
                  onClick={() => void onClearAll()}
                >
                  <CheckCheck size={16} /> Clear all
                </button>
              </div>
            )}
          </>
        )}
      </section>

      {cleared.length > 0 && (
        <section className="panel">
          <header className="panel-head">
            <h3>Recently cleared</h3>
          </header>
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Cleared</th>
                  <th>Seller</th>
                  <th>Buyer</th>
                  <th>Item</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {cleared.slice(0, 20).map((b) => {
                  const seller = state.employees.find(
                    (e) => e.id === b.employeeId,
                  )
                  return (
                    <tr key={b.id}>
                      <td>
                        {b.clearedAt ? formatDate(b.clearedAt) : '—'}
                      </td>
                      <td>{seller?.name ?? '—'}</td>
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
        </section>
      )}
    </div>
  )
}
