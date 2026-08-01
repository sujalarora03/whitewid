import { useMemo, useState } from 'react'
import { ClipboardList, Trash2 } from 'lucide-react'
import type { StoreApi } from '../hooks/useStore'
import type { OrderStatus, PendingOrder } from '../types'
import { formatDate, money } from '../lib/utils'

const STATUS_LABEL: Record<OrderStatus, string> = {
  open: 'Open',
  crafting: 'Crafting',
  ready: 'Ready to sell',
  fulfilled: 'Fulfilled',
  cancelled: 'Cancelled',
}

const ACTIVE: OrderStatus[] = ['open', 'crafting', 'ready']

function empName(
  employees: { id: string; name: string }[],
  id?: string,
): string {
  if (!id) return '—'
  return employees.find((e) => e.id === id)?.name ?? '—'
}

export function Orders({
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
    addPendingOrder,
    updatePendingOrder,
    removePendingOrder,
    addStashBuy,
  } = store
  const activeEmps = state.employees.filter((e) => e.active)
  const [customerName, setCustomerName] = useState('')
  const [productId, setProductId] = useState(state.products[0]?.id ?? '')
  const [qty, setQty] = useState(1)
  const [amount, setAmount] = useState(
    state.products[0]?.salePrice || state.products[0]?.cost || 0,
  )
  const [crafterId, setCrafterId] = useState('')
  const [sellerId, setSellerId] = useState(lockedEmployeeId || '')
  const [note, setNote] = useState('')
  const [msg, setMsg] = useState<string | null>(null)

  const createdById = lockedEmployeeId || activeEmps[0]?.id || ''

  const openOrders = useMemo(
    () =>
      state.pendingOrders.filter((o) =>
        ACTIVE.includes(o.status),
      ),
    [state.pendingOrders],
  )
  const doneOrders = useMemo(
    () =>
      state.pendingOrders.filter(
        (o) => o.status === 'fulfilled' || o.status === 'cancelled',
      ),
    [state.pendingOrders],
  )

  function onProductChange(id: string) {
    setProductId(id)
    const p = state.products.find((x) => x.id === id)
    if (p) setAmount((p.salePrice || p.cost || 0) * qty)
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!createdById || !productId || qty < 1) return
    addPendingOrder({
      customerName,
      productId,
      qty,
      amount,
      createdById,
      crafterId: crafterId || undefined,
      sellerId: sellerId || lockedEmployeeId || undefined,
      note: note || undefined,
    })
    setMsg('Order added to pending queue')
    setCustomerName('')
    setNote('')
    setQty(1)
  }

  function fulfillAsStash(order: PendingOrder) {
    const seller = order.sellerId || lockedEmployeeId || order.createdById
    const product = state.products.find((p) => p.id === order.productId)
    if (!seller || !product) return
    if (
      !confirm(
        `Fulfill order for ${order.customerName}: log a pending stash sale for seller ${empName(state.employees, seller)}? (Crafts stay on the Craft tab — owner clears stash for commission.)`,
      )
    ) {
      return
    }
    addStashBuy({
      employeeId: seller,
      buyerName: order.customerName,
      productId: order.productId,
      qty: order.qty,
      amount: order.amount,
      note: order.note,
      orderId: order.id,
      craftedThenSold: false,
      deductMaterials: false,
    })
    setMsg('Order fulfilled → pending sale logged (owner clears for commission)')
  }

  return (
    <div className="stack">
      <section className="panel">
        <header className="panel-head">
          <h3>
            <ClipboardList size={16} /> New pending order
          </h3>
        </header>
        <p className="muted panel-intro">
          Customer wants something later. Assign a <strong>crafter</strong>{' '}
          and/or <strong>seller</strong>, track status, then fulfill into a
          stash sale when ready.
        </p>
        <form className="form-stack" onSubmit={submit}>
          <div className="form-row">
            <label className="field grow">
              <span>Customer</span>
              <input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Character / buyer name"
                required
              />
            </label>
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
              <span>Quoted total</span>
              <input
                type="number"
                min={0}
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value) || 0)}
              />
            </label>
          </div>
          <div className="form-row">
            <label className="field grow">
              <span>Assign crafter</span>
              <select
                value={crafterId}
                onChange={(e) => setCrafterId(e.target.value)}
              >
                <option value="">Unassigned</option>
                {activeEmps.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field grow">
              <span>Assign seller</span>
              <select
                value={sellerId}
                onChange={(e) => setSellerId(e.target.value)}
              >
                <option value="">Unassigned</option>
                {activeEmps.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field grow">
              <span>Note</span>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Optional details"
              />
            </label>
          </div>
          <div className="actions">
            <button type="submit" className="btn primary" disabled={!createdById}>
              Add pending order
            </button>
            {msg && <span className="muted">{msg}</span>}
          </div>
        </form>
      </section>

      <section className="panel">
        <header className="panel-head">
          <h3>Open orders</h3>
          <span className="muted">{openOrders.length} active</span>
        </header>
        {openOrders.length === 0 ? (
          <p className="empty">No pending orders.</p>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Customer</th>
                  <th>Item</th>
                  <th>Quote</th>
                  <th>Crafter</th>
                  <th>Seller</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {openOrders.map((o) => (
                  <tr key={o.id} className="warn-row">
                    <td>{formatDate(o.createdAt)}</td>
                    <td>
                      {o.customerName}
                      {o.note ? (
                        <span className="note-tag"> · {o.note}</span>
                      ) : null}
                    </td>
                    <td>
                      {o.qty}× {o.productName}
                    </td>
                    <td>{money(o.amount)}</td>
                    <td>
                      <select
                        value={o.crafterId ?? ''}
                        onChange={(e) =>
                          updatePendingOrder(o.id, {
                            crafterId: e.target.value || undefined,
                          })
                        }
                      >
                        <option value="">Unassigned</option>
                        {activeEmps.map((e) => (
                          <option key={e.id} value={e.id}>
                            {e.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <select
                        value={o.sellerId ?? ''}
                        onChange={(e) =>
                          updatePendingOrder(o.id, {
                            sellerId: e.target.value || undefined,
                          })
                        }
                      >
                        <option value="">Unassigned</option>
                        {activeEmps.map((e) => (
                          <option key={e.id} value={e.id}>
                            {e.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <select
                        value={o.status}
                        onChange={(e) =>
                          updatePendingOrder(o.id, {
                            status: e.target.value as OrderStatus,
                          })
                        }
                      >
                        {ACTIVE.map((s) => (
                          <option key={s} value={s}>
                            {STATUS_LABEL[s]}
                          </option>
                        ))}
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </td>
                    <td className="row-actions">
                      <button
                        type="button"
                        className="btn primary sm"
                        onClick={() => fulfillAsStash(o)}
                      >
                        Fulfill → stash
                      </button>
                      {!employeeMode && (
                        <button
                          type="button"
                          className="icon-btn"
                          aria-label="Delete"
                          onClick={() => {
                            if (confirm('Delete this order?'))
                              removePendingOrder(o.id)
                          }}
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="panel">
        <header className="panel-head">
          <h3>Fulfilled / cancelled</h3>
        </header>
        {doneOrders.length === 0 ? (
          <p className="empty">Nothing completed yet.</p>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Customer</th>
                  <th>Item</th>
                  <th>Crafter</th>
                  <th>Seller</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {doneOrders.slice(0, 40).map((o) => (
                  <tr key={o.id}>
                    <td>{formatDate(o.fulfilledAt || o.updatedAt)}</td>
                    <td>{o.customerName}</td>
                    <td>
                      {o.qty}× {o.productName}
                    </td>
                    <td>{empName(state.employees, o.crafterId)}</td>
                    <td>{empName(state.employees, o.sellerId)}</td>
                    <td>
                      <span className="note-tag">{STATUS_LABEL[o.status]}</span>
                    </td>
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
