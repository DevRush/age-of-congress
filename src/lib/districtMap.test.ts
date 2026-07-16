import { describe, expect, it } from 'vitest'
import { feature } from 'topojson-client'
import type { GeometryCollection, Topology } from 'topojson-specification'
import topo from '@/data/hex435.topo.json'
import districts from '@/data/districts.json'

type Topo = Topology<{ HexCDv31: GeometryCollection<{ GEOID: string }> }>
import { readFileSync } from 'node:fs'
import {
  GAP_CLAMP,
  type GapDistrict,
  RAMP,
  buildCells,
  formatGap,
  gapColor,
  gapExtremes,
  pruneRing,
} from './districtMap'

/** Shoelace area of a closed ring. */
function ringArea(pts: number[][]): number {
  let s = 0
  for (let i = 0; i < pts.length - 1; i++) s += pts[i][0] * pts[i + 1][1] - pts[i + 1][0] * pts[i][1]
  return Math.abs(s / 2)
}

describe('pruneRing', () => {
  it('drops points that lie on a straight edge, keeping the shape identical', () => {
    // A unit square with two redundant points sitting mid-edge.
    const square = [[0, 0], [0.5, 0], [1, 0], [1, 1], [0, 1], [0, 0.5], [0, 0]]
    const out = pruneRing(square)
    expect(out.length).toBe(5) // 4 real corners + the closing point
    expect(ringArea(out)).toBeCloseTo(ringArea(square), 10)
    expect(ringArea(out)).toBeCloseTo(1, 10)
  })

  it('drops exact repeated points', () => {
    const dup = [[0, 0], [1, 0], [1, 0], [1, 1], [0, 0]]
    expect(pruneRing(dup).length).toBeLessThan(dup.length)
    expect(ringArea(pruneRing(dup))).toBeCloseTo(0.5, 10)
  })

  it('leaves a shape with no redundant points alone', () => {
    const tri = [[0, 0], [1, 0], [0, 1], [0, 0]]
    expect(ringArea(pruneRing(tri))).toBeCloseTo(0.5, 10)
    expect(pruneRing(tri).length).toBe(4)
  })

  it('refuses to collapse a degenerate ring to nothing', () => {
    // Every point collinear: there is no polygon here, so leave it be rather
    // than emit an empty path.
    const line = [[0, 0], [1, 1], [2, 2], [0, 0]]
    expect(pruneRing(line).length).toBeGreaterThanOrEqual(3)
  })
})

describe('gapColor', () => {
  it('anchors the neutral midpoint at exactly zero', () => {
    expect(gapColor(0)).toBe('#e5e8ec')
  })

  it('hits each ramp anchor exactly', () => {
    for (const [gap, hex] of RAMP) expect(gapColor(gap)).toBe(hex)
  })

  it('clamps beyond ±30 rather than extrapolating', () => {
    expect(gapColor(45)).toBe(gapColor(GAP_CLAMP))
    expect(gapColor(31)).toBe(gapColor(GAP_CLAMP))
    expect(gapColor(-19.3)).not.toBe(gapColor(-GAP_CLAMP)) // the real minimum is short of the clamp
    expect(gapColor(-60)).toBe(gapColor(-GAP_CLAMP))
  })

  it('is symmetric in weight: equal |gap| gives equally dark fills', () => {
    // Perceived weight is what the diverging contract promises. Compare relative
    // luminance of the two arms at matched distances from zero.
    const lum = (hex: string) => {
      const c = [1, 3, 5].map((i) => {
        const v = parseInt(hex.slice(i, i + 2), 16) / 255
        return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
      })
      return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
    }
    for (const k of [10, 20, 30]) {
      expect(Math.abs(lum(gapColor(-k)) - lum(gapColor(k)))).toBeLessThan(0.05)
    }
  })

  it('moves monotonically darker as the gap grows in either direction', () => {
    const warm = [0, 5, 10, 15, 20, 25, 30].map(gapColor)
    expect(new Set(warm).size).toBe(warm.length)
    const cool = [0, -5, -10, -15, -20, -30].map(gapColor)
    expect(new Set(cool).size).toBe(cool.length)
  })

  it('interpolates between anchors', () => {
    const mid = gapColor(5)
    expect(mid).not.toBe(gapColor(0))
    expect(mid).not.toBe(gapColor(10))
  })
})

