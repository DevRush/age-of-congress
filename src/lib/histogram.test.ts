import { describe, expect, it } from 'vitest'
import { binByAge, dotPositions, silhouetteCounts } from './histogram'

describe('histogram helpers', () => {
  it('bins members by age at the given year', () => {
    const bins = binByAge(
      [
        { birthYear: 1997, party: 'D', chamber: 'house' }, // 29 → 25–29
        { birthYear: 1966, party: 'R', chamber: 'house' }, // 60 → 60–64
        { birthYear: 1933, party: 'R', chamber: 'senate' }, // 93 → 90–94
      ],
      2026,
    )
    expect(bins.find((b) => b.label === '25–29')!.counts.D).toBe(1)
    expect(bins.find((b) => b.label === '60–64')!.counts.R).toBe(1)
    expect(bins.find((b) => b.label === '90–94')!.counts.R).toBe(1)
    expect(bins).toHaveLength(14)
  })
  it('scales population counts to the member total and respects minAge', () => {
    const pop = [
      { min: 25, count: 100 },
      { min: 30, count: 300 },
    ]
    expect(silhouetteCounts(pop, 40, 25)).toEqual([10, 30])
    expect(silhouetteCounts(pop, 30, 30)).toEqual([0, 30])
  })
  it('lays out dots left-to-right, bottom-up', () => {
    expect(dotPositions(5, 2)).toEqual([
      { col: 0, row: 0 },
      { col: 1, row: 0 },
      { col: 0, row: 1 },
      { col: 1, row: 1 },
      { col: 0, row: 2 },
    ])
  })
})
