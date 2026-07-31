import type { StoreApi } from '../hooks/useStore'
import { money } from '../lib/utils'

export function Inventory({ store }: { store: StoreApi }) {
  const { state, setMaterialStock, setProductStock } = store

  return (
    <div className="stack">
      <section className="panel">
        <header className="panel-head">
          <h3>Materials</h3>
          <span className="muted">Update after store buys / crafts</span>
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
    </div>
  )
}
