const g = globalThis as typeof globalThis & {
  __livingTreeRadar?: { h4: string; h1: string }
}

function store() {
  if (!g.__livingTreeRadar) g.__livingTreeRadar = { h4: '', h1: '' }
  return g.__livingTreeRadar
}

export function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }
}

export function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders(),
      'Content-Type': 'application/json',
    },
  })
}

export function getLatest(feed: 'h4' | 'h1') {
  return store()[feed]
}

export function setLatest(feed: 'h4' | 'h1', body: string) {
  store()[feed] = body
}

export function clearLatest(feed: 'h4' | 'h1') {
  store()[feed] = ''
}

export function isRealRadar(obj: Record<string, unknown> | null, field: string) {
  if (!obj) return false
  if (obj.iso === 'test' || obj.feed === 'test') return false
  const value = obj[field]
  return value != null && value !== ''
}
