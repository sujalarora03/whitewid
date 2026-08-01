import { useState } from 'react'
import { ShoppingBag, Trash2 } from 'lucide-react'
import type { StoreApi } from '../hooks/useStore'
import { materialPurchaseEmbed, postToDiscord } from '../lib/discord'
import { formatDate, money } from '../lib/utils'

export function Inventory({
  store,
  lockedEmployeeId,
  employeeMode = false,
}: {
  store: StoreApi
  lockedEmployeeId?: string
  employeeMode?: boolean
}) {
  const {
    state,
    setMaterialStock,
    setProductStock,
    addMaterialPurchase,
    removeMaterialPurchase,
  } = store

  const activeEmps = state.employees.filter((e) => e.active)
  const [buyerId, setBuyerId] = useState(lockedEmployeeId || '')
  const [materialId, setMaterialId] = useState(state.materials[0]?.id ?? '')
  const [qty, setQty] = useState(1)
  const [totalPaid, setTotalPaid] = useState(state.materials[0]?.cost ?? 0)
  const [note, setNote] = useState('')
  const [discordMsg, setDiscordMsg] = useState<string | null>(null)

  const effectiveBuyerId = lockedEmployeeId || buyerId

  function onMaterialChange(id: string) {
    setMaterialId(id)
    const mat = state.materials.find((m) => m.id === id)
    if (mat) setTotalPaid(mat.cost * qty)
  }

  async function submitPurchase(e: React.FormEvent) {
    e.preventDefault()
    if (!materialId || qty < 1) return

    const mat = state.materials.find((m) => m.id === materialId)
    const emp = state.employees.find((x) => x.id === effectiveBuyerId)
    const buyerName =
      emp?.name || state.settings.ownerName || 'Owner / business'

    addMaterialPurchase({
      employeeId: effectiveBuyerId,
      materialId,
      qty,
      totalPaid,
      note: note || undefined,
    })

    if (
      state.settings.discordPostMaterials &&
      state.settings.discordWebhookUrl.trim() &&
      mat
    ) {
      const result = await postToDiscord(
        state.settings.discordWebhookUrl,
        materialPurchaseEmbed({
          businessName: state.settings.businessName,
          buyerName,
          materialName: mat.name,
          qty,
          totalPaid,
          note: note || undefined,
        }),
      )
      setDiscordMsg(
        result.ok ? 'Logged + posted to Discord' : `Discord: ${result.error}`,
      )
    } else {
      setDiscordMsg(null)
    }

    setNote('')
    setQty(1)
    if (mat) setTotalPaid(mat.cost)
  }

  return (
    <div className="stack">
      <section className="panel">
        <header className="panel-head">
          <h3>
            <ShoppingBag size={16} /> Log material purchase
          </h3>
        </header>
        <p className="muted panel-intro">
          Who bought mats for the business from the store. Separate from
          crafting — the person who crafts is not assumed to be the buyer.
        </p>
        <form
          className="form-stack"
          onSubmit={(e) => void submitPurchase(e)}
        >
          <div className="form-row">
            <label className="field grow">
              <span>Who bought</span>
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
                  value={buyerId}
                  onChange={(e) => setBuyerId(e.target.value)}
                >
                  <option value="">
                    {state.settings.ownerName || 'Owner / business'}
                  </option>
                  {activeEmps.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name}
                    </option>
                  ))}
                </select>
              )}
            </label>
            <label className="field grow">
              <span>Material</span>
              <select
                value={materialId}
                onChange={(e) => onMaterialChange(e.target.value)}
                required
              >
                {state.materials.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
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
                  const m = state.materials.find((x) => x.id === materialId)
                  if (m) setTotalPaid(m.cost * q)
                }}
              />
            </label>
            <label className="field">
              <span>Total paid</span>
              <input
                type="number"
                min={0}
                value={totalPaid}
                onChange={(e) => setTotalPaid(Number(e.target.value) || 0)}
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
            <button type="submit" className="btn primary">
              Add to business stock
            </button>
            {discordMsg && <span className="muted">{discordMsg}</span>}
          </div>
        </form>

        {state.materialPurchases.length > 0 && (
          <div className="table-scroll spaced-top">
            <table className="data-table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Buyer</th>
                  <th>Material</th>
                  <th>Qty</th>
                  <th>Paid</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {state.materialPurchases.slice(0, 30).map((p) => {
                  const emp = state.employees.find((e) => e.id === p.employeeId)
                  return (
                    <tr key={p.id}>
                      <td>{formatDate(p.createdAt)}</td>
                      <td>
                        {p.employeeId
                          ? (emp?.name ?? '—')
                          : state.settings.ownerName || 'Owner / business'}
                      </td>
                      <td>
                        {p.materialName}
                        {p.note ? (
                          <span className="note-tag"> · {p.note}</span>
                        ) : null}
                      </td>
                      <td>{p.qty}</td>
                      <td>{money(p.totalPaid)}</td>
                      <td>
                        <button
                          type="button"
                          className="icon-btn"
                          aria-label="Remove purchase"
                          onClick={() => removeMaterialPurchase(p.id)}
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

      {employeeMode ? (
        <section className="panel">
          <header className="panel-head">
            <h3>Business stock (view)</h3>
          </header>
          <p className="muted panel-intro">
            Stock edits are owner-only. Log material purchases above to add
            mats.
          </p>
          <ul className="rank-list">
            {state.materials.map((m) => (
              <li key={m.id}>
                <span className="grow">{m.name}</span>
                <span>
                  {m.stock} in stock · {money(m.cost)}/ea
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <>
          <section className="panel">
            <header className="panel-head">
              <h3>Materials</h3>
              <span className="muted">Business shared stock</span>
            </header>
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Material</th>
                    <th>Unit cost</th>
                    <th>Stock</th>
                  </tr>
                </thead>
                <tbody>
                  {state.materials.map((m) => (
                    <tr key={m.id}>
                      <td>{m.name}</td>
                      <td>{money(m.cost)}</td>
                      <td>
                        <input
                          className="stock-input"
                          type="number"
                          min={0}
                          value={m.stock}
                          onChange={(e) =>
                            setMaterialStock(m.id, Number(e.target.value) || 0)
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
              <h3>Finished products</h3>
              <span className="muted">Crafted items + resale goods</span>
            </header>
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Cost</th>
                    <th>Sale price</th>
                    <th>Stock</th>
                  </tr>
                </thead>
                <tbody>
                  {state.products.map((p) => (
                    <tr key={p.id}>
                      <td>
                        {p.name}
                        {p.recipeId ? (
                          <span className="note-tag"> craftable</span>
                        ) : null}
                      </td>
                      <td>{money(p.cost)}</td>
                      <td>{p.salePrice ? money(p.salePrice) : '—'}</td>
                      <td>
                        <input
                          className="stock-input"
                          type="number"
                          min={0}
                          value={p.stock}
                          onChange={(e) =>
                            setProductStock(p.id, Number(e.target.value) || 0)
                          }
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  )
}
