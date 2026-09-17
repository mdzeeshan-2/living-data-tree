import { EXTRA_ANGLES, SOURCE_SLOTS, VISUAL } from '../config/visualConfig'
import { segmentLength } from '../data/DataProcessor'
import type {
  Branch,
  PendingGrowth,
  Segment,
  Tree,
  Vec2,
  VisualInterpretation,
} from '../models/types'
import { lerpRgb } from '../utils/colorUtils'
import { easeOutCubic } from '../utils/interpolation'
import { add, sampleBezier, scale } from '../utils/mathUtils'
import { createRng, hashString } from '../utils/random'
import { approachRgb } from './AnimationEngine'
import type { LeafEngine } from './LeafEngine'

function sourceAngle(index: number, seed: number): number {
  const slot = SOURCE_SLOTS[index]
  const base = slot ? slot.angle : EXTRA_ANGLES[(index - SOURCE_SLOTS.length) % EXTRA_ANGLES.length]
  const jitter = ((seed % 1000) / 1000 - 0.5) * 0.08
  return base + jitter
}

function attachOrigin(sourceId: string, index: number, seed: number): Vec2 {
  const rng = createRng(seed ^ 0xabc)
  if (sourceId === 'source-1') {
    return { x: -34 + (rng() - 0.5) * 1.2, y: 224 + (rng() - 0.5) * 2 }
  }
  if (sourceId === 'source-2') {
    return { x: 34 + (rng() - 0.5) * 1.2, y: 224 + (rng() - 0.5) * 2 }
  }
  if (sourceId === 'source-3') {
    return { x: 0 + (rng() - 0.5) * 1.2, y: 248 + (rng() - 0.5) * 2 }
  }
  const slots = [
    { x: -18, y: 198 },
    { x: 18, y: 198 },
    { x: -8, y: 168 },
    { x: 8, y: 168 },
  ]
  const slot = slots[index % slots.length]
  return { x: slot.x + (rng() - 0.5) * 2, y: slot.y + (rng() - 0.5) * 2 }
}

function stemDirection(
  sourceId: string,
  delta: number,
  bias: number,
  seed: number,
  isFirst: boolean,
  prevDir: number,
  nodeIndex: number,
): number {
  const rng = createRng(seed ^ 0x5f3759df ^ (nodeIndex * 997))
  const side = sourceId === 'source-1' ? -0.62 : sourceId === 'source-2' ? 0.62 : sourceId === 'source-3' ? 0.04 : 0
  const signed = delta !== 0 ? delta : bias
  const tilt = signed < 0 ? 0.42 : -0.16
  const spread = (rng() - 0.5) * 0.18 + (nodeIndex % 2 === 0 ? -0.08 : 0.08)
  if (isFirst) return tilt * 0.35 + side + spread * 0.4
  return prevDir * 0.72 + side * 0.18 + tilt * 0.22 + spread
}

export class BranchEngine {
  private nextSegmentId = 1
  private leaves: LeafEngine

  constructor(leaves: LeafEngine) {
    this.leaves = leaves
  }

  ensureBranch(tree: Tree, sourceId: string, startMinutes: number): Branch {
    const existing = tree.sources[sourceId]
    if (existing) return existing
    const sourceIndex = tree.sourceOrder.length
    const seed = hashString(`${tree.id}:${sourceId}`)
    const branch: Branch = {
      sourceId,
      sourceIndex,
      seed,
      baseAngle: sourceAngle(sourceIndex, seed),
      origin: attachOrigin(sourceId, sourceIndex, seed),
      segments: [],
      leaves: [],
      pending: [],
      currentBias: 0,
      previousBias: 0,
      history: [],
      strength: 0,
      polarity: 'neutral',
      color: { r: 96, g: 90, b: 112 },
      lastUpdateMinutes: startMinutes,
      startMinutes,
    }
    tree.sources[sourceId] = branch
    tree.sourceOrder.push(sourceId)
    return branch
  }

  enqueue(branch: Branch, interp: VisualInterpretation, simMinutes: number): void {
    branch.pending.push({ interp, simMinutes })
  }

  flushInstant(branch: Branch, nowMs: number): void {
    while (branch.pending.length) {
      const next = branch.pending.shift()
      if (!next) break
      this.spawnSegment(branch, next, nowMs)
      const last = branch.segments[branch.segments.length - 1]
      if (last) last.growth = 1
      for (const leaf of branch.leaves) {
        if (last && leaf.segmentId === last.id) {
          leaf.scale = leaf.targetScale
          leaf.opacity = 0.92
        }
      }
    }
  }

  update(tree: Tree, dtMs: number, nowMs: number): void {
    for (const sourceId of tree.sourceOrder) {
      const branch = tree.sources[sourceId]
      this.flushQueue(branch, nowMs)
      this.growSegments(branch, dtMs)
      this.leaves.update(branch, dtMs, nowMs)
    }
  }

