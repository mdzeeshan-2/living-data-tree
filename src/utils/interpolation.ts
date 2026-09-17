export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

export function easeOutBack(t: number): number {
  const c = 1.70158
  const c3 = c + 1
  return 1 + c3 * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2)
}

export function smoothstep(t: number): number {
  const x = t < 0 ? 0 : t > 1 ? 1 : t
  return x * x * (3 - 2 * x)
}

export function damp(current: number, target: number, lambda: number, dt: number): number {
  return current + (target - current) * (1 - Math.exp(-lambda * dt))
}
