import { describe, expect, it } from 'vitest'
import {
  GENERATIONS,
  congressShares,
  generationOf,
  populationShares,
} from './generations'

describe('generationOf', () => {
  it('maps a birth year to its band', () => {
    expect(generationOf(1950)?.name).toBe('Boomer')
    expect(generationOf(1972)?.name).toBe('Gen X')
    expect(generationOf(1990)?.name).toBe('Millennial')
    expect(generationOf(2000)?.name).toBe('Gen Z')
  })

  it('is inclusive at both edges of every band', () => {
    for (const g of GENERATIONS) {
      expect(generationOf(g.from)?.name).toBe(g.name)
      expect(generationOf(g.to)?.name).toBe(g.name)
    }
  })

  it('leaves the bands contiguous, with no year in two of them', () => {
    for (let i = 1; i < GENERATIONS.length; i++) {
      expect(GENERATIONS[i].from).toBe(GENERATIONS[i - 1].to + 1)
    }
  })

  it('returns undefined outside the bands', () => {
    expect(generationOf(1927)).toBeUndefined() // Greatest, before Silent
    expect(generationOf(2013)).toBeUndefined() // after Gen Z
  })
})

describe('congressShares', () => {
  it('counts members per band and divides by the roster', () => {
    const rows = congressShares([
      { birthYear: 1950 }, // Boomer
      { birthYear: 1960 }, // Boomer
      { birthYear: 1970 }, // Gen X
      { birthYear: 2000 }, // Gen Z
    ])
    const by = (n: string) => rows.find((r) => r.name === n)!
    expect(by('Boomer').count).toBe(2)
    expect(by('Boomer').share).toBeCloseTo(0.5)
    expect(by('Gen X').count).toBe(1)
    expect(by('Gen Z').share).toBeCloseTo(0.25)
    expect(by('Silent').count).toBe(0)
  })

  it('returns a row per band, in order, and never divides by zero', () => {
    const rows = congressShares([])
    expect(rows.map((r) => r.name)).toEqual(GENERATIONS.map((g) => g.name))
    expect(rows.every((r) => r.count === 0 && r.share === 0)).toBe(true)
  })
})

describe('populationShares', () => {
  // At asOf 2025: Gen Z (b. 1997–2012) is 13–28, Millennial (b. 1981–1996) is
  // 29–44. Against bins that start at 25, Gen Z can only claim ages 25–28 —
  // four of the five years in the 25–29 bin.
  const bins = [
    { min: 25, max: 29, count: 500 },
    { min: 30, max: 34, count: 500 },
  ]

  it('interpolates uniformly where a band splits a bin', () => {
    const rows = populationShares(bins, 2025)
    const by = (n: string) => rows.find((r) => r.name === n)!
    expect(by('Gen Z').count).toBeCloseTo(400) // 500 * 4/5
    expect(by('Millennial').count).toBeCloseTo(600) // 500 * 1/5 + 500
    expect(by('Gen Z').share).toBeCloseTo(0.4)
    expect(by('Millennial').share).toBeCloseTo(0.6)
  })

  it('shares are taken over every bin, so a band outside them reads zero', () => {
    const rows = populationShares(bins, 2025)
    expect(rows.find((r) => r.name === 'Boomer')!.count).toBe(0)
    expect(rows.find((r) => r.name === 'Silent')!.count).toBe(0)
  })

  it('treats the open-ended terminal bin as a five-year span', () => {
    // Silent (b. 1928–1945) is 80–97 at 2025, so it claims 95, 96 and 97 of a
    // 95+ bin read as 95–99: three fifths of it.
    const rows = populationShares([{ min: 95, max: null, count: 500 }], 2025)
    expect(rows.find((r) => r.name === 'Silent')!.count).toBeCloseTo(300)
  })

  it('never lets the bands overlap: every person is counted once', () => {
    const full = [
      { min: 25, max: 29, count: 100 },
      { min: 30, max: 34, count: 100 },
      { min: 35, max: 39, count: 100 },
    ]
    const rows = populationShares(full, 2025)
    const claimed = rows.reduce((a, r) => a + r.count, 0)
    expect(claimed).toBeCloseTo(300) // ages 25–39 all fall in Gen Z or Millennial
  })

  it('handles an empty population without dividing by zero', () => {
    expect(populationShares([], 2025).every((r) => r.share === 0)).toBe(true)
  })
})
