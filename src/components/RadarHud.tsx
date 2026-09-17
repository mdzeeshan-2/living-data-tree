import type { RadarView } from '../hooks/useH4Radar'

function toneClass(delta: number) {
  if (delta > 0) return 'green'
  if (delta < 0) return 'red'
  return 'neutral'
}

function StemCell({
  title,
  view,
  versus,
}: {
  title: string
  view: RadarView
  versus: 'hour' | '30m'
}) {
  const tone = toneClass(view.delta)
  const shown = view.bias == null ? '—' : view.bias.toFixed(2)
  const prior = versus === '30m' ? 'last 30m' : 'last hour'
  return (
    <div>
      <span>
        {title} · vs {view.lastHourLabel}
      </span>
      <strong className={tone}>{shown}</strong>
      <small className={tone}>
        {prior} {view.previousBias == null ? '—' : view.previousBias.toFixed(2)} · {view.delta >= 0 ? '+' : ''}
        {view.delta.toFixed(2)} {view.delta > 0 ? 'UP' : view.delta < 0 ? 'DOWN' : 'FLAT'}
      </small>
    </div>
  )
}

export function RadarHud({
  h4,
  h1,
  h30,
}: {
  h4?: RadarView | null
  h1?: RadarView | null
  h30?: RadarView | null
}) {
  const a = h4
  const b = h1
  const c = h30
  const live = !!(a?.connected || b?.connected || c?.connected)
  return (
    <section className="radar-hud">
      <div className="radar-kicker">
        <span className={live ? 'dot live' : 'dot'} />
        LIVE STEMS
        <em>{live ? 'LIVE' : 'WAITING'}</em>
      </div>
      <div className="radar-bias-row three-source">
        {a && <StemCell title="4H stem" view={a} versus="hour" />}
        {b && <StemCell title="1H stem" view={b} versus="hour" />}
        {c && <StemCell title="30m stem" view={c} versus="30m" />}
      </div>
      <div className="hour-grid">
        {h4?.hours?.map((mark) => (
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
        <span>{h4?.live?.action || h1?.live?.action || 'Bias only on 30m'}</span>
        <span>{h1?.live?.price || h4?.live?.price ? `BTC ${h1?.live?.price || h4?.live?.price}` : ''}</span>
        <span>{h30?.updatedAt || h1?.updatedAt || h4?.updatedAt}</span>
      </div>
      {!live && (
        <p className="radar-help">
          Reload the 4H, 1H, and 30m radar extensions. 4H is left, 1H is right, 30m is the center stem. Only 30m
          bias is used.
        </p>
      )}
    </section>
  )
}
