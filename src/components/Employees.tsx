import { useState } from 'react'
import { Gift, UserPlus, Trash2 } from 'lucide-react'
import type { StoreApi } from '../hooks/useStore'
import { buildWeekReport } from '../lib/stats'
import { bonusEmbed, postToDiscord } from '../lib/discord'
import { formatDate, money, pct } from '../lib/utils'

export function Employees({ store }: { store: StoreApi }) {
  const {
    state,
    addEmployee,
    toggleEmployee,
    removeEmployee,
    addBonus,
    removeBonus,
  } = store
  const [name, setName] = useState('')
  const [bonusEmp, setBonusEmp] = useState(state.employees[0]?.id ?? '')
  const [bonusAmt, setBonusAmt] = useState(0)
  const [bonusReason, setBonusReason] = useState('')
  const [discordMsg, setDiscordMsg] = useState<string | null>(null)
  const report = buildWeekReport(state)
  const rate = state.settings.commissionRate

  function onAddEmp(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    addEmployee(name)
    setName('')
  }

  async function onBonus(e: React.FormEvent) {
    e.preventDefault()
    if (!bonusEmp || bonusAmt <= 0) return
    const emp = state.employees.find((x) => x.id === bonusEmp)
    addBonus(bonusEmp, bonusAmt, bonusReason)

    if (
      state.settings.discordPostBonuses &&
      state.settings.discordWebhookUrl.trim() &&
      emp
    ) {
      const result = await postToDiscord(
        state.settings.discordWebhookUrl,
        bonusEmbed({
          businessName: state.settings.businessName,
          employeeName: emp.name,
          amount: bonusAmt,
          reason: bonusReason || 'Bonus',
        }),
      )
      setDiscordMsg(
        result.ok ? 'Bonus posted to Discord' : `Discord: ${result.error}`,
      )
    } else {
      setDiscordMsg(null)
    }

    setBonusAmt(0)
    setBonusReason('')
  }

  return (
    <div className="stack">
      <section className="panel">
        <header className="panel-head">
          <h3>
            <UserPlus size={16} /> Add employee
          </h3>
        </header>
        <form className="form-row" onSubmit={onAddEmp}>
          <label className="field grow">
            <span>Name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sergio Rodriguez"
              required
            />
          </label>
          <button type="submit" className="btn primary align-end">
            Add
          </button>
        </form>
      </section>

      <section className="panel">
        <header className="panel-head">
          <h3>Crew · this week</h3>
          <span className="muted">Commission {pct(rate)} of profit</span>
        </header>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Sales</th>
                <th>Revenue</th>
                <th>Profit</th>
                <th>Commission</th>
                <th>Bonuses</th>
                <th>Payout</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {report.employees.map((e) => {
                const emp = state.employees.find((x) => x.id === e.employeeId)
                return (
                  <tr
                    key={e.employeeId}
                    className={emp && !emp.active ? 'dim' : ''}
                  >
                    <td>
                      {e.name}
                      {emp && !emp.active ? (
                        <span className="note-tag"> inactive</span>
                      ) : null}
                    </td>
                    <td>{e.salesCount}</td>
                    <td>{money(e.revenue)}</td>
                    <td>{money(e.profit)}</td>
                    <td>{money(e.commission)}</td>
                    <td>{money(e.bonuses)}</td>
                    <td>
                      <strong>{money(e.payout)}</strong>
                    </td>
                    <td className="row-actions">
                      <button
                        type="button"
                        className="btn ghost sm"
                        onClick={() => toggleEmployee(e.employeeId)}
                      >
                        {emp?.active ? 'Disable' : 'Enable'}
                      </button>
                      <button
                        type="button"
                        className="icon-btn"
                        aria-label="Remove"
                        onClick={() => {
                          if (confirm(`Remove ${e.name}?`)) {
                            removeEmployee(e.employeeId)
                          }
                        }}
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
      </section>

      <section className="panel">
        <header className="panel-head">
          <h3>
            <Gift size={16} /> Give a bonus
          </h3>
        </header>
        <form className="form-stack" onSubmit={(e) => void onBonus(e)}>
          <div className="form-row">
            <label className="field grow">
              <span>Employee</span>
              <select
                value={bonusEmp}
                onChange={(e) => setBonusEmp(e.target.value)}
              >
                {state.employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Amount</span>
              <input
                type="number"
                min={1}
                value={bonusAmt || ''}
                onChange={(e) => setBonusAmt(Number(e.target.value) || 0)}
                required
              />
            </label>
            <label className="field grow">
              <span>Reason</span>
              <input
                value={bonusReason}
                onChange={(e) => setBonusReason(e.target.value)}
                placeholder="Top seller, overtime…"
              />
            </label>
          </div>
          <div className="actions">
            <button type="submit" className="btn primary">
              Add bonus
            </button>
            {discordMsg && <span className="muted">{discordMsg}</span>}
          </div>
        </form>

        {state.bonuses.length > 0 && (
          <ul className="rank-list spaced">
            {state.bonuses.slice(0, 20).map((b) => {
              const emp = state.employees.find((e) => e.id === b.employeeId)
              return (
                <li key={b.id}>
                  <span className="grow">
                    {emp?.name ?? '—'} · {b.reason}
                    <span className="note-tag"> · {formatDate(b.createdAt)}</span>
                  </span>
                  <span>{money(b.amount)}</span>
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label="Remove bonus"
                    onClick={() => removeBonus(b.id)}
                  >
                    <Trash2 size={16} />
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
