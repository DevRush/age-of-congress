import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { ageAt, countAtLeast, decadeRows } from './decades'

describe('ageAt', () => {
  it('is the age the member reaches during the edition year', () => {
    expect(ageAt(1950, 2026)).toBe(76)
  })
})

describe('decadeRows', () => {
  it('groups members by decade of life', () => {
    const rows = decadeRows(
      [
        { birthYear: 1997 }, // 29 → 20s
        { birthYear: 1996 }, // 30 → 30s
        { birthYear: 1986 }, // 40 → 40s
      ],
      2026,
    )
    expect(rows.map((r) => [r.label, r.count])).toEqual([
      ['20s', 1],
      ['30s', 1],
      ['40s', 1],
    ])
  })

  it('keeps the run contiguous, holding an empty decade at zero', () => {
    const rows = decadeRows([{ birthYear: 1996 }, { birthYear: 1956 }], 2026)
    // 30 and 70, so the 40s/50s/60s must still appear, empty.
    expect(rows.map((r) => r.label)).toEqual(['30s', '40s', '50s', '60s', '70s'])
    expect(rows.map((r) => r.count)).toEqual([1, 0, 0, 0, 1])
  })

  it('carries the decade floor for the threshold rule', () => {
    expect(decadeRows([{ birthYear: 1950 }], 2026)[0]).toEqual({
      label: '70s',
      min: 70,
      count: 1,
    })
  })

  it('is empty for an empty roster', () => {
    expect(decadeRows([], 2026)).toEqual([])
  })
})

describe('countAtLeast', () => {
  const roster = [
    { birthYear: 1956 }, // 70
    { birthYear: 1961 }, // 65
    { birthYear: 1962 }, // 64
  ]
  it('counts members at or above the age', () => {
    expect(countAtLeast(roster, 2026, 70)).toBe(1)
    expect(countAtLeast(roster, 2026, 65)).toBe(2)
    expect(countAtLeast(roster, 2026, 64)).toBe(3)
  })
})

/**
 * The Decades once ended on "37 have outlived US life expectancy (78.4)", which
 * read life expectancy AT BIRTH as a forecast for people already in their
 * seventies — the survivorship fallacy, printed on a page that asks to be
 * trusted on arithmetic. The claim, its helper (`countOutliving`), and its
 * constant are all gone.
 *
 * This is the gate that keeps them gone. The section is welcome to count the
 * roster; it is not welcome to make an actuarial claim about it.
 */
describe('The Decades makes no actuarial claim', () => {
  // page.tsx carries the section's footnote, which is where the claim's source
  // citation lived — and where it survived the first removal of the claim
  // itself. A gate that only watched the component would have missed it.
  const sources = ['../components/Decades.tsx', './decades.ts', '../app/page.tsx'] as const

  for (const rel of sources) {
    const src = readFileSync(new URL(rel, import.meta.url), 'utf8')
    // Strip comments: the files explain at length WHY the claim is gone, and
    // that prose must not trip the gate that keeps it gone.
    const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')

    it(`${rel} states no life expectancy, in code`, () => {
      expect(code).not.toMatch(/life.?expectancy/i)
      expect(code).not.toMatch(/outliv/i)
      expect(code).not.toMatch(/78\.4/)
    })
  }

  it('exports no strict-threshold counter for a fractional actuarial figure', () => {
    const lib = readFileSync(new URL('./decades.ts', import.meta.url), 'utf8')
    expect(lib).not.toMatch(/export function countOutliving/)
  })

  it('still counts the roster, which is all it ever needed to do', () => {
    const roster = [{ birthYear: 1947 }, { birthYear: 1948 }, { birthYear: 1949 }]
    expect(countAtLeast(roster, 2026, 79)).toBe(1)
    expect(countAtLeast(roster, 2026, 70)).toBe(3)
  })
})
