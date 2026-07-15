/**
 * Minimal SVG plotting helpers for the static "Long View" line chart. No
 * runtime dependency — the chart is a server component that renders plain SVG,
 * so these two functions are all the geometry it needs.
 */

/**
 * A linear scale from a data domain [d0, d1] onto a pixel range [r0, r1].
 * The range may be inverted (r0 > r1), which is how SVG's downward-growing y
 * axis is handled: a larger age maps to a smaller y. Extrapolates past the
 * domain rather than clamping, so a "today" reading just beyond the last
 * Congress still lands in the right place.
 */
export function scaleLinear(
  d0: number,
  d1: number,
  r0: number,
  r1: number,
): (v: number) => number {
  return (v) => r0 + ((v - d0) * (r1 - r0)) / (d1 - d0)
}

/**
 * Build an SVG path string ("M x y L x y …") through the given points.
 * Coordinates are rounded to one decimal to keep the emitted markup compact.
 * An empty list yields an empty string (an empty `d` draws nothing).
 */
export function linePath(pts: { x: number; y: number }[]): string {
  return pts
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${round1(p.x)} ${round1(p.y)}`)
    .join(' ')
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
}
