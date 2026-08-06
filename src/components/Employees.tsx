import { useState } from 'react'
import {
  Gift,
  UserPlus,
  Trash2,
  KeyRound,
  ChevronUp,
  ChevronDown,
  Users,
} from 'lucide-react'
import type { StoreApi } from '../hooks/useStore'
import { buildWeekReport } from '../lib/stats'
import { bonusEmbed, postToDiscord } from '../lib/discord'
import { EMPLOYEE_GRADES, demoteGrade, promoteGrade } from '../lib/grades'
import type { ActorCtx } from '../lib/permissions'
import { formatDate, money, pct } from '../lib/utils'

export function Employees({
  store,
  actor,
}: {
  store: StoreApi
  actor: ActorCtx
}) {
  const {
    state,
    addEmployee,
    setEmployeePassword,
    setEmployeeGrade,
    seedCrewRoster,
    toggleEmployee,
    removeEmployee,
    addBonus,
    removeBonus,
  } = store
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [grade, setGrade] = useState<string>('Junior Seller')
  const [bonusEmp, setBonusEmp] = useState(state.employees[0]?.id ?? '')
  const [bonusAmt, setBonusAmt] = useState(0)
  const [bonusReason, setBonusReason] = useState('')
  const [discordMsg, setDiscordMsg] = useState<string | null>(null)
  const [pwEdits, setPwEdits] = useState<Record<string, string>>({})
  const report = buildWeekReport(state)
  const rate = state.settings.commissionRate

  function onAddEmp(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !password.trim()) return
    addEmployee(name, password, grade)
    setName('')
    setPassword('')
    setGrade('Junior Seller')
  }

  async function onBonus(e: React.FormEvent) {
    e.preventDefault()
    if (!bonusEmp || bonusAmt <= 0) return
    const emp = state.employees.find((x) => x.id === bonusEmp)
    addBonus(bonusEmp, bonusAmt, bonusReason, actor)

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
            <Users size={16} /> White Widow roster
          </h3>
          <span className="muted">{state.employees.length} employees</span>
        </header>
        <p className="muted panel-intro">
          Load the full crew (grades + passwords) and set owner password to{' '}
          <code>sujal@3301</code>.
        </p>
        <button
          type="button"
          className="btn primary"
          onClick={() => {
            if (
              confirm(
                'Replace all employee accounts with the White Widow roster and set owner password to sujal@3301?',
              )
            ) {
              seedCrewRoster()
            }
          }}
        >
          Load / reset crew roster
        </button>
      </section>

      <section className="panel">
        <header className="panel-head">
          <h3>
            <UserPlus size={16} /> Create employee account
          </h3>
        </header>
        <form className="form-stack" onSubmit={onAddEmp}>
          <div className="form-row">
            <label className="field grow">
              <span>Name</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Aaron Shore"
                required
              />
            </label>
            <label className="field grow">
              <span>Password</span>
              <input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="First name / PIN"
                required
              />
            </label>
            <label className="field grow">
              <span>Grade</span>
              <select value={grade} onChange={(e) => setGrade(e.target.value)}>
                {EMPLOYEE_GRADES.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </label>
            <button type="submit" className="btn primary align-end">
              Create account
            </button>
          </div>
        </form>
      </section>

      <section className="panel">
        <header className="panel-head">
          <h3>
            <KeyRound size={16} /> Accounts · grade · passwords
          </h3>
        </header>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Grade</th>
                <th>Promote / Demote</th>
                <th>Password</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {state.employees.map((e) => (
                <tr key={e.id} className={!e.active ? 'dim' : ''}>
                  <td>{e.name}</td>
                  <td>
                    <select
                      value={e.grade || 'Junior Seller'}
                      onChange={(ev) =>
                        setEmployeeGrade(e.id, ev.target.value)
                      }
                    >
                      {EMPLOYEE_GRADES.map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="row-actions">
                    <button
                      type="button"
                      className="btn ghost sm"
                      title="Promote"
                      disabled={
                        (e.grade || 'Junior Seller') ===
                        EMPLOYEE_GRADES[EMPLOYEE_GRADES.length - 1]
                      }
                      onClick={() =>
                        setEmployeeGrade(
                          e.id,
                          promoteGrade(e.grade || 'Junior Seller'),
                        )
                      }
                    >
                      <ChevronUp size={16} /> Promote
                    </button>
                    <button
                      type="button"
                      className="btn ghost sm"
                      title="Demote"
                      disabled={
                        (e.grade || 'Junior Seller') === EMPLOYEE_GRADES[0]
                      }
                      onClick={() =>
                        setEmployeeGrade(
                          e.id,
                          demoteGrade(e.grade || 'Junior Seller'),
                        )
                      }
                    >
                      <ChevronDown size={16} /> Demote
                    </button>
                  </td>
                  <td>
                    <div className="form-row">
                      <input
                        className="stock-input"
                        style={{ width: 140 }}
                        type="text"
                        value={pwEdits[e.id] ?? e.password}
                        onChange={(ev) =>
                          setPwEdits((m) => ({
                            ...m,
                            [e.id]: ev.target.value,
                          }))
                        }
                      />
                      <button
                        type="button"
                        className="btn ghost sm"
                        onClick={() => {
                          const next = pwEdits[e.id] ?? e.password
                          setEmployeePassword(e.id, next)
                          setPwEdits((m) => {
                            const copy = { ...m }
                            delete copy[e.id]
                            return copy
                          })
                        }}
                      >
                        Save
                      </button>
                    </div>
                  </td>
                  <td>{e.active ? 'Active' : 'Disabled'}</td>
                  <td className="row-actions">
                    <button
                      type="button"
                      className="btn ghost sm"
                      onClick={() => toggleEmployee(e.id)}
                    >
                      {e.active ? 'Disable' : 'Enable'}
                    </button>
                    <button
                      type="button"
                      className="icon-btn"
                      aria-label="Remove"
                      onClick={() => {
                        if (confirm(`Remove ${e.name}?`))
                          removeEmployee(e.id, actor)
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <header className="panel-head">
          <h3>Crew · this week</h3>
          <span className="muted">Commission {pct(rate)} of sale price</span>
        </header>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Grade</th>
                <th>Crafted</th>
                <th>Sold</th>
                <th>Revenue</th>
                <th>Commission</th>
                <th>Bonuses</th>
                <th>Payout</th>
              </tr>
            </thead>
            <tbody>
              {report.employees.map((e) => {
                const emp = state.employees.find((x) => x.id === e.employeeId)
                return (
                  <tr key={e.employeeId}>
                    <td>{e.name}</td>
                    <td>
                      <span className="note-tag">
                        {emp?.grade ?? 'Junior Seller'}
                      </span>
                    </td>
                    <td>{e.craftUnits}</td>
                    <td>
                      {e.unitsSold}{' '}
                      <span className="note-tag">({e.salesCount})</span>
                    </td>
                    <td>{money(e.revenue)}</td>
                    <td>{money(e.commission)}</td>
                    <td>{money(e.bonuses)}</td>
                    <td>
                      <strong>{money(e.payout)}</strong>
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
                    {e.name} · {e.grade}
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
                    onClick={() => removeBonus(b.id, actor)}
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
