import type { PresetName } from '../models/types'

interface SourceDraft {
  id: string
  label: string
  bias: string
}

interface Props {
  timestamp: string
  sources: SourceDraft[]
  presetPlaying: PresetName | null
  liveRadar?: boolean
  onTimestamp: (value: string) => void
  onBias: (id: string, value: string) => void
  onSend: () => void
  onNewTree: () => void
  onClear: () => void
  onRandom: () => void
  onPreset: (name: PresetName) => void
}

export function DataInput({
  timestamp,
  sources,
  presetPlaying,
  liveRadar,
  onTimestamp,
  onBias,
  onSend,
  onNewTree,
  onClear,
  onRandom,
  onPreset,
}: Props) {
  return (
    <section className="panel-block">
      <h2>Data Input</h2>
      <label>
        Timestamp
        <input value={timestamp} onChange={(e) => onTimestamp(e.target.value)} placeholder="09:30" />
      </label>
      {sources
        .filter((source) => !liveRadar || source.id === 'source-1' || source.id === 'source-2')
        .map((source) => (
        <label key={source.id}>
          {source.label}
          <input
            type="number"
            step="0.01"
            value={source.bias}
            readOnly={!!liveRadar && (source.id === 'source-1' || source.id === 'source-2')}
            onChange={(e) => onBias(source.id, e.target.value)}
          />
        </label>
      ))}
      <button className="primary wide" onClick={onSend}>
        Send Data
      </button>
      <div className="btn-row two">
        <button className="ghost" onClick={onNewTree}>
          Create New Tree
        </button>
        <button className="ghost" onClick={onClear}>
          Clear
        </button>
      </div>
      <button className="ghost wide" onClick={onRandom}>
        Random Data
      </button>
      <div className="preset-grid">
        <button className={presetPlaying === 'STEADY_NEGATIVE' ? 'active' : ''} onClick={() => onPreset('STEADY_NEGATIVE')}>
          Steady Negative
        </button>
        <button className={presetPlaying === 'STEADY_POSITIVE' ? 'active' : ''} onClick={() => onPreset('STEADY_POSITIVE')}>
          Steady Positive
        </button>
        <button className={presetPlaying === 'REVERSAL' ? 'active' : ''} onClick={() => onPreset('REVERSAL')}>
          Reversal
        </button>
        <button className={presetPlaying === 'VOLATILE' ? 'active' : ''} onClick={() => onPreset('VOLATILE')}>
          Volatile
        </button>
      </div>
    </section>
  )
}
