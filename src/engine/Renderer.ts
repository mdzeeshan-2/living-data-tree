import { formatDateLong, localTimeZoneName, sourceMeta, treeWindow } from '../data/treeMeta'
import { VISUAL } from '../config/visualConfig'
import type { Branch, Leaf, RGB, Segment, Tree, Vec2 } from '../models/types'
import { glowOf, rgbToCss } from '../utils/colorUtils'
import { pointOnPolyline, tangentOnPolyline } from '../utils/mathUtils'
import { valueNoise } from '../utils/noise'
import type { TreeEngine } from './TreeEngine'

export class Renderer {
  draw(ctx: CanvasRenderingContext2D, engine: TreeEngine): void {
    const w = engine.canvasWidth
    const h = engine.canvasHeight
    ctx.clearRect(0, 0, w, h)
    this.drawBackdrop(ctx, w, h, engine.nowMs)
    engine.particles.draw(ctx)
    this.drawWorld(ctx, engine)
  }

  private drawBackdrop(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    now: number,
  ): void {
    const g = ctx.createRadialGradient(w * 0.46, h * 0.62, 20, w * 0.5, h * 0.55, Math.max(w, h) * 0.72)
    g.addColorStop(0, 'rgba(18, 28, 36, 0.9)')
    g.addColorStop(0.45, 'rgba(8, 12, 16, 0.96)')
    g.addColorStop(1, '#04060a')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, h)