describe('formatGap', () => {
  it('signs the figure with a real minus and one decimal', () => {
    expect(formatGap(8.9)).toBe('+8.9')
    expect(formatGap(-19.3)).toBe('−19.3')
    expect(formatGap(45)).toBe('+45.0')
    expect(formatGap(0)).toBe('0.0')
  })
})

describe('buildCells', () => {
  const built = buildCells(topo)

  it('produces one drawable cell per district', () => {
    expect(built.cells.length).toBe(435)
    for (const c of built.cells) expect(c.d.startsWith('M')).toBe(true)
  })

  it('joins exactly onto the district roster by geoid', () => {
    const mapIds = new Set(built.cells.map((c) => c.geoid))
    const dataIds = new Set(districts.districts.map((d) => d.geoid))
    expect(mapIds.size).toBe(435)
    expect(dataIds.size).toBe(435)
    for (const id of dataIds) expect(mapIds.has(id)).toBe(true)
  })

  it('keeps the layout aspect ratio instead of filling an arbitrary box', () => {
    expect(built.width).toBe(1000)
    // The hexmap is wider than it is tall, like the country it draws.
    expect(built.height).toBeGreaterThan(600)
    expect(built.height).toBeLessThan(800)
  })

  it('places every centroid inside the viewBox', () => {
    for (const c of built.cells) {
      expect(c.cx).toBeGreaterThanOrEqual(0)
      expect(c.cx).toBeLessThanOrEqual(built.width)
      expect(c.cy).toBeGreaterThanOrEqual(0)
      expect(c.cy).toBeLessThanOrEqual(built.height)
    }
  })

  it('prunes every real district ring without moving its area', () => {
    // Losslessness proved on the actual data, in source coordinates — no
    // projection or rounding involved, so this isolates `pruneRing` itself.
    let before = 0
    let after = 0
    let ringCount = 0
    for (const f of feature(topo as never, (topo as never as Topo).objects.HexCDv31).features) {
      const g = f.geometry
      if (g.type !== 'Polygon' && g.type !== 'MultiPolygon') continue
      const polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates
      for (const poly of polys) {
        for (const ring of poly) {
          const pruned = pruneRing(ring)
          expect(ringArea(pruned)).toBeCloseTo(ringArea(ring), 9)
          before += ring.length
          after += pruned.length
          ringCount++
        }
      }
    }
    expect(ringCount).toBeGreaterThan(435)
    // A modest, real reduction — ~3%, almost all of it exact repeats. The
    // outlines carry little redundancy, so this asserts the measured floor
    // rather than an aspirational one.
    expect(after).toBeLessThan(before)
    expect(after).toBeLessThan(before * 0.98)
  })

  it('lays the country out west-to-east and north-to-south', () => {
    const at = (geoid: string) => built.cells.find((c) => c.geoid === geoid)!
    // CA-12 (Oakland) sits west of NY-12 (Manhattan).
    expect(at('0612').cx).toBeLessThan(at('3612').cx)
    // FL-27 (Miami) sits south of MN-8 (northern Minnesota).
    expect(at('1227').cy).toBeGreaterThan(at('2708').cy)
  })
})

/**
 * The ends of the range are annotated on the strip, ringed on the map, and named
 * again in the caption. They used to be six hand-written literals sitting beside
 * live-computed neighbours; these are the gates that keep them derived.
 */
