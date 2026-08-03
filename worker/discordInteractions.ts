/**
 * Discord slash-command interactions: /inventory
 * Requires env.DISCORD_PUBLIC_KEY (Application Public Key from Discord Developer Portal).
 */

import type { AppState } from '../src/types'
import {
  craftedStockLines,
  materialStockLines,
} from '../src/lib/inventory'

export interface InteractionEnv {
  DB: D1Database
  DISCORD_PUBLIC_KEY?: string
}

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, X-Signature-Ed25519, X-Signature-Timestamp',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function hexToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2)
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  }
  return out
}

async function verifyDiscordSignature(
  publicKeyHex: string,
  signatureHex: string,
  timestamp: string,
  body: string,
): Promise<boolean> {
  try {
    const key = await crypto.subtle.importKey(
      'raw',
      hexToBytes(publicKeyHex),
      { name: 'Ed25519' },
      false,
      ['verify'],
    )
    const data = new TextEncoder().encode(timestamp + body)
    return crypto.subtle.verify(
      'Ed25519',
      key,
      hexToBytes(signatureHex),
      data,
    )
  } catch {
    return false
  }
}

async function loadAppState(db: D1Database): Promise<AppState | null> {
  const row = await db
    .prepare('SELECT data FROM app_state WHERE id = 1')
    .first<{ data: string }>()
  if (!row?.data) return null
  try {
    return JSON.parse(row.data) as AppState
  } catch {
    return null
  }
}

function inventoryInteractionResponse(state: AppState) {
  const business = state.settings?.businessName || 'White Widow'
  const mats = materialStockLines(state)
  const crafted = craftedStockLines(state)
  const matsText =
    mats.map((m) => `• **${m.name}** — ${m.stock}`).join('\n') || '_None_'
  const craftText =
    crafted.map((p) => `• **${p.name}** — ${p.stock}`).join('\n') || '_None_'

  return {
    type: 4, // CHANNEL_MESSAGE_WITH_SOURCE
    data: {
      embeds: [
        {
          title: `${business} · Inventory`,
          color: 0x5dade2,
          fields: [
            {
              name: 'Raw materials',
              value: matsText.slice(0, 1000),
            },
            {
              name: 'Crafted / finished',
              value: craftText.slice(0, 1000),
            },
          ],
          timestamp: new Date().toISOString(),
        },
      ],
    },
  }
}

export async function handleDiscordInteractions(
  request: Request,
  env: InteractionEnv,
): Promise<Response> {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors })
  }
  if (request.method !== 'POST') {
    return Response.json(
      { error: 'Method not allowed' },
      { status: 405, headers: cors },
    )
  }

  const publicKey = env.DISCORD_PUBLIC_KEY?.trim()
  if (!publicKey) {
    return Response.json(
      {
        error:
          'DISCORD_PUBLIC_KEY not set. Add the Discord Application Public Key as a Worker secret.',
      },
      { status: 503, headers: cors },
    )
  }

  const signature = request.headers.get('X-Signature-Ed25519') || ''
  const timestamp = request.headers.get('X-Signature-Timestamp') || ''
  const body = await request.text()

  const ok = await verifyDiscordSignature(
    publicKey,
    signature,
    timestamp,
    body,
  )
  if (!ok) {
    return new Response('Bad request signature', {
      status: 401,
      headers: cors,
    })
  }

  let interaction: {
    type: number
    data?: { name?: string }
  }
  try {
    interaction = JSON.parse(body) as {
      type: number
      data?: { name?: string }
    }
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400, headers: cors })
  }

  // PING
  if (interaction.type === 1) {
    return Response.json({ type: 1 }, { headers: cors })
  }

  // APPLICATION_COMMAND
  if (interaction.type === 2) {
    const name = (interaction.data?.name || '').toLowerCase()
    if (name === 'inventory' || name === 'stock' || name === 'inv') {
      const state = await loadAppState(env.DB)
      if (!state) {
        return Response.json(
          {
            type: 4,
            data: {
              content: 'No shared inventory in the database yet.',
            },
          },
          { headers: cors },
        )
      }
      return Response.json(inventoryInteractionResponse(state), {
        headers: cors,
      })
    }
    return Response.json(
      {
        type: 4,
        data: {
          content:
            'Unknown command. Try `/inventory` for raw mats + crafted stock.',
        },
      },
      { headers: cors },
    )
  }

  return Response.json(
    { error: 'Unhandled interaction type' },
    { status: 400, headers: cors },
  )
}
