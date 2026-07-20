import type { ReactNode } from 'react'
import data from '@/data/congress.json'
import { countAtLeast, decadeRows } from '@/lib/decades'

/**
 * "The Decades" — the intuition made countable. Everyone has a private sense
 * that a member in their 90s is a different proposition from a member in their
 * 60s, but the histogram's five-year bins are too fine to carry it: nobody
 * thinks in five-year bins, they think in decades of life. So this counts the
 * roster the way the reader already does, one row per decade, and prints the
 * headcount at the end of each row rather than making anyone read a bar against
 * an axis. There is no axis. The numbers are the axis.
 *
 * The one drawn line is at 70. Below it the bars are a cool, neutral ink tint —
 * baseline, unremarked. At and above it they deepen through this section's own
 * hue, a dusty rose (--dec-*), a step darker each decade, so a member in their
 * 90s is visibly further along the scale than one in their 70s. Rose rather than
 * the map's amber because three sections all wearing that gold read as one
 * repeated smudge; every count chart now carries its own color. It marks "past
 * retirement" with a little warmth, not alarm. Length still carries the count
 * independently of hue — the 60s row is the longest bar and stays neutral — and
 * because every count is printed, the color can editorialize without the
 * geometry lying.
 *
 * Server-rendered: the figures are fixed at build time from the same data the
 * cron refreshes, so they move when the roster moves and never drift.
 */

// Where the rule is drawn. The threshold is the section's whole argument, so it
// is a named constant rather than a magic number buried in a comparison.
const THRESHOLD = 70

/*
 * The cascade used to end on a third clause: "37 have outlived US life
 * expectancy (78.4)". It is gone, and should not come back in any form.
 *
 * 78.4 was life expectancy AT BIRTH, and it cannot be read as a forecast for a
 * living 79-year-old. A member who has reached 79 has already survived every
 * death that pulls the at-birth average down — infant mortality, accidents at
 * 20, heart attacks at 55 — and their remaining expectancy is calculated from a
 * different row of the life table entirely. "Outliving" a figure that was never
 * about them is the survivorship fallacy in one sentence, on a page whose whole
 * claim on the reader is that its arithmetic is careful. Any stats-literate
 * critic gets a free win, and the rest of the page pays for it. (The 78.4
 * attribution to CDC/NCHS could not be confirmed either, which is its own
 * reason.)
 *
 * The replacement is nothing. A period-life-expectancy-at-79 figure would be
 * arithmetically defensible and would still be an actuarial claim this page has
 * no need to make and no source to back. The two clauses that remain are plain
 * counts of the roster — the reader can check them against the bars directly —
 * and a short true line beats a long false one.
 */

// The bars are a measure, not a banner: a column narrow enough that the eye
// reads label → length → count in one movement, centered under the kicker like
// every other figure on the page.
const COLUMN = 600

// The cool baseline every below-70 row shares: a neutral ink tint, no warmth.
const NEUTRAL = 'color-mix(in srgb, var(--ink) 22%, var(--paper))'

// The rose arm, one step per decade past the line: 70s→--dec-1, 80s→--dec-2,
// 90s→--dec-3, and anything deeper (a future centenarian row) holds at the
// darkest step rather than running off the ramp.
const ROSE = ['var(--dec-1)', 'var(--dec-2)', 'var(--dec-3)'] as const

/** The bar fill for a decade whose floor is `min`. Neutral below 70, rose above. */
function decadeFill(min: number): string {
  if (min < THRESHOLD) return NEUTRAL
  return ROSE[Math.min(Math.floor((min - THRESHOLD) / 10), ROSE.length - 1)]
}

export function Decades() {
  const atYear = new Date(data.generatedAt).getUTCFullYear()
  const entries = data.histogram as { birthYear: number }[]

  const rows = decadeRows(entries, atYear)
  const max = Math.max(...rows.map((r) => r.count))

  const past70 = countAtLeast(entries, atYear, THRESHOLD)
  const past65 = countAtLeast(entries, atYear, 65)

  return (
    <figure className="mx-auto my-0" style={{ maxWidth: COLUMN }}>
      {/* The dek exists to settle one question before the reader counts a single
          bar: these are ages, not birth decades. "In their 70s" means 70-something
          today — the decade of life they are living in now. */}
      <p className="serif mb-6 max-w-prose text-[1.0625rem] leading-relaxed text-[var(--ink-soft)]">
        Members of Congress by the decade of life they are in &mdash; how old they
        are now, not the decade they were born.
      </p>

      <div
        role="img"
        aria-label={
          `Voting members of Congress by decade of life: ` +
          rows.map((r) => `${r.count} in their ${r.label}`).join(', ') +
          `. ${past70} are ${THRESHOLD} or older.`
        }
        className="grid grid-cols-[5.5rem_1fr_2.5rem] items-center gap-x-3 gap-y-1.5"
      >
        {rows.map((row, i) => {
          const past = row.min >= THRESHOLD
          // The rule sits above the first row that crosses the threshold.
          const opensThreshold = past && !(rows[i - 1]?.min >= THRESHOLD)
          return (
            <ThresholdGroup key={row.label} draw={opensThreshold}>
              {/* Rendered in normal case, NOT small-caps: an uppercase transform
                  turns the trailing "s" into "70S". The number keeps its lowercase
                  decade "s", and "In their" removes the birth-decade ambiguity at
                  the row level too. */}
              <span
                className="meta tnum text-[0.8125rem] leading-tight"
                style={{
                  color: past ? 'var(--ink)' : 'var(--ink-soft)',
                  fontWeight: past ? 600 : 400,
                }}
              >
                In their {row.label}
              </span>

              <span aria-hidden className="block">
                <span
                  className="block h-[16px] rounded-r-[3px]"
                  style={{
                    // A count of 1 is a tick, not a nothing: the sliver is
                    // floored so the row still reads as present.
                    width: `max(2px, ${(row.count / max) * 100}%)`,
                    background: decadeFill(row.min),
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

      {/* `text-balance` splits the two clauses evenly rather than leaving a
          widow, on the rare narrow width where they wrap at all. */}
      <p className="serif mt-7 text-balance text-[1.0625rem] leading-relaxed text-[var(--ink-soft)]">
        <Figure n={past70} /> are {THRESHOLD} or older <Dot />{' '}
        <Figure n={past65} /> have reached 65
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
