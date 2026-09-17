import { useEffect, useMemo, useState } from 'react'
import { BlunderBanner } from './components/BlunderBanner'
import { ControlPanel } from './components/ControlPanel'
import { DebugPanel } from './components/DebugPanel'
import { RadarHud } from './components/RadarHud'
import { Tooltip } from './components/Tooltip'
import { TreeArchive } from './components/TreeArchive'
import { TreeCanvas } from './components/TreeCanvas'
import { TreeInfo } from './components/TreeInfo'
import { DEFAULT_SOURCES } from './config/visualConfig'
import { useH1Radar } from './hooks/useH1Radar'
import { useH4Radar } from './hooks/useH4Radar'
import { useH30Radar } from './hooks/useH30Radar'
import { useSimulation } from './hooks/useSimulation'
import { useTreeEngine } from './hooks/useTreeEngine'
import { formatClock, parseClock } from './utils/mathUtils'

const SOURCE_META = [
  { id: 'source-1', label: '4H stem · h4_bias' },
  { id: 'source-2', label: '1H stem · h1_bias' },
  { id: 'source-3', label: '30m stem · bias' },
]

export default function App() {
  const { engine, snapshot, hover, setHover } = useTreeEngine()
  const sim = useSimulation(engine)
  const [liveRadar, setLiveRadar] = useState(true)
  const radar = useH4Radar(engine, liveRadar)
  const h1Radar = useH1Radar(engine, liveRadar)
  const h30Radar = useH30Radar(engine, liveRadar)
  const [timestamp, setTimestamp] = useState('09:30')
  const [biases, setBiases] = useState<Record<string, string>>({
    'source-1': '-20',
    'source-2': '-5',
    'source-3': '3',
  })
  const [debug, setDebug] = useState(false)
  const [autoSessions, setAutoSessions] = useState(true)
  const [, bump] = useState(0)

  const sources = useMemo(
    () =>
      SOURCE_META.map((s) => ({
        id: s.id,
        label: s.label,
        bias:
          s.id === 'source-1' && radar.bias != null
            ? String(radar.bias)
            : s.id === 'source-2' && h1Radar.bias != null
              ? String(h1Radar.bias)
              : s.id === 'source-3' && h30Radar.bias != null
                ? String(h30Radar.bias)
                : (biases[s.id] ?? '0'),
      })),
    [biases, radar.bias, h1Radar.bias, h30Radar.bias],
  )

  useEffect(() => {
    if (liveRadar) engine.setAutoSessions(false)
    else engine.setAutoSessions(autoSessions)
  }, [liveRadar, autoSessions, engine])

  useEffect(() => {
    if (!sim.running && !sim.presetPlaying) return
    setTimestamp(snapshot.simulatedTime.slice(0, 5))
    if (snapshot.sources.length === 0) return
    setBiases((prev) => {
      const next = { ...prev }
      for (const source of snapshot.sources) {
        next[source.sourceId] = String(Math.round(source.bias * 10) / 10)
      }
      return next
    })
  }, [sim.running, sim.presetPlaying, snapshot.simulatedTime, snapshot.sources])

  const parsedSources = () =>
    sources.map((s) => ({
      id: s.id,
      bias: Number(s.bias) || 0,
    }))

  const bumpHover = () => {
    setHover(engine.hovered ? { ...engine.hovered } : null)
    bump((n) => n + 1)
  }

  const afterSend = () => {
    const next = parseClock(timestamp) + 1
    setTimestamp(formatClock(next).slice(0, 5))
    const fromEngine = engine.activeTree()
    if (fromEngine) {
      const nextBiases: Record<string, string> = { ...biases }
      for (const id of fromEngine.sourceOrder) {
        nextBiases[id] = String(fromEngine.sources[id].currentBias)
      }
      setBiases(nextBiases)
    }
  }

  const handleSend = () => {
    sim.sendCurrent(timestamp, parsedSources())
    afterSend()
  }

  const handleRandom = () => {
    const next = sim.randomOnce(timestamp)
    const map: Record<string, string> = { ...biases }
    for (const s of next) map[s.id] = String(Math.round(s.bias * 10) / 10)
    setBiases(map)
    afterSend()
  }

  const handleReset = () => {
    if (engine.significantHistory()) {
      const ok = window.confirm('Clear all trees, history, and simulated time?')
      if (!ok) return
    }
    sim.resetProvider()
    engine.reset()
    setTimestamp('09:30')
    setBiases({
      'source-1': String(DEFAULT_SOURCES[0].bias),
      'source-2': String(DEFAULT_SOURCES[1].bias),
      'source-3': String(DEFAULT_SOURCES[2].bias),
    })
  }

  const handleClear = () => {
    setBiases({
      'source-1': '',
      'source-2': '',
      'source-3': '',
    })
  }

  const waiting = snapshot.waiting && !radar.connected && !h1Radar.connected && !h30Radar.connected

  return (
    <div className="app">
      <main className="stage">
        <TreeCanvas engine={engine} onHover={bumpHover} />
        <TreeInfo
          snapshot={snapshot}
          live={liveRadar}
          clockLabel={
            radar.live?.ts
              ? new Date(radar.live.ts).toLocaleTimeString('en-GB', { hour12: false })
              : h1Radar.live?.ts
                ? new Date(h1Radar.live.ts).toLocaleTimeString('en-GB', { hour12: false })
              : h30Radar.live?.ts
                ? new Date(h30Radar.live.ts).toLocaleTimeString('en-GB', { hour12: false })
                : snapshot.simulatedTime
          }
        />
        {liveRadar && <RadarHud h4={radar} h1={h1Radar} h30={h30Radar} />}
        <TreeArchive snapshot={snapshot} onInspect={(id) => engine.inspectTree(id)} />
        <BlunderBanner
          alerts={[
            ...radar.blunders.map((alert) => ({ ...alert, field: `4H ${alert.field}` })),
            ...h1Radar.blunders.map((alert) => ({ ...alert, field: `1H ${alert.field}` })),
          ]}
        />
        {waiting && (
          <div className="waiting-overlay">
            <div>WAITING FOR RADAR</div>
            <span>Reload the 4H, 1H, and 30m logger extensions, then refresh this page. 4H grows the left stem, 1H the right, 30m the center.</span>
          </div>
        )}
        <Tooltip info={hover} />
        {debug && (
          <DebugPanel snapshot={snapshot} animationCount={engine.animation.activeCount} />
        )}
      </main>
      <ControlPanel
        timestamp={timestamp}
        sources={sources}
        presetPlaying={sim.presetPlaying}
        running={sim.running}
        intervalSec={sim.intervalSec}
        timeScale={sim.timeScale}
        autoSessions={autoSessions}
        debug={debug}
        liveRadar={liveRadar}
        onLiveRadar={setLiveRadar}
        onTimestamp={setTimestamp}
        onBias={(id, value) => setBiases((prev) => ({ ...prev, [id]: value }))}
        onSend={handleSend}
        onNewTree={() => engine.ingest({ type: 'CREATE_TREE', timestamp })}
        onClear={handleClear}
        onRandom={handleRandom}
        onPreset={(name) => sim.playPreset(name, timestamp)}
        onStart={sim.start}
        onStop={sim.stop}
        onReset={handleReset}
        onInterval={sim.changeInterval}
        onTimeScale={sim.changeTimeScale}
        onAutoSessions={(value) => {
          setAutoSessions(value)
          if (!liveRadar) engine.setAutoSessions(value)
        }}
        onToggleDebug={() => setDebug((v) => !v)}
        onResetView={() => engine.resetView()}
        onZoom={(factor) => engine.zoomAt(engine.canvasWidth / 2, engine.canvasHeight / 2, factor)}
      />
    </div>
  )
}
