import type { AppState } from '../src/types'
import {
  craftedStockLines,
  materialStockLines,
} from '../src/lib/inventory'

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function loadState(data: string): AppState | null {
  try {
    return JSON.parse(data) as AppState
  } catch {
    return null
  }
}

function renderText(state: AppState): string {
  const business = state.settings?.businessName || 'White Widow'
  const mats = materialStockLines(state)
  const crafted = craftedStockLines(state)
  const lines = [
    `${business} · LIVE INVENTORY`,
    '',
    'RAW MATERIALS',
    ...mats.map((m) => `  ${m.name}: ${m.stock}`),
    '',
    'CRAFTED / FINISHED',
    ...crafted.map((p) => `  ${p.name}: ${p.stock}`),
    '',
    `Updated ${new Date().toISOString()}`,
  ]
  return lines.join('\n')
}

function renderHtml(state: AppState): string {
  const business = state.settings?.businessName || 'White Widow'
  const mats = materialStockLines(state)
  const crafted = craftedStockLines(state)
  const matRows = mats
    .map(
      (m) =>
        `<tr><td>${escapeHtml(m.name)}</td><td><strong>${m.stock}</strong></td></tr>`,
    )
    .join('')
  const craftRows = crafted
    .map(
      (p) =>
        `<tr><td>${escapeHtml(p.name)}</td><td><strong>${p.stock}</strong></td></tr>`,
    )
    .join('')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(business)} inventory</title>
  <style>
    :root { color-scheme: dark; }
    body {
      margin: 0; font-family: ui-sans-serif, system-ui, sans-serif;
      background: #0f1410; color: #e8f0e9; padding: 1.25rem;
    }
    h1 { font-size: 1.35rem; margin: 0 0 0.25rem; color: #7cff9a; }
    p { color: #9aab9e; margin: 0 0 1.25rem; font-size: 0.9rem; }
    h2 { font-size: 0.95rem; margin: 1.25rem 0 0.5rem; color: #b6cbb9; text-transform: uppercase; letter-spacing: 0.04em; }
    table { width: 100%; max-width: 420px; border-collapse: collapse; }
    td { padding: 0.45rem 0.35rem; border-bottom: 1px solid #243028; }
    td:last-child { text-align: right; font-variant-numeric: tabular-nums; }
    .hint { margin-top: 1.5rem; font-size: 0.8rem; color: #6f7f73; }
  </style>
</head>
<body>
  <h1>${escapeHtml(business)}</h1>
  <p>Live inventory · raw materials + crafted stock</p>
  <h2>Raw materials</h2>
  <table>${matRows || '<tr><td colspan="2">Empty</td></tr>'}</table>
  <h2>Crafted / finished</h2>
  <table>${craftRows || '<tr><td colspan="2">Empty</td></tr>'}</table>
  <p class="hint">Bookmark this page or pin the link in Discord. Refresh anytime — no Discord bot key needed.</p>
</body>
</html>`
}

export async function handlePublicInventory(
  request: Request,
  env: { DB: D1Database },
): Promise<Response> {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
  }

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors })
  }
  if (request.method !== 'GET') {
    return Response.json(
      { error: 'Method not allowed' },
      { status: 405, headers: cors },
    )
  }

  if (!env.DB) {
    return Response.json(
      { error: 'Database not configured' },
      { status: 503, headers: cors },
    )
  }

  const url = new URL(request.url)
  const format = (url.searchParams.get('format') || 'html').toLowerCase()

  const row = await env.DB.prepare(
    'SELECT data, updated_at FROM app_state WHERE id = 1',
  ).first<{ data: string; updated_at: string }>()

  if (!row?.data) {
    if (format === 'json') {
      return Response.json(
        { materials: [], crafted: [], updatedAt: null },
        { headers: cors },
      )
    }
    return new Response('No inventory data yet.', {
      status: 404,
      headers: { ...cors, 'Content-Type': 'text/plain; charset=utf-8' },
    })
  }

  const state = loadState(row.data)
  if (!state) {
    return Response.json(
      { error: 'Corrupt state' },
      { status: 500, headers: cors },
    )
  }

  const mats = materialStockLines(state).map((m) => ({
    name: m.name,
    stock: m.stock,
  }))
  const crafted = craftedStockLines(state).map((p) => ({
    name: p.name,
    stock: p.stock,
  }))

  if (format === 'json') {
    return Response.json(
      {
        businessName: state.settings?.businessName || 'White Widow',
        materials: mats,
        crafted,
        updatedAt: row.updated_at,
      },
      { headers: { ...cors, 'Cache-Control': 'no-store' } },
    )
  }

  if (format === 'text' || format === 'txt') {
    return new Response(renderText(state), {
      headers: {
        ...cors,
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    })
  }

  return new Response(renderHtml(state), {
    headers: {
      ...cors,
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  })
}
