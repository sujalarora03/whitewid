import { useMemo, useState } from 'react'
import { Calculator, ShoppingCart, Send } from 'lucide-react'
import type { StoreApi } from '../hooks/useStore'
import { recipeUnitCost } from '../data/seed'
import { craftRestockEmbed, postToDiscord } from '../lib/discord'
import { money } from '../lib/utils'

export function CraftCalc({ store }: { store: StoreApi }) {
  const { state, craft } = store
  const [recipeId, setRecipeId] = useState(state.recipes[0]?.id ?? '')
  const [qty, setQty] = useState(1)
  const [discordMsg, setDiscordMsg] = useState<string | null>(null)

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
  const canCraft =
    !!recipe && qty > 0 && breakdown.every((b) => b.short === 0)

  const shoppingList = breakdown.filter((b) => b.short > 0)
  const shopTotal = shoppingList.reduce((sum, b) => {
    const mat = state.materials.find((m) => m.id === b.materialId)
    return sum + (mat?.cost ?? 0) * b.short
  }, 0)

  return (
    <div className="stack">
      <section className="panel">
        <header className="panel-head">
          <h3>
            <Calculator size={16} /> Material calculator
          </h3>
        </header>
        <p className="muted panel-intro">
          Pick a craft recipe and batch size. See exact materials, cost, and
          what you still need to buy.
        </p>

        <div className="form-row">
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
        </div>

        {recipe && (
          <>
            <div className="cost-banner">
              <div>
                <span className="muted">Unit cost</span>
                <strong>{money(unitCost)}</strong>
              </div>
              <div>
                <span className="muted">Batch cost ({qty}×)</span>
                <strong>{money(totalCost)}</strong>
              </div>
            </div>

            <table className="data-table">
              <thead>
                <tr>
                  <th>Material</th>
                  <th>Per craft</th>
                  <th>Needed</th>
                  <th>In stock</th>
                  <th>Buy</th>
                  <th>Cost</th>
                </tr>
              </thead>
              <tbody>
                {breakdown.map((b) => (
                  <tr key={b.materialId} className={b.short ? 'warn-row' : ''}>
                    <td>{b.name}</td>
                    <td>{b.perUnit}</td>
                    <td>{b.need}</td>
                    <td>{b.stock}</td>
                    <td>{b.short || '—'}</td>
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
                onClick={() => craft(recipe.id, qty)}
              >
                Craft {qty}× {recipe.name}
              </button>
              {!canCraft && (
                <span className="muted">
                  Update stock or buy missing materials first.
                </span>
              )}
            </div>
          </>
        )}
      </section>

      {shoppingList.length > 0 && (
        <section className="panel">
          <header className="panel-head">
            <h3>
              <ShoppingCart size={16} /> Restock list
            </h3>
          </header>
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
            {discordMsg && <span className="muted">{discordMsg}</span>}
          </div>
        </section>
      )}

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
