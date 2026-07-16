/**
 * The arithmetic behind "The Decades" — counting the roster by decade of life,
 * and counting it against the thresholds.
 *
 * Pure module: no data imports, no React. The section feeds it `congress.json`'s
 * histogram, so every figure is derived at build time and none of them can go
 * stale between data runs.
 *
 * Ages are birth-year granular, which is the convention "The Shape of Congress"
 * already uses: `ageAt` is the age a member *reaches* during the edition year.
 * That makes it an upper bound on their age today — exact the day after their
 * birthday, a year high before it — and the section's footnote says so.
 */

export interface DecadeRow {
  /** "70s" */
  label: string
  /** The decade's age floor — 70 — which the threshold rule keys off. */
  min: number
  count: number
}

/** The age a member born in `birthYear` reaches during `atYear`. */
export function ageAt(birthYear: number, atYear: number): number {
  return atYear - birthYear
}

/**
 * Tally the roster into decades of life, from the youngest decade present to
 * the oldest. The run is contiguous — an empty decade in the middle is held at
 * zero rather than dropped, so the bars stay on one scale and a gap reads as a
 * gap. The ends are taken from the data rather than fixed at 20s–90s, so a
 * centenarian would simply open a new row.
 */
export function decadeRows(
  entries: readonly { birthYear: number }[],
  atYear: number,
): DecadeRow[] {
  if (entries.length === 0) return []
  const decades = entries.map((e) => Math.floor(ageAt(e.birthYear, atYear) / 10) * 10)
  const lo = Math.min(...decades)
  const hi = Math.max(...decades)
  const rows: DecadeRow[] = []
  for (let min = lo; min <= hi; min += 10) {
    rows.push({
      label: `${min}s`,
      min,
      count: decades.filter((d) => d === min).length,
    })
  }
  return rows
}

/** Members who are `minAge` or older at `atYear`. */
export function countAtLeast(
  entries: readonly { birthYear: number }[],
  atYear: number,
  minAge: number,
): number {
  return entries.filter((e) => ageAt(e.birthYear, atYear) >= minAge).length
}

/*
 * `countOutliving` used to live here — members strictly older than a fractional
 * threshold, which existed only to count who had "outlived" a life expectancy of
 * 78.4. That claim is gone from The Decades (see the note in Decades.tsx: it
 * read life expectancy at birth as a forecast for the already-old), and the
 * function went with it rather than sitting here as a loaded gun. It had no
 * other caller, and its only plausible next caller would be someone re-making
 * the same mistake.
 *
 * `countAtLeast` covers every honest counting question this section asks.
 */
