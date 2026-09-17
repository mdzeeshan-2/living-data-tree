import type { BlunderAlert } from '../models/types'

export function BlunderBanner({ alerts }: { alerts: BlunderAlert[] }) {
  if (!alerts.length) return null
  return (
    <aside className="blunder-banner">
      <div className="blunder-kicker">HEAVY SIGNAL</div>
      {alerts.map((alert) => (
        <div key={`${alert.field}-${alert.title}`} className={`blunder-card ${alert.color.toLowerCase()}`}>
          <span>{alert.field}</span>
          <strong>{alert.title}</strong>
          <p>{alert.detail}</p>
        </div>
      ))}
    </aside>
  )
}
