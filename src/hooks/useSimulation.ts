import { useEffect, useRef, useState } from 'react'
import { SimulationProvider } from '../data/SimulationProvider'
import type { TreeEngine } from '../engine/TreeEngine'
import type { PresetName, SimInterval, TimeScale } from '../models/types'
import { formatClock } from '../utils/mathUtils'

export function useSimulation(engine: TreeEngine) {
  const providerRef = useRef<SimulationProvider | null>(null)
  if (!providerRef.current) providerRef.current = new SimulationProvider()
  const provider = providerRef.current
  const [running, setRunning] = useState(false)
  const [intervalSec, setIntervalSec] = useState<SimInterval>(1)
  const [timeScale, setTimeScale] = useState<TimeScale>(1)
  const [presetPlaying, setPresetPlaying] = useState<PresetName | null>(null)
  const presetTimer = useRef<number | null>(null)

  useEffect(() => {
    return provider.subscribe((event) => {
      if (event.type === 'BATCH_UPDATE' && !event.timestamp) {
        engine.ingest({
          ...event,
          timestamp: formatClock(engine.simulatedMinutes),
        })
      } else {
        engine.ingest(event)
      }
    })
  }, [engine, provider])

  useEffect(() => {
    return () => {
      provider.stop()
      if (presetTimer.current) window.clearInterval(presetTimer.current)
    }
  }, [provider])

  const start = () => {
    engine.setClockRunning(true)
    provider.start()
    setRunning(true)
  }

  const stop = () => {
    engine.setClockRunning(false)
    provider.stop()
    setRunning(false)
  }

  const changeInterval = (value: SimInterval) => {
    setIntervalSec(value)
    provider.setIntervalSec(value)
  }

  const changeTimeScale = (value: TimeScale) => {
    setTimeScale(value)
    engine.setTimeScale(value)
  }

  const sendCurrent = (timestamp: string, sources: Array<{ id: string; bias: number }>) => {
    provider.setSources(sources)
    engine.ingest({ type: 'BATCH_UPDATE', timestamp, sources })
  }

  const randomOnce = (timestamp: string) => {
    const event = provider.randomStep()
    engine.ingest({
      type: 'BATCH_UPDATE',
      timestamp,
      sources: event.type === 'BATCH_UPDATE' ? event.sources : [],
    })
    return provider.sources
  }

  const playPreset = (name: PresetName, timestamp: string) => {
    stopPreset()
    setPresetPlaying(name)
    let index = 0
    const step = () => {
      const event = provider.presetStep(name, index)
      if (!event || event.type !== 'BATCH_UPDATE') {
        stopPreset()
        return
      }
      const minutes = engine.simulatedMinutes + (index === 0 ? 0 : 1)
      engine.ingest({
        type: 'BATCH_UPDATE',
        timestamp: index === 0 ? timestamp : formatClock(minutes),
        sources: event.sources,
      })
      index++
    }
    step()
    presetTimer.current = window.setInterval(step, 850)
  }

  const stopPreset = () => {
    if (presetTimer.current) {
      window.clearInterval(presetTimer.current)
      presetTimer.current = null
    }
    setPresetPlaying(null)
  }

  const resetProvider = () => {
    stop()
    stopPreset()
    provider.reset()
  }

  return {
    provider,
    running,
    intervalSec,
    timeScale,
    presetPlaying,
    start,
    stop,
    changeInterval,
    changeTimeScale,
    sendCurrent,
    randomOnce,
    playPreset,
    stopPreset,
    resetProvider,
  }
}
