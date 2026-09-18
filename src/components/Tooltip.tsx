import type { HoverInfo } from '../models/types'

export function Tooltip({ info }: { info: HoverInfo | null }) {
  if (!info) return null
  const nowLabel = info.live ? 'now' : 'close'
  const compareDelta = info.bias - (info.anchorBias ?? info.previousBias)
  return (
    <div
      className="tooltip"
      style={{ left: info.screenX + 18, top: info.screenY + 14 }}
    >
      <div className="tooltip-title">{info.title}</div>
      <Row label="date" value={info.date} />
      <Row label="window" value={`${info.window} ${info.zone}`} />
      <Row
        label={`${info.anchorLabel} ${info.anchorField}`}
        value={info.anchorBias == null ? '—' : info.anchorBias.toFixed(2)}
      />
      <Row label={`${nowLabel} ${info.anchorField}`} value={info.bias.toFixed(2)} />
      <Row
        label="change"
        value={`${compareDelta >= 0 ? '+' : ''}${compareDelta.toFixed(2)}`}
      />
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