describe('gapExtremes', () => {
  const d = (
    geoid: string,
    gapYears: number | null,
    member: { name: string } | null = { name: `Rep ${geoid}` },
  ): GapDistrict => ({ geoid, state: 'XX', district: 1, member, gapYears })

  it('returns the least and greatest gap, with the member who owns each', () => {
    const { min, max } = gapExtremes([d('a', 3), d('b', -12.5), d('c', 41.2), d('d', 0)])
    expect(min.gap).toBe(-12.5)
    expect(min.name).toBe('Rep b')
    expect(max.gap).toBe(41.2)
    expect(max.name).toBe('Rep c')
  })

  it('never lets a vacant seat become a numeric gap', () => {
    // The failure this exists for: the largest gap in the country going vacant
    // and rendering as "0.0" — a real-looking, near-zero reading for an empty
    // chair — because a null was cast to a number.
    const vacant = d('vacant', null, null)
    const { min, max } = gapExtremes([vacant, d('a', 5), d('b', 9)])
    expect(min.d.geoid).not.toBe('vacant')
    expect(max.d.geoid).not.toBe('vacant')
    expect(min.gap).toBe(5)
    expect(max.gap).toBe(9)
  })

  it('skips a seated member whose gap is missing — a member is not a measurement', () => {
    const unmeasured = d('unmeasured', null, { name: 'Someone' })
    const { min, max } = gapExtremes([unmeasured, d('a', 7)])
    expect(min.d.geoid).toBe('a')
    expect(max.d.geoid).toBe('a')
  })

  it('throws rather than inventing a range when nothing is measurable', () => {
    // Runs during `next build`, so this stops a broken roster at the build.
    expect(() => gapExtremes([d('v1', null, null), d('v2', null, null)])).toThrow(/no district/)
    expect(() => gapExtremes([])).toThrow(/no district/)
  })
})

describe('the map annotates the range the committed data actually has', () => {
  const rows = districts.districts as GapDistrict[]
  const { min, max } = gapExtremes(rows)

  it('agrees with the pipeline’s own independently computed min/max', () => {
    // Two computations from opposite ends of the build — the pipeline's
    // districtGapStats and the component's gapExtremes — must name the same
    // numbers, or one of them is lying to the reader.
    expect(max.gap).toBe(districts.stats.maxGap)
    expect(min.gap).toBe(districts.stats.minGap)
  })

  it('names a real, seated member at each end', () => {
    for (const e of [min, max]) {
      expect(e.d.member).not.toBeNull()
      expect(e.name.length).toBeGreaterThan(0)
      expect(Number.isFinite(e.gap)).toBe(true)
    }
  })

  it('has no district that is half-vacant — a member without a gap, or a gap without a member', () => {
    for (const r of rows) {
      expect(r.member === null).toBe(r.gapYears === null)
    }
  })

  it('keeps both ends inside the strip they are positioned on', () => {
    // The strip's axis is a design constant (−22…+47) and the extremes are
    // placed as a percentage along it. If the data ever outgrows the axis, the
    // annotation lands off the figure — so the constants are held to the data.
    const src = readFileSync(new URL('../components/DistrictMap.tsx', import.meta.url), 'utf8')
    const stripMin = Number(src.match(/const STRIP_MIN = (-?[\d.]+)/)![1])
    const stripMax = Number(src.match(/const STRIP_MAX = (-?[\d.]+)/)![1])
    expect(min.gap).toBeGreaterThan(stripMin)
    expect(max.gap).toBeLessThan(stripMax)
  })
})

/**
 * The recurrence gate. The bug was not that the numbers were wrong on the day
 * they were typed — they were right — it was that they were *stated* next to
 * figures that recompute nightly, with nothing binding the two together.
 */
describe('DistrictMap states no extreme as a literal', () => {
  const src = readFileSync(new URL('../components/DistrictMap.tsx', import.meta.url), 'utf8')

  it('hardcodes no gap figure', () => {
    expect(src).not.toMatch(/formatGap\(\s*-?\d/)
  })

  it('hardcodes no district geoid', () => {
    expect(src).not.toMatch(/geoid:\s*['"]\d+['"]/)
    expect(src).not.toMatch(/['"]\d{4}['"]/)
  })

  it('casts no nullable gap into a number', () => {
    expect(src).not.toMatch(/as number/)
  })

  it('takes both ends from gapExtremes', () => {
    expect(src).toMatch(/gapExtremes\(/)
  })
})
