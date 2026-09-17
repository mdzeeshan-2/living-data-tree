import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Plugin } from 'vite'

type Feed = {
  prefix: string
  field: string
  latest: string
  clients: Set<ServerResponse>
}

function isRealRadar(obj: Record<string, unknown> | null, field: string): boolean {
  if (!obj) return false
  if (obj.iso === 'test' || obj.feed === 'test') return false
  const value = obj[field]
  if (value == null || value === '') return false
  return true
}

export function h4RadarBridge(): Plugin {
  const feeds: Feed[] = [
    { prefix: '/h4-radar', field: 'h4Bias', latest: '', clients: new Set() },
    { prefix: '/h1-radar', field: 'h1Bias', latest: '', clients: new Set() },
  ]

  function cors(res: ServerResponse) {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  }

  function broadcast(feed: Feed, json: string) {
    feed.latest = json
    for (const client of feed.clients) {
      client.write(`data: ${json}\n\n`)
    }
  }

  function readBody(req: IncomingMessage): Promise<string> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = []
      req.on('data', (chunk) => chunks.push(Buffer.from(chunk)))
      req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
      req.on('error', reject)
    })
  }

  return {
    name: 'radar-bridge',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url?.split('?')[0] || ''
        const feed = feeds.find((item) => url.startsWith(`${item.prefix}/`))
        if (!feed) return next()
        cors(res)
        if (req.method === 'OPTIONS') {
          res.statusCode = 204
          res.end()
          return
        }
        if (url === `${feed.prefix}/live` && req.method === 'POST') {
          try {
            const body = await readBody(req)
            const parsed = JSON.parse(body) as Record<string, unknown>
            if (!isRealRadar(parsed, feed.field)) {
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ ok: false, ignored: true }))
              return
            }
            broadcast(feed, body)
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ ok: true, [feed.field]: parsed[feed.field] }))
          } catch {
            res.statusCode = 400
            res.end(JSON.stringify({ ok: false }))
          }
          return
        }
        if (url === `${feed.prefix}/clear` && req.method === 'POST') {
          feed.latest = ''
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ ok: true }))
          return
        }
        if (url === `${feed.prefix}/latest`) {
          res.setHeader('Content-Type', 'application/json')
          res.end(feed.latest || 'null')
          return
        }
        if (url === `${feed.prefix}/stream`) {
          res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
            'Access-Control-Allow-Origin': '*',
          })
          res.write('\n')
          if (feed.latest) res.write(`data: ${feed.latest}\n\n`)
          feed.clients.add(res)
          req.on('close', () => feed.clients.delete(res))
          return
        }
        next()
      })
    },
  }
}
