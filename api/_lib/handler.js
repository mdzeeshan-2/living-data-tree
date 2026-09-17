const g = globalThis

function bucket() {
  if (!g.__livingTreeRadar) g.__livingTreeRadar = { h4: '', h1: '', h30: '' }
  return g.__livingTreeRadar
}

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.setHeader('Cache-Control', 'no-store')
}

function actionOf(req) {
  const raw = req.query && req.query.action
  if (Array.isArray(raw)) return raw[0] || ''
  if (raw) return String(raw)
  const path = String((req.url || '').split('?')[0])
  const parts = path.split('/').filter(Boolean)
  return parts[parts.length - 1] || ''
}

function bodyText(req) {
  if (typeof req.body === 'string') return req.body
  if (req.body && typeof req.body === 'object') return JSON.stringify(req.body)
  return ''
}

async function persist(feed, raw) {
  bucket()[feed] = raw
  try {
    const { getCache } = await import('@vercel/functions')
    await getCache({ namespace: 'living-tree' }).set(feed, raw, {
      ttl: 86400,
      tags: ['radar', feed],
    })
  } catch {
    /* local Vite and cache misses still use memory */
  }
}

async function readLatest(feed) {
  try {
    const { getCache } = await import('@vercel/functions')
    const cached = await getCache({ namespace: 'living-tree' }).get(feed)
    if (typeof cached === 'string' && cached) return cached
    if (cached && typeof cached === 'object') return JSON.stringify(cached)
  } catch {
    /* fall through */
  }
  return bucket()[feed] || ''
}

export async function handleRadar(feed, field, req, res) {
  cors(res)
  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }

  const action = actionOf(req)

  if (action === 'live' && req.method === 'POST') {
    try {
      const raw = bodyText(req)
      const parsed = JSON.parse(raw)
      if (!parsed || parsed.iso === 'test' || parsed.feed === 'test' || parsed[field] == null || parsed[field] === '') {
        res.status(200).json({ ok: false, ignored: true })
        return
      }
      await persist(feed, raw)
      res.status(200).json({ ok: true, [field]: parsed[field] })
      return
    } catch {
      res.status(400).json({ ok: false })
      return
    }
  }

  if (action === 'clear' && req.method === 'POST') {
    await persist(feed, '')
    res.status(200).json({ ok: true })
    return
  }

  if (action === 'latest') {
    const latest = await readLatest(feed)
    res.setHeader('Content-Type', 'application/json')
    res.status(200).send(latest || 'null')
    return
  }

  if (action === 'stream') {
    const latest = await readLatest(feed)
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.status(200).send(latest ? `data: ${latest}\n\n` : '\n')
    return
  }

  res.status(404).json({ ok: false, error: 'Not found' })
}