  private flushQueue(branch: Branch, nowMs: number): void {
    if (branch.pending.length === 0) return
    const last = branch.segments[branch.segments.length - 1]
    if (last && last.growth < 0.48) return
    const next = branch.pending.shift()
    if (next) this.spawnSegment(branch, next, nowMs)
  }

  private spawnSegment(branch: Branch, pending: PendingGrowth, nowMs: number): void {
    const interp = pending.interp
    const last = branch.segments[branch.segments.length - 1]
    const start: Vec2 = last ? { x: last.end.x, y: last.end.y } : { x: branch.origin.x, y: branch.origin.y }
    const isFirst = !last
    const rng = createRng(branch.seed + branch.segments.length * 7919)
    const prevDir = last ? last.direction : branch.baseAngle
    const direction = stemDirection(
      branch.sourceId,
      interp.delta,
      interp.bias,
      branch.seed,
      isFirst,
      prevDir,
      branch.segments.length,
    )
    const len = segmentLength(interp, isFirst)
    const end = {
      x: start.x + Math.sin(direction) * len,
      y: start.y + Math.cos(direction) * len,
    }
    const perp = direction + Math.PI / 2
    const bend = (rng() - 0.5) * len * (isFirst ? 0.08 : 0.16)
    const c1 = add(start, add(
      { x: Math.sin(direction) * len * 0.32, y: Math.cos(direction) * len * 0.32 },
      scale({ x: Math.sin(perp), y: Math.cos(perp) }, bend * 0.45),
    ))
    const c2 = add(start, add(
      { x: Math.sin(direction) * len * 0.68, y: Math.cos(direction) * len * 0.68 },
      scale({ x: Math.sin(perp), y: Math.cos(perp) }, bend),
    ))
    const startWidth = last ? last.endWidth * 0.94 : Math.max(7.5, interp.width * 1.35)
    const points: Vec2[] = []
    sampleBezier(start, c1, c2, end, VISUAL.BEZIER_SAMPLES, points)
    const twigs = []
    const twigCount = 1 + (interp.deltaNorm > 0.18 ? 1 : 0) + (interp.isReversal ? 1 : 0)
    for (let i = 0; i < twigCount; i++) {
      const t = 0.45 + rng() * 0.42
      const along = points[Math.min(points.length - 1, Math.floor(t * (points.length - 1)))]
      const side = rng() < 0.5 ? -1 : 1
      const twigDir = direction + side * (0.55 + rng() * 0.45)
      const twigLen = 12 + rng() * 18 * (0.5 + interp.strength)
      const twigEnd = {
        x: along.x + Math.sin(twigDir) * twigLen,
        y: along.y + Math.cos(twigDir) * twigLen,
      }
      const mid = {
        x: along.x + Math.sin(twigDir) * twigLen * 0.55 + Math.sin(twigDir + 1.2) * 4 * side,
        y: along.y + Math.cos(twigDir) * twigLen * 0.55 + Math.cos(twigDir + 1.2) * 4 * side,
      }
      const twigPoints: Vec2[] = []
      sampleBezier(along, mid, mid, twigEnd, 8, twigPoints)
      twigs.push({
        points: twigPoints,
        startWidth: Math.max(1.1, interp.width * 0.28),
        endWidth: 0.7,
      })
    }
    const segment: Segment = {
      id: this.nextSegmentId++,
      start,
      end,
      c1,
      c2,
      points,
      twigs,
      startWidth,
      endWidth: Math.max(3.2, interp.width * 0.92),
      color: last ? { ...last.displayColor } : { ...interp.color },
      targetColor: { ...interp.color },
      displayColor: last ? { ...last.displayColor } : { ...interp.color },
      bias: interp.bias,
      previousBias: interp.previousBias ?? 0,
      delta: interp.delta,
      growth: 0,
      growthDuration: interp.duration,
      createdSimMinutes: pending.simMinutes,
      direction,
    }
    branch.segments.push(segment)
    branch.color = interp.color
    branch.strength = interp.strength
    branch.polarity = interp.polarity
    this.leaves.spawnForSegment(branch, segment, interp, nowMs)
  }

  private growSegments(branch: Branch, dtMs: number): void {
    for (const segment of branch.segments) {
      if (segment.growth < 1) {
        segment.growth = Math.min(1, segment.growth + dtMs / segment.growthDuration)
      }
      segment.displayColor = approachRgb(segment.displayColor, segment.targetColor, dtMs)
      if (segment.growth > 0.85) {
        segment.color = lerpRgb(segment.color, segment.targetColor, 0.02)
      }
    }
    const last = branch.segments[branch.segments.length - 1]
    if (last) {
      const reveal = easeOutCubic(Math.min(1, last.growth / 0.7))
      for (const leaf of branch.leaves) {
        if (leaf.bornAt > 0 && last.growth < 1) {
          leaf.targetScale = Math.max(leaf.targetScale, 0.35 + reveal * 0.65)
        }
      }
    }
  }

  resetIds(): void {
    this.nextSegmentId = 1
  }
}
