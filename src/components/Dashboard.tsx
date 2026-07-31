import { useState } from 'react'
import { Trophy, TrendingUp, Wallet, Gift, Flame, Send } from 'lucide-react'
import type { StoreApi } from '../hooks/useStore'
import { buildWeekReport } from '../lib/stats'
import { postToDiscord, weekReportEmbed } from '../lib/discord'
import { formatWeekLabel, money, pct } from '../lib/utils'

export function Dashboard({ store }: { store: StoreApi }) {
  const { state } = store
  const report = buildWeekReport(state)
  const rate = state.settings.commissionRate
  const [discordMsg, setDiscordMsg] = useState<string | null>(null)

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
          <p className="eyebrow">This week</p>
          <h2 className="hero-brand">{state.settings.businessName}</h2>
          <p className="hero-copy">{formatWeekLabel(report.start)}</p>
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
          <span>Commissions ({pct(rate)})</span>
          <strong>{money(report.commission)}</strong>
        </article>
        <article className="stat-card">
          <Gift size={18} />
          <span>Bonuses paid</span>
          <strong>{money(report.bonusTotal)}</strong>
        </article>
      </div>

      <div className="split">
        <section className="panel">
          <header className="panel-head">
            <h3>Top performer</h3>
          </header>
          {report.topEmployee && report.topEmployee.salesCount > 0 ? (
            <div className="top-emp">
              <div className="top-emp-badge">
                <Trophy size={22} />
              </div>
              <div>
                <p className="top-emp-name">{report.topEmployee.name}</p>
                <p className="muted">
                  {report.topEmployee.unitsSold} units ·{' '}
                  {money(report.topEmployee.revenue)} sales ·{' '}
                  {money(report.topEmployee.payout)} payout
                </p>
              </div>
            </div>
          ) : (
            <p className="empty">No sales logged this week yet.</p>
          )}

          <ul className="rank-list">
            {report.employees
              .filter((e) => e.salesCount > 0)
              .slice(0, 5)
              .map((e, i) => (
                <li key={e.employeeId}>
                  <span className="rank">#{i + 1}</span>
                  <span className="grow">{e.name}</span>
                  <span>{money(e.profit)} profit</span>
                </li>
              ))}
          </ul>
        </section>

        <section className="panel">
          <header className="panel-head">
            <h3>
              <Flame size={16} /> Most sold
            </h3>
          </header>
          {report.topProducts.length === 0 ? (
            <p className="empty">Products will rank here after sales.</p>
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
      </div>

      <section className="panel tip-panel">
        <h3>Ideas you can run next</h3>
        <ul className="tip-list">
          <li>Connect Discord under Prices to auto-post sales and share weekly reports with the crew.</li>
          <li>Log every sale so weekly MVP + most-sold stay accurate.</li>
          <li>Set sale prices for crafted seeds — costs are already from recipes.</li>
          <li>Use Craft to build a restock shopping list before a production run.</li>
          <li>Track bonuses separately so commission stays clean at {pct(rate)} of profit.</li>
        </ul>
      </section>
    </div>
  )
}
