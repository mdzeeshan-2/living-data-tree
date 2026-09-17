import { VISUAL } from '../config/visualConfig'
import type {
  DataEvent,
  PresetName,
  SimInterval,
} from '../models/types'
import { clamp } from '../utils/mathUtils'
import { createRng } from '../utils/random'
import { BaseDataProvider } from './DataProvider'

export const PRESETS: Record<PresetName, number[][]> = {
  STEADY_NEGATIVE: [
    [-5, -3, 2],
    [-8, -5, 3],
    [-10, -7, 4],
    [-12, -8, 5],
    [-15, -10, 6],
    [-20, -12, 7],
    [-25, -14, 8],
  ],
  STEADY_POSITIVE: [
    [5, 3, 2],
    [8, 5, 4],
    [12, 8, 6],
    [15, 11, 8],
    [20, 14, 10],
    [25, 18, 12],
  ],
  REVERSAL: [
    [-20, -8, 4],
    [-25, -12, 6],
    [-30, -15, 5],
    [-15, -8, 8],
    [-5, -2, 10],
    [5, 3, 14],
    [15, 8, 18],
    [25, 12, 22],
  ],
  VOLATILE: [
    [-20, 8, 4],
    [15, -10, 12],
    [-25, 18, -8],
    [30, -22, 16],
    [-10, 14, -18],
    [20, -8, 24],
    [-30, 22, -12],
  ],
}

function evolveBias(current: number, rng: () => number): number {
  const roll = rng()
  let next = current
  if (roll < 0.07) {
    next = current + (rng() - 0.5) * 42
  } else if (roll < 0.12) {
    next = -current + (rng() - 0.5) * 10
  } else {
    next = current + (rng() - 0.48) * 7.5
  }
  return clamp(next, VISUAL.MIN_BIAS, VISUAL.MAX_BIAS)
}

export class SimulationProvider extends BaseDataProvider {
  sources: Array<{ id: string; bias: number }> = [
    { id: 'source-1', bias: -20 },
    { id: 'source-2', bias: -5 },
    { id: 'source-3', bias: 3 },
  ]
  intervalSec: SimInterval = 1
  private timer: number | null = null
  private rng = createRng('living-tree-sim')

  setSources(sources: Array<{ id: string; bias: number }>): void {
    this.sources = sources.map((s) => ({ ...s }))
  }

  setSourceBias(id: string, bias: number): void {
    const found = this.sources.find((s) => s.id === id)
    if (found) found.bias = bias
    else this.sources.push({ id, bias })
  }

  setIntervalSec(value: SimInterval): void {
    this.intervalSec = value
    if (this.running) {
      this.stop()
      this.start()
    }
  }

  start(): void {
    if (this.running) return
    this.running = true
    this.tick()
    this.timer = window.setInterval(() => this.tick(), this.intervalSec * 1000)
  }

  stop(): void {
    this.running = false
    if (this.timer != null) {
      window.clearInterval(this.timer)
      this.timer = null
    }
  }

  randomStep(): DataEvent {
    for (const source of this.sources) {
      source.bias = evolveBias(source.bias, this.rng)
    }
    return {
      type: 'BATCH_UPDATE',
      timestamp: '',
      sources: this.sources.map((s) => ({ ...s })),
    }
  }

  presetStep(name: PresetName, index: number): DataEvent | null {
    const rows = PRESETS[name]
    const row = rows[index]
    if (!row) return null
    this.sources = this.sources.map((s, i) => ({
      id: s.id,
      bias: row[i] ?? s.bias,
    }))
    return {
      type: 'BATCH_UPDATE',
      timestamp: '',
      sources: this.sources.map((s) => ({ ...s })),
    }
  }

  reset(initial?: Array<{ id: string; bias: number }>): void {
    this.stop()
    this.sources = (initial ?? [
      { id: 'source-1', bias: -20 },
      { id: 'source-2', bias: -5 },
      { id: 'source-3', bias: 3 },
    ]).map((s) => ({ ...s }))
    this.rng = createRng(`living-tree-sim-${Date.now()}`)
  }

  private tick(): void {
    const event = this.randomStep()
    this.emit(event)
  }
}

export function nextSessionStart(currentMinutes: number, originMinutes: number): number | null {
  const elapsed = currentMinutes - originMinutes
  if (elapsed < VISUAL.SESSION_INTERVAL_MINUTES) return null
  const steps = Math.floor(elapsed / VISUAL.SESSION_INTERVAL_MINUTES)
  return originMinutes + steps * VISUAL.SESSION_INTERVAL_MINUTES
}
