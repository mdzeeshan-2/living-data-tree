import { useEffect, useRef, useState } from 'react'
import { TreeEngine } from '../engine/TreeEngine'
import type { EngineSnapshot, HoverInfo } from '../models/types'

export function useTreeEngine() {
  const engineRef = useRef<TreeEngine | null>(null)
  if (!engineRef.current) engineRef.current = new TreeEngine()
  const engine = engineRef.current
  const [snapshot, setSnapshot] = useState<EngineSnapshot>(() => engine.snapshot())
  const [hover, setHover] = useState<HoverInfo | null>(null)

  useEffect(() => {
    return engine.subscribe((next) => {
      setSnapshot(next)
      setHover(engine.hovered)
    })
  }, [engine])

  return { engine, snapshot, hover, setHover }
}
