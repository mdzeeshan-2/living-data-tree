import type { RGB } from '../models/types'
import { clamp, lerp } from './mathUtils'

const STOPS: Array<{ t: number; color: RGB }> = [
  { t: -1, color: { r: 255, g: 46, b: 62 } },
  { t: -0.7, color: { r: 214, g: 28, b: 52 } },
  { t: -0.38, color: { r: 168, g: 32, b: 78 } },
  { t: -0.14, color: { r: 128, g: 52, b: 96 } },
  { t: 0, color: { r: 96, g: 90, b: 112 } },
  { t: 0.14, color: { r: 118, g: 122, b: 64 } },
  { t: 0.32, color: { r: 86, g: 168, b: 72 } },
  { t: 0.62, color: { r: 42, g: 198, b: 108 } },
  { t: 1, color: { r: 72, g: 248, b: 148 } },
]

export function lerpRgb(a: RGB, b: RGB, t: number): RGB {
  return {
    r: lerp(a.r, b.r, t),
    g: lerp(a.g, b.g, t),
    b: lerp(a.b, b.b, t),
  }
}

export function biasToColor(signed: number): RGB {
  const t = clamp(signed, -1, 1)
  for (let i = 0; i < STOPS.length - 1; i++) {
    const a = STOPS[i]
    const b = STOPS[i + 1]
    if (t >= a.t && t <= b.t) {
      const u = (t - a.t) / (b.t - a.t || 1)
      return lerpRgb(a.color, b.color, u)
    }
  }
  return t < 0 ? STOPS[0].color : STOPS[STOPS.length - 1].color
}

export function rgbToCss(c: RGB, alpha = 1): string {
  return `rgba(${c.r | 0}, ${c.g | 0}, ${c.b | 0}, ${alpha})`
}

export function glowOf(c: RGB): RGB {
  return {
    r: Math.min(255, c.r + 40),
    g: Math.min(255, c.g + 40),
    b: Math.min(255, c.b + 30),
  }
}

export function mixRgb(a: RGB, b: RGB, bAmount: number): RGB {
  return lerpRgb(a, b, clamp(bAmount, 0, 1))
}

export function dimRgb(c: RGB, amount: number): RGB {
  return {
    r: c.r * amount,
    g: c.g * amount,
    b: c.b * amount,
  }
}
