import type { DataEvent, DataListener, DataProvider } from '../models/types'

export class BaseDataProvider implements DataProvider {
  protected listeners = new Set<DataListener>()
  protected running = false

  start(): void {
    this.running = true
  }

  stop(): void {
    this.running = false
  }

  subscribe(listener: DataListener): () => void {
    this.listeners.add(listener)
    return () => this.unsubscribe(listener)
  }

  unsubscribe(listener: DataListener): void {
    this.listeners.delete(listener)
  }

  emit(event: DataEvent): void {
    for (const listener of this.listeners) listener(event)
  }
}

export function createManualEvent(
  timestamp: string,
  sources: Array<{ id: string; bias: number }>,
): DataEvent {
  return { type: 'BATCH_UPDATE', timestamp, sources }
}
