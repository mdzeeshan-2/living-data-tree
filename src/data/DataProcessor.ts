import { VISUAL } from '../config/visualConfig'
import type { VisualInterpretation } from '../models/types'
import { biasToColor } from '../utils/colorUtils'
import { easeOutCubic } from '../utils/interpolation'
import { clamp, lerp, mapRange } from '../utils/mathUtils'

export function colorFromBiasDelta(delta: number) {
  if (delta > 0) {
    const signed = clamp(0.22 + delta / 18, 0.22, 1)
    return biasToColor(signed)
  }
  if (delta < 0) {
    const signed = clamp(-0.22 + delta / 18, -1, -0.22)
    return biasToColor(signed)
  }
  return biasToColor(0)
}

export function toneFromDelta(delta: number): 'green' | 'red' | 'neutral' {
  if (delta > 0) return 'green'
  if (delta < 0) return 'red'
  return 'neutral'
}

export function interpretBias(
  bias: number,
  previousBias: number | null,
): VisualInterpretation {
  const clamped = clamp(bias, VISUAL.MIN_BIAS, VISUAL.MAX_BIAS)
  const signed = clamped / VISUAL.MAX_BIAS
  const strength = Math.abs(signed)
  const delta = previousBias == null ? 0 : clamped - previousBias
  const deltaMag = Math.abs(delta)
  const deltaNorm = clamp(deltaMag / VISUAL.MAX_DELTA, 0, 1)

  let polarity: VisualInterpretation['polarity'] = 'neutral'
  if (delta > 0) polarity = 'positive'
  else if (delta < 0) polarity = 'negative'

  const isReversal =
    previousBias != null &&
    Math.sign(delta) !== 0 &&
    Math.sign(clamped) !== Math.sign(previousBias) &&
    Math.abs(clamped) >= VISUAL.NEUTRAL_THRESHOLD &&
    Math.abs(previousBias) >= VISUAL.NEUTRAL_THRESHOLD

  const strengthEase = easeOutCubic(strength)
  const width = lerp(VISUAL.MIN_BRANCH_WIDTH, VISUAL.MAX_BRANCH_WIDTH, strengthEase)
  const leafSize = lerp(VISUAL.MIN_LEAF_SIZE, VISUAL.MAX_LEAF_SIZE, strengthEase)
  const growth = clamp(0.18 + deltaNorm * 0.82, 0, 1)
  const duration = lerp(
    VISUAL.MAX_ANIMATION_MS,
    VISUAL.MIN_ANIMATION_MS,
    Math.pow(deltaNorm, 0.55),
  )

  let leafCount = 2
  if (deltaMag >= 0.35) leafCount = 3
  if (deltaMag >= 3) leafCount = 4
  if (deltaMag >= 5) leafCount = 6
  if (deltaMag >= 10) leafCount = 8
  if (isReversal) leafCount += 2
  if (previousBias == null) leafCount = Math.max(leafCount, 3)

  const wood = { r: 124, g: 88, b: 54 }
  const signal = previousBias == null ? biasToColor(signed) : colorFromBiasDelta(delta)
  const stemColor = {
    r: wood.r * 0.48 + signal.r * 0.52,
    g: wood.g * 0.48 + signal.g * 0.52,
    b: wood.b * 0.48 + signal.b * 0.52,
  }
  const leafColor =
    delta > 0
      ? { r: 186, g: 236, b: 52 }
      : delta < 0
        ? { r: 255, g: 176, b: 42 }
        : { r: 132, g: 184, b: 86 }

  return {
    polarity,
    signed,
    strength,
    color: stemColor,
    leafColor,
    width,
    leafSize,
    growth,
    duration,
    leafCount,
    delta,
    deltaNorm,
    isReversal,
    bias: clamped,
    previousBias,
  }
}

export function segmentLength(interp: VisualInterpretation, isFirst: boolean): number {
  const fromDelta = mapRange(
    interp.deltaNorm,
    0,
    1,
    VISUAL.MIN_SEGMENT_LENGTH,
    VISUAL.MAX_SEGMENT_LENGTH,
  )
  return isFirst ? Math.max(fromDelta * 0.72, 96) : Math.max(fromDelta * 0.34, 22)
}

export function polarityLabel(polarity: VisualInterpretation['polarity']): string {
  if (polarity === 'negative') return 'FALLING'
  if (polarity === 'positive') return 'RISING'
  return 'STEADY'
}
