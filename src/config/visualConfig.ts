export const VISUAL = {
  MIN_BIAS: -100,
  MAX_BIAS: 100,
  MIN_BRANCH_WIDTH: 2.4,
  MAX_BRANCH_WIDTH: 18,
  MIN_LEAF_SIZE: 4.2,
  MAX_LEAF_SIZE: 18,
  MIN_SEGMENT_LENGTH: 64,
  MAX_SEGMENT_LENGTH: 176,
  TREE_LIFETIME_MINUTES: 240,
  SESSION_INTERVAL_MINUTES: 60,
  MIN_ANIMATION_MS: 300,
  MAX_ANIMATION_MS: 1500,
  TRUNK_HEIGHT: 236,
  TRUNK_WIDTH: 22,
  NEUTRAL_THRESHOLD: 2,
  MAX_DELTA: 40,
  DELTA_COLOR_THRESHOLD: 0.35,
  BEZIER_SAMPLES: 22,
  PARTICLE_COUNT: 90,
} as const

export const SOURCE_SLOTS = [
  { id: 'source-1', label: '4H stem · h4_bias', angle: -0.18 },
  { id: 'source-2', label: '1H stem · h1_bias', angle: 0.18 },
  { id: 'source-3', label: '30m stem · bias', angle: 0 },
] as const

export const EXTRA_ANGLES = [-0.38, 0.42, -1.58, 1.62, 2.28, -2.7]

export const DEFAULT_SOURCES = [
  { id: 'source-1', bias: -20 },
  { id: 'source-2', bias: -5 },
  { id: 'source-3', bias: 3 },
]
