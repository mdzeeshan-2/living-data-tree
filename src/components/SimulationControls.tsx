import type { SimInterval, TimeScale } from '../models/types'

interface Props {
  running: boolean
  intervalSec: SimInterval
  timeScale: TimeScale
  autoSessions: boolean
  onStart: () => void
  onStop: () => void
  onReset: () => void
  onInterval: (value: SimInterval) => void
  onTimeScale: (value: TimeScale) => void
  onAutoSessions: (value: boolean) => void
}

const INTERVALS: SimInterval[] = [0.5, 1, 2, 5, 10]
const SCALES: TimeScale[] = [1, 5, 15]

export function SimulationControls({
  running,
  intervalSec,
  timeScale,
  autoSessions,
  onStart,
  onStop,
  onReset,
  onInterval,
  onTimeScale,
  onAutoSessions,
}: Props) {
  return (
    <section className="panel-block">
      <h2>Live Simulation</h2>
      <div className="btn-row">
        <button className={running ? 'ghost' : 'primary'} onClick={onStart} disabled={running}>
          Start
        </button>
        <button className="ghost" onClick={onStop} disabled={!running}>
          Stop
        </button>
        <button className="ghost danger" onClick={onReset}>
          Reset
        </button>
      </div>
      <label>
        Update interval
        <select value={intervalSec} onChange={(e) => onInterval(Number(e.target.value) as SimInterval)}>
          {INTERVALS.map((n) => (
            <option key={n} value={n}>
              {n} sec
            </option>
          ))}
        </select>
      </label>
      <label>
        Time scale
        <select value={timeScale} onChange={(e) => onTimeScale(Number(e.target.value) as TimeScale)}>
          {SCALES.map((n) => (
            <option key={n} value={n}>
              1 real sec = {n} sim min
            </option>
          ))}
        </select>
      </label>
      <label className="check">
        <input
          type="checkbox"
          checked={autoSessions}
          onChange={(e) => onAutoSessions(e.target.checked)}
        />
        Auto-create a tree every 1 simulated hour
      </label>
    </section>
  )
}
