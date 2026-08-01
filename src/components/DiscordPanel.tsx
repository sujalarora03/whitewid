import { useState } from 'react'
import { MessageSquare, Send, CheckCircle2, AlertCircle } from 'lucide-react'
import type { StoreApi } from '../hooks/useStore'
import { buildWeekReport } from '../lib/stats'
import {
  discordReady,
  postToDiscord,
  weekReportEmbed,
} from '../lib/discord'

export function DiscordPanel({ store }: { store: StoreApi }) {
  const { state, updateSettings } = store
  const [status, setStatus] = useState<{
    kind: 'ok' | 'err'
    text: string
  } | null>(null)
  const [busy, setBusy] = useState(false)
  const ready = discordReady(state.settings)

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
          <MessageSquare size={16} /> Discord channel
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
        Create a webhook in your Discord server: Channel settings → Integrations
        → Webhooks → New Webhook → copy URL. Sales, bonuses, and weekly reports
        can post into that text channel.
      </p>

      <div className="form-stack">
        <label className="field">
          <span>Webhook URL</span>
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
            <Send size={16} /> Test webhook
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
