import type { StemDetail as StemDetailData } from '../models/types'

export function StemDetail({
  detail,
  onClose,
}: {
  detail: StemDetailData | null
  onClose: () => void
}) {
  if (!detail) return null
  const deltaText = `${detail.delta >= 0 ? '+' : ''}${detail.delta.toFixed(2)}`
  const tone = detail.delta > 0.0001 ? 'green' : detail.delta < -0.0001 ? 'red' : ''
  const nowLabel = detail.live ? 'now' : 'close'
  return (
    <aside className="stem-detail">
      <div className="stem-detail-head">
        <div>
          <div className="radar-kicker">{detail.title}</div>
          <strong>{detail.date}</strong>
        </div>
        <button type="button" onClick={onClose} aria-label="Close stem details">
          ×
        </button>
      </div>
      <p>
        {detail.window} {detail.zone}
      </p>
      <div className={`tooltip-row ${tone}`}>
        <span>
          {detail.anchorLabel} {detail.anchorField}
        </span>
        <strong>{detail.anchorBias == null ? '—' : detail.anchorBias.toFixed(2)}</strong>
      </div>
      <div className={`tooltip-row ${tone}`}>
        <span>
          {nowLabel} {detail.anchorField}
        </span>
        <strong>{detail.currentBias.toFixed(2)}</strong>
      </div>
      <div className={`tooltip-row ${tone}`}>
        <span>change</span>
        <strong>{deltaText}</strong>
      </div>
      <div className="radar-kicker stem-history-kicker">HOW IT CHANGED</div>
      <div className="stem-history">
        {detail.history.length === 0 && <div className="archive-empty">No moves stored yet.</div>}
        {detail.history.map((entry, index) => (
          <div key={`${entry.time}-${index}`} className={`log-row ${entry.tone}`}>
            <span>{entry.time}</span>
            <b>{entry.bias.toFixed(2)}</b>
            <em>
              {entry.delta ? `${entry.delta > 0 ? '+' : ''}${entry.delta.toFixed(2)}` : 'open'}
            </em>
          </div>
        ))}
      </div>
    </aside>
  )
}
