import type { RadarView } from '../hooks/useH4Radar'

function toneClass(delta: number) {
  if (delta > 0) return 'green'
  if (delta < 0) return 'red'
  return 'neutral'
}

export function RadarHud({
  h4,
  h1,
}: {
  h4: RadarView
  h1: RadarView
}) {
  const h4Tone = toneClass(h4.delta)
  const h1Tone = toneClass(h1.delta)
  return (
    <section className="radar-hud">
      <div className="radar-kicker">
        <span className={h4.connected || h1.connected ? 'dot live' : 'dot'} />
        LIVE STEMS
        <em>{h4.connected || h1.connected ? 'LIVE' : 'WAITING'}</em>
      </div>
      <div className="radar-bias-row two-source">
        <div>
          <span>4H stem · vs {h4.lastHourLabel}</span>
          <strong className={h4Tone}>
            {h4.live?.h4Bias ?? (h4.bias == null ? '—' : h4.bias.toFixed(2))}
          </strong>
          <small className={h4Tone}>
            last hour {h4.previousBias == null ? '—' : h4.previousBias.toFixed(2)} · {h4.delta >= 0 ? '+' : ''}
            {h4.delta.toFixed(2)} {h4.delta > 0 ? 'UP' : h4.delta < 0 ? 'DOWN' : 'FLAT'}
          </small>
        </div>
        <div>
          <span>1H stem · vs {h1.lastHourLabel}</span>
          <strong className={h1Tone}>
            {h1.live?.h1Bias ?? (h1.bias == null ? '—' : h1.bias.toFixed(2))}
          </strong>
          <small className={h1Tone}>
            last hour {h1.previousBias == null ? '—' : h1.previousBias.toFixed(2)} · {h1.delta >= 0 ? '+' : ''}
            {h1.delta.toFixed(2)} {h1.delta > 0 ? 'UP' : h1.delta < 0 ? 'DOWN' : 'FLAT'}
          </small>
        </div>
      </div>
      <div className="hour-grid">
        {h4.hours.map((mark) => (
          <div key={`h4-${mark.hour}`} className={`hour-cell ${Number.isFinite(mark.bias) ? mark.tone : 'empty'}`}>
            <span>4H H{mark.hour + 1} {mark.label}</span>
            <b>{Number.isFinite(mark.bias) ? mark.bias.toFixed(2) : 'waiting'}</b>
            <small>
              {mark.hour === 0 || !Number.isFinite(mark.bias)
                ? 'open'
                : `${mark.delta >= 0 ? '+' : ''}${mark.delta.toFixed(2)}`}
            </small>
          </div>
        ))}
      </div>
      <div className="radar-meta">
        <span>{h4.live?.action || h1.live?.action || 'No action yet'}</span>
        <span>{h1.live?.price || h4.live?.price ? `BTC ${h1.live?.price || h4.live?.price}` : ''}</span>
        <span>{h1.updatedAt || h4.updatedAt}</span>
      </div>
      {!h4.connected && !h1.connected && (
        <p className="radar-help">
          Reload both radar logger extensions, keep them running, and leave this page open. 4H
          feeds the left stem, 1H feeds the right stem.
        </p>
      )}
    </section>
  )
}
