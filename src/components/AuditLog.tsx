import { useMemo, useState } from 'react'
import { ScrollText, Trash2 } from 'lucide-react'
import type { StoreApi } from '../hooks/useStore'
import type { ActorCtx } from '../lib/permissions'
import { formatDate } from '../lib/utils'

export function AuditLog({
  store,
  actor,
}: {
  store: StoreApi
  actor: ActorCtx
}) {
  const { state, clearAuditLogs } = store
  const [filter, setFilter] = useState('')
  const logs = state.auditLogs ?? []

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase()
    if (!q) return logs
    return logs.filter(
      (e) =>
        e.summary.toLowerCase().includes(q) ||
        e.actorName.toLowerCase().includes(q) ||
        e.action.toLowerCase().includes(q) ||
        e.entity.toLowerCase().includes(q),
    )
  }, [logs, filter])

  return (
    <div className="stack">
      <section className="panel">
        <header className="panel-head">
          <h3>
            <ScrollText size={16} /> Audit log
          </h3>
          <span className="muted">{logs.length} events (kept last 400)</span>
        </header>
        <p className="muted panel-intro">
          Owner-only trail of creates, deletes, stash clears, and stock edits.
          Crew can only delete their own sales/crafts/buys — those deletes show
          here too.
        </p>

        <div className="form-row" style={{ alignItems: 'flex-end', gap: '0.75rem' }}>
          <label className="field grow">
            <span>Filter</span>
            <input
              type="search"
              placeholder="Search actor, action, summary…"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          </label>
          <button
            type="button"
            className="btn"
            disabled={!actor.isOwner || logs.length === 0}
            onClick={() => {
              if (
                confirm(
                  'Clear audit history? A single “cleared” event will remain.',
                )
              ) {
                clearAuditLogs(actor)
              }
            }}
          >
            <Trash2 size={16} /> Clear log
          </button>
        </div>
      </section>

      <section className="panel">
        <header className="panel-head">
          <h3>Recent activity</h3>
        </header>
        {filtered.length === 0 ? (
          <p className="muted panel-intro">No audit events yet.</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Who</th>
                  <th>Action</th>
                  <th>What</th>
                  <th>Summary</th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 200).map((e) => (
                  <tr key={e.id}>
                    <td>{formatDate(e.at)}</td>
                    <td>{e.actorName}</td>
                    <td>
                      <span className="note-tag">{e.action}</span>
                    </td>
                    <td>
                      <span className="note-tag">{e.entity}</span>
                    </td>
                    <td>{e.summary}</td>
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
