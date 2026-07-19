import { describe, expect, it } from 'vitest'
import { linearAdultMedian } from './derive-us-medians'

/**
 * The one function the U.S.-adults line rests on. The convention under test:
 * ages are uniform within [a, a+1), so the median is
 * a + (N/2 − cumBefore) / pop(a) inside whichever single year of age holds the
 * midpoint — the standard linear interpolation, NOT the coarser bin-midpoint
 * method parse-census.ts uses for its single published point.
 */
describe('linearAdultMedian', () => {
  it('lands mid-year when the midpoint falls mid-year', () => {
    // 100 people aged 18, 300 aged 19: N/2 = 200, so the median sits 100/300
    // of the way through age 19.
    const m = linearAdultMedian([
      { age: 18, pop: 100 },
      { age: 19, pop: 300 },
    ])
    expect(m).toBeCloseTo(19 + 100 / 300, 6)
  })

  it('resolves an exact boundary to the end of the year that reaches it', () => {
    // Two equal years: the midpoint is exactly the whole first year.
    const m = linearAdultMedian([
      { age: 18, pop: 100 },
      { age: 19, pop: 100 },
    ])
    expect(m).toBeCloseTo(19, 6)
  })

  it('ignores ages below the floor and tolerates unsorted input', () => {
    const m = linearAdultMedian([
      { age: 19, pop: 100 },
      { age: 10, pop: 1_000_000 }, // a child boom must not move an 18+ median
      { age: 18, pop: 100 },
    ])
    expect(m).toBeCloseTo(19, 6)
  })

  it('refuses an empty population rather than returning something', () => {
    expect(() => linearAdultMedian([{ age: 5, pop: 100 }])).toThrow(/empty/)
  })
})
