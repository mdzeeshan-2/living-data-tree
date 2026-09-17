import type { BlunderAlert, H4LiveSnapshot, HourMark } from '../models/types'
import { toneFromDelta } from './DataProcessor'

export const H4_MS = 4 * 60 * 60 * 1000
export const HOUR_MS = 60 * 60 * 1000

export function parseH4Bias(live: H4LiveSnapshot | null): number | null {
  if (!live) return null
  const n = Number(String(live.h4Bias ?? '').replace(/[^\d.+-]/g, ''))
  return Number.isFinite(n) ? n : null
}

export function parseH1Bias(live: H4LiveSnapshot | null): number | null {
  if (!live) return null
  const n = Number(String(live.h1Bias ?? '').replace(/[^\d.+-]/g, ''))
  return Number.isFinite(n) ? n : null
}

export function parseH30Bias(live: H4LiveSnapshot | null): number | null {
  if (!live) return null
  const n = Number(String(live.h30Bias ?? live.bias ?? '').replace(/[^\d.+-]/g, ''))
  return Number.isFinite(n) ? n : null
}

export function parsePrice(live: H4LiveSnapshot | null): number | null {
  if (!live?.price) return null
  const n = Number(String(live.price).replace(/[^\d.+-]/g, ''))
  return Number.isFinite(n) && n > 0 ? n : null
}

export function windowStart(ts: number): number {
  return Math.floor(ts / H4_MS) * H4_MS
}

export function formatDayStamp(ts: number): string {
  const d = new Date(ts)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getDate())}/${p(d.getMonth() + 1)} ${p(d.getHours())}:${p(d.getMinutes())}`
}

export function formatStamp(ts: number): string {
  const d = new Date(ts)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getHours())}:${p(d.getMinutes())}`
}

export function formatStampFull(ts: number): string {
  const d = new Date(ts)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

export function clockMinutes(ts: number): number {
  const d = new Date(ts)
  return d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60
}

export function hourStartMs(ts: number): number {
  return Math.floor(ts / HOUR_MS) * HOUR_MS
}

export function hourIndex(ts: number, start: number): number {
  return Math.min(3, Math.max(0, Math.floor((ts - start) / HOUR_MS)))
}

export interface HourAnchor {
  hourStart: number
  close: number
  prevClose: number | null
  prevHourStart: number | null
}

function readAnchor(key: string): HourAnchor | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw) as HourAnchor
    if (!parsed || !Number.isFinite(parsed.hourStart) || !Number.isFinite(parsed.close)) return null
    return parsed
  } catch {
    return null
  }
}

function writeAnchor(key: string, anchor: HourAnchor): void {
  try {
    localStorage.setItem(key, JSON.stringify(anchor))
  } catch {
    /* ignore quota */
  }
}

export function updateHourAnchor(key: string, ts: number, bias: number): HourAnchor {
  const hour = hourStartMs(ts)
  const stored = readAnchor(key)
  let next: HourAnchor
  if (!stored) {
    next = { hourStart: hour, close: bias, prevClose: null, prevHourStart: null }
  } else if (stored.hourStart !== hour) {
    next = {
      hourStart: hour,
      close: bias,
      prevClose: stored.close,
      prevHourStart: stored.hourStart,
    }
  } else {
    next = { ...stored, close: bias }
  }
  writeAnchor(key, next)
  return next
}

export function ensureHourMark(
  marks: HourMark[],
  liveTs: number,
  bias: number,
): HourMark[] {
  const start = windowStart(liveTs)
  const idx = hourIndex(liveTs, start)
  if (marks.some((m) => m.hour === idx && m.at === start + idx * HOUR_MS)) return marks
  const prev = marks.filter((m) => m.hour < idx).sort((a, b) => b.hour - a.hour)[0]
  const delta = prev ? bias - prev.bias : 0
  const next = marks.filter((m) => m.hour !== idx)
  next.push({
    hour: idx,
    at: start + idx * HOUR_MS,
    label: formatStamp(start + idx * HOUR_MS),
    bias,
    delta,
    tone: prev ? toneFromDelta(delta) : 'neutral',
  })
  next.sort((a, b) => a.hour - b.hour)
  return next
}

export function hourTable(start: number, marks: HourMark[]): HourMark[] {
  return [0, 1, 2, 3].map((hour) => {
    const found = marks.find((m) => m.hour === hour)
    if (found) return found
    return {
      hour,
      at: start + hour * HOUR_MS,
      label: formatStamp(start + hour * HOUR_MS),
      bias: Number.NaN,
      delta: 0,
      tone: 'neutral' as const,
    }
  })
}

export function extractBlunders(live: H4LiveSnapshot | null): BlunderAlert[] {
  if (!live || live.ok === false) return []
  const items: BlunderAlert[] = []
  const reversal = String(live.reversal || '').trim().toUpperCase()
  const color = String(live.color || '').trim().toUpperCase()
  const action = String(live.action || '').trim()
  const state = String(live.marketState || '').trim()
  const alignment = String(live.alignment || '').trim().toUpperCase()
  const guide = String(live.guide || '').trim()

  if (reversal && reversal !== 'NONE') {
    items.push({
      field: 'reversal',
      title: live.reversal || reversal,
      detail: action,
      color: live.color || 'ORANGE',
    })
  }
  if (color === 'YELLOW' || color === 'ORANGE') {
    items.push({
      field: 'color',
      title: `${color} ACTION`,
      detail: action || state,
      color,
    })
  }
  if (/WARNING|REVERSAL|CONFLICT/i.test(state)) {
    items.push({
      field: 'state',
      title: state,
      detail: [live.alignment, live.pressure, live.extension].filter(Boolean).join(' · '),
      color: live.color || 'YELLOW',
    })
  }
  if (alignment === 'CONFLICT' || /CONFLICT/i.test(alignment)) {
    items.push({
      field: 'alignment',
      title: live.alignment || 'CONFLICT',
      detail: `1D ${live.d1Bias ?? '--'}  ·  4H ${live.h4Bias ?? '--'}`,
      color: live.d1Color || live.color || 'YELLOW',
    })
  }
  if (/WARNING|REVERSAL/i.test(guide) && !items.length) {
    items.push({
      field: 'guide',
      title: guide,
      detail: action,
      color: live.color || 'YELLOW',
    })
  }

  const seen = new Set<string>()
  return items.filter((item) => {
    const key = item.title
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export function liveTone(live: H4LiveSnapshot | null, delta: number): string {
  if (delta > 0) return 'green'
  if (delta < 0) return 'red'
  const named = String(live?.biasColor || live?.h4Color || '').toUpperCase()
  if (named === 'GREEN' || named === 'RED' || named === 'YELLOW' || named === 'ORANGE') {
    return named.toLowerCase()
  }
  return 'neutral'
}

let candleSeedAt = 0

export function seedHourCandlesFromBinance(
  apply: (openTime: number, open: number, close: number) => void,
  ts: number,
): void {
  if (Date.now() - candleSeedAt < 30_000) return
  candleSeedAt = Date.now()
  const start = windowStart(ts)
  fetch('https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1h&limit=8')
    .then((res) => res.json())
    .then((rows: unknown) => {
      if (!Array.isArray(rows)) return
      for (const row of rows) {
        if (!Array.isArray(row)) continue
        const openTime = Number(row[0])
        const open = Number(row[1])
        const close = Number(row[4])
        if (!Number.isFinite(openTime) || !Number.isFinite(open) || !Number.isFinite(close)) continue
        if (windowStart(openTime) !== start) continue
        apply(openTime + 1, open, close)
      }
    })
    .catch(() => {})
}
