import http from 'node:http'
import { createReadStream, existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DIST = path.join(__dirname, 'dist', 'client')
const PORT = Number(process.env.PORT) || 4173

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
}

function sendJson(res, status, body) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  })
  res.end(JSON.stringify(body))
}

async function readBody(req) {
  const chunks = []
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  return Buffer.concat(chunks).toString('utf8')
}

async function handleDiscord(req, res) {
  if (req.method === 'OPTIONS') {
    sendJson(res, 204, {})
    return
  }
  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Method not allowed' })
    return
  }

  try {
    const raw = await readBody(req)
    const data = JSON.parse(raw)
    const webhookUrl = data.webhookUrl?.trim()
    if (
      !webhookUrl ||
      !/^https:\/\/(discord\.com|discordapp\.com)\/api\/webhooks\//.test(
        webhookUrl,
      )
    ) {
      sendJson(res, 400, { error: 'Invalid Discord webhook URL' })
      return
    }

    const payload = {}
    if (data.content) payload.content = data.content
    if (data.embeds) payload.embeds = data.embeds

    const discordRes = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!discordRes.ok) {
      const text = await discordRes.text()
      sendJson(res, discordRes.status, {
        error: text || `Discord returned ${discordRes.status}`,
      })
      return
    }

    sendJson(res, 200, { ok: true })
  } catch (err) {
    sendJson(res, 500, {
      error: err instanceof Error ? err.message : 'Proxy failed',
    })
  }
}

function serveStatic(req, res) {
  const urlPath = decodeURIComponent((req.url ?? '/').split('?')[0] || '/')
  let filePath = path.join(DIST, urlPath === '/' ? 'index.html' : urlPath)

  if (!filePath.startsWith(DIST)) {
    res.writeHead(403)
    res.end('Forbidden')
    return
  }

  if (!existsSync(filePath) || !path.extname(filePath)) {
    filePath = path.join(DIST, 'index.html')
  }

  const ext = path.extname(filePath)
  res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' })
  createReadStream(filePath).pipe(res)
}

const server = http.createServer(async (req, res) => {
  if (req.url?.startsWith('/api/discord')) {
    await handleDiscord(req, res)
    return
  }

  if (!existsSync(DIST)) {
    res.writeHead(503, { 'Content-Type': 'text/plain' })
    res.end('Build missing. Run: npm run build')
    return
  }

  serveStatic(req, res)
})

server.listen(PORT, () => {
  console.log(`White Widow Manager → http://localhost:${PORT}`)
})
