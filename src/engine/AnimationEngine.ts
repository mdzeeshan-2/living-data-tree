import { damp, easeOutCubic } from '../utils/interpolation'
import { lerp } from '../utils/mathUtils'
import { lerpRgb } from '../utils/colorUtils'
import type { RGB } from '../models/types'

export interface Tween {
  id: number
  duration: number
  elapsed: number
  from: number
  to: number
  onUpdate: (value: number) => void
  onComplete?: () => void
  live: boolean
}

export class AnimationEngine {
  private tweens: Tween[] = []
  private pool: Tween[] = []
  private nextId = 1

  animate(
    from: number,
    to: number,
    duration: number,
    onUpdate: (value: number) => void,
    onComplete?: () => void,
  ): number {
    const tween = this.pool.pop() ?? {
      id: 0,
      duration: 0,
      elapsed: 0,
      from: 0,
      to: 0,
      onUpdate,
      live: true,
    }
    tween.id = this.nextId++
    tween.duration = Math.max(16, duration)
    tween.elapsed = 0
    tween.from = from
    tween.to = to
    tween.onUpdate = onUpdate
    tween.onComplete = onComplete
    tween.live = true
    this.tweens.push(tween)
    return tween.id
  }

  update(dtMs: number): void {
    for (let i = this.tweens.length - 1; i >= 0; i--) {
      const tween = this.tweens[i]
      if (!tween.live) {
        this.tweens.splice(i, 1)
        this.pool.push(tween)
        continue
      }
      tween.elapsed += dtMs
      const t = Math.min(1, tween.elapsed / tween.duration)
      tween.onUpdate(lerp(tween.from, tween.to, easeOutCubic(t)))
      if (t >= 1) {
        tween.live = false
        tween.onComplete?.()
        this.tweens.splice(i, 1)
        this.pool.push(tween)
      }
    }
  }

  clear(): void {
    for (const tween of this.tweens) this.pool.push(tween)
    this.tweens.length = 0
  }

  get activeCount(): number {
    return this.tweens.length
  }
}

export function approachRgb(current: RGB, target: RGB, dtMs: number): RGB {
  const k = 4.2
  const dt = dtMs / 1000
  return {
    r: damp(current.r, target.r, k, dt),
    g: damp(current.g, target.g, k, dt),
    b: damp(current.b, target.b, k, dt),
  }
}

export { lerpRgb }
