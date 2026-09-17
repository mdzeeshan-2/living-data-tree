import type { HoverInfo } from '../models/types'
import { polarityLabel } from '../data/DataProcessor'

export function Tooltip({ info }: { info: HoverInfo | null }) {
  if (!info) return null
  return (
    <div
      className="tooltip"
      style={{ left: info.screenX + 18, top: info.screenY + 14 }}
    >
      <div className="tooltip-title">{info.sourceId.replace('-', ' ').toUpperCase()}</div>
      <Row label="Bias" value={info.bias.toFixed(1)} />
      <Row label="Previous" value={info.previousBias.toFixed(1)} />
      <Row label="Change" value={`${info.delta >= 0 ? '+' : ''}${info.delta.toFixed(1)}`} />
      <Row label="State" value={polarityLabel(info.polarity)} />
      <Row label="Strength" value={info.strength.toFixed(2)} />
      <Row label="Start" value={info.startTime} />
      <Row label="Updated" value={info.lastUpdate} />
      <Row label="Age" value={`${Math.round(info.ageMinutes)} min`} />
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="tooltip-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}
