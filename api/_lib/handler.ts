const g = globalThis as typeof globalThis & {
  __livingTreeRadar?: { h4: string; h1: string }
}

function store() {
  if (!g.__livingTreeRadar) g.__livingTreeRadar = { h4: '', h1: '' }
  return g.__livingTreeRadar
}

export function getLatest(feed: 'h4' | 'h1') {
  return store()[feed] || ''
}

export function setLatest(feed: 'h4' | 'h1', body: string) {
  store()[feed] = body
}

export function clearLatest(feed: 'h4' | 'h1') {
  store()[feed] = ''
}

export function isRealRadar(parsed: Record<string, unknown>, field: string) {
  if (parsed.iso === 'test' || parsed.feed === 'test') return false
  const value = parsed[field]
  return typeof value === 'number' && Number.isFinite(value)
}

export function applyCors(res: { setHeader: (k: string, v: string) => void }) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
}

type NodeReq = {
  method?: string
  query?: Record<string, string | string[] | undefined>
  body?: unknown
}

type NodeRes = {
  setHeader: (k: string, v: string) => void
  status: (code: number) => NodeRes
  json: (body: unknown) => void
  send: (body: string) => void
  end: (body?: string) => void
}

function actionFrom(req: NodeReq) {
  const raw = req.query?.action
  return Array.isArray(raw) ? raw[0] : raw || ''
}

function bodyText(req: NodeReq) {
  if (typeof req.body === 'string') return req.body
  if (req.body && typeof req.body === 'object') return JSON.stringify(req.body)
  return ''
}

export function handleRadar(
  feed: 'h4' | 'h1',
  field: string,
  req: NodeReq,
  res: NodeRes,
) {
  applyCors(res)
  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }

  const action = actionFrom(req)

  if (action === 'live' && req.method === 'POST') {
    try {
      const raw = bodyText(req)
      const parsed = JSON.parse(raw) as Record<string, unknown>
      if (!isRealRadar(parsed, field)) {
        res.status(200).json({ ok: false, ignored: true })
        return
      }
      setLatest(feed, raw)
      res.status(200).json({ ok: true, [field]: parsed[field] })
      return
    } catch {
      res.status(400).json({ ok: false })
      return
    }
  }

  if (action === 'clear' && req.method === 'POST') {
    clearLatest(feed)
    res.status(200).json({ ok: true })
    return
  }

  if (action === 'latest') {
    const latest = getLatest(feed)
    res.setHeader('Content-Type', 'application/json')
    res.status(200).send(latest || 'null')
    return
  }

  if (action === 'stream') {
    const latest = getLatest(feed)
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.status(200).send(latest ? `data: ${latest}\n\n` : '\n')
    return
  }

  res.status(404).json({ ok: false, error: 'Not found' })
}
