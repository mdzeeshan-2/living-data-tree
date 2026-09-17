import type { EngineSnapshot } from '../models/types'

export function TreeInfo({
  snapshot,
  live,
  clockLabel,
}: {
  snapshot: EngineSnapshot
  live?: boolean
  clockLabel?: string
}) {
  return (
    <div className="tree-info">
      <div className="tree-info-kicker">{live ? 'REAL TIME' : 'SIMULATED TIME'}</div>
      <div className="tree-info-time">{clockLabel || snapshot.simulatedTime}</div>
      <div className="tree-info-meta">
        <span>{snapshot.activeTreeLabel}</span>
        <span>Age {Math.round(snapshot.treeAgeMinutes)} min</span>
      </div>
    </div>
  )
}
