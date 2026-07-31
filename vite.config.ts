import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

/** Dev-only Discord webhook proxy (avoids browser CORS). */
function discordProxy(): Plugin {
  return {
    name: 'discord-webhook-proxy',
    configureServer(server) {
      server.middlewares.use('/api/discord', (req, res, next) => {
        if (req.method === 'OPTIONS') {
          res.statusCode = 204
          res.setHeader('Access-Control-Allow-Origin', '*')
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
          res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
          res.end()
          return
        }
        if (req.method !== 'POST') {
          next()
          return
        }

        const chunks: Buffer[] = []
        req.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)))
        req.on('end', async () => {
          try {
            const raw = Buffer.concat(chunks).toString('utf8')
            const data = JSON.parse(raw) as {
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
              res.statusCode = 400
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: 'Invalid Discord webhook URL' }))
              return
            }

            const payload: { content?: string; embeds?: unknown[] } = {}
            if (data.content) payload.content = data.content
            if (data.embeds) payload.embeds = data.embeds

            const discordRes = await fetch(webhookUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            })

            const text = await discordRes.text()
            res.statusCode = discordRes.ok ? 200 : discordRes.status
            res.setHeader('Content-Type', 'application/json')
            res.end(
              discordRes.ok
                ? JSON.stringify({ ok: true })
                : JSON.stringify({ error: text || `Discord ${discordRes.status}` }),
            )
          } catch (err) {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(
              JSON.stringify({
                error: err instanceof Error ? err.message : 'Proxy failed',
              }),
            )
          }
        })
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), discordProxy()],
})
