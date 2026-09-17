import type { Tree } from '../models/types'

const KEY = 'living-tree-forest-v2'

export interface StoredStemNode {
  bias: number
  previous: number | null
}

export interface StoredTree {
  startMs: number
  stems: Record<string, StoredStemNode[]>
}

export function loadForest(): StoredTree[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as { trees?: StoredTree[] }
    return Array.isArray(parsed?.trees) ? parsed.trees : []
  } catch {
    return []
  }
}

export function saveForest(trees: Tree[]): void {
  try {
    const payload: { trees: StoredTree[] } = {
      trees: trees
        .filter((tree) => tree.startMs != null)
        .map((tree) => ({
          startMs: tree.startMs as number,
          stems: Object.fromEntries(
            tree.sourceOrder.map((id) => [
              id,
              tree.sources[id].segments.map((segment) => ({
                bias: segment.bias,
                previous: segment.previousBias,
              })),
            ]),
          ),
        })),
    }
    localStorage.setItem(KEY, JSON.stringify(payload))
  } catch {
    /* ignore quota */
  }
}

export function clearForest(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}
