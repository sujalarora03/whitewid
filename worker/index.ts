/**
 * White Widow API — Discord proxy + shared D1 state.
 */

export interface Env {
  DB: D1Database
}

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, PUT, POST, OPTIONS',
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    if (request.method === 'OPTIONS' && url.pathname.startsWith('/api/')) {
      return new Response(null, { status: 204, headers: cors })
    }

    if (url.pathname === '/api/discord') {
      return handleDiscord(request)
    }

    if (url.pathname === '/api/state') {
      return handleState(request, env)
    }

    if (url.pathname === '/api/health') {
      return Response.json(
        { ok: true, db: Boolean(env.DB), owner: 'Pablo the II Escobar' },
        { headers: cors },
      )
    }

    return new Response(null, { status: 404 })
  },
}

async function handleState(request: Request, env: Env): Promise<Response> {
  if (!env.DB) {
    return Response.json(
      { error: 'Database not configured' },
      { status: 503, headers: cors },
    )
  }

  try {
    if (request.method === 'GET') {
      const row = await env.DB.prepare(
        'SELECT data, updated_at FROM app_state WHERE id = 1',
      ).first<{ data: string; updated_at: string }>()

      if (!row) {
        return Response.json(
          { state: null, updatedAt: null },
          { headers: cors },
        )
      }

      return Response.json(
        {
          state: JSON.parse(row.data),
          updatedAt: row.updated_at,
        },
        { headers: cors },
      )
    }

    if (request.method === 'PUT') {
      const body = (await request.json()) as { state?: unknown }
      if (!body.state || typeof body.state !== 'object') {
        return Response.json(
          { error: 'Missing state' },
          { status: 400, headers: cors },
        )
      }

      const updatedAt = new Date().toISOString()
      const data = JSON.stringify(body.state)

      await env.DB.prepare(
        `INSERT INTO app_state (id, data, updated_at) VALUES (1, ?, ?)
         ON CONFLICT(id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at`,
      )
        .bind(data, updatedAt)
        .run()

      return Response.json({ ok: true, updatedAt }, { headers: cors })
    }

    return Response.json(
      { error: 'Method not allowed' },
      { status: 405, headers: cors },
    )
  } catch (err) {
    return Response.json(
      {
        error: err instanceof Error ? err.message : 'Database error',
      },
      { status: 500, headers: cors },
    )
  }
}

async function handleDiscord(request: Request): Promise<Response> {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors })
  }

  if (request.method !== 'POST') {
    return Response.json(
      { error: 'Method not allowed' },
      { status: 405, headers: cors },
    )
  }

  try {
    const data = (await request.json()) as {
      webhookUrl?: string
      content?: string
      embeds?: unknown[]
    }

    const webhookUrl = data.webhookUrl?.trim()
    if (
      !webhookUrl ||
      !/^https:\/\/(discord\.com|discordapp\.com)\/api\/webhooks\//.test(
        webhookUrl,
      )
    ) {
      return Response.json(
        { error: 'Invalid Discord webhook URL' },
        { status: 400, headers: cors },
      )
    }

    const payload: { content?: string; embeds?: unknown[] } = {}
    if (data.content) payload.content = data.content
    if (data.embeds) payload.embeds = data.embeds

    const discordRes = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!discordRes.ok) {
      const text = await discordRes.text()
      return Response.json(
        { error: text || `Discord returned ${discordRes.status}` },
        { status: discordRes.status, headers: cors },
      )
    }

    return Response.json({ ok: true }, { headers: cors })
  } catch (err) {
    return Response.json(
      {
        error: err instanceof Error ? err.message : 'Proxy failed',
      },
      { status: 500, headers: cors },
    )
  }
}
