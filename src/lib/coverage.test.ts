import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import historical from '@/data/historical.json'
import type { HistoricalPoint } from './types'
import { coverageSince, ordinal } from './coverage'

const point = (congress: number, year: number, birthdayCoverage: number): HistoricalPoint => ({
  congress,
  year,
  convening: `${year}-01-03`,
  senateMean: 60,
  houseMean: 55,
  overallMean: 56,
  senateN: 100,
  houseN: 435,
  missingBirthday: 0,
  birthdayCoverage,
})

describe('coverageSince', () => {
  const pts = [
    point(1, 1789, 0.83),
    point(30, 1847, 0.9),
    point(32, 1851, 0.926),
    point(33, 1853, 0.947),
    point(119, 2025, 1),
  ]

  it('reports the worst Congress in the window, not in the whole record', () => {
    // 1789's 83% is worse, and is outside the window — quoting it would be a
    // different (and much less flattering) claim than the sentence makes.
    const c = coverageSince(pts, 1850, 0.99)
    expect(c.worst.congress).toBe(32)
    expect(c.worst.birthdayCoverage).toBe(0.926)
  })

  it('counts how many miss the threshold, and out of how many', () => {
    const c = coverageSince(pts, 1850, 0.99)
    expect(c.total).toBe(3) // 1851, 1853, 2025 — 1789 and 1847 are outside the window
    expect(c.below).toBe(2) // 1851 and 1853; 2025 is complete
  })

  it('carries the threshold it counted against, so copy cannot quote one without the other', () => {
    expect(coverageSince(pts, 1850, 0.99).threshold).toBe(0.99)
    // Move the bar and the count moves with it: at 95% both 1851 (92.6%) and
    // 1853 (94.7%) still miss; at 93% only 1851 does; at 90% nothing does.
    expect(coverageSince(pts, 1850, 0.95).below).toBe(2)
    expect(coverageSince(pts, 1850, 0.93).below).toBe(1)
    expect(coverageSince(pts, 1850, 0.9).below).toBe(0)
  })

  it('throws rather than describing an empty window', () => {
    expect(() => coverageSince(pts, 2200, 0.99)).toThrow(/no Congress/)
  })
})

describe('ordinal', () => {
  it('cites a Congress the way a citation does', () => {
    expect(ordinal(1)).toBe('1st')
    expect(ordinal(32)).toBe('32nd')
    expect(ordinal(43)).toBe('43rd')
    expect(ordinal(119)).toBe('119th')
  })
  it('handles the teens, which are the reason this function exists', () => {
    expect(ordinal(11)).toBe('11th')
    expect(ordinal(12)).toBe('12th')
    expect(ordinal(13)).toBe('13th')
    expect(ordinal(111)).toBe('111th')
  })
})

/**
 * The claim that shipped false.
 *
 * "From 1850 onward, coverage exceeds 99%" was contradicted by the very file the
 * chart above it reads. These hold the replacement sentence to the data, and
 * would have failed on the original.
 */
describe('the Methodology’s coverage claim against the committed record', () => {
  const points = historical as HistoricalPoint[]
  const c = coverageSince(points, 1850, 0.99)

  it('does not support the old ">99% from 1850 onward" claim', () => {
    // Kept as a live headstone: if the data ever does clear 99% everywhere, this
    // fails and someone gets to write a better sentence — deliberately.
    expect(c.below).toBeGreaterThan(0)
  })

  it('is stated by the component through the computation, not as a literal', () => {
    const src = readFileSync(new URL('../components/Methodology.tsx', import.meta.url), 'utf8')
    // Comments stripped: the file explains at length what the old claim was and
    // why it was wrong, and that prose must not trip the gate that retired it.
    const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')

    // Every figure in the sentence is read from the record…
    expect(code).toMatch(/coverageSince\(/)
    expect(code).toMatch(/cov\.worst\.birthdayCoverage/) // the measured floor
    expect(code).toMatch(/cov\.worst\.congress/) // whose Congress it was
    expect(code).toMatch(/cov\.below/) // how many miss the bar
    expect(code).toMatch(/cov\.total/) // out of how many

    // …and none of it is typed by hand.
    expect(code).not.toMatch(/coverage exceeds/i)
    expect(code).not.toMatch(/99(\.\d)?%/)
  })

  it('never claims a coverage floor the record does not clear', () => {
    for (const p of points.filter((p) => p.year >= 1850)) {
      expect(p.birthdayCoverage).toBeGreaterThanOrEqual(c.worst.birthdayCoverage)
    }
  })

  it('keeps the pipeline’s own 90% floor gate meaningful', () => {
    // build-data.ts gates post-1849 coverage at ≥90%. The worst case must sit
    // above it, or the build would be failing and this page would not exist.
    expect(c.worst.birthdayCoverage).toBeGreaterThanOrEqual(0.9)
  })
})