    ctx.save()
    ctx.strokeStyle = `rgba(120, 160, 190, ${0.035 + Math.sin(now * 0.0004) * 0.01})`
    ctx.lineWidth = 1
    const gap = 56
    ctx.beginPath()
    for (let x = (w / 2) % gap; x < w; x += gap) {
      ctx.moveTo(x, 0)
      ctx.lineTo(x, h)
    }
    for (let y = (h * 0.86) % gap; y < h; y += gap) {
      ctx.moveTo(0, y)
      ctx.lineTo(w, y)
    }
    ctx.stroke()
    ctx.restore()
  }

  private drawWorld(ctx: CanvasRenderingContext2D, engine: TreeEngine): void {
    ctx.save()
    ctx.translate(engine.canvasWidth * 0.5, engine.canvasHeight * 0.86)
    const zoom = engine.camera.zoom * engine.viewScale
    ctx.scale(zoom, -zoom)
    ctx.translate(engine.camera.x, engine.camera.y)

    const ordered = [...engine.trees].sort((a, b) => a.layout.scale - b.layout.scale)
    for (const tree of ordered) this.drawTree(ctx, engine, tree)
    ctx.restore()
  }

  private drawTree(ctx: CanvasRenderingContext2D, engine: TreeEngine, tree: Tree): void {
    ctx.save()
    ctx.globalAlpha *= tree.layout.opacity
    ctx.translate(tree.layout.x, tree.layout.y)
    ctx.scale(tree.layout.scale, tree.layout.scale)

    this.drawGroundGlow(ctx, engine.nowMs, tree)
    this.drawTrunk(ctx, engine.nowMs, tree)
    const selected = engine.selectedSourceId
    for (const id of tree.sourceOrder) {
      const branch = tree.sources[id]
      const dim = selected != null && selected !== id
      this.drawBranch(ctx, engine, branch, dim)
    }
    if (tree.layout.scale > 0.5) this.drawSourceLabels(ctx, tree, engine)
    ctx.restore()
  }

  private drawGroundGlow(ctx: CanvasRenderingContext2D, now: number, tree: Tree): void {
    const pulse = 0.14 + Math.sin(now * 0.0014) * 0.03
    const g = ctx.createRadialGradient(0, 8, 4, 0, 0, 90)
    g.addColorStop(0, `rgba(90, 160, 140, ${pulse})`)
    g.addColorStop(1, 'rgba(90, 160, 140, 0)')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.ellipse(0, 4, 70, 16, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.save()
    ctx.scale(1, -1)
    ctx.textAlign = 'center'
    ctx.fillStyle = tree.growing ? 'rgba(210, 230, 240, 0.62)' : 'rgba(180, 200, 220, 0.78)'
    const date = tree.startMs ? formatDateLong(tree.startMs) : tree.label
    const window = treeWindow(tree)
    const zone = localTimeZoneName(tree.startMs ?? Date.now())
    ctx.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace'
    ctx.fillText(date, 0, 26)
    ctx.font = '10px ui-monospace, SFMono-Regular, Menlo, monospace'
    ctx.fillText(`${window} ${zone}`, 0, 40)
    ctx.fillStyle = tree.growing ? 'rgba(58, 224, 138, 0.75)' : 'rgba(180, 200, 220, 0.55)'
    ctx.fillText(tree.growing ? 'LIVE' : 'PAST', 0, 54)
    ctx.restore()
  }

  private drawTrunk(ctx: CanvasRenderingContext2D, now: number, tree: Tree): void {
    const breath = 1 + Math.sin(now * 0.0018) * 0.03
    const energy = this.treeEnergy(tree)
    const width = VISUAL.TRUNK_WIDTH * breath
    const top: Vec2 = { x: 0, y: VISUAL.TRUNK_HEIGHT }
    const c1: Vec2 = { x: -11, y: VISUAL.TRUNK_HEIGHT * 0.28 }
    const c2: Vec2 = { x: 9, y: VISUAL.TRUNK_HEIGHT * 0.66 }
    const base: Vec2 = { x: 0, y: 6 }
    const bark = {
      r: 138 + energy.r * 0.16,
      g: 108 + energy.g * 0.12,
      b: 78 + energy.b * 0.08,
    }
    this.drawRoots(ctx, now, bark)
    const points: Vec2[] = []
    const samples = 18
    for (let i = 0; i < samples; i++) {
      const t = i / (samples - 1)
      const u = 1 - t
      points.push({
        x: u * u * u * base.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t * t * t * top.x,
        y: u * u * u * base.y + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t * t * t * top.y,
      })
    }
    this.fillRibbon(ctx, points, width * 1.15, width * 0.42, rgbToCss(bark, 0.95), 1, 0, 0)
    this.fillRibbon(ctx, points, width * 0.42, width * 0.12, 'rgba(214, 196, 168, 0.55)', 1, 0, 0)
    const forkL = { x: top.x - 28, y: top.y + 36 }
    const forkR = { x: top.x + 22, y: top.y + 24 }
    this.fillRibbon(
      ctx,
      [top, { x: top.x - 14, y: top.y + 18 }, forkL],
      width * 0.38,
      2.2,
      rgbToCss(bark, 0.88),
      1,
      0,
      0,
    )
    this.fillRibbon(
      ctx,
      [top, { x: top.x + 10, y: top.y + 12 }, forkR],
      width * 0.28,
      1.6,
      rgbToCss(bark, 0.8),
      1,
      0,
      0,
    )
  }

  private treeEnergy(tree: Tree): RGB {
    let r = 90
    let g = 90
    let b = 90
    let n = 0
    for (const id of tree.sourceOrder) {
      const c = tree.sources[id].color
      r += c.r
      g += c.g
      b += c.b
      n++
    }
    if (!n) return { r: 110, g: 100, b: 90 }
    return { r: r / (n + 1), g: g / (n + 1), b: b / (n + 1) }
  }

  private drawRoots(ctx: CanvasRenderingContext2D, now: number, bark: RGB): void {
    const roots: Vec2[][] = [
      [{ x: -2, y: 8 }, { x: -22, y: -10 }, { x: -38, y: -18 }],
      [{ x: 3, y: 8 }, { x: 18, y: -8 }, { x: 34, y: -16 }],
      [{ x: 0, y: 6 }, { x: -6, y: -14 }, { x: -8, y: -26 }],
    ]
    const sway = Math.sin(now * 0.0008) * 1.2
    for (const root of roots) {
      const pts = root.map((p, i) => ({ x: p.x + sway * (i * 0.2), y: p.y }))
      this.fillRibbon(ctx, pts, 7 - root.length, 1.4, rgbToCss(bark, 0.7), 1, 0, 0)
    }
  }

  private drawBranch(
    ctx: CanvasRenderingContext2D,
    engine: TreeEngine,
    branch: Branch,
    dim: boolean,
  ): void {
    ctx.save()
    if (dim) ctx.globalAlpha *= 0.22
    const highlight = engine.selectedSourceId === branch.sourceId
    if (highlight) ctx.globalAlpha = Math.min(1, ctx.globalAlpha * 1.15)
    const t = engine.nowMs
    for (const segment of branch.segments) {
      this.drawSegment(ctx, segment, branch, t, highlight)
      this.drawTwigs(ctx, segment, branch, t)
    }
    for (const leaf of branch.leaves) {
      this.drawLeaf(ctx, branch, leaf, t)
    }
    ctx.restore()
  }

  private drawSegment(
    ctx: CanvasRenderingContext2D,
    segment: Segment,
    branch: Branch,
    now: number,
    highlight: boolean,
  ): void {
    const g = Math.max(0.02, segment.growth)
    const color = segment.displayColor
    const glow = glowOf(color)
    const swayed = segment.points.map((p, i) => this.swayPoint(p, now, branch.seed, i))
    this.fillRibbon(ctx, swayed, segment.startWidth * 2.4, segment.endWidth * 2.1, rgbToCss(glow, highlight ? 0.2 : 0.1), g, branch.seed, now)
    this.fillRibbon(ctx, swayed, segment.startWidth, segment.endWidth, rgbToCss(color, 0.96), g, branch.seed, now)
    this.fillRibbon(
      ctx,
      swayed,
      Math.max(1.2, segment.startWidth * 0.38),
      Math.max(0.7, segment.endWidth * 0.28),
      rgbToCss(glow, 0.7),
      g,
      branch.seed,
      now,
    )
    const tip = swayed[Math.max(0, Math.ceil((swayed.length - 1) * g))]
    if (tip && g > 0.55) {
      const radius = Math.max(2.4, segment.endWidth * 0.72)
      ctx.beginPath()
      ctx.arc(tip.x, tip.y, radius, 0, Math.PI * 2)
      ctx.fillStyle = rgbToCss(color, 0.98)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(tip.x, tip.y, radius * 0.45, 0, Math.PI * 2)
      ctx.fillStyle = rgbToCss(glow, 0.9)
      ctx.fill()
    }
  }

  private drawTwigs(
    ctx: CanvasRenderingContext2D,
    segment: Segment,
    branch: Branch,
    now: number,
  ): void {
    if (segment.growth < 0.55) return
    const reveal = Math.min(1, (segment.growth - 0.55) / 0.45)
    for (const twig of segment.twigs) {
      const pts = twig.points.map((p, i) => this.swayPoint(p, now, branch.seed + 17, i + 8))
      this.fillRibbon(
        ctx,
        pts,
        twig.startWidth,
        twig.endWidth,
        rgbToCss(segment.displayColor, 0.78),
        reveal,
        branch.seed,
        now,
      )
    }
  }

  private fillRibbon(
    ctx: CanvasRenderingContext2D,
    points: Vec2[],
    startW: number,
    endW: number,
    color: string,
    growth: number,
    seed: number,
    now: number,
  ): void {
    if (points.length < 2) return
    const last = Math.max(2, Math.ceil((points.length - 1) * Math.min(1, growth)) + 1)
    const left: Vec2[] = []
    const right: Vec2[] = []
    for (let i = 0; i < last; i++) {
      const p = points[i]
      const q = points[Math.min(i + 1, last - 1)]
      const prev = points[Math.max(0, i - 1)]
      const dx = q.x - prev.x
      const dy = q.y - prev.y
      const len = Math.hypot(dx, dy) || 1
      const nx = -dy / len
      const ny = dx / len
      const u = last === 1 ? 0 : i / (last - 1)
      const w = (startW + (endW - startW) * u) * 0.5
      const n = seed ? (valueNoise(now * 0.0002 + seed * 0.001 + i * 0.15, seed) - 0.5) * 0.35 : 0
      left.push({ x: p.x + nx * (w + n), y: p.y + ny * (w + n) })
      right.push({ x: p.x - nx * (w + n), y: p.y - ny * (w + n) })
    }
    ctx.beginPath()
    ctx.moveTo(left[0].x, left[0].y)
    for (let i = 1; i < left.length; i++) ctx.lineTo(left[i].x, left[i].y)
    for (let i = right.length - 1; i >= 0; i--) ctx.lineTo(right[i].x, right[i].y)
    ctx.closePath()
    ctx.fillStyle = color
    ctx.fill()
  }

  private swayPoint(p: Vec2, now: number, seed: number, i: number): Vec2 {
    const n = valueNoise(now * 0.00035 + seed * 0.0001 + i * 0.07, seed)
    const wind = Math.sin(now * 0.0007 + seed * 0.01 + i * 0.13) * 0.35 + (n - 0.5) * 0.4
    const h = Math.max(0, p.y) / 220
    return { x: p.x + wind * h * 2.2, y: p.y }
  }

  private drawLeaf(ctx: CanvasRenderingContext2D, branch: Branch, leaf: Leaf, now: number): void {
    const segment = this.segmentForLeaf(branch, leaf)
    if (!segment || segment.growth < 0.28) return
    const t = Math.min(leaf.t, segment.growth)
    const pos = pointOnPolyline(segment.points, t)
    const tan = tangentOnPolyline(segment.points, t)
    const swayed = this.swayPoint(pos, now, branch.seed, t * 20)
    const flutter = Math.sin(now * 0.0022 + leaf.swayPhase) * 0.18
    const nx = -tan.y * leaf.side
    const ny = tan.x * leaf.side
    const x = swayed.x + nx * leaf.offset
    const y = swayed.y + ny * leaf.offset
    const rot = leaf.rotation + flutter
    const s = leaf.size * leaf.scale
    if (s < 0.4) return

    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(rot)
    ctx.globalAlpha *= leaf.opacity
    ctx.fillStyle = rgbToCss(leaf.color, 0.92)
    ctx.strokeStyle = 'rgba(20, 18, 12, 0.35)'
    ctx.lineWidth = 0.7
    this.leafPath(ctx, leaf, s)
    ctx.fill()
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(0, s * 0.75)
    ctx.lineTo(0, -s * 0.7)
    ctx.strokeStyle = 'rgba(40, 28, 10, 0.45)'
    ctx.lineWidth = 0.8
    ctx.stroke()
    ctx.restore()
  }

  private segmentForLeaf(branch: Branch, leaf: Leaf): Segment | null {
    for (let i = branch.segments.length - 1; i >= 0; i--) {
      if (branch.segments[i].id === leaf.segmentId) return branch.segments[i]
    }
    return branch.segments[branch.segments.length - 1] ?? null
  }

  private leafPath(ctx: CanvasRenderingContext2D, leaf: Leaf, s: number): void {
    ctx.beginPath()
    if (leaf.kind === 'oval') {
      ctx.ellipse(0, 0, s * 0.42, s, 0, 0, Math.PI * 2)
      return
    }
    if (leaf.kind === 'pointed') {
      ctx.moveTo(0, s)
      ctx.bezierCurveTo(s * 0.55, s * 0.35, s * 0.45, -s * 0.2, 0, -s)
      ctx.bezierCurveTo(-s * 0.45, -s * 0.2, -s * 0.55, s * 0.35, 0, s)
      return
    }
    if (leaf.kind === 'curved') {
      ctx.moveTo(0, s * 0.9)
      ctx.bezierCurveTo(s * 0.8, s * 0.4, s * 0.7, -s * 0.1, s * 0.15, -s * 0.85)
      ctx.bezierCurveTo(-s * 0.2, -s * 0.2, -s * 0.7, s * 0.25, 0, s * 0.9)
      return
    }
    ctx.ellipse(-s * 0.35 * leaf.clusterSpread, 0, s * 0.28, s * 0.55, -0.4, 0, Math.PI * 2)
    ctx.ellipse(s * 0.3 * leaf.clusterSpread, 0.1, s * 0.24, s * 0.5, 0.35, 0, Math.PI * 2)
    ctx.ellipse(0, s * 0.15, s * 0.22, s * 0.48, 0.1, 0, Math.PI * 2)
  }

  private drawSourceLabels(ctx: CanvasRenderingContext2D, tree: Tree, engine: TreeEngine): void {
    ctx.save()
    ctx.scale(1, -1)
    ctx.textAlign = 'center'
    const zoomed = engine.camera.zoom >= 1.25 || engine.selectedSourceId != null
    for (const id of tree.sourceOrder) {
      const branch = tree.sources[id]
      const last = branch.segments[branch.segments.length - 1]
      if (!last) continue
      const tip = this.swayPoint(
        pointOnPolyline(last.points, last.growth),
        engine.nowMs,
        branch.seed,
        20,
      )
      const selected = engine.selectedSourceId === id
      const dim = engine.selectedSourceId != null && !selected
      ctx.fillStyle = dim ? 'rgba(180,200,210,0.18)' : 'rgba(230, 245, 250, 0.9)'
      const meta = sourceMeta(id)
      ctx.font = selected ? '11px ui-monospace, SFMono-Regular, Menlo, monospace' : '10px ui-monospace, SFMono-Regular, Menlo, monospace'
      ctx.fillText(meta.title, tip.x, -tip.y - (zoomed ? 28 : 14))
      if (zoomed) {
        const anchor = branch.anchorBias == null ? '—' : branch.anchorBias.toFixed(1)
        const now = branch.currentBias.toFixed(1)
        const stamp = branch.anchorLabel || 'open'
        ctx.fillStyle = dim ? 'rgba(180,200,210,0.16)' : 'rgba(190, 220, 210, 0.9)'
        ctx.font = '9px ui-monospace, SFMono-Regular, Menlo, monospace'
        ctx.fillText(`${stamp} ${meta.field} ${anchor} → ${now}`, tip.x, -tip.y - 14)
      }
    }
    ctx.restore()
  }
}
