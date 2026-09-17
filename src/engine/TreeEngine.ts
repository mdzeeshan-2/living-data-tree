import { VISUAL } from '../config/visualConfig'
import { interpretBias, toneFromDelta } from '../data/DataProcessor'
import { clockMinutes, formatDayStamp, formatStamp, formatStampFull, H4_MS, hourIndex, HOUR_MS, windowStart } from '../data/h4Radar'
import { nextSessionStart } from '../data/SimulationProvider'
import type {
  Branch,
  CameraState,
  DataEvent,
  EngineSnapshot,
  HoverInfo,
  SourceDebug,
  TimeScale,
  Tree,
  TreeLogEntry,
  Vec2,
} from '../models/types'
import { rgbToCss } from '../utils/colorUtils'
import {
  distToPolyline,
  formatClock,
  formatClockShort,
  parseClock,
  pointOnPolyline,
} from '../utils/mathUtils'
import { AnimationEngine } from './AnimationEngine'
import { BranchEngine } from './BranchEngine'
import { LeafEngine } from './LeafEngine'
import { ParticleEngine } from './ParticleEngine'
import { Renderer } from './Renderer'
import { clearForest, loadForest, saveForest } from './treeStore'

type SnapshotListener = (snapshot: EngineSnapshot) => void

const LAYOUT_SLOTS: Array<{ x: number; y: number; scale: number }> = [
  { x: -430, y: 90, scale: 0.3 },
  { x: 430, y: 90, scale: 0.3 },
  { x: -310, y: -170, scale: 0.24 },
  { x: 310, y: -170, scale: 0.24 },
  { x: 0, y: -210, scale: 0.22 },
]

export class TreeEngine {
  trees: Tree[] = []
  camera: CameraState = { x: 0, y: 0, zoom: 1 }
  selectedSourceId: string | null = null
  hovered: HoverInfo | null = null
  simulatedMinutes = parseClock('09:30')
  clockRunning = false
  timeScale: TimeScale = 1
  autoSessions = true
  canvasWidth = 0
  canvasHeight = 0
  viewScale = 1.35
  fps = 0
  nowMs = 0

  readonly particles = new ParticleEngine()
  readonly animation = new AnimationEngine()
  readonly leaves = new LeafEngine()
  readonly branches = new BranchEngine(this.leaves)
  readonly renderer = new Renderer()

  private listeners = new Set<SnapshotListener>()
  private raf = 0
  private lastTs = 0
  private fpsFrames = 0
  private fpsTimer = 0
  private snapshotTimer = 0
  private nextTreeIndex = 0
  private originMinutes: number | null = null
  private createdSessionStarts = new Set<number>()
  private canvas: HTMLCanvasElement | null = null
  private updateCount = 0
  inspectedTreeId: string | null = null
  private restoring = false
  private saveTimer = 0
  private static readonly MAX_NODES = 32

  constructor() {
    this.restoreForest()
  }

  subscribe(listener: SnapshotListener): () => void {
    this.listeners.add(listener)
    listener(this.snapshot())
    return () => this.listeners.delete(listener)
  }

  attach(canvas: HTMLCanvasElement): void {
    this.canvas = canvas
    this.resize()
    this.stopLoop()
    this.lastTs = performance.now()
    const loop = (ts: number) => {
      this.raf = requestAnimationFrame(loop)
      const dt = Math.min(48, ts - this.lastTs)
      this.lastTs = ts
      this.tick(dt, ts)
      this.draw()
    }
    this.raf = requestAnimationFrame(loop)
  }

  detach(): void {
    this.stopLoop()
    this.canvas = null
  }

  private stopLoop(): void {
    if (this.raf) cancelAnimationFrame(this.raf)
    this.raf = 0
  }

