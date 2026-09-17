import type { EngineSnapshot } from '../models/types'
import { polarityLabel } from '../data/DataProcessor'

export function DebugPanel({
  snapshot,
  animationCount,
}: {
  snapshot: EngineSnapshot
  animationCount: number
}) {
  return (
    <aside className="debug-panel">
      <div className="debug-title">DEBUG</div>
      <Line label="Time" value={snapshot.simulatedTime} />
      <Line label="Active" value={snapshot.activeTreeLabel} />
      <Line label="Tree age" value={`${Math.round(snapshot.treeAgeMinutes)} min`} />
      <Line label="Trees" value={String(snapshot.treeCount)} />
      <Line label="Sources" value={String(snapshot.sourceCount)} />
      <Line label="Branches" value={String(snapshot.branchCount)} />
      <Line label="Leaves" value={String(snapshot.leafCount)} />
      <Line label="Animation" value={String(animationCount)} />
      <Line label="FPS" value={String(snapshot.fps)} />
      <Line label="Canvas" value={`${snapshot.canvasWidth}×${snapshot.canvasHeight}`} />
      {snapshot.sources.map((s) => (
        <div key={s.sourceId} className="debug-source">
          <div className="debug-source-title">{s.sourceId}</div>
          <Line label="Bias" value={s.bias.toFixed(1)} />
          <Line label="Previous" value={s.previous.toFixed(1)} />
          <Line label="Delta" value={`${s.delta >= 0 ? '+' : ''}${s.delta.toFixed(1)}`} />
          <Line label="State" value={polarityLabel(s.polarity)} />
          <Line label="Strength" value={s.strength.toFixed(2)} />
          <div className="debug-swatch" style={{ background: s.color }} />
        </div>
      ))}
    </aside>
  )
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="debug-line">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  )
}
