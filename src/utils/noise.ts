function hash2(x: number, y: number, seed: number): number {
  let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + seed
  h = (h ^ (h >>> 13)) >>> 0
  h = Math.imul(h, 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

function fade(t: number): number {
  return t * t * (3 - 2 * t)
}

export function valueNoise(x: number, seed = 1): number {
  const i = Math.floor(x)
  const f = fade(x - i)
  const a = hash2(i, 0, seed)
  const b = hash2(i + 1, 0, seed)
  return a + (b - a) * f
}

export function valueNoise2(x: number, y: number, seed = 1): number {
  const xi = Math.floor(x)
  const yi = Math.floor(y)
  const fx = fade(x - xi)
  const fy = fade(y - yi)
  const n00 = hash2(xi, yi, seed)
  const n10 = hash2(xi + 1, yi, seed)
  const n01 = hash2(xi, yi + 1, seed)
  const n11 = hash2(xi + 1, yi + 1, seed)
  const nx0 = n00 + (n10 - n00) * fx
  const nx1 = n01 + (n11 - n01) * fx
  return nx0 + (nx1 - nx0) * fy
}
