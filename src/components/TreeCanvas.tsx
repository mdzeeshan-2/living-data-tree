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

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    engine.attach(canvas)
    const onResize = () => engine.resize()
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const rect = canvas.getBoundingClientRect()
      const factor = e.deltaY < 0 ? 1.08 : 0.92
      engine.zoomAt(e.clientX - rect.left, e.clientY - rect.top, factor)
    }
    window.addEventListener('resize', onResize)
    canvas.addEventListener('wheel', onWheel, { passive: false })
    const ro = new ResizeObserver(onResize)
    if (canvas.parentElement) ro.observe(canvas.parentElement)
    onResize()
    return () => {
      window.removeEventListener('resize', onResize)
      canvas.removeEventListener('wheel', onWheel)
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
        if (!drag.current.moved) engine.handleClick(x, y)
        drag.current.active = false
        drag.current.moved = false
      }}
      onPointerLeave={() => {
        engine.hovered = null
        drag.current.active = false
        onHover()
      }}
    />
  )
}
