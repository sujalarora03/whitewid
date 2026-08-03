import { useState } from 'react'
import { MessageSquare, Send, CheckCircle2, AlertCircle } from 'lucide-react'
import type { StoreApi } from '../hooks/useStore'
import { buildWeekReport } from '../lib/stats'
import {
  alertsWebhookUrl,
  costAlertWebhookUrl,
  discordReady,
  inventorySnapshotEmbed,
  postToDiscord,
  resourcesDiscordReady,
  weekReportEmbed,
} from '../lib/discord'
import {
  craftedStockLines,
  materialStockLines,
} from '../lib/inventory'

export function DiscordPanel({ store }: { store: StoreApi }) {
  const { state, updateSettings } = store
  const [status, setStatus] = useState<{
    kind: 'ok' | 'err'
    text: string
  } | null>(null)
  const [busy, setBusy] = useState(false)
  const ready = discordReady(state.settings)
  const resourcesReady = Boolean(
    state.settings.discordResourcesWebhookUrl?.trim(),
  )
  const costAlertReady = Boolean(costAlertWebhookUrl(state.settings))
  const alertsReady = Boolean(state.settings.discordAlertsWebhookUrl?.trim())
  const resourcesUsable = resourcesDiscordReady(state.settings)

  async function testWebhook() {
    setBusy(true)
    setStatus(null)
    const result = await postToDiscord(state.settings.discordWebhookUrl, {
      content: `✅ **${state.settings.businessName}** is connected to this channel.`,
    })
    setBusy(false)
    setStatus(
      result.ok
        ? { kind: 'ok', text: 'Test message sent — check Discord.' }
        : { kind: 'err', text: result.error || 'Failed' },
    )
  }

  async function testResourcesWebhook() {
    setBusy(true)
    setStatus(null)
    const url = state.settings.discordResourcesWebhookUrl.trim()
    const result = await postToDiscord(url, {
      content: `📦 **${state.settings.businessName}** resource requests will post here.`,
    })
    setBusy(false)
    setStatus(
      result.ok
        ? { kind: 'ok', text: 'Resources channel test sent — check Discord.' }
        : { kind: 'err', text: result.error || 'Failed' },
    )
  }

  async function testCostAlertWebhook() {
    setBusy(true)
    setStatus(null)
    const url = costAlertWebhookUrl(state.settings)
    const result = await postToDiscord(url, {
      content: `🚨 **${state.settings.businessName}** cost alerts will post here when a sale is under the baseline floor.`,
    })
    setBusy(false)
    setStatus(
      result.ok
        ? { kind: 'ok', text: 'Cost alert channel test sent — check Discord.' }
        : { kind: 'err', text: result.error || 'Failed' },
    )
  }

  async function testAlertsWebhook() {
    setBusy(true)
    setStatus(null)
    const url = alertsWebhookUrl(state.settings)
    const result = await postToDiscord(url, {
      content: `📣 **${state.settings.businessName}** sale/craft alerts + inventory will post here.`,
    })
    setBusy(false)
    setStatus(
      result.ok
        ? { kind: 'ok', text: 'Alerts channel test sent — check Discord.' }
        : { kind: 'err', text: result.error || 'Failed' },
    )
  }

  async function postInventoryNow() {
    setBusy(true)
    setStatus(null)
    const url = alertsWebhookUrl(state.settings)
    const result = await postToDiscord(
      url,
      inventorySnapshotEmbed(
        state.settings.businessName,
        materialStockLines(state).map((m) => ({
          name: m.name,
          stock: m.stock,
        })),
        craftedStockLines(state).map((p) => ({
          name: p.name,
          stock: p.stock,
        })),
      ),
    )
    setBusy(false)
    setStatus(
      result.ok
        ? { kind: 'ok', text: 'Inventory posted to alerts channel.' }
        : { kind: 'err', text: result.error || 'Failed' },
    )
  }

  async function postWeekly() {
    setBusy(true)
    setStatus(null)
    const report = buildWeekReport(state)
    const result = await postToDiscord(
      state.settings.discordWebhookUrl,
      weekReportEmbed(
        state.settings.businessName,
        report,
        state.settings.commissionRate,
      ),
    )
    setBusy(false)
    setStatus(
      result.ok
        ? { kind: 'ok', text: 'Weekly report posted to Discord.' }
        : { kind: 'err', text: result.error || 'Failed' },
    )
  }

  return (
    <section className="panel">
      <header className="panel-head">
        <h3>
          <MessageSquare size={16} /> Discord channels
        </h3>
        {ready ? (
          <span className="discord-status ok">
            <CheckCircle2 size={14} /> Connected
          </span>
        ) : (
          <span className="discord-status">Not set</span>
        )}
      </header>

      <p className="muted panel-intro">
        Create webhooks in Discord: Channel settings → Integrations → Webhooks
        → New Webhook → copy URL. Main = ops; Alerts = simple sale/craft +
        inventory; Resources = restock; Cost alert = under-floor sales. For
        live <strong>/inventory</strong> in Discord, see SETUP.md (bot
        interactions).
      </p>

      <div className="form-stack">
        <label className="field">
          <span>Main channel webhook (sales, bonuses, crafts…)</span>
          <input
            type="password"
            autoComplete="off"
            placeholder="https://discord.com/api/webhooks/…"
            value={state.settings.discordWebhookUrl}
            onChange={(e) =>
              updateSettings({ discordWebhookUrl: e.target.value })
            }
          />
        </label>

        <label className="field">
          <span>Alerts channel webhook (sale/craft + inventory)</span>
          <input
            type="password"
            autoComplete="off"
            placeholder="https://discord.com/api/webhooks/… (optional)"
            value={state.settings.discordAlertsWebhookUrl}
            onChange={(e) =>
              updateSettings({ discordAlertsWebhookUrl: e.target.value })
            }
          />
        </label>
        <p className="muted" style={{ marginTop: '-0.5rem', fontSize: '0.85rem' }}>
          {alertsReady
            ? 'Sale/craft alerts with stock left post here.'
            : 'If empty, sale/craft alerts use the main channel.'}
        </p>

        <label className="field">
          <span>Resources channel webhook (restock requests)</span>
          <input
            type="password"
            autoComplete="off"
            placeholder="https://discord.com/api/webhooks/… (optional)"
            value={state.settings.discordResourcesWebhookUrl}
            onChange={(e) =>
              updateSettings({ discordResourcesWebhookUrl: e.target.value })
            }
          />
        </label>
        <p className="muted" style={{ marginTop: '-0.5rem', fontSize: '0.85rem' }}>
          {resourcesReady
            ? 'Craft “Request resources” posts go to this channel.'
            : 'If empty, restock requests use the main channel above.'}
        </p>

        <label className="field">
          <span>Cost alert channel webhook (under-floor sales)</span>
          <input
            type="password"
            autoComplete="off"
            placeholder="https://discord.com/api/webhooks/… (optional)"
            value={state.settings.discordCostAlertWebhookUrl}
            onChange={(e) =>
              updateSettings({ discordCostAlertWebhookUrl: e.target.value })
            }
          />
        </label>
        <p className="muted" style={{ marginTop: '-0.5rem', fontSize: '0.85rem' }}>
          {costAlertReady
            ? 'Sales below the Cost Info floor post here automatically.'
            : 'Paste a #cost-alert (or similar) channel webhook to enable alerts.'}
        </p>

        <div className="form-row">
          <label className="check-field">
            <input
              type="checkbox"
              checked={state.settings.discordPostSales}
              onChange={(e) =>
                updateSettings({ discordPostSales: e.target.checked })
              }
            />
            Auto-post sales
          </label>
          <label className="check-field">
            <input
              type="checkbox"
              checked={state.settings.discordPostBonuses}
              onChange={(e) =>
                updateSettings({ discordPostBonuses: e.target.checked })
              }
            />
            Auto-post bonuses
          </label>
          <label className="check-field">
            <input
              type="checkbox"
              checked={state.settings.discordPostCrafts}
              onChange={(e) =>
                updateSettings({ discordPostCrafts: e.target.checked })
              }
            />
            Auto-post crafts
          </label>
          <label className="check-field">
            <input
              type="checkbox"
              checked={state.settings.discordPostStash}
              onChange={(e) =>
                updateSettings({ discordPostStash: e.target.checked })
              }
            />
            Auto-post stash
          </label>
          <label className="check-field">
            <input
              type="checkbox"
              checked={state.settings.discordPostMaterials}
              onChange={(e) =>
                updateSettings({ discordPostMaterials: e.target.checked })
              }
            />
            Auto-post material buys
          </label>
        </div>

        <div className="actions">
          <button
            type="button"
            className="btn discord"
            disabled={!ready || busy}
            onClick={() => void testWebhook()}
          >
            <Send size={16} /> Test main
          </button>
          <button
            type="button"
            className="btn discord"
            disabled={!alertsWebhookUrl(state.settings) || busy}
            onClick={() => void testAlertsWebhook()}
          >
            <Send size={16} /> Test alerts
          </button>
          <button
            type="button"
            className="btn discord"
            disabled={!alertsWebhookUrl(state.settings) || busy}
            onClick={() => void postInventoryNow()}
          >
            <Send size={16} /> Post inventory
          </button>
          <button
            type="button"
            className="btn discord"
            disabled={!resourcesReady || busy}
            onClick={() => void testResourcesWebhook()}
          >
            <Send size={16} /> Test resources
          </button>
          <button
            type="button"
            className="btn discord"
            disabled={!costAlertReady || busy}
            onClick={() => void testCostAlertWebhook()}
          >
            <Send size={16} /> Test cost alert
          </button>
          <button
            type="button"
            className="btn primary"
            disabled={!ready || busy}
            onClick={() => void postWeekly()}
          >
            Post weekly report
          </button>
        </div>

        {!resourcesReady && resourcesUsable && (
          <p className="muted" style={{ fontSize: '0.85rem' }}>
            Resources channel not set — restock requests will use main for now.
          </p>
        )}

        {status && (
          <p className={`discord-status ${status.kind}`}>
            {status.kind === 'ok' ? (
              <CheckCircle2 size={14} />
            ) : (
              <AlertCircle size={14} />
            )}
            {status.text}
          </p>
        )}
      </div>
    </section>
  )
}
