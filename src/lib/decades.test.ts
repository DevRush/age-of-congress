import { describe, expect, it } from 'vitest'
import { ageAt, countAtLeast, countOutliving, decadeRows } from './decades'

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

describe('countOutliving', () => {
  // The claim is "has outlived", so the comparison is strict: at a life
  // expectancy of 78.4 a member must be 79, not 78. Rounding the threshold down
  // would count six members who have not, in fact, outlived it.
  const roster = [
    { birthYear: 1947 }, // 79
    { birthYear: 1948 }, // 78
    { birthYear: 1949 }, // 77
  ]
  it('counts only members strictly past a fractional threshold', () => {
    expect(countOutliving(roster, 2026, 78.4)).toBe(1)
  })
  it('excludes a member whose age equals a whole-year threshold', () => {
    expect(countOutliving(roster, 2026, 79)).toBe(0)
  })
})
