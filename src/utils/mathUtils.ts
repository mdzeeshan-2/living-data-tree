import type { Vec2 } from '../models/types'

export function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

export function mapRange(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number,
): number {
  if (inMax === inMin) return outMin
  return outMin + ((value - inMin) / (inMax - inMin)) * (outMax - outMin)
}

export function length(v: Vec2): number {
  return Math.hypot(v.x, v.y)
}

export function normalize(v: Vec2): Vec2 {
  const len = length(v) || 1
  return { x: v.x / len, y: v.y / len }
}

export function add(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x + b.x, y: a.y + b.y }
}

export function sub(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x - b.x, y: a.y - b.y }
}

export function scale(v: Vec2, s: number): Vec2 {
  return { x: v.x * s, y: v.y * s }
}

export function dist(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

export function cubicBezier(p0: Vec2, p1: Vec2, p2: Vec2, p3: Vec2, t: number): Vec2 {
  const u = 1 - t
  const tt = t * t
  const uu = u * u
  const uuu = uu * u
  const ttt = tt * t
  return {
    x: uuu * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + ttt * p3.x,
    y: uuu * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + ttt * p3.y,
  }
}

export function sampleBezier(
  p0: Vec2,
  p1: Vec2,
  p2: Vec2,
  p3: Vec2,
  count: number,
  out: Vec2[],
): void {
  out.length = count
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1)
    const p = cubicBezier(p0, p1, p2, p3, t)
    const existing = out[i]
    if (existing) {
      existing.x = p.x
      existing.y = p.y
    } else {
      out[i] = p
    }
  }
}

export function pointOnPolyline(points: Vec2[], t: number): Vec2 {
  if (points.length === 0) return { x: 0, y: 0 }
  if (points.length === 1 || t <= 0) return { x: points[0].x, y: points[0].y }
  if (t >= 1) {
    const last = points[points.length - 1]
    return { x: last.x, y: last.y }
  }
  const scaled = t * (points.length - 1)
  const i = Math.floor(scaled)
  const f = scaled - i
  const a = points[i]
  const b = points[Math.min(i + 1, points.length - 1)]
  return { x: lerp(a.x, b.x, f), y: lerp(a.y, b.y, f) }
}

export function tangentOnPolyline(points: Vec2[], t: number): Vec2 {
  if (points.length < 2) return { x: 0, y: 1 }
  const scaled = clamp(t, 0, 0.999) * (points.length - 1)
  const i = Math.min(Math.floor(scaled), points.length - 2)
  return normalize(sub(points[i + 1], points[i]))
}

export function distToSegment(p: Vec2, a: Vec2, b: Vec2): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const lenSq = dx * dx + dy * dy
  if (lenSq === 0) return dist(p, a)
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq
  t = clamp(t, 0, 1)
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy))
}

export function distToPolyline(p: Vec2, points: Vec2[], until: number): number {
  const last = Math.max(1, Math.floor((points.length - 1) * until))
  let min = Infinity
  for (let i = 0; i < last; i++) {
    const d = distToSegment(p, points[i], points[i + 1])
    if (d < min) min = d
  }
  return min
}

export function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n)
}

export function parseClock(value: string): number {
  const parts = value.trim().split(':')
  const h = Number(parts[0]) || 0
  const m = Number(parts[1]) || 0
  const s = Number(parts[2]) || 0
  return h * 60 + m + s / 60
}

export function formatClock(minutes: number): string {
  const wrapped = ((minutes % (24 * 60)) + 24 * 60) % (24 * 60)
  const totalSeconds = Math.floor(wrapped * 60)
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  return `${pad2(h)}:${pad2(m)}:${pad2(s)}`
}

export function formatClockShort(minutes: number): string {
  const wrapped = ((minutes % (24 * 60)) + 24 * 60) % (24 * 60)
  const h = Math.floor(wrapped / 60)
  const m = Math.floor(wrapped % 60)
  return `${pad2(h)}:${pad2(m)}`
}
