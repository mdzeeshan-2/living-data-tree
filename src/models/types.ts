export interface Vec2 {
  x: number
  y: number
}

export interface RGB {
  r: number
  g: number
  b: number
}

export type Polarity = 'negative' | 'positive' | 'neutral'

export type LeafKind = 'oval' | 'pointed' | 'curved' | 'cluster'

export interface VisualInterpretation {
  polarity: Polarity
  signed: number
  strength: number
  color: RGB
  leafColor: RGB
  width: number
  leafSize: number
  growth: number
  duration: number
  leafCount: number
  delta: number
  deltaNorm: number
  isReversal: boolean
  bias: number
  previousBias: number | null
}

export interface Leaf {
  id: number
  segmentId: number
  t: number
  side: number
  offset: number
  size: number
  rotation: number
  kind: LeafKind
  color: RGB
  opacity: number
  scale: number
  targetScale: number
  swayPhase: number
  bornAt: number
  clusterSpread: number
}

export interface Twig {
  points: Vec2[]
  startWidth: number
  endWidth: number
}

export interface Segment {
  id: number
  start: Vec2
  end: Vec2
  c1: Vec2
  c2: Vec2
  points: Vec2[]
  twigs: Twig[]
  startWidth: number
  endWidth: number
  color: RGB
  targetColor: RGB
  displayColor: RGB
  bias: number
  previousBias: number
  delta: number
  growth: number
  growthDuration: number
  createdSimMinutes: number
  direction: number
}

export interface PendingGrowth {
  interp: VisualInterpretation
  simMinutes: number
}

export interface Branch {
  sourceId: string
  sourceIndex: number
  seed: number
  baseAngle: number
  origin: Vec2
  segments: Segment[]
  leaves: Leaf[]
  pending: PendingGrowth[]
  currentBias: number
  previousBias: number
  history: BiasSample[]
  strength: number
  polarity: Polarity
  color: RGB
  lastUpdateMinutes: number
  startMinutes: number
}

export interface BiasSample {
  timestamp: string
  minutes: number
  bias: number
}

export interface TreeLayout {
  x: number
  y: number
  scale: number
  opacity: number
}

export interface HourCandle {
  hour: number
  startMs: number
  open: number
  close: number
  color: 'green' | 'red' | 'neutral'
}

export interface TreeLogEntry {
  ts: number
  iso: string
  sourceId: string
  bias: number
  previous: number | null
  delta: number
  tone: 'green' | 'red' | 'neutral'
}

export interface Tree {
  id: string
  label: string
  startMinutes: number
  endMinutes: number
  startMs?: number
  endMs?: number
  sources: Record<string, Branch>
  sourceOrder: string[]
  layout: TreeLayout
  growing: boolean
  hourCandles: HourCandle[]
  log: TreeLogEntry[]
}

export interface H4LiveSnapshot {
  ok?: boolean
  error?: string
  ts?: number
  iso?: string
  price?: string
  action?: string
  color?: string
  biasColor?: string
  h4Bias?: string
  h4Color?: string
  h1Bias?: string
  h1Color?: string
  h30Bias?: string | number
  bias?: string | number
  d1Bias?: string
  d1Color?: string
  marketState?: string
  velocity?: string
  accel?: string
  pressure?: string
  reversal?: string
  conviction?: string
  alignment?: string
  extension?: string
  projected?: string
  trendRsi?: string
  macdVolF?: string
  priceMomentum?: string
  guide?: string
  feed?: string
}

export interface HourMark {
  hour: number
  at: number
  label: string
  bias: number
  delta: number
  tone: 'green' | 'red' | 'neutral'
}

export interface BlunderAlert {
  field: string
  title: string
  detail: string
  color: string
}

export interface BiasUpdateEvent {
  type: 'BIAS_UPDATE'
  timestamp: string
  sourceId: string
  previousBias: number | null
  currentBias: number
}

export interface BatchUpdateEvent {
  type: 'BATCH_UPDATE'
  timestamp: string
  sources: Array<{ id: string; bias: number }>
}

export interface CreateTreeEvent {
  type: 'CREATE_TREE'
  timestamp: string
}

export interface ResetEvent {
  type: 'RESET'
}

export type DataEvent =
  | BiasUpdateEvent
  | BatchUpdateEvent
  | CreateTreeEvent
  | ResetEvent

export type DataListener = (event: DataEvent) => void

export interface DataProvider {
  start(): void
  stop(): void
  subscribe(listener: DataListener): () => void
  unsubscribe(listener: DataListener): void
}

export interface CameraState {
  x: number
  y: number
  zoom: number
}

export interface SourceDebug {
  sourceId: string
  bias: number
  previous: number
  delta: number
  polarity: Polarity
  strength: number
  color: string
  segments: number
  leaves: number
}

export interface EngineSnapshot {
  simulatedTime: string
  simulatedMinutes: number
  activeTreeId: string | null
  activeTreeLabel: string
  treeAgeMinutes: number
  treeCount: number
  sourceCount: number
  branchCount: number
  leafCount: number
  fps: number
  canvasWidth: number
  canvasHeight: number
  waiting: boolean
  clockRunning: boolean
  sources: SourceDebug[]
  trees: Array<{
    id: string
    label: string
    start: string
    end: string
    growing: boolean
    age: number
    candles: HourCandle[]
    logCount: number
  }>
  selectedSourceId: string | null
  inspectedTreeId: string | null
  inspectedLog: TreeLogEntry[]
}

export interface HoverInfo {
  treeId: string
  sourceId: string
  screenX: number
  screenY: number
  bias: number
  previousBias: number
  delta: number
  polarity: Polarity
  strength: number
  startTime: string
  lastUpdate: string
  ageMinutes: number
}

export type TimeScale = 1 | 5 | 15
export type SimInterval = 0.5 | 1 | 2 | 5 | 10
export type PresetName = 'STEADY_NEGATIVE' | 'STEADY_POSITIVE' | 'REVERSAL' | 'VOLATILE'
