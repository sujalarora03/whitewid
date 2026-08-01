import { useMemo, useState } from 'react'
import { Calculator, ShoppingCart, Send, Trash2 } from 'lucide-react'
import type { StoreApi } from '../hooks/useStore'
import { recipeUnitCost } from '../data/seed'
import {
  craftLogEmbed,
  craftRestockEmbed,
  postToDiscord,
} from '../lib/discord'
import { formatDate, money } from '../lib/utils'

export function CraftCalc({
  store,
  lockedEmployeeId,
}: {
  store: StoreApi
  lockedEmployeeId?: string
}) {
  const { state, craft, removeCraftLog } = store
  const activeEmps = state.employees.filter((e) => e.active)
  const [recipeId, setRecipeId] = useState(state.recipes[0]?.id ?? '')
  const [employeeId, setEmployeeId] = useState(
    lockedEmployeeId || activeEmps[0]?.id || '',
  )
  const [qty, setQty] = useState(1)
  const [note, setNote] = useState('')
  const [deductStock, setDeductStock] = useState(true)
  const [discordMsg, setDiscordMsg] = useState<string | null>(null)

  const effectiveEmployeeId = lockedEmployeeId || employeeId

  const recipe = state.recipes.find((r) => r.id === recipeId)

  const breakdown = useMemo(() => {
    if (!recipe) return []
    return recipe.ingredients.map((ing) => {
      const mat = state.materials.find((m) => m.id === ing.materialId)
      const need = ing.qty * qty
      return {
        materialId: ing.materialId,
        name: mat?.name ?? 'Unknown',
        perUnit: ing.qty,
        need,
        cost: (mat?.cost ?? 0) * need,
        stock: mat?.stock ?? 0,
        short: Math.max(0, need - (mat?.stock ?? 0)),
      }
    })
  }, [recipe, qty, state.materials])

  const unitCost = recipe
    ? recipeUnitCost(recipe.id, state.materials, state.recipes)
    : 0
  const totalCost = unitCost * qty
  const stockOk = !deductStock || breakdown.every((b) => b.short === 0)
  const canCraft = !!recipe && !!effectiveEmployeeId && qty > 0 && stockOk

  const shoppingList = breakdown.filter((b) => b.short > 0)
  const shopTotal = shoppingList.reduce((sum, b) => {
    const mat = state.materials.find((m) => m.id === b.materialId)
    return sum + (mat?.cost ?? 0) * b.short
  }, 0)

  async function doCraft() {
    if (!recipe || !effectiveEmployeeId) return
    const emp = state.employees.find((e) => e.id === effectiveEmployeeId)
    craft(recipe.id, qty, effectiveEmployeeId, {
      note: note || undefined,
      deductStock,
    })

    if (
      state.settings.discordPostCrafts &&
      state.settings.discordWebhookUrl.trim() &&
      emp
    ) {
      const result = await postToDiscord(
        state.settings.discordWebhookUrl,
        craftLogEmbed({
          businessName: state.settings.businessName,
          employeeName: emp.name,
          recipeName: recipe.name,
          qty,
          totalCost,
        }),
      )
      setDiscordMsg(
        result.ok ? 'Craft logged + posted to Discord' : `Discord: ${result.error}`,
      )
    } else {
      setDiscordMsg(
        deductStock
          ? 'Craft logged — used business materials (not a purchase)'
          : 'Craft logged — no stock deducted',
      )
    }
    setNote('')
  }

  return (
    <div className="stack">
      <section className="panel">
        <header className="panel-head">
          <h3>
            <Calculator size={16} /> Log a craft
          </h3>
        </header>
        <p className="muted panel-intro">
          Crafting only records who produced the item. It does{' '}
          <strong>not</strong> mean they bought the materials — log store buys
          under <strong>Stock</strong> separately.
        </p>

        <div className="form-row">
          <label className="field grow">
            <span>Who crafted</span>
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
            <span>Recipe</span>
            <select
              value={recipeId}
              onChange={(e) => setRecipeId(e.target.value)}
            >
              {state.recipes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Quantity</span>
            <input
              type="number"
              min={1}
              value={qty}
              onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
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

        <label className="check-field">
          <input
            type="checkbox"
            checked={deductStock}
            onChange={(e) => setDeductStock(e.target.checked)}
          />
          Deduct from business material stock
          <span className="note-tag">
            {' '}
            (off = mats already handled / not from shared stock)
          </span>
        </label>

        {recipe && (
          <>
            <div className="cost-banner">
              <div>
                <span className="muted">Recipe cost (reference)</span>
                <strong>{money(unitCost)}</strong>
              </div>
              <div>
                <span className="muted">Batch reference ({qty}×)</span>
                <strong>{money(totalCost)}</strong>
              </div>
            </div>

            <table className="data-table">
              <thead>
                <tr>
                  <th>Material</th>
                  <th>Per craft</th>
                  <th>Needed</th>
                  <th>Business stock</th>
                  <th>Short</th>
                  <th>Ref. cost</th>
                </tr>
              </thead>
              <tbody>
                {breakdown.map((b) => (
                  <tr
                    key={b.materialId}
                    className={deductStock && b.short ? 'warn-row' : ''}
                  >
                    <td>{b.name}</td>
                    <td>{b.perUnit}</td>
                    <td>{b.need}</td>
                    <td>{b.stock}</td>
                    <td>{deductStock ? b.short || '—' : '—'}</td>
                    <td>{money(b.cost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="actions">
              <button
                type="button"
                className="btn primary"
                disabled={!canCraft}
                onClick={() => void doCraft()}
              >
                Log craft {qty}× {recipe.name}
              </button>
              {!canCraft && (
                <span className="muted">
                  {!effectiveEmployeeId
                    ? 'Pick who crafted.'
                    : 'Business stock is short — buy mats under Stock, or uncheck deduct.'}
                </span>
              )}
              {discordMsg && <span className="muted">{discordMsg}</span>}
            </div>
          </>
        )}
      </section>

      {deductStock && shoppingList.length > 0 && (
        <section className="panel">
          <header className="panel-head">
            <h3>
              <ShoppingCart size={16} /> Materials short
            </h3>
          </header>
          <p className="muted panel-intro">
            Someone needs to buy these for the business (Stock → Material
            purchase) — not automatically tied to the crafter.
          </p>
          <ul className="rank-list">
            {shoppingList.map((b) => (
              <li key={b.materialId}>
                <span className="grow">
                  {b.short}× {b.name}
                </span>
                <span>
                  {money(
                    (state.materials.find((m) => m.id === b.materialId)?.cost ??
                      0) * b.short,
                  )}
                </span>
              </li>
            ))}
          </ul>
          <p className="shop-total">
            Store buy total: <strong>{money(shopTotal)}</strong>
          </p>
          <div className="actions">
            <button
              type="button"
              className="btn discord"
              disabled={!state.settings.discordWebhookUrl.trim()}
              onClick={() => {
                void (async () => {
                  if (!recipe) return
                  const result = await postToDiscord(
                    state.settings.discordWebhookUrl,
                    craftRestockEmbed({
                      businessName: state.settings.businessName,
                      recipeName: recipe.name,
                      qty,
                      lines: shoppingList.map((b) => ({
                        name: b.name,
                        short: b.short,
                        cost:
                          (state.materials.find((m) => m.id === b.materialId)
                            ?.cost ?? 0) * b.short,
                      })),
                      shopTotal,
                    }),
                  )
                  setDiscordMsg(
                    result.ok
                      ? 'Restock list posted to Discord'
                      : `Discord: ${result.error}`,
                  )
                })()
              }}
            >
              <Send size={16} /> Post restock to Discord
            </button>
          </div>
        </section>
      )}

      <section className="panel">
        <header className="panel-head">
          <h3>Craft history</h3>
          <span className="muted">Production only — not material buys</span>
        </header>
        {state.craftLogs.length === 0 ? (
          <p className="empty">No crafts logged yet.</p>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Who crafted</th>
                  <th>Item</th>
                  <th>Qty</th>
                  <th>Stock</th>
                  <th>Ref. cost</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {state.craftLogs.slice(0, 40).map((c) => {
                  const emp = state.employees.find((e) => e.id === c.employeeId)
                  return (
                    <tr key={c.id}>
                      <td>{formatDate(c.createdAt)}</td>
                      <td>{emp?.name ?? '—'}</td>
                      <td>
                        {c.recipeName}
                        {c.note ? (
                          <span className="note-tag"> · {c.note}</span>
                        ) : null}
                      </td>
                      <td>{c.qty}</td>
                      <td>
                        {c.deductedStock !== false ? (
                          <span className="note-tag">deducted</span>
                        ) : (
                          <span className="note-tag">no deduct</span>
                        )}
                      </td>
                      <td>{money(c.totalCost)}</td>
                      <td>
                        <button
                          type="button"
                          className="icon-btn"
                          aria-label="Delete craft log"
                          onClick={() => removeCraftLog(c.id)}
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

      <section className="panel">
        <header className="panel-head">
          <h3>Recipe book</h3>
        </header>
        <div className="recipe-grid">
          {state.recipes.map((r) => {
            const cost = recipeUnitCost(r.id, state.materials, state.recipes)
            return (
              <button
                key={r.id}
                type="button"
                className={`recipe-card ${recipeId === r.id ? 'active' : ''}`}
                onClick={() => setRecipeId(r.id)}
              >
                <strong>{r.name}</strong>
                <ul>
                  {r.ingredients.map((ing) => {
                    const mat = state.materials.find(
                      (m) => m.id === ing.materialId,
                    )
                    return (
                      <li key={ing.materialId}>
                        {ing.qty}× {mat?.name}
                      </li>
                    )
                  })}
                </ul>
                <span className="recipe-cost">{money(cost)} / craft</span>
              </button>
            )
          })}
        </div>
      </section>
    </div>
  )
}
