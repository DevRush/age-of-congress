import { feature } from 'topojson-client'
import type { GeometryCollection, Topology } from 'topojson-specification'

/**
 * Geometry and color for "The Map" — the 435 House districts, each shaded by the
 * gap between its member's age and the median age of the adults they represent.
 *
 * Everything here is pure and runs at build time. The site is a static export,
 * so the TopoJSON is decoded once during `next build` and only finished SVG path
 * strings reach the browser; the client never pays to decode a topology.
 */

/** One district, ready to draw: its outline and its centroid (for arrow-key navigation). */
export type Cell = { geoid: string; d: string; cx: number; cy: number }

export type CellSet = { cells: Cell[]; width: number; height: number }

// ── The scale ────────────────────────────────────────────────────────────────

/**
 * The ramp is clamped at ±30 years and is SYMMETRIC about zero: a member ten
 * years younger than their district is exactly as saturated as one ten years
 * older, in the opposing hue. That symmetry is the whole contract of a diverging
 * scale, and it is why the domain is not fitted to the data's actual range
 * (−19.3 to +45). An asymmetric −20/+45 domain would paint the most extreme
 * "younger" district at full strength alongside the most extreme "older" one,
 * telling the reader that a 19-year gap and a 45-year gap are the same size.
 *
 * The cost is that the cool arm is never fully spent — nothing in the data is
 * 30 years younger, so the deepest teal on the map is only ~64% of the way down
 * its arm. That is not waste. It is the finding: there is no deep teal anywhere
 * on this map because no member is dramatically younger than the people they
 * represent, while 39 are 30+ years older.
 *
 * ±30 rather than the full ±45 because the median gap (+10.8) would otherwise
 * land at 24% of the warm arm and the map would read as washed out. Clamping
 * costs 39 of 431 districts (9.0%), all on the warm side. Rather than hide that,
 * the legend strip is drawn across the data's real range (−22 to +47) while the
 * ramp beneath it flattens at +30, so the reader can see precisely what the
 * clamp costs; both extremes are named there and ringed on the map.
 */
export const GAP_CLAMP = 30

/**
 * Teal (younger) → neutral → amber (older).
 *
 * Chosen against a hard constraint: this page already spends red and blue on
 * party identity, so an age-gap map must not read as a party map. Both poles sit
 * in hue territory the party palette does not occupy, and the separation is
 * measured rather than eyeballed — every hued stop below clears CIE ΔE ≥ 12
 * against BOTH --dem (#2560c9) and --rep (#d1382c) under protanopia and
 * deuteranopia (worst case: +20 vs party red, ΔE 12.8), while the two poles sit
 * ΔE 61 apart from each other. Sepia was the first instinct for "older" and had
 * to be rejected: mid-brown collapses onto party red under deuteranopia (ΔE 8.3).
 * Holding the warm arm in the gold/olive family instead of letting it drift to
 * brown is what keeps it clear of red.
 *
 * The lightness profile is symmetric arm-to-arm (equal |gap| → equal contrast,
 * within 0.63), so the two directions carry equal visual weight.
 *
 * The midpoint is a near-white neutral, not a hue — a district whose member is
 * the same age as its adults should recede, and low salience at zero is the
 * point. Every hex carries a hairline stroke so a near-zero cell is still a
 * countable shape rather than a hole in the map.
 */
export const RAMP: readonly (readonly [number, string])[] = [
  [-30, '#006c67'],
  [-20, '#00aaa3'],
  [-10, '#88d3cd'],
  [0, '#e5e8ec'],
  [10, '#ddbd8b'],
  [20, '#bb8825'],
  [30, '#785300'],
]

/**
 * The ink for the vacancy hatch. Vacant seats never take a fill from the ramp —
 * see the `vacant-hatch` pattern in DistrictMap for why texture rather than a
 * muted color is the only safe answer here.
 */
export const VACANT_INK = '#9aa0aa'

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function rgbToHex(r: number, g: number, b: number): string {
  const to = (v: number) => Math.round(v).toString(16).padStart(2, '0')
  return `#${to(r)}${to(g)}${to(b)}`
}

/**
 * The fill for a gap in years, clamped to ±`GAP_CLAMP` and interpolated between
 * the ramp's anchor stops. Stops sit close enough together that interpolating in
 * sRGB introduces no visible banding, which keeps this dependency-free.
 */
export function gapColor(gap: number): string {
  const g = Math.max(-GAP_CLAMP, Math.min(GAP_CLAMP, gap))
  for (let i = 0; i < RAMP.length - 1; i++) {
    const [g0, c0] = RAMP[i]
    const [g1, c1] = RAMP[i + 1]
    if (g >= g0 && g <= g1) {
      const t = g1 === g0 ? 0 : (g - g0) / (g1 - g0)
      const a = hexToRgb(c0)
      const b = hexToRgb(c1)
      return rgbToHex(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t)
    }
  }
  return RAMP[RAMP.length - 1][1]
}

