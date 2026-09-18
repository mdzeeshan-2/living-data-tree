import type { ReactNode } from 'react'
import { DataInput } from './DataInput'
import { SimulationControls } from './SimulationControls'
import type { PresetName, SimInterval, TimeScale } from '../models/types'

interface SourceDraft {
  id: string
  label: string
  bias: string
}

interface Props {
  timestamp: string
  sources: SourceDraft[]
  presetPlaying: PresetName | null
  running: boolean
  intervalSec: SimInterval
  timeScale: TimeScale
  autoSessions: boolean
  debug: boolean
  liveRadar: boolean
  children?: ReactNode
  onTimestamp: (value: string) => void
  onBias: (id: string, value: string) => void
  onSend: () => void
  onNewTree: () => void
  onClear: () => void
  onRandom: () => void
  onPreset: (name: PresetName) => void
  onStart: () => void
  onStop: () => void
  onReset: () => void
  onInterval: (value: SimInterval) => void
  onTimeScale: (value: TimeScale) => void
  onAutoSessions: (value: boolean) => void
  onToggleDebug: () => void
  onLiveRadar: (value: boolean) => void
  onResetView: () => void
  onZoom: (factor: number) => void
}

export function ControlPanel(props: Props) {
  return (
    <aside className="control-panel">
      <header className="panel-header">
        <div className="kicker">ORGANISM</div>
        <h1>Living Tree</h1>
        <p>Click a tree or stem to zoom into its 4H window. Each stem compares the :29 bias at the start of that window with the current bias.</p>
      </header>
      <section className="panel-block">
        <label className="check">
          <input
            type="checkbox"
            checked={props.liveRadar}
            onChange={(e) => props.onLiveRadar(e.target.checked)}
          />
          Live radar · 4H + 1H + 30m stems
        </label>
      </section>
      <DataInput
        timestamp={props.timestamp}
        sources={props.sources}
        presetPlaying={props.presetPlaying}
        liveRadar={props.liveRadar}
        onTimestamp={props.onTimestamp}
        onBias={props.onBias}
        onSend={props.onSend}
        onNewTree={props.onNewTree}
        onClear={props.onClear}
        onRandom={props.onRandom}
        onPreset={props.onPreset}
      />
      <SimulationControls
        running={props.running}
        intervalSec={props.intervalSec}
        timeScale={props.timeScale}
        autoSessions={props.autoSessions}
        onStart={props.onStart}
        onStop={props.onStop}
        onReset={props.onReset}
        onInterval={props.onInterval}
        onTimeScale={props.onTimeScale}
        onAutoSessions={props.onAutoSessions}
      />
      <section className="panel-block">
        <h2>Camera</h2>
        <div className="btn-row two">
          <button className="ghost" onClick={() => props.onZoom(1.28)}>
            Zoom in
          </button>
          <button className="ghost" onClick={() => props.onZoom(0.78)}>
            Zoom out
          </button>
        </div>
        <button className="ghost wide" onClick={props.onResetView}>
          Reset View
        </button>
      </section>
      <section className="panel-block">
        <label className="check">
          <input type="checkbox" checked={props.debug} onChange={props.onToggleDebug} />
          Debug mode
        </label>
      </section>
      {props.children}
    </aside>
  )
}
