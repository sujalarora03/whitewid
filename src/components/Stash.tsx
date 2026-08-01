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

function empName(
  employees: { id: string; name: string }[],
  id?: string,
): string {
  if (!id) return '—'
  return employees.find((e) => e.id === id)?.name ?? '—'
}

export function Stash({
  store,
  lockedEmployeeId,
  employeeMode = false,
}: {
  store: StoreApi
  lockedEmployeeId?: string
  /** Employees can log pending sales but not clear them */
  employeeMode?: boolean
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
  const [crafterId, setCrafterId] = useState(activeEmps[0]?.id || '')
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

  const effectiveSellerId = lockedEmployeeId || sellerId
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

  const pending = state.stashBuys.filter(
    (b) =>
      b.status === 'pending' &&
      (!employeeMode ||
        !lockedEmployeeId ||
        b.employeeId === lockedEmployeeId ||
        b.crafterId === lockedEmployeeId),
  )
  const cleared = state.stashBuys.filter(
    (b) =>
      b.status === 'cleared' &&
      (!employeeMode ||
        !lockedEmployeeId ||
        b.employeeId === lockedEmployeeId ||
        b.crafterId === lockedEmployeeId),
  )
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
    if (!effectiveSellerId || !productId || qty < 1) return
    if (isCraftable && craftedThenSold && !crafterId) return

    const seller = state.employees.find((x) => x.id === effectiveSellerId)
    const crafter = state.employees.find((x) => x.id === crafterId)
    const prod = state.products.find((x) => x.id === productId)
    addStashBuy({
      employeeId: effectiveSellerId,
      crafterId:
        isCraftable && craftedThenSold
          ? crafterId
          : crafterId || undefined,
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
      seller &&
      prod
    ) {
      const result = await postToDiscord(
        state.settings.discordWebhookUrl,
        stashPendingEmbed({
          businessName: state.settings.businessName,
          sellerName: seller.name,
          crafterName:
            isCraftable && craftedThenSold
              ? crafter?.name
              : crafterId
                ? crafter?.name
                : undefined,
          buyerName: buyerName.trim() || 'Customer',
          productName: prod.name,
          qty,
          amount,
          unitCost,
          source:
            isCraftable && craftedThenSold
              ? 'crafted_then_sold'
              : 'from_stock',
          commissionRate: state.settings.commissionRate,
        }),
      )
      setDiscordMsg(
        result.ok
          ? 'Stash sale logged + Discord'
          : `Discord: ${result.error}`,
      )
    } else {
      setDiscordMsg('Stash sale logged — owner clears to confirm commission')
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
      const crafter = buy.crafterId
        ? state.employees.find((e) => e.id === buy.crafterId)
        : undefined
      await postToDiscord(
        state.settings.discordWebhookUrl,
        stashClearedEmbed({
          businessName: state.settings.businessName,
          sellerName: seller?.name ?? '—',
          crafterName: crafter?.name,
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
        `Clear all ${pending.length} pending stash sales? Confirms as real sales — commission goes to each seller.`,
      )
    ) {
      return
    }
    clearAllPendingStash()
    if (
      state.settings.discordPostStash &&
      state.settings.discordWebhookUrl.trim()
    ) {
      const estProfit = pending.reduce(
        (sum, b) => sum + (b.amount - (b.unitCost ?? 0) * b.qty),
        0,
      )
      const estComm =
        Math.max(0, estProfit) * state.settings.commissionRate
      await postToDiscord(state.settings.discordWebhookUrl, {
        content: `✅ **${state.settings.businessName}** — owner cleared **${pending.length}** stash sales.\nRevenue ${money(pendingTotal)} · Profit ${money(estProfit)} · Commission ${money(estComm)}.`,
      })
    }
  }

  return (
    <div className="stack">
      <section className="panel">
        <header className="panel-head">
          <h3>
            <PackageOpen size={16} /> Log stash sale
          </h3>
        </header>
        <p className="muted panel-intro">
          Crew splits work: some craft, some sell, some do both. Mark{' '}
          <strong>who crafted</strong> and <strong>who sold</strong> (can be
          different). Commission goes to the <strong>seller</strong> when the
          owner clears. Craft credit goes to the <strong>crafter</strong>.
        </p>
        <form className="form-stack" onSubmit={(e) => void submit(e)}>
          <div className="form-row">
            <label className="field grow">
              <span>Seller (who sold)</span>
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
              <span>Crafter (who made it)</span>
              <select
                value={crafterId}
                onChange={(e) => setCrafterId(e.target.value)}
                required={isCraftable && craftedThenSold}
              >
                {!craftedThenSold && (
                  <option value="">Unknown / not craftable</option>
                )}
                {activeEmps.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                    {e.id === effectiveSellerId ? ' (same as seller)' : ''}
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
                Log craft for the crafter + this stash sale
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
                  Selling from finished stash stock. Optionally still name who
                  crafted it earlier.
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
              <span className="muted">Seller commission</span>
              <strong>{money(previewComm)}</strong>
            </div>
          </div>

          <div className="actions">
            <button
              type="submit"
              className="btn primary"
              disabled={!effectiveSellerId}
            >
              Log stash sale
            </button>
            {discordMsg && <span className="muted">{discordMsg}</span>}
          </div>
        </form>
      </section>

      <section className="panel">
        <header className="panel-head">
          <h3>
            {employeeMode
              ? 'Your stash sales (owner clears)'
              : 'Pending stash sales — await owner clear'}
          </h3>
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
                    <th>Seller</th>
                    <th>Crafter</th>
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
                    const cost = (b.unitCost ?? 0) * b.qty
                    const profit = b.amount - cost
                    const same =
                      b.crafterId && b.crafterId === b.employeeId
                    return (
                      <tr key={b.id} className="warn-row">
                        <td>{formatDate(b.createdAt)}</td>
                        <td>{empName(state.employees, b.employeeId)}</td>
                        <td>
                          {empName(state.employees, b.crafterId)}
                          {same ? (
                            <span className="note-tag"> · both</span>
                          ) : null}
                        </td>
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
                          {!employeeMode && (
                            <>
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
                            </>
                          )}
                          {employeeMode && (
                            <span className="note-tag">waiting on owner</span>
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
                  <CheckCheck size={16} /> Clear all → confirm sales
                </button>
              </div>
            )}
          </>
        )}
      </section>

      <section className="panel">
        <header className="panel-head">
          <h3>Cleared / confirmed stash sales</h3>
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
                  <th>Seller</th>
                  <th>Crafter</th>
                  <th>Buyer</th>
                  <th>Item</th>
                  <th>Flow</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {cleared.slice(0, 30).map((b) => (
                  <tr key={b.id}>
                    <td>{formatDate(b.createdAt)}</td>
                    <td>{b.clearedAt ? formatDate(b.clearedAt) : '—'}</td>
                    <td>{empName(state.employees, b.employeeId)}</td>
                    <td>{empName(state.employees, b.crafterId)}</td>
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
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
