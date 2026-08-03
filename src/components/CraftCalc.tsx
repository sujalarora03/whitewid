import { useMemo, useState } from 'react'
import { Calculator, ShoppingCart, Send, Trash2, UserRound } from 'lucide-react'
import type { StoreApi } from '../hooks/useStore'
import { recipeUnitCost } from '../data/seed'
import {
  craftLogEmbed,
  craftRestockEmbed,
  postToDiscord,
  resourcesWebhookUrl,
} from '../lib/discord'
import { canDeleteRecord, type ActorCtx } from '../lib/permissions'
import { formatDate, money } from '../lib/utils'

export function CraftCalc({
  store,
  lockedEmployeeId,
  mode = 'business',
  actor,
}: {
  store: StoreApi
  lockedEmployeeId?: string
  /** business = shop production; personal = craft for yourself */
  mode?: 'business' | 'personal'
  actor: ActorCtx
}) {
  const personal = mode === 'personal'
  const { state, craft, removeCraftLog } = store
  const activeEmps = state.employees.filter((e) => e.active)
  const [recipeId, setRecipeId] = useState(state.recipes[0]?.id ?? '')
  const [employeeId, setEmployeeId] = useState(
    lockedEmployeeId || activeEmps[0]?.id || '',
  )
  const [qty, setQty] = useState(1)
  const [note, setNote] = useState('')
  const [deductStock, setDeductStock] = useState(!personal)
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
  const materialsShort =
    deductStock && breakdown.some((b) => b.short > 0)
  // When deducting mats, require enough business stock before logging.
  const canCraft =
    !!recipe &&
    !!effectiveEmployeeId &&
    qty > 0 &&
    (!deductStock || !materialsShort)

  const shoppingList = personal
    ? breakdown.map((b) => ({ ...b, short: b.need }))
    : breakdown.filter((b) => b.short > 0)
  const shopTotal = shoppingList.reduce((sum, b) => {
    const mat = state.materials.find((m) => m.id === b.materialId)
    const units = personal ? b.need : b.short
    return sum + (mat?.cost ?? 0) * units
  }, 0)

  const history = state.craftLogs.filter((c) =>
    personal
      ? c.purpose === 'personal'
      : (c.purpose ?? 'business') === 'business',
  )

  async function doCraft() {
    if (!recipe || !effectiveEmployeeId) return
    const emp = state.employees.find((e) => e.id === effectiveEmployeeId)
    craft(recipe.id, qty, effectiveEmployeeId, {
      note: note || undefined,
      deductStock,
      purpose: personal ? 'personal' : 'business',
    })

    const stockSummary = personal
      ? deductStock
        ? 'Personal craft logged — business mats reduced; finished stock unchanged'
        : 'Personal craft logged — no stock changes'
      : deductStock
        ? `Craft logged — mats deducted · finished stock +${qty}× ${recipe.name}`
        : `Craft logged — finished stock +${qty}× ${recipe.name} (mats not deducted)`

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
          personal,
        }),
      )
      setDiscordMsg(
        result.ok ? `${stockSummary} · Discord ok` : `${stockSummary} · Discord: ${result.error}`,
      )
    } else {
      setDiscordMsg(stockSummary)
    }
    setNote('')
  }

  return (
    <div className="stack">
      <section className="panel">
        <header className="panel-head">
          <h3>
            {personal ? <UserRound size={16} /> : <Calculator size={16} />}{' '}
            {personal ? 'Personal requirements' : 'Log a craft'}
          </h3>
        </header>
        <p className="muted panel-intro">
          {personal ? (
            <>
              Calculate what <strong>you</strong> need to craft for yourself.
              Logging a personal craft does <strong>not</strong> add finished
              stock to the business and does <strong>not</strong> count as a
              sale or commission.
            </>
          ) : (
            <>
              Crafting only records who produced the item. It does{' '}
              <strong>not</strong> mean they bought the materials — log store
              buys under <strong>Stock</strong> separately.
            </>
          )}
        </p>

        <div className="form-row">
          <label className="field grow">
            <span>{personal ? 'Who' : 'Who crafted'}</span>
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
              placeholder={personal ? 'e.g. for myself' : 'Optional'}
            />
          </label>
        </div>

        <label className="check-field">
          <input
            type="checkbox"
            checked={deductStock}
            onChange={(e) => setDeductStock(e.target.checked)}
          />
          {personal
            ? 'Took materials from business stock'
            : 'Deduct from business material stock'}
          <span className="note-tag">
            {' '}
            {personal
              ? '(off = you bought / used your own mats)'
              : '(off = mats already handled / not from shared stock)'}
          </span>
        </label>

        {recipe && (
          <>
            <div className="cost-banner">
              <div>
                <span className="muted">
                  {personal ? 'Your cost (reference)' : 'Recipe cost (reference)'}
                </span>
                <strong>{money(unitCost)}</strong>
              </div>
              <div>
                <span className="muted">
                  {personal ? `Batch for you (${qty}×)` : `Batch reference (${qty}×)`}
                </span>
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
                  <th>{personal ? 'You need' : 'Short'}</th>
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
                    <td>{personal ? b.need : deductStock ? b.short || '—' : '—'}</td>
                    <td>{money(b.cost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {materialsShort && (
              <p className="muted panel-intro">
                Not enough materials in business stock for this batch. Lower the
                quantity, turn off deduct (if mats were handled outside the
                app), or restock under <strong>Stock</strong> / request
                resources on Discord.
              </p>
            )}

            <div className="actions">
              <button
                type="button"
                className="btn primary"
                disabled={!canCraft}
                onClick={() => void doCraft()}
              >
                {personal
                  ? `Log personal craft ${qty}× ${recipe.name}`
                  : `Log craft ${qty}× ${recipe.name}`}
              </button>
              {!canCraft && (
                <span className="muted">
                  {!effectiveEmployeeId
                    ? 'Pick who crafted.'
                    : materialsShort
                      ? 'Need more materials (or turn off deduct).'
                      : 'Cannot log yet.'}
                </span>
              )}
              {discordMsg && <span className="muted">{discordMsg}</span>}
            </div>
          </>
        )}
      </section>

      {shoppingList.length > 0 && (
        <section className="panel">
          <header className="panel-head">
            <h3>
              <ShoppingCart size={16} />{' '}
              {personal ? 'Your material list' : 'Materials short'}
            </h3>
          </header>
          <p className="muted panel-intro">
            {personal
              ? 'Buy these yourself for a personal craft (not a business Stock purchase unless you choose to use shared mats).'
              : 'Someone needs to buy these for the business (Stock → Material purchase) — not automatically tied to the crafter.'}
          </p>
          <ul className="rank-list">
            {shoppingList.map((b) => (
              <li key={b.materialId}>
                <span className="grow">
                  {(personal ? b.need : b.short)}× {b.name}
                </span>
                <span>
                  {money(
                    (state.materials.find((m) => m.id === b.materialId)?.cost ??
                      0) * (personal ? b.need : b.short),
                  )}
                </span>
              </li>
            ))}
          </ul>
          <p className="shop-total">
            {personal ? 'Personal buy total' : 'Store buy total'}:{' '}
            <strong>{money(shopTotal)}</strong>
          </p>
          {!personal && (
            <div className="actions">
              <button
                type="button"
                className="btn discord"
                disabled={!resourcesWebhookUrl(state.settings)}
                onClick={() => {
                  void (async () => {
                    if (!recipe) return
                    const webhook = resourcesWebhookUrl(state.settings)
                    const result = await postToDiscord(
                      webhook,
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
                        ? 'Restock request posted to resources channel'
                        : `Discord: ${result.error}`,
                    )
                  })()
                }}
              >
                <Send size={16} /> Request resources on Discord
              </button>
            </div>
          )}
        </section>
      )}

      <section className="panel">
        <header className="panel-head">
          <h3>{personal ? 'Personal craft history' : 'Craft history'}</h3>
          <span className="muted">
            {personal
              ? 'Kept by crafter — not business stock'
              : 'Production only — not material buys'}
          </span>
        </header>
        {history.length === 0 ? (
          <p className="empty">
            {personal ? 'No personal crafts logged yet.' : 'No crafts logged yet.'}
          </p>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Who</th>
                  <th>Item</th>
                  <th>Qty</th>
                  <th>Stock</th>
                  <th>Ref. cost</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {history.slice(0, 40).map((c) => {
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
                          <span className="note-tag">
                            {personal ? 'used business mats' : 'deducted'}
                          </span>
                        ) : (
                          <span className="note-tag">
                            {personal ? 'own mats' : 'no deduct'}
                          </span>
                        )}
                      </td>
                      <td>{money(c.totalCost)}</td>
                      <td>
                        {canDeleteRecord(actor, c.employeeId) ? (
                          <button
                            type="button"
                            className="icon-btn"
                            aria-label="Delete craft log"
                            onClick={() => removeCraftLog(c.id, actor)}
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
