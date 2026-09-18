import { useEffect, useRef } from 'react'
import type { TreeEngine } from '../engine/TreeEngine'

interface Props {
  engine: TreeEngine
  onHover: () => void
}

export function TreeCanvas({ engine, onHover }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drag = useRef({
    active: false,
    moved: false,
    lastX: 0,
    lastY: 0,
  })
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const pinch = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    engine.attach(canvas)
    const onResize = () => engine.resize()
    const onWheel = (e: WheelEvent) => {
      if (e.target instanceof HTMLElement && e.target.closest('button, input, select, textarea, .stem-detail, .control-panel, .tree-archive, .zoom-bar')) {
        return
      }
      const rect = canvas.getBoundingClientRect()
      if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) return
      e.preventDefault()
      const factor = e.deltaY < 0 ? 1.18 : 0.85
      engine.zoomAt(e.clientX - rect.left, e.clientY - rect.top, factor)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return
      if (e.key === '+' || e.key === '=') {
        e.preventDefault()
        engine.zoomBy(1.28)
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault()
        engine.zoomBy(0.78)
      } else if (e.key === '0') {
        engine.resetView()
      }
    }
    window.addEventListener('resize', onResize)
    window.addEventListener('keydown', onKey)
    window.addEventListener('wheel', onWheel, { passive: false })
    const ro = new ResizeObserver(onResize)
    if (canvas.parentElement) ro.observe(canvas.parentElement)
    onResize()
    return () => {
      window.removeEventListener('resize', onResize)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('wheel', onWheel)
      ro.disconnect()
      engine.detach()
    }
  }, [engine])

  return (
    <canvas
      ref={canvasRef}
      className="tree-canvas"
      onPointerDown={(e) => {
        const canvas = canvasRef.current
        canvas?.setPointerCapture(e.pointerId)
        pointers.current.set(e.pointerId, { x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY })
        if (pointers.current.size === 2) {
          const pts = [...pointers.current.values()]
          pinch.current = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y)
          drag.current.active = false
          return
        }
        drag.current = {
          active: true,
          moved: false,
          lastX: e.nativeEvent.offsetX,
          lastY: e.nativeEvent.offsetY,
        }
      }}
      onPointerMove={(e) => {
        const x = e.nativeEvent.offsetX
        const y = e.nativeEvent.offsetY
        if (pointers.current.has(e.pointerId)) pointers.current.set(e.pointerId, { x, y })
        if (pointers.current.size === 2) {
          const pts = [...pointers.current.values()]
          const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y)
          if (pinch.current > 8 && dist > 8) {
            const midX = (pts[0].x + pts[1].x) / 2
            const midY = (pts[0].y + pts[1].y) / 2
            engine.zoomAt(midX, midY, dist / pinch.current)
          }
          pinch.current = dist
          drag.current.moved = true
          return
        }
        if (drag.current.active) {
          const dx = x - drag.current.lastX
          const dy = y - drag.current.lastY
          if (Math.hypot(dx, dy) > 3) drag.current.moved = true
          engine.pan(dx, dy)
          drag.current.lastX = x
          drag.current.lastY = y
        } else {
          engine.handleHover(x, y)
          onHover()
        }
      }}
      onPointerUp={(e) => {
        const x = e.nativeEvent.offsetX
        const y = e.nativeEvent.offsetY
        pointers.current.delete(e.pointerId)
        pinch.current = 0
        if (pointers.current.size < 2 && !drag.current.moved) engine.handleClick(x, y)
        drag.current.active = false
        drag.current.moved = false
      }}
      onPointerLeave={() => {
        engine.hovered = null
        drag.current.active = false
        pointers.current.clear()
        onHover()
      }}
    />
  )
}
