import type { Chamber, Party } from './types'

/** One five-year age bin with a per-party tally of the members who fall in it. */
export interface HistoBin {
  label: string
  min: number
  counts: Record<Party, number>
}

/**
 * Tally voting members into fourteen five-year age bins (25–29 … 90–94), using
 * each member's age *at* `atYear` (birth-year granularity — good enough for a
 * five-year bin). Ages outside 25–94 are dropped rather than clamped, so a bin
 * count is always a real headcount. Returns the bins in ascending age order.
 */
export function binByAge(
  entries: { birthYear: number; party: Party; chamber: Chamber }[],
  atYear: number,
): HistoBin[] {
  const bins: HistoBin[] = []
  for (let min = 25; min <= 90; min += 5) {
    bins.push({ label: `${min}–${min + 4}`, min, counts: { D: 0, R: 0, I: 0 } })
  }
  for (const e of entries) {
    const age = atYear - e.birthYear
    const bin = bins.find((b) => age >= b.min && age < b.min + 5)
    if (bin) bin.counts[e.party]++
  }
  return bins
}

/**
 * Rescale the population's per-bin counts so they sum to `memberTotal`, giving a
 * "if Congress mirrored the country" ghost drawn on the same vertical scale as
 * the member dots. Bins below `minAge` are zeroed first (a chamber's eligible
 * pool starts at its constitutional minimum age), so the comparison is fair.
 */
export function silhouetteCounts(
  pop: { min: number; count: number }[],
  memberTotal: number,
  minAge: number,
): number[] {
  const eligible = pop.map((b) => (b.min >= minAge ? b.count : 0))
  const total = eligible.reduce((a, b) => a + b, 0)
  return eligible.map((c) => (total ? (c / total) * memberTotal : 0))
}

/**
 * Grid coordinates for `count` dots packed `perRow` to a row, filling
 * left-to-right and bottom-up (row 0 is the bottom row). Pure layout math — the
 * caller maps `{ col, row }` to pixels and picks the fill.
 */
export function dotPositions(count: number, perRow: number): { col: number; row: number }[] {
  return Array.from({ length: count }, (_, i) => ({
    col: i % perRow,
    row: Math.floor(i / perRow),
  }))
}
