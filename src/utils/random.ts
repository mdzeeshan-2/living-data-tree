export function hashString(input: string): number {
  let h = 2166136261
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a += 0x6d2b79f5
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function createRng(seed: string | number): () => number {
  const n = typeof seed === 'number' ? seed : hashString(seed)
  return mulberry32(n)
}

export function rngRange(rng: () => number, min: number, max: number): number {
  return min + rng() * (max - min)
}

export function rngInt(rng: () => number, min: number, max: number): number {
  return Math.floor(rngRange(rng, min, max + 1))
}

export function pick<T>(rng: () => number, items: readonly T[]): T {
  return items[Math.floor(rng() * items.length)]
}
