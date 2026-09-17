import { useEffect, useRef, useState } from 'react'
import {
  closeStamp,
  formatStamp,
  formatStampFull,
  parseH30Bias,
  updatePeriodAnchor,
  windowStart,
  M30_MS,
} from '../data/h4Radar'
import type { TreeEngine } from '../engine/TreeEngine'
import type { H4LiveSnapshot } from '../models/types'
import type { RadarView } from './useH4Radar'

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
  const bias = parseH30Bias(live)
  const ts = live.ts || Date.now()
  if (bias == null) {
    engine.syncLiveClock(ts)
    return { grew: false }
  }
  const previous = lastHourBias ?? bias
  const now = Date.now()
  const moved = lastShown == null || Math.abs(bias - lastShown) >= 0.08
  const due = now - lastGrowAt > 800
  if (moved && (lastShown == null || due)) {
    engine.applyLiveBias('source-3', bias, ts, previous)
    return { grew: true }
  }
  engine.syncLiveClock(ts)
  return { grew: false }
}

export function useH30Radar(engine: TreeEngine, enabled: boolean) {
  const [view, setView] = useState<RadarView>(EMPTY)
  const lastShown = useRef<number | null>(null)
  const lastGrowAt = useRef(0)
  const lastWindow = useRef(0)

  useEffect(() => {
    if (!enabled) return undefined
    let active = true
    const remote = !/^(localhost|127\.0\.0\.1)$/.test(window.location.hostname)
    const source = remote ? null : new EventSource('/h30-radar/stream')

    const handlePayload = (live: H4LiveSnapshot | null) => {
      if (!active || !live) return
      if (live.iso === 'test' || live.feed === 'test') return
      if (live.h30Bias == null || live.h30Bias === '') return
      const ts = live.ts || Date.now()
      const start = windowStart(ts)
      if (start !== lastWindow.current) {
        lastShown.current = null
        lastWindow.current = start
        engine.ensureLiveTree(start)
      }
      const bias = parseH30Bias(live)
      let lastBarBias: number | null = null
      let lastHourLabel = '—'
      if (bias != null) {
        const anchor = updatePeriodAnchor('living-tree-m30-h30', ts, bias, M30_MS)
        lastBarBias = anchor.prevClose
        lastHourLabel = closeStamp(anchor.prevHourStart, M30_MS)
        const result = applyLive(engine, live, lastBarBias, lastShown.current, lastGrowAt.current)
        if (result.grew) {
          lastShown.current = bias
          lastGrowAt.current = Date.now()
        }
      }
      const current = bias
      const tickDelta = current != null && lastBarBias != null ? current - lastBarBias : 0
      setView({
        connected: true,
        live,
        bias: current,
        previousBias: lastBarBias,
        delta: tickDelta,
        lastHourLabel,
        hours: [],
        windowLabel: `${formatStamp(start)}–${formatStamp(start + 4 * 60 * 60 * 1000)}`,
        blunders: [],
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
      if (!data || data.source !== 'h30-radar-bridge') return
      if (data.live) handlePayload(data.live as H4LiveSnapshot)
    }
    window.addEventListener('message', onMessage)

    fetch('/h30-radar/latest')
      .then((r) => r.json())
      .then((live) => {
        if (live && live.h30Bias != null && live.h30Bias !== '') handlePayload(live as H4LiveSnapshot)
      })
      .catch(() => {})

    const poll = window.setInterval(() => {
      fetch('/h30-radar/latest')
        .then((r) => r.json())
        .then((live) => {
          if (live && live.h30Bias != null && live.h30Bias !== '') handlePayload(live as H4LiveSnapshot)
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
