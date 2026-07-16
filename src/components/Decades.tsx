import type { ReactNode } from 'react'
import data from '@/data/congress.json'
import { countAtLeast, countOutliving, decadeRows } from '@/lib/decades'

/**
 * "The Decades" — the intuition made countable. Everyone has a private sense
 * that a member in their 90s is a different proposition from a member in their
 * 60s, but the histogram's five-year bins are too fine to carry it: nobody
 * thinks in five-year bins, they think in decades of life. So this counts the
 * roster the way the reader already does, one row per decade, and prints the
 * headcount at the end of each row rather than making anyone read a bar against
 * an axis. There is no axis. The numbers are the axis.
 *
 * The one drawn line is at 70. Above it the bars are a quiet ink tint; at and
 * below it they go to full ink — the same "ink weight carries emphasis"
 * convention the chambers and "The Long View" already teach, so the shift reads
 * as significance and never as hue. Length still carries the count (the 60s row
 * is the longest bar on the chart and stays pale), and because every count is
 * printed, the ink can editorialize without the geometry lying.
 *
 * Server-rendered: the figures are fixed at build time from the same data the
 * cron refreshes, so they move when the roster moves and never drift.
 */

// Where the rule is drawn. The threshold is the section's whole argument, so it
// is a named constant rather than a magic number buried in a comparison.
const THRESHOLD = 70

// U.S. life expectancy at birth, 78.4 years (CDC/NCHS, 2023). Held to one
// decimal on purpose: `countOutliving` compares strictly against it, so the
// fraction is what keeps the 78-year-olds — who have not outlived it — out of
// the count.
const LIFE_EXPECTANCY = 78.4

// The bars are a measure, not a banner: a column narrow enough that the eye
// reads label → length → count in one movement, centered under the kicker like
// every other figure on the page.
const COLUMN = 600

export function Decades() {
  const atYear = new Date(data.generatedAt).getUTCFullYear()
  const entries = data.histogram as { birthYear: number }[]

  const rows = decadeRows(entries, atYear)
  const max = Math.max(...rows.map((r) => r.count))

  const past70 = countAtLeast(entries, atYear, THRESHOLD)
  const past65 = countAtLeast(entries, atYear, 65)
  const outlived = countOutliving(entries, atYear, LIFE_EXPECTANCY)

  return (
    <figure className="mx-auto my-0" style={{ maxWidth: COLUMN }}>
      <div
        role="img"
        aria-label={
          `Voting members of Congress by decade of life: ` +
          rows.map((r) => `${r.count} in their ${r.label}`).join(', ') +
          `. ${past70} are ${THRESHOLD} or older.`
        }
        className="grid grid-cols-[2.25rem_1fr_2.5rem] items-center gap-x-3 gap-y-1.5"
      >
        {rows.map((row, i) => {
          const past = row.min >= THRESHOLD
          // The rule sits above the first row that crosses the threshold.
          const opensThreshold = past && !(rows[i - 1]?.min >= THRESHOLD)
          return (
            <ThresholdGroup key={row.label} draw={opensThreshold}>
              <span
                className="smallcaps tnum text-[0.6875rem] tracking-[0.1em]"
                style={{ color: past ? 'var(--ink)' : 'var(--ink-soft)' }}
              >
                {row.label}
              </span>

              <span aria-hidden className="block">
                <span
                  className="block h-[16px] rounded-r-[3px]"
                  style={{
                    // A count of 1 is a tick, not a nothing: the sliver is
                    // floored so the row still reads as present.
                    width: `max(2px, ${(row.count / max) * 100}%)`,
                    background: past
                      ? 'var(--ink)'
                      : 'color-mix(in srgb, var(--ink) 26%, var(--paper))',
                  }}
                />
              </span>

              <span
                className="serif tnum text-right text-[0.9375rem]"
                style={{
                  color: past ? 'var(--ink)' : 'var(--ink-soft)',
                  fontWeight: past ? 600 : 400,
                }}
              >
                {row.count}
              </span>
            </ThresholdGroup>
          )
        })}
      </div>

      {/* `text-balance` keeps the line from dropping a lone "(78.4)" onto a
          second row: the three clauses wrap into even lines instead. */}
      <p className="serif mt-7 text-balance text-[1.0625rem] leading-relaxed text-[var(--ink-soft)]">
        <Figure n={past70} /> are {THRESHOLD} or older{' '}
        <Dot /> <Figure n={past65} /> have reached 65 <Dot />{' '}
        <Figure n={outlived} /> have outlived U.S. life expectancy (
        {LIFE_EXPECTANCY})
      </p>
    </figure>
  )
}

/**
 * A row, optionally opened by the threshold rule. The rule spans all three
 * columns and carries its own label, so the grid stays one grid — the bars keep
 * a single shared scale across the line rather than becoming two charts.
 */
function ThresholdGroup({
  draw,
  children,
}: {
  draw: boolean
  children: ReactNode
}) {
  return (
    <>
      {draw ? (
        <div
          aria-hidden
          className="col-span-3 mt-2 mb-1 flex items-center gap-2.5"
        >
          <span className="h-px flex-1 bg-[var(--rule-strong)]" />
          <span className="smallcaps text-[0.625rem] tracking-[0.14em] text-[var(--ink-faint)]">
            {THRESHOLD} and older
          </span>
        </div>
      ) : null}
      {children}
    </>
  )
}

/** A counted figure: the page's display face, at full ink, tabular. */
function Figure({ n }: { n: number }) {
  return <strong className="tnum font-semibold text-[var(--ink)]">{n}</strong>
}

function Dot() {
  return <span className="text-[var(--ink-faint)]"> · </span>
}
