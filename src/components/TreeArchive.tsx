import type { EngineSnapshot } from '../models/types'

export function TreeArchive({
  snapshot,
  onInspect,
}: {
  snapshot: EngineSnapshot
  onInspect: (id: string | null) => void
}) {
  const trees = [...snapshot.trees].reverse()
  const inspected = snapshot.inspectedTreeId
  return (
    <section className="tree-archive">
      <div className="radar-kicker">4H TREES</div>
      <p>Every 4 hours starts a new tree. Old trees stay here with their logs.</p>
      <div className="archive-list">
        {trees.length === 0 && <div className="archive-empty">No 4H tree yet.</div>}
        {trees.map((tree) => (
          <button
            key={tree.id}
            className={`archive-item ${tree.growing ? 'live' : 'archived'} ${inspected === tree.id ? 'selected' : ''}`}
            onClick={() => onInspect(inspected === tree.id ? null : tree.id)}
          >
            <strong>{tree.label}</strong>
            <span>
              {tree.start}–{tree.end} · {tree.growing ? 'live' : 'kept'}
            </span>
            <div className="archive-candles">
              {[0, 1, 2, 3].map((hour) => {
                const candle = tree.candles.find((item) => item.hour === hour)
                return <i key={hour} className={candle?.color || 'empty'} title={`H${hour + 1} ${candle?.color || 'waiting'}`} />
              })}
            </div>
          </button>
        ))}
      </div>
      {inspected && (
        <div className="archive-log">
          <div className="radar-kicker">TREE LOG</div>
          {snapshot.inspectedLog.length === 0 && <div className="archive-empty">No stem moves yet.</div>}
          {snapshot.inspectedLog.map((entry, index) => (
            <div key={`${entry.ts}-${entry.sourceId}-${index}`} className={`log-row ${entry.tone}`}>
              <span>{entry.iso}</span>
              <b>{entry.sourceId === 'source-1' ? '4H' : entry.sourceId === 'source-2' ? '1H' : entry.sourceId}</b>
              <em>
                {entry.bias.toFixed(2)}
                {entry.delta ? ` ${entry.delta > 0 ? '+' : ''}${entry.delta.toFixed(2)}` : ''}
              </em>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
