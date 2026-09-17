import type { Branch, Leaf, LeafKind, Segment, VisualInterpretation } from '../models/types'
import { damp } from '../utils/interpolation'
import { createRng, pick } from '../utils/random'

const KINDS: LeafKind[] = ['oval', 'pointed', 'curved', 'cluster']

export class LeafEngine {
  private pool: Leaf[] = []
  private nextId = 1

  acquire(): Leaf {
    const leaf = this.pool.pop()
    if (leaf) return leaf
    return {
      id: 0,
      segmentId: 0,
      t: 1,
      side: 1,
      offset: 8,
      size: 6,
      rotation: 0,
      kind: 'oval',
      color: { r: 120, g: 120, b: 120 },
      opacity: 0,
      scale: 0,
      targetScale: 1,
      swayPhase: 0,
      bornAt: 0,
      clusterSpread: 1,
    }
  }

  release(leaf: Leaf): void {
    this.pool.push(leaf)
  }

  spawnForSegment(
    branch: Branch,
    segment: Segment,
    interp: VisualInterpretation,
    nowMs: number,
  ): void {
    const rng = createRng(branch.seed + segment.id * 997 + interp.leafCount)
    const count = interp.leafCount
    for (let i = 0; i < count; i++) {
      const leaf = this.acquire()
      leaf.id = this.nextId++
      leaf.segmentId = segment.id
      leaf.t = 0.42 + rng() * 0.56
      leaf.side = rng() < 0.5 ? -1 : 1
      leaf.offset = 14 + rng() * 18
      leaf.size = interp.leafSize * (0.85 + rng() * 0.5)
      leaf.rotation = segment.direction + leaf.side * (0.6 + rng() * 0.8)
      leaf.kind = pick(rng, KINDS)
      leaf.color = { ...interp.leafColor }
      leaf.opacity = 0
      leaf.scale = 0
      leaf.targetScale = 0.75 + rng() * 0.45
      leaf.swayPhase = rng() * Math.PI * 2
      leaf.bornAt = nowMs
      leaf.clusterSpread = 0.7 + rng() * 1.1
      branch.leaves.push(leaf)
    }
  }

  update(branch: Branch, dtMs: number, nowMs: number): void {
    const dt = dtMs / 1000
    for (const leaf of branch.leaves) {
      const age = nowMs - leaf.bornAt
      const appear = Math.min(1, age / 520)
      leaf.scale = damp(leaf.scale, leaf.targetScale, 5.5, dt)
      leaf.opacity = damp(leaf.opacity, 0.55 + appear * 0.4, 4.5, dt)
    }
  }

  releaseBranch(branch: Branch): void {
    for (const leaf of branch.leaves) this.release(leaf)
    branch.leaves.length = 0
  }
}
