import type { HistoricalPoint } from './types'

/**
 * How well birth dates cover the historical record — computed, because the
 * Methodology box is where a reporter checks whether to trust the rest.
 *
 * This replaces a hand-written sentence ("From 1850 onward, coverage exceeds
 * 99%") that was false against the project's own committed data on the day it
 * was written: eight Congresses fall below that line and the 32nd (1851) reaches
 * only 92.6%. Nobody had lied — someone had rounded a recollection into a claim
 * and put it next to figures the build computes. A methodology box that
 * overstates its own completeness is worse than one that admits a gap, because
 * the gap is small and the overstatement is what a critic gets to quote.
 *
 * So the box no longer asserts a number the data can produce. It asks.
 */

export interface Coverage {
  /** The worst-covered Congress in the window. */
  worst: HistoricalPoint
  /** How many Congresses in the window fall below `threshold`. */
  below: number
  /** How many Congresses the window holds at all. */
  total: number
  /** The threshold `below` was counted against, as a fraction (0.99). */
  threshold: number
}

/**
 * Coverage across every Congress convening in `fromYear` or later.
 *
 * `threshold` is the bar the copy quotes, and `below` is the honest count of
 * Congresses that miss it — the two travel together so a sentence can never
 * quote one without the other.
 */
export function coverageSince(
  points: readonly HistoricalPoint[],
  fromYear: number,
  threshold: number,
): Coverage {
  const window = points.filter((p) => p.year >= fromYear)
  if (window.length === 0) {
    throw new Error(`coverageSince: no Congress convened in or after ${fromYear}`)
  }
  let worst = window[0]
  for (const p of window) if (p.birthdayCoverage < worst.birthdayCoverage) worst = p
  return {
    worst,
    below: window.filter((p) => p.birthdayCoverage < threshold).length,
    total: window.length,
    threshold,
  }
}

/** "32nd" — a Congress is always cited by its ordinal. */
export function ordinal(n: number): string {
  const rem100 = n % 100
  if (rem100 >= 11 && rem100 <= 13) return `${n}th`
  switch (n % 10) {
    case 1:
      return `${n}st`
    case 2:
      return `${n}nd`
    case 3:
      return `${n}rd`
    default:
      return `${n}th`
  }
}
