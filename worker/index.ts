/**
 * Discord webhook proxy for Cloudflare Workers (free tier).
 * Static SPA assets are served automatically; this only handles /api/*.
 */
export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)

    if (url.pathname === '/api/discord') {
      return handleDiscord(request)
    }

    return new Response(null, { status: 404 })
  },
}

async function handleDiscord(request: Request): Promise<Response> {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }

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
