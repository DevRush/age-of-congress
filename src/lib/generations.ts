/**
 * The band mapping and share math behind "The Generation Gap".
 *
 * Pure module: no data imports, no React. The section feeds it `congress.json`'s
 * histogram and `population.json`'s bins, so every figure is derived at build
 * time and none of them can go stale between data runs.
 */

export interface Generation {
  name: string
  /** Inclusive birth-year band. */
  from: number
  to: number
}

/**
 * The Pew Research Center's birth-year bands, which are the ones in general
 * newsroom use. They are contiguous and non-overlapping, so a birth year lands
 * in exactly one of them or in none — members born before 1928 or after 2012
 * fall outside the chart rather than getting rounded into a neighbour.
 */
export const GENERATIONS: readonly Generation[] = [
  { name: 'Silent', from: 1928, to: 1945 },
  { name: 'Boomer', from: 1946, to: 1964 },
  { name: 'Gen X', from: 1965, to: 1980 },
  { name: 'Millennial', from: 1981, to: 1996 },
  { name: 'Gen Z', from: 1997, to: 2012 },
]

export function generationOf(birthYear: number): Generation | undefined {
  return GENERATIONS.find((g) => birthYear >= g.from && birthYear <= g.to)
}

export interface Share {
  name: string
  /** Headcount for Congress; an interpolated estimate for the population. */
  count: number
  /** Fraction of the whole, 0–1. */
  share: number
}

/** Each band's headcount and share of the roster. One row per band, in order. */
export function congressShares(entries: readonly { birthYear: number }[]): Share[] {
  const total = entries.length
  return GENERATIONS.map((g) => {
    const count = entries.filter((e) => generationOf(e.birthYear) === g).length
    return { name: g.name, count, share: total ? count / total : 0 }
  })
}

export interface PopBin {
  min: number
  /** `null` on the open-ended terminal bin (95+). */
  max: number | null
  count: number
}

/**
 * The span assumed for the open-ended terminal bin (95+), so it can be
 * interpolated like the rest. It matches the five-year width of every other
 * bin; the choice moves the Silent share by about a third of a point.
 */
export const TERMINAL_BIN_SPAN = 5

/** The inclusive whole-year age range a bin covers. */
function binAges(b: PopBin): { lo: number; hi: number } {
  return { lo: b.min, hi: b.max ?? b.min + TERMINAL_BIN_SPAN - 1 }
}

/**
 * Each band's share of the binned population, by mapping the band's birth years
 * to an age range at `asOfYear` and summing the bins it covers — interpolating
 * uniformly across a bin the band only partly claims.
 *
 * The denominator is every bin supplied, so the shares are shares of the
 * population the bins actually describe. Where a band reaches past them (Gen Z
 * runs down to age 13; the bins start at 25) only the covered part is counted,
 * and the section's footnote states the resulting baseline.
 */
export function populationShares(bins: readonly PopBin[], asOfYear: number): Share[] {
  const total = bins.reduce((a, b) => a + b.count, 0)
  return GENERATIONS.map((g) => {
    const ageLo = asOfYear - g.to
    const ageHi = asOfYear - g.from
    let count = 0
    for (const b of bins) {
      const { lo, hi } = binAges(b)
      const overlap = Math.min(ageHi, hi) - Math.max(ageLo, lo) + 1
      if (overlap > 0) count += b.count * (overlap / (hi - lo + 1))
    }
    return { name: g.name, count, share: total ? count / total : 0 }
  })
}