/** "+8.9" / "−19.3" / "0.0" — a real minus sign, one decimal, to match the page. */
export function formatGap(gap: number): string {
  const v = Math.round(gap * 10) / 10
  if (v > 0) return `+${v.toFixed(1)}`
  if (v < 0) return `−${Math.abs(v).toFixed(1)}`
  return '0.0'
}

// ── The geometry ─────────────────────────────────────────────────────────────

const round1 = (n: number) => Math.round(n * 10) / 10

type HexProps = { GEOID: string }

/**
 * Drop the points in a closed ring that draw nothing: exact repeats, and points
 * sitting on the straight line between their neighbors.
 *
 * This is a lossless edit, not a simplification — a repeated or collinear point
 * contributes nothing to the outline, so the polygon drawn afterwards is
 * identical, and the tests hold it to that by comparing areas.
 *
 * Worth calibrating expectations: this removes ~3% of vertices, and nearly all
 * of that is exact repeats left where the topology's arcs were split. The
 * cluster outlines are otherwise all real corners — there is no fat here to cut,
 * which is itself the answer to "should this be simplified further?". Anything
 * more would move the shape, and at 435 districts a moved boundary is a wrong
 * boundary. The map's ~130KB of geometry is the data, not overhead.
 */
export function pruneRing(ring: number[][]): number[][] {
  const dd = ring.filter((p, i) => i === 0 || p[0] !== ring[i - 1][0] || p[1] !== ring[i - 1][1])
  if (dd.length < 4) return dd
  const closed = dd[0][0] === dd[dd.length - 1][0] && dd[0][1] === dd[dd.length - 1][1]
  const pts = closed ? dd.slice(0, -1) : dd
  const keep: number[][] = []
  for (let i = 0; i < pts.length; i++) {
    const a = pts[(i - 1 + pts.length) % pts.length]
    const b = pts[i]
    const c = pts[(i + 1) % pts.length]
    const cross = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])
    if (Math.abs(cross) > 1e-9) keep.push(b)
  }
  if (keep.length < 3) return dd
  return [...keep, keep[0]]
}

/**
 * Decode the hex cartogram into SVG paths.
 *
 * The layout's coordinates look like longitude/latitude but are not: this is the
 * Daily Kos / Downballot hexmap, in which every district is an equal-area cluster
 * of hexagons packed into a recognizable state outline. The numbers are design
 * space, already proportioned to be drawn 1:1 — rendering it with any projection
 * correction (an equirectangular cos-latitude squeeze, say) visibly stretches the
 * country. So the mapping is a plain linear fit to the viewBox with the y axis
 * flipped, and nothing else.
 *
 * `width` is fixed and `height` follows from the layout's own aspect ratio, so
 * the map can never be squashed by its container.
 */
export function buildCells(topology: unknown, width = 1000): CellSet {
  const topo = topology as unknown as Topology<{ HexCDv31: GeometryCollection<HexProps> }>
  const fc = feature(topo, topo.objects.HexCDv31)

  /** Every district is a Polygon or a MultiPolygon; nothing else is drawable here. */
  const polysOf = (g: (typeof fc.features)[number]['geometry']): number[][][][] => {
    if (g.type === 'Polygon') return [g.coordinates]
    if (g.type === 'MultiPolygon') return g.coordinates
    throw new Error(`buildCells: unexpected geometry ${g.type}`)
  }

  let x0 = Infinity
  let y0 = Infinity
  let x1 = -Infinity
  let y1 = -Infinity
  for (const f of fc.features) {
    for (const poly of polysOf(f.geometry)) {
      for (const ring of poly) {
        for (const [x, y] of ring) {
          if (x < x0) x0 = x
          if (x > x1) x1 = x
          if (y < y0) y0 = y
          if (y > y1) y1 = y
        }
      }
    }
  }

  const scale = width / (x1 - x0)
  const height = Math.round((y1 - y0) * scale)
  const px = (x: number) => round1((x - x0) * scale)
  const py = (y: number) => round1(height - (y - y0) * scale)

  const cells: Cell[] = fc.features.map((f) => {
    let d = ''
    let sx = 0
    let sy = 0
    let n = 0
    for (const poly of polysOf(f.geometry)) {
      for (const raw of poly) {
        const ring = pruneRing(raw)
        d += `M${ring.map(([x, y]) => `${px(x)},${py(y)}`).join('L')}Z`
        for (const [x, y] of ring) {
          sx += px(x)
          sy += py(y)
          n++
        }
      }
    }
    return { geoid: f.properties.GEOID, d, cx: round1(sx / n), cy: round1(sy / n) }
  })

  return { cells, width, height }
}
