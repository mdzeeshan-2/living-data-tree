import type { Tree } from '../models/types'

const KEY = 'living-tree-forest-v3'
const LEGACY_KEY = 'living-tree-forest-v2'

export interface StoredStemNode {
  bias: number
  previous: number | null
}

export interface StoredStem {
  anchorBias: number | null
  nodes: StoredStemNode[]
}

export interface StoredTree {
  startMs: number
  stems: Record<string, StoredStem>
}

function normalizeTrees(raw: unknown): StoredTree[] {
  const parsed = raw as { trees?: Array<StoredTree & { stems?: Record<string, StoredStem | StoredStemNode[]> }> }
  if (!Array.isArray(parsed?.trees)) return []
  return parsed.trees
    .filter((tree) => Number.isFinite(tree.startMs))
    .map((tree) => ({
      startMs: tree.startMs,
      stems: Object.fromEntries(
        Object.entries(tree.stems || {}).map(([id, value]) => {
          if (Array.isArray(value)) {
            const first = value[0]
            return [id, { anchorBias: first?.previous ?? null, nodes: value }]
          }
          return [
            id,
            {
              anchorBias: value?.anchorBias ?? value?.nodes?.[0]?.previous ?? null,
              nodes: Array.isArray(value?.nodes) ? value.nodes : [],
            },
          ]
        }),
      ),
    }))
}

export function loadForest(): StoredTree[] {
  try {
    const raw = localStorage.getItem(KEY) ?? localStorage.getItem(LEGACY_KEY)
    if (!raw) return []
    return normalizeTrees(JSON.parse(raw))
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
            tree.sourceOrder.map((id) => {
              const branch = tree.sources[id]
              return [
                id,
                {
                  anchorBias: branch.anchorBias,
                  nodes: branch.segments.map((segment) => ({
                    bias: segment.bias,
                    previous: segment.previousBias,
                  })),
                },
              ]
            }),
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
    localStorage.removeItem(LEGACY_KEY)
  } catch {
    /* ignore */
  }
}
