import { useEffect, useRef, useState } from 'react'
import {
  clockMinutes,
  ensureHourMark,
  extractBlunders,
  formatStamp,
  formatStampFull,
  hourTable,
  parseH4Bias,
  parsePrice,
  seedHourCandlesFromBinance,
  updateHourAnchor,
  windowStart,
} from '../data/h4Radar'
import { formatClock } from '../utils/mathUtils'
import type { TreeEngine } from '../engine/TreeEngine'
import type { BlunderAlert, H4LiveSnapshot, HourMark } from '../models/types'

export interface RadarView {
  connected: boolean
  live: H4LiveSnapshot | null
  bias: number | null
  previousBias: number | null
  delta: number
  lastHourLabel: string
  hours: HourMark[]
  windowLabel: string
  blunders: BlunderAlert[]
  updatedAt: string
  waiting: boolean
}

const EMPTY: RadarView = {
  connected: false,
  live: null,
  bias: null,
  previousBias: null,
  delta: 0,
  lastHourLabel: '—',
  hours: [],
  windowLabel: '—',
  blunders: [],
  updatedAt: '',
  waiting: true,
}

function applyLive(
  engine: TreeEngine,
  live: H4LiveSnapshot,
  lastHourBias: number | null,
  lastShown: number | null,
  lastGrowAt: number,
): { grew: boolean } {
  const bias = parseH4Bias(live)
  const ts = live.ts || Date.now()
  if (bias == null || lastHourBias == null) {
    engine.syncLiveClock(ts)
    return { grew: false }
  }
  const now = Date.now()
  const moved = lastShown == null || Math.abs(bias - lastShown) >= 0.08
  const due = now - lastGrowAt > 800
  if (moved && (lastShown == null || due)) {
    engine.applyLiveBias('source-1', bias, ts, lastHourBias)
    return { grew: true }
  }
  engine.syncLiveClock(ts)
  return { grew: false }
}

export function useH4Radar(engine: TreeEngine, enabled: boolean) {
  const [view, setView] = useState<RadarView>(EMPTY)
  const lastShown = useRef<number | null>(null)
  const lastGrowAt = useRef(0)
  const lastWindow = useRef(0)
  const hourMarks = useRef<HourMark[]>([])

  useEffect(() => {
    if (!enabled) return undefined
    let active = true
    const remote = !/^(localhost|127\.0\.0\.1)$/.test(window.location.hostname)
    const source = remote ? null : new EventSource('/h4-radar/stream')

    const handlePayload = (live: H4LiveSnapshot | null) => {
      if (!active || !live) return
      if (live.iso === 'test' || live.feed === 'test') return
      if (live.h4Bias == null || live.h4Bias === '') return
      const ts = live.ts || Date.now()
      const start = windowStart(ts)
      if (start !== lastWindow.current) {
        hourMarks.current = []
        lastShown.current = null
        lastWindow.current = start
        engine.ensureLiveTree(start)
      }
      const bias = parseH4Bias(live)
      const price = parsePrice(live)
      if (price != null) engine.updateHourCandle(ts, price)
      seedHourCandlesFromBinance((openTime, open, close) => engine.seedHourCandle(openTime, open, close), ts)
      let lastHourBias: number | null = null
      let lastHourLabel = '—'
      if (bias != null) {
        hourMarks.current = ensureHourMark(hourMarks.current, ts, bias)
        const anchor = updateHourAnchor('living-tree-hour-h4', ts, bias)
        lastHourBias = anchor.prevClose
        lastHourLabel = anchor.prevHourStart ? formatStamp(anchor.prevHourStart + 60 * 60 * 1000 - 60_000) : '—'
        if (lastHourBias == null) {
          const live = engine.trees.find((tree) => tree.startMs === start)
          lastHourBias = engine.lastBiasFromArchive('source-1', live?.id ?? null)
          if (lastHourBias != null) lastHourLabel = 'last tree'
        }
        if (lastHourBias == null) {
          const open = hourMarks.current.find((mark) => Number.isFinite(mark.bias))
          if (open && Math.abs(open.bias - bias) > 0.0001) {
            lastHourBias = open.bias
            lastHourLabel = open.label
          }
        }
        const result = applyLive(engine, live, lastHourBias, lastShown.current, lastGrowAt.current)
        if (result.grew) {
          lastShown.current = bias
          lastGrowAt.current = Date.now()
        }
      }
      const current = bias
      const tickDelta = current != null && lastHourBias != null ? current - lastHourBias : 0
      setView({
        connected: true,
        live,
        bias: current,
        previousBias: lastHourBias,
        delta: tickDelta,
        lastHourLabel,
        hours: hourTable(start, hourMarks.current),
        windowLabel: `${formatStamp(start)}–${formatStamp(start + 4 * 60 * 60 * 1000)}`,
        blunders: extractBlunders(live),
        updatedAt: live.iso || formatStampFull(ts),
        waiting: false,
      })
    }

    if (source) {
      source.onmessage = (ev) => {
        try {
          handlePayload(JSON.parse(ev.data) as H4LiveSnapshot)
        } catch {
          /* ignore malformed */
        }
      }
    }

    const onMessage = (ev: MessageEvent) => {
      const data = ev.data
      if (!data || data.source !== 'h4-radar-bridge') return
      if (data.live) handlePayload(data.live as H4LiveSnapshot)
    }
    window.addEventListener('message', onMessage)

    fetch('/h4-radar/latest')
      .then((r) => r.json())
      .then((live) => {
        if (live && live.h4Bias) handlePayload(live as H4LiveSnapshot)
      })
      .catch(() => {})

    const poll = window.setInterval(() => {
      fetch('/h4-radar/latest')
        .then((r) => r.json())
        .then((live) => {
          if (live && live.h4Bias) handlePayload(live as H4LiveSnapshot)
        })
        .catch(() => {})
    }, remote ? 5000 : 400)

    return () => {
      active = false
      source?.close()
      window.clearInterval(poll)
      window.removeEventListener('message', onMessage)
    }
  }, [engine, enabled])

  useEffect(() => {
    if (!enabled) setView(EMPTY)
  }, [enabled])

  return view
}

export function liveTimestamp(live: H4LiveSnapshot | null): string {
  if (!live?.ts) return formatClock(clockMinutes(Date.now())).slice(0, 5)
  return formatStamp(live.ts)
}
