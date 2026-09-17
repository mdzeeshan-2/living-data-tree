import { clearLatest, corsHeaders, getLatest, isRealRadar, json, setLatest } from './store'

export async function handleRadar(
  feed: 'h4' | 'h1',
  field: string,
  request: Request,
  action: string,
) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() })
  }

  if (action === 'live' && request.method === 'POST') {
    try {
      const body = await request.text()
      const parsed = JSON.parse(body) as Record<string, unknown>
      if (!isRealRadar(parsed, field)) return json({ ok: false, ignored: true })
      setLatest(feed, body)
      return json({ ok: true, [field]: parsed[field] })
    } catch {
      return json({ ok: false }, 400)
    }
  }

  if (action === 'clear' && request.method === 'POST') {
    clearLatest(feed)
    return json({ ok: true })
  }

  if (action === 'latest') {
    const latest = getLatest(feed)
    return new Response(latest || 'null', {
      headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
    })
  }

  if (action === 'stream') {
    const latest = getLatest(feed)
    const payload = latest ? `data: ${latest}\n\n` : '\n'
    return new Response(payload, {
      headers: {
        ...corsHeaders(),
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  }

  return json({ ok: false, error: 'Not found' }, 404)
}