  resize(): void {
    const canvas = this.canvas
    if (!canvas) return
    const parent = canvas.parentElement ?? canvas
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    const width = parent.clientWidth
    const height = parent.clientHeight
    this.canvasWidth = width
    this.canvasHeight = height
    const fit = Math.min(width * 0.42, height * 0.58) / 240
    this.viewScale = Math.max(0.85, Math.min(2.1, fit))
    canvas.width = Math.max(1, Math.floor(width * dpr))
    canvas.height = Math.max(1, Math.floor(height * dpr))
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`
    const ctx = canvas.getContext('2d')
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    this.particles.init(width, height)
  }

  ingest(event: DataEvent): void {
    if (event.type === 'RESET') {
      this.reset()
      return
    }
    if (event.type === 'CREATE_TREE') {
      this.createTree(parseClock(event.timestamp || formatClock(this.simulatedMinutes)), true)
      this.emitSnapshot()
      return
    }
    if (event.type === 'BIAS_UPDATE') {
      const minutes = this.applyTimestamp(event.timestamp)
      this.applyBias(event.sourceId, event.currentBias, minutes, event.previousBias)
      this.updateCount++
      this.emitSnapshot()
      return
    }
    if (event.type === 'BATCH_UPDATE') {
      const minutes = this.applyTimestamp(event.timestamp)
      this.maybeAutoSession(minutes)
      for (const source of event.sources) {
        this.applyBias(source.id, source.bias, minutes, null)
      }
      this.updateCount++
      this.emitSnapshot()
    }
  }

  createTree(startMinutes: number, force = false): Tree {
    const start = Math.round(startMinutes * 60) / 60
    if (!force) {
      const existing = this.trees.find((t) => Math.abs(t.startMinutes - start) < 0.05)
      if (existing) return existing
    }
    const label = String.fromCharCode(65 + (this.nextTreeIndex % 26))
    this.nextTreeIndex++
    const tree: Tree = {
      id: `tree-${Math.round(start * 1000)}`,
      label: `Tree ${label}`,
      startMinutes: start,
      endMinutes: start + VISUAL.TREE_LIFETIME_MINUTES,
      sources: {},
      sourceOrder: [],
      layout: { x: 0, y: 0, scale: 1, opacity: 1 },
      growing: true,
      hourCandles: [],
      log: [],
    }
    this.trees.push(tree)
    this.createdSessionStarts.add(Math.round(start))
    if (this.originMinutes == null) this.originMinutes = start
    this.layoutTrees()
    return tree
  }

  ensureLiveTree(startMs: number): Tree {
    const existing = this.trees.find((t) => t.startMs === startMs)
    if (existing) {
      existing.growing = !existing.endMs || Date.now() < existing.endMs
      this.layoutTrees()
      return existing
    }
    const startMinutes = clockMinutes(startMs)
    const tree = this.createTree(startMinutes, true)
    tree.startMs = startMs
    tree.id = `tree-${startMs}`
    tree.endMs = startMs + H4_MS
    tree.endMinutes = startMinutes + VISUAL.TREE_LIFETIME_MINUTES
    tree.label = `4H ${formatDayStamp(startMs)}`
    for (const other of this.trees) {
      if (other !== tree && other.startMs != null) other.growing = false
    }
    this.layoutTrees()
    return tree
  }

  syncLiveClock(ts: number): void {
    this.simulatedMinutes = clockMinutes(ts)
  }

  applyLiveBias(
    sourceId: string,
    bias: number,
    ts: number,
    previousOverride: number | null,
  ): void {
    this.syncLiveClock(ts)
    const startMs = Math.floor(ts / H4_MS) * H4_MS
    const tree = this.ensureLiveTree(startMs)
    tree.growing = true
    const minutes = clockMinutes(ts)
    const branch = this.branches.ensureBranch(tree, sourceId, minutes)
    const previous = previousOverride ?? (branch.history.length ? branch.currentBias : null)
    const interp = interpretBias(bias, previous)
    if (previous != null) branch.previousBias = previous
    else branch.previousBias = bias
    branch.currentBias = interp.bias
    branch.lastUpdateMinutes = minutes
    branch.history.push({
      timestamp: formatClock(minutes),
      minutes,
      bias: interp.bias,
    })
    branch.color = interp.color
    branch.strength = interp.strength
    branch.polarity = interp.polarity
    if (this.wantsNode(branch, interp.bias)) {
      this.branches.enqueue(branch, interp, minutes)
      if (this.restoring) this.branches.flushInstant(branch, this.nowMs || performance.now())
    }
    this.appendLog(tree, sourceId, interp.bias, previous, interp.delta, ts)
    this.updateCount++
    this.layoutTrees()
    this.emitSnapshot()
    this.scheduleSave()
  }

  updateHourCandle(ts: number, price: number): void {
    const startMs = windowStart(ts)
    const tree = this.ensureLiveTree(startMs)
    const hour = hourIndex(ts, startMs)
    if (!tree.hourCandles) tree.hourCandles = []
    let candle = tree.hourCandles.find((item) => item.hour === hour)
    if (!candle) {
      candle = {
        hour,
        startMs: startMs + hour * HOUR_MS,
        open: price,
        close: price,
        color: 'neutral',
      }
      tree.hourCandles.push(candle)
      tree.hourCandles.sort((a, b) => a.hour - b.hour)
    }
    candle.close = price
    if (candle.close > candle.open) candle.color = 'green'
    else if (candle.close < candle.open) candle.color = 'red'
    else candle.color = 'neutral'
  }

  seedHourCandle(ts: number, open: number, close: number): void {
    const startMs = windowStart(ts)
    const tree = this.ensureLiveTree(startMs)
    const hour = hourIndex(ts, startMs)
    if (!tree.hourCandles) tree.hourCandles = []
    let candle = tree.hourCandles.find((item) => item.hour === hour)
    if (!candle) {
      candle = {
        hour,
        startMs: startMs + hour * HOUR_MS,
        open,
        close,
        color: 'neutral',
      }
      tree.hourCandles.push(candle)
      tree.hourCandles.sort((a, b) => a.hour - b.hour)
    } else if (candle.open === candle.close) {
      candle.open = open
    }
    if (Date.now() - (startMs + hour * HOUR_MS) >= HOUR_MS) {
      candle.open = open
      candle.close = close
    }
    if (candle.close > candle.open) candle.color = 'green'
    else if (candle.close < candle.open) candle.color = 'red'
    else candle.color = 'neutral'
  }

  inspectTree(id: string | null): void {
    this.inspectedTreeId = id
    this.layoutTrees()
    this.emitSnapshot()
  }

  lastBiasFromArchive(sourceId: string, liveTreeId: string | null): number | null {
    for (let i = this.trees.length - 1; i >= 0; i--) {
      const tree = this.trees[i]
      if (liveTreeId && tree.id === liveTreeId) continue
      const branch = tree.sources[sourceId]
      if (branch && branch.history.length) return branch.currentBias
    }
    return null
  }

  private appendLog(
    tree: Tree,
    sourceId: string,
    bias: number,
    previous: number | null,
    delta: number,
    ts: number,
  ): void {
    if (!tree.log) tree.log = []
    const entry: TreeLogEntry = {
      ts,
      iso: formatStampFull(ts),
      sourceId,
      bias,
      previous,
      delta,
      tone: toneFromDelta(delta),
    }
    tree.log.push(entry)
    if (tree.log.length > 400) tree.log.splice(0, tree.log.length - 400)
  }

  reset(): void {
    for (const tree of this.trees) {
      for (const id of tree.sourceOrder) this.leaves.releaseBranch(tree.sources[id])
    }
    this.trees = []
    this.selectedSourceId = null
    this.hovered = null
    this.simulatedMinutes = parseClock('09:30')
    this.clockRunning = false
    this.nextTreeIndex = 0
    this.originMinutes = null
    this.createdSessionStarts.clear()
    this.updateCount = 0
    this.animation.clear()
    this.branches.resetIds()
    this.camera = { x: 0, y: 0, zoom: 1 }
    this.inspectedTreeId = null
    clearForest()
    this.emitSnapshot()
  }

  setClockRunning(running: boolean): void {
    this.clockRunning = running
  }

  setTimeScale(scale: TimeScale): void {
    this.timeScale = scale
  }

  setAutoSessions(value: boolean): void {
    this.autoSessions = value
  }

  significantHistory(): boolean {
    return this.updateCount > 4 || this.trees.length > 1
  }

  resetView(): void {
    this.camera = { x: 0, y: 0, zoom: 1 }
  }

  zoomAt(screenX: number, screenY: number, factor: number): void {
    const world = this.screenToWorld(screenX, screenY)
    this.camera.zoom = Math.min(3.4, Math.max(0.35, this.camera.zoom * factor))
    const zoom = this.camera.zoom * this.viewScale
    this.camera.x = (screenX - this.canvasWidth * 0.5) / zoom - world.x
    this.camera.y = (this.canvasHeight * 0.78 - screenY) / zoom - world.y
  }

  pan(dx: number, dy: number): void {
    this.camera.x += dx / this.camera.zoom
    this.camera.y -= dy / this.camera.zoom
  }

  handleHover(screenX: number, screenY: number): void {
    const hit = this.hitTest(screenX, screenY)
    this.hovered = hit
  }

  handleClick(screenX: number, screenY: number): void {
    const hit = this.hitTest(screenX, screenY)
    this.selectedSourceId = hit ? hit.sourceId : null
    const treeHit = this.hitTree(screenX, screenY)
    if (treeHit) this.inspectedTreeId = treeHit.id
    else if (!hit) this.inspectedTreeId = null
    this.layoutTrees()
    this.emitSnapshot()
  }

  worldToScreen(x: number, y: number): Vec2 {
    const zoom = this.camera.zoom * this.viewScale
    return {
      x: this.canvasWidth * 0.5 + (x + this.camera.x) * zoom,
      y: this.canvasHeight * 0.78 - (y + this.camera.y) * zoom,
    }
  }

  screenToWorld(x: number, y: number): Vec2 {
    const zoom = this.camera.zoom * this.viewScale || 1
    return {
      x: (x - this.canvasWidth * 0.5) / zoom - this.camera.x,
      y: (this.canvasHeight * 0.78 - y) / zoom - this.camera.y,
    }
  }

  snapshot(): EngineSnapshot {
    const active = this.focusedTree()
    const sources: SourceDebug[] = []
    if (active) {
      for (const id of active.sourceOrder) {
        const b = active.sources[id]
        sources.push({
          sourceId: id,
          bias: b.currentBias,
          previous: b.previousBias,
          delta: b.currentBias - b.previousBias,
          polarity: b.polarity,
          strength: b.strength,
          color: rgbToCss(b.color),
          segments: b.segments.length,
          leaves: b.leaves.length,
        })
      }
    }
    let branchCount = 0
    let leafCount = 0
    for (const tree of this.trees) {
      branchCount += tree.sourceOrder.length
      for (const id of tree.sourceOrder) leafCount += tree.sources[id].leaves.length
    }
    return {
      simulatedTime: formatClock(this.simulatedMinutes),
      simulatedMinutes: this.simulatedMinutes,
      activeTreeId: active?.id ?? null,
      activeTreeLabel: active
        ? active.startMs
          ? `${active.label}–${formatStamp(active.endMs ?? active.startMs + H4_MS)}`
          : `${active.label} ${formatClockShort(active.startMinutes)}–${formatClockShort(active.endMinutes)}`
        : '—',
      treeAgeMinutes: active ? Math.max(0, this.simulatedMinutes - active.startMinutes) : 0,
      treeCount: this.trees.length,
      sourceCount: active?.sourceOrder.length ?? 0,
      branchCount,
      leafCount,
      fps: this.fps,
      canvasWidth: this.canvasWidth,
      canvasHeight: this.canvasHeight,
      waiting: this.trees.every((tree) => tree.sourceOrder.length === 0),
      clockRunning: this.clockRunning,
      sources,
      trees: this.trees.map((t) => ({
        id: t.id,
        label: t.label,
        start: t.startMs ? formatDayStamp(t.startMs) : formatClockShort(t.startMinutes),
        end: t.endMs ? formatDayStamp(t.endMs) : formatClockShort(t.endMinutes),
        growing: t.growing,
        age: Math.max(0, this.simulatedMinutes - t.startMinutes),
        candles: (t.hourCandles ?? []).map((c) => ({ ...c })),
        logCount: t.log?.length ?? 0,
      })),
      selectedSourceId: this.selectedSourceId,
      inspectedTreeId: this.inspectedTreeId,
      inspectedLog: [...(this.focusedTree()?.log ?? [])].slice(-80).reverse(),
    }
  }

  activeTree(): Tree | null {
    const growing = this.trees.filter((t) => t.growing)
    if (growing.length) return growing[growing.length - 1]
    return this.trees[this.trees.length - 1] ?? null
  }

  focusedTree(): Tree | null {
    if (this.inspectedTreeId) {
      const found = this.trees.find((t) => t.id === this.inspectedTreeId)
      if (found) return found
    }
    return this.activeTree()
  }

  private applyTimestamp(timestamp: string): number {
    if (timestamp) {
      const minutes = parseClock(timestamp)
      if (minutes > this.simulatedMinutes || this.trees.length === 0) {
        this.simulatedMinutes = minutes
      }
      return minutes
    }
    return this.simulatedMinutes
  }

  private maybeAutoSession(minutes: number): void {
    if (!this.autoSessions || this.originMinutes == null) return
    const start = nextSessionStart(minutes, this.originMinutes)
    if (start == null) return
    if (this.createdSessionStarts.has(Math.round(start))) return
    if (Math.abs(minutes - start) > 0.6) return
    this.createTree(start)
  }

  private applyBias(
    sourceId: string,
    bias: number,
    minutes: number,
    previousOverride: number | null,
  ): void {
    if (this.trees.length === 0) this.createTree(minutes)
    const targets = this.trees.filter(
      (tree) => minutes + 0.0001 >= tree.startMinutes && minutes <= tree.endMinutes + 0.0001,
    )
    const applyTo = targets.length ? targets : [this.createTree(minutes)]
    for (const tree of applyTo) {
      if (!tree.growing) continue
      const branch = this.branches.ensureBranch(tree, sourceId, minutes)
      const previous = previousOverride ?? (branch.history.length ? branch.currentBias : null)
      const interp = interpretBias(bias, previous)
      if (previous != null) branch.previousBias = previous
      else branch.previousBias = bias
      branch.currentBias = interp.bias
      branch.lastUpdateMinutes = minutes
      branch.history.push({
        timestamp: formatClock(minutes),
        minutes,
        bias: interp.bias,
      })
      branch.color = interp.color
      branch.strength = interp.strength
      branch.polarity = interp.polarity
      if (this.wantsNode(branch, interp.bias)) this.branches.enqueue(branch, interp, minutes)
    }
    this.layoutTrees()
    this.scheduleSave()
  }

  private tick(dtMs: number, ts: number): void {
    this.nowMs = ts
    this.fpsFrames++
    this.fpsTimer += dtMs
    if (this.fpsTimer >= 500) {
      this.fps = Math.round((this.fpsFrames * 1000) / this.fpsTimer)
      this.fpsFrames = 0
      this.fpsTimer = 0
    }
    if (this.clockRunning) {
      this.simulatedMinutes += (dtMs / 1000) * this.timeScale
      this.maybeAutoSession(this.simulatedMinutes)
    }
    for (const tree of this.trees) {
      if (tree.endMs) tree.growing = Date.now() < tree.endMs
      else tree.growing = this.simulatedMinutes < tree.endMinutes
      this.branches.update(tree, dtMs, ts)
    }
    this.animation.update(dtMs)
    this.particles.update(dtMs, this.canvasWidth, this.canvasHeight)
    this.layoutTrees()
    this.snapshotTimer += dtMs
    if (this.snapshotTimer > 180) {
      this.snapshotTimer = 0
      this.emitSnapshot()
    }
  }

  private layoutTrees(): void {
    const focused = this.focusedTree()
    let slot = 0
    for (const tree of this.trees) {
      const ended = !tree.growing
      if (tree === focused) {
        tree.layout = { x: 0, y: 0, scale: 1, opacity: 1 }
      } else {
        const pos = LAYOUT_SLOTS[slot % LAYOUT_SLOTS.length]
        slot++
        tree.layout = {
          x: pos.x,
          y: pos.y,
          scale: ended ? pos.scale * 0.92 : pos.scale,
          opacity: ended ? 0.62 : 0.72,
        }
      }
    }
  }

  private draw(): void {
    const canvas = this.canvas
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    this.renderer.draw(ctx, this)
  }

  private hitTest(screenX: number, screenY: number): HoverInfo | null {
    const world = this.screenToWorld(screenX, screenY)
    let best: { branch: Branch; tree: Tree; dist: number } | null = null
    for (const tree of this.trees) {
      const lx = tree.layout.x
      const ly = tree.layout.y
      const sc = tree.layout.scale
      const local = { x: (world.x - lx) / sc, y: (world.y - ly) / sc }
      for (const id of tree.sourceOrder) {
        const branch = tree.sources[id]
        for (const segment of branch.segments) {
          const d = distToPolyline(local, segment.points, Math.max(0.08, segment.growth))
          const threshold = (10 + segment.endWidth) / (this.camera.zoom * this.viewScale * sc)
          if (d < threshold && (!best || d < best.dist)) best = { branch, tree, dist: d }
        }
      }
    }
    if (!best) return null
    const { branch, tree } = best
    return {
      treeId: tree.id,
      sourceId: branch.sourceId,
      screenX,
      screenY,
      bias: branch.currentBias,
      previousBias: branch.previousBias,
      delta: branch.currentBias - branch.previousBias,
      polarity: branch.polarity,
      strength: branch.strength,
      startTime: formatClockShort(branch.startMinutes),
      lastUpdate: formatClockShort(branch.lastUpdateMinutes),
      ageMinutes: Math.max(0, this.simulatedMinutes - branch.startMinutes),
    }
  }

  private hitTree(screenX: number, screenY: number): Tree | null {
    const world = this.screenToWorld(screenX, screenY)
    let best: { tree: Tree; dist: number } | null = null
    for (const tree of this.trees) {
      const sc = tree.layout.scale || 1
      const local = {
        x: (world.x - tree.layout.x) / sc,
        y: (world.y - tree.layout.y) / sc,
      }
      if (Math.abs(local.x) > 36 || local.y < -24 || local.y > VISUAL.TRUNK_HEIGHT + 36) continue
      const dist = Math.hypot(local.x, local.y - VISUAL.TRUNK_HEIGHT * 0.45)
      if (!best || dist < best.dist) best = { tree, dist }
    }
    return best?.tree ?? null
  }

  private wantsNode(branch: Branch, bias: number): boolean {
    const queued = branch.pending[branch.pending.length - 1]
    const last = queued?.interp.bias ?? branch.segments[branch.segments.length - 1]?.bias
    if (last == null) return true
    if (branch.segments.length + branch.pending.length >= TreeEngine.MAX_NODES) return false
    return Math.abs(bias - last) >= 0.35
  }

  private scheduleSave(): void {
    if (this.restoring || typeof window === 'undefined') return
    window.clearTimeout(this.saveTimer)
    this.saveTimer = window.setTimeout(() => saveForest(this.trees), 450)
  }

  private restoreForest(): void {
    const stored = loadForest()
    if (!stored.length) return
    this.restoring = true
    for (const item of stored) {
      const tree = this.ensureLiveTree(item.startMs)
      for (const [sourceId, nodes] of Object.entries(item.stems || {})) {
        for (const node of nodes) {
          this.applyLiveBias(sourceId, node.bias, item.startMs, node.previous)
        }
      }
    }
    this.restoring = false
    this.emitSnapshot()
  }

  emitSnapshot(): void {
    const snap = this.snapshot()
    for (const listener of this.listeners) listener(snap)
  }

  tipOf(branch: Branch): Vec2 {
    const last = branch.segments[branch.segments.length - 1]
    if (!last || last.points.length === 0) return branch.origin
    return pointOnPolyline(last.points, last.growth)
  }
}
