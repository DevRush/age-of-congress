import type { ReactNode } from 'react'
import congress from '@/data/congress.json'
import population from '@/data/population.json'
import {
  GENERATIONS,
  congressShares,
  populationShares,
  type PopBin,
} from '@/lib/generations'
import { trunc1 } from '@/lib/format'

/**
 * "The Generation Gap" — the roster against the country it is drawn from.
 *
 * Two bars per generation: Congress in full ink, the population in a quiet
 * tint, on one shared scale, with the gap between them printed at the right.
 * The pairing is the whole argument, so the two bars sit directly on top of one
 * another with a hairline of paper between them — near enough to read as one
 * measurement taken twice, not as two charts.
 *
 * Monochrome by rule: these are not member-level marks, so no party hue. The
 * two series are told apart by ink weight and by a legend, which is a lightness
 * difference rather than a hue one and so survives any color vision.
 *
 * The baseline is adults 25 and older, not all adults — see `populationShares`
 * and the section's footnote. That is what `population.json` describes, and it
 * happens to be the fairer comparison anyway: 25 is the House's minimum age, so
 * every person in the denominator is someone who could actually hold the seat.
 *
 * Server-rendered: every figure is derived at build time from the same data the
 * cron refreshes.
 */

const COLUMN = 640

export function GenerationGap() {
  const entries = congress.histogram as { birthYear: number }[]
  const asOfYear = new Date(population.asOf).getUTCFullYear()

  const inCongress = congressShares(entries)
  const inCountry = populationShares(population.bins as PopBin[], asOfYear)

  // One shared scale across both series, so a Congress bar and a population bar
  // of the same length mean the same thing.
  const max = Math.max(...inCongress.map((r) => r.share), ...inCountry.map((r) => r.share))

  const genZ = inCongress.find((r) => r.name === 'Gen Z')!
  const genZCountry = inCountry.find((r) => r.name === 'Gen Z')!

  return (
    <figure className="mx-auto my-0" style={{ maxWidth: COLUMN }}>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <ul className="smallcaps flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[0.6875rem] tracking-[0.08em] text-[var(--ink-soft)]">
          <Key fill="var(--ink)">Congress</Key>
          <Key fill="color-mix(in srgb, var(--ink) 22%, var(--paper))">
            U.S. adults 25+
          </Key>
        </ul>
        <span className="smallcaps self-start text-[0.625rem] tracking-[0.14em] text-[var(--ink-faint)] sm:self-auto">
          Congress − country
        </span>
      </div>

      <div
        role="img"
        aria-label={
          `Share of Congress against share of the U.S. adult population 25 and older, by generation: ` +
          GENERATIONS.map((g, i) => {
            const c = inCongress[i]
            const p = inCountry[i]
            return `${g.name}, ${pct(c.share)} of Congress against ${pctFloor(p.share)} of the country`
          }).join('; ') +
          '.'
        }
        className="space-y-6"
      >
        {GENERATIONS.map((g, i) => (
          <Row
            key={g.name}
            generation={g}
            congress={inCongress[i].share}
            country={inCountry[i].share}
            max={max}
          />
        ))}
      </div>

      <figcaption className="serif mt-9 max-w-prose text-[1.0625rem] leading-relaxed text-[var(--ink-soft)]">
        One member of Congress was born after 1996. Gen Z holds{' '}
        <strong className="tnum font-semibold text-[var(--ink)]">
          {pct(genZ.share)}
        </strong>{' '}
        of the seats and makes up{' '}
        <strong className="tnum font-semibold text-[var(--ink)]">
          {pctFloor(genZCountry.share)}
        </strong>{' '}
        of the Americans old enough to fill them.
      </figcaption>
    </figure>
  )
}

/**
 * One generation: the band and its gap on a label line, the paired bars below.
 * The label sits above the bars rather than beside them so the row survives a
 * 390px screen without a scroller — the bars keep the full column width at
 * every size, which is what keeps the pairs comparable down the chart.
 */
function Row({
  generation,
  congress,
  country,
  max,
}: {
  generation: { name: string; from: number; to: number }
  congress: number
  country: number
  max: number
}) {
  const delta = (congress - country) * 100
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <p className="flex items-baseline gap-2">
          <span className="smallcaps text-[0.75rem] tracking-[0.1em] text-[var(--ink)]">
            {generation.name}
          </span>
          <span className="meta tnum text-[0.6875rem] text-[var(--ink-faint)]">
            b. {generation.from}&ndash;{generation.to}
          </span>
        </p>
        <p className="serif tnum shrink-0 text-[0.9375rem] font-semibold text-[var(--ink)]">
          {delta > 0 ? '+' : delta < 0 ? '−' : ''}
          {Math.abs(delta).toFixed(1)}
        </p>
      </div>

      <div aria-hidden className="mt-2 space-y-[3px]">
        <Bar value={congress} max={max} fill="var(--ink)" format={pct} />
        <Bar
          value={country}
          max={max}
          fill="color-mix(in srgb, var(--ink) 22%, var(--paper))"
          format={pctFloor}
        />
      </div>
    </div>
  )
}

/** One bar, with its share direct-labelled in a fixed column at the right. */
function Bar({
  value,
  max,
  fill,
  format,
}: {
  value: number
  max: number
  fill: string
  format: (share: number) => string
}) {
  return (
    <div className="grid grid-cols-[1fr_2.75rem] items-center gap-2.5">
      <span className="block">
        <span
          className="block h-[13px] rounded-r-[3px]"
          style={{ width: `max(2px, ${(value / max) * 100}%)`, background: fill }}
        />
      </span>
      <span className="meta tnum text-right text-[0.75rem] text-[var(--ink-soft)]">
        {format(value)}
      </span>
    </div>
  )
}

function Key({ fill, children }: { fill: string; children: ReactNode }) {
  return (
    <li className="flex items-center gap-1.5">
      <span
        aria-hidden
        className="inline-block h-[10px] w-[16px] rounded-[2px]"
        style={{ background: fill }}
      />
      {children}
    </li>
  )
}

/**
 * Congress shares, rounded to one decimal. Every voting member falls in a band
 * (all were born 1928–2012), so these cover the whole roster and rounding to the
 * nearest tenth keeps each figure — including Gen Z's lone 0.2% — honest.
 */
function pct(share: number): string {
  return `${(share * 100).toFixed(1)}%`
}

/**
 * Country shares, truncated to one decimal. The five bands leave out adults 98
 * and older, so the country's shares genuinely sum to just under 100; truncating
 * (rather than rounding up) is what lets the printed figures reflect that
 * shortfall instead of rounding back up to a false 100.0.
 */
function pctFloor(share: number): string {
  return `${trunc1(share * 100)}%`
}
