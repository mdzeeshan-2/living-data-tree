interface Props {
  zoom: number
  onZoomIn: () => void
  onZoomOut: () => void
  onReset: () => void
}

export function ZoomBar({ zoom, onZoomIn, onZoomOut, onReset }: Props) {
  return (
    <div className="zoom-bar">
      <button type="button" onClick={onZoomIn} aria-label="Zoom in">
        +
      </button>
      <button type="button" onClick={onZoomOut} aria-label="Zoom out">
        −
      </button>
      <button type="button" className="zoom-reset" onClick={onReset}>
        {zoom.toFixed(1)}×
      </button>
    </div>
  )
}
