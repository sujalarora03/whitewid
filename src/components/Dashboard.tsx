import { useState } from 'react'
import {
  Trophy,
  TrendingUp,
  Wallet,
  Gift,
  Flame,
  Send,
  FlaskConical,
  Receipt,
} from 'lucide-react'
import type { StoreApi } from '../hooks/useStore'
import { buildWeekReport } from '../lib/stats'
import { postToDiscord, weekReportEmbed } from '../lib/discord'
import { formatWeekLabel, money, pct } from '../lib/utils'

export function Dashboard({ store }: { store: StoreApi }) {
  const { state } = store
  const report = buildWeekReport(state)
  const rate = state.settings.commissionRate
  const [discordMsg, setDiscordMsg] = useState<string | null>(null)

  const activeCrew = report.employees.filter(
    (e) => e.craftUnits > 0 || e.salesCount > 0 || e.bonuses > 0,
  )

  async function postWeekly() {
    const result = await postToDiscord(
      state.settings.discordWebhookUrl,
      weekReportEmbed(state.settings.businessName, report, rate),
    )
    setDiscordMsg(
      result.ok ? 'Weekly report posted' : `Discord: ${result.error}`,
    )
  }

  return (
    <div className="stack">
      <section className="hero-panel">
        <div>
          <p className="eyebrow">Weekly overview</p>
          <h2 className="hero-brand">{state.settings.businessName}</h2>
          <p className="hero-copy">
            {formatWeekLabel(report.start)} · Crafts and sales logged separately ·
            Commission {pct(rate)} of sale profit
          </p>
          <div className="actions" style={{ marginTop: '0.85rem' }}>
            <button
              type="button"
              className="btn discord"
              disabled={!state.settings.discordWebhookUrl.trim()}
              onClick={() => void postWeekly()}
            >
              <Send size={16} /> Post week to Discord
            </button>
            {discordMsg && <span className="muted">{discordMsg}</span>}
          </div>
        </div>
        <div className="hero-stat">
          <span className="muted">Net to business</span>
          <strong>{money(report.netToBusiness)}</strong>
        </div>
      </section>

      <div className="stat-grid">
        <article className="stat-card">
          <Wallet size={18} />
          <span>Revenue</span>
          <strong>{money(report.revenue)}</strong>
        </article>
        <article className="stat-card">
          <TrendingUp size={18} />
          <span>Gross profit</span>
          <strong>{money(report.profit)}</strong>
        </article>
        <article className="stat-card">
          <Trophy size={18} />
          <span>Total commissions</span>
          <strong>{money(report.commission)}</strong>
        </article>
        <article className="stat-card">
          <Gift size={18} />
          <span>Bonuses paid</span>
          <strong>{money(report.bonusTotal)}</strong>
        </article>
        <article className="stat-card">
          <FlaskConical size={18} />
          <span>Units crafted</span>
          <strong>{report.craftUnits}</strong>
        </article>
        <article className="stat-card">
          <Receipt size={18} />
          <span>Units sold</span>
          <strong>
            {report.employees.reduce((s, e) => s + e.unitsSold, 0)}
          </strong>
        </article>
      </div>

      <div className="split">
        <section className="panel">
          <header className="panel-head">
            <h3>
              <FlaskConical size={16} /> Top crafter
            </h3>
          </header>
          {report.topCrafter ? (
            <div className="top-emp">
              <div className="top-emp-badge">
                <FlaskConical size={22} />
              </div>
              <div>
                <p className="top-emp-name">{report.topCrafter.name}</p>
                <p className="muted">
                  {report.topCrafter.craftUnits} units ·{' '}
                  {report.topCrafter.craftCount} craft logs
                  {report.topCrafter.craftsByItem[0]
                    ? ` · top: ${report.topCrafter.craftsByItem[0].recipeName}`
                    : ''}{' '}
                  · business only (personal excluded)
                </p>
              </div>
            </div>
          ) : (
            <p className="empty">No business crafts logged this week.</p>
          )}
          <ul className="rank-list">
            {report.employees
              .filter((e) => e.craftUnits > 0)
              .sort((a, b) => b.craftUnits - a.craftUnits)
              .slice(0, 5)
              .map((e, i) => (
                <li key={e.employeeId}>
                  <span className="rank">#{i + 1}</span>
                  <span className="grow">{e.name}</span>
                  <span>{e.craftUnits} crafted</span>
                </li>
              ))}
          </ul>
        </section>

        <section className="panel">
          <header className="panel-head">
            <h3>
              <Trophy size={16} /> Top seller
            </h3>
          </header>
          {report.topSeller ? (
            <div className="top-emp">
              <div className="top-emp-badge">
                <Trophy size={22} />
              </div>
              <div>
                <p className="top-emp-name">{report.topSeller.name}</p>
                <p className="muted">
                  {report.topSeller.unitsSold} sold ·{' '}
                  {money(report.topSeller.revenue)} revenue ·{' '}
                  {money(report.topSeller.commission)} commission
                </p>
              </div>
            </div>
          ) : (
            <p className="empty">No sales logged this week.</p>
          )}
          <ul className="rank-list">
            {report.employees
              .filter((e) => e.unitsSold > 0)
              .sort((a, b) => b.unitsSold - a.unitsSold || b.revenue - a.revenue)
              .slice(0, 5)
              .map((e, i) => (
                <li key={e.employeeId}>
                  <span className="rank">#{i + 1}</span>
                  <span className="grow">{e.name}</span>
                  <span>
                    {e.unitsSold} sold · {money(e.commission)}
                  </span>
                </li>
              ))}
          </ul>
        </section>
      </div>

      <section className="panel">
        <header className="panel-head">
          <h3>Crew breakdown · this week</h3>
          <span className="muted">Who crafted / sold / earned</span>
        </header>
        {activeCrew.length === 0 ? (
          <p className="empty">
            Log crafts under <strong>Craft</strong> and sells under{' '}
            <strong>Sales</strong> — they show up here.
          </p>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Crafted</th>
                  <th>What they crafted</th>
                  <th>Sold</th>
                  <th>Revenue</th>
                  <th>Commission</th>
                  <th>Bonuses</th>
                  <th>Payout</th>
                </tr>
              </thead>
              <tbody>
                {activeCrew.map((e) => (
                  <tr key={e.employeeId}>
                    <td>{e.name}</td>
                    <td>
                      <strong>{e.craftUnits}</strong>
                      {e.craftCount > 0 ? (
                        <span className="note-tag"> · {e.craftCount} logs</span>
                      ) : null}
                    </td>
                    <td>
                      {e.craftsByItem.length === 0 ? (
                        <span className="muted">—</span>
                      ) : (
                        e.craftsByItem
                          .slice(0, 3)
                          .map((c) => `${c.qty}× ${c.recipeName}`)
                          .join(', ')
                      )}
                    </td>
                    <td>
                      {e.unitsSold}{' '}
                      <span className="note-tag">({e.salesCount} sales)</span>
                    </td>
                    <td>{money(e.revenue)}</td>
                    <td>
                      <strong>{money(e.commission)}</strong>
                    </td>
                    <td>{money(e.bonuses)}</td>
                    <td>
                      <strong>{money(e.payout)}</strong>
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
          <h3>
            <Flame size={16} /> Most sold items
          </h3>
        </header>
        {report.topProducts.length === 0 ? (
          <p className="empty">Products rank here after sales are logged.</p>
        ) : (
          <ul className="rank-list">
            {report.topProducts.slice(0, 8).map((p, i) => (
              <li key={p.productId}>
                <span className="rank">#{i + 1}</span>
                <span className="grow">{p.name}</span>
                <span>
                  {p.units} sold · {money(p.revenue)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel tip-panel">
        <h3>How to use the logs</h3>
        <ul className="tip-list">
          <li>
            <strong>Craft</strong> — crafters log what they made (separate from
            sales).
          </li>
          <li>
            <strong>Sales</strong> — sellers log what they sold → commission.
          </li>
          <li>
            Someone who does both just uses both tabs. This overview adds it up.
          </li>
          <li>
            <strong>Stash</strong> is optional — only if you want sales held
            until you personally clear them. Most shops can ignore it and use
            Sales.
          </li>
        </ul>
      </section>
    </div>
  )
}
