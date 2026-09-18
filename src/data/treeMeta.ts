import type { Tree } from '../models/types'
import { formatClockShort } from '../utils/mathUtils'
import { formatStamp, H4_MS } from './h4Radar'

export function localTimeZoneName(ts = Date.now()): string {
  try {
    const parts = new Intl.DateTimeFormat(undefined, {
      timeZoneName: 'short',
      hour: '2-digit',
    }).formatToParts(new Date(ts))
    return parts.find((part) => part.type === 'timeZoneName')?.value ?? 'local'
  } catch {
    return 'local'
  }
}

export function formatDateLong(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function formatWindow(startMs: number, endMs: number): string {
  return `${formatStamp(startMs)}–${formatStamp(endMs)}`
}

export function treeEndMs(tree: Tree): number {
  if (tree.endMs) return tree.endMs
  if (tree.startMs) return tree.startMs + H4_MS
  return Date.now()
}

export function treeAnchorStamp(tree: Tree): string {
  if (tree.startMs) return formatStamp(tree.startMs - 60_000)
  return formatClockShort(Math.max(0, tree.startMinutes - 1))
}

export function treeWindow(tree: Tree): string {
  if (tree.startMs) return formatWindow(tree.startMs, treeEndMs(tree))
  return `${formatClockShort(tree.startMinutes)}–${formatClockShort(tree.endMinutes)}`
}

export function treeCaption(tree: Tree): string {
  const zone = localTimeZoneName(tree.startMs ?? Date.now())
  if (tree.startMs) return `${formatDateLong(tree.startMs)} · ${treeWindow(tree)} ${zone}`
  return `${treeWindow(tree)} ${zone}`
}

export function sourceMeta(sourceId: string): { title: string; field: string } {
  if (sourceId === 'source-1') return { title: '4H STEM', field: '4h_bias' }
  if (sourceId === 'source-2') return { title: '1H STEM', field: '1h_bias' }
  if (sourceId === 'source-3') return { title: '30m STEM', field: 'bias' }
  return { title: sourceId.toUpperCase(), field: 'bias' }
}
