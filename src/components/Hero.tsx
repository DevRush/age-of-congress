import data from '@/data/congress.json'
import population from '@/data/population.json'
import { ageYears } from '@/lib/age'
import { ordinal } from '@/lib/format'
import { Clock } from './Clock'

/**
 * The front-page graphic. A small masthead names the piece; below it the whole
 * emotional payload is a single enormous, live-ticking number — the average age
 * of Congress carried to eight absurd decimal places, the last three dimmed so
 * the figure appears to keep running past any point that could possibly matter.
 * Everything around the number stays quiet: this is where the page spends its
 * one loud gesture.
 */
export function Hero() {
  const baselineMs = Date.parse(data.generatedAt)
  const meanAge = ageYears(data.overall.meanDobMs, baselineMs)
  const delta = Math.round(meanAge - population.adultMeanAge18)

  return (
    <header className="pt-10 pb-16 text-center sm:pt-14">
      {/* Masthead — the nameplate and a folio line stating the edition. */}
      <div className="mx-auto max-w-2xl border-b border-[var(--ink)] pb-2.5">
        <h1 className="smallcaps text-[0.9375rem] font-medium tracking-[0.24em] text-[var(--ink)]">
          The Age of Congress
        </h1>
      </div>
      <p className="smallcaps mt-2 text-[0.6875rem] tracking-[0.14em] text-[var(--ink-soft)]">
        {ordinal(data.congress)} United States Congress · {data.overall.count} voting members
      </p>

      {/* The graphic: kicker, the live figure, its label, and the deadpan dek. */}
      <p className="smallcaps mt-[clamp(3.5rem,9vw,6.5rem)] text-lg tracking-[0.05em] text-[var(--ink-soft)]">
        How old is Congress?
      </p>
      <div className="mt-4 text-[clamp(2.75rem,13.5vw,10rem)] font-medium leading-[0.86] tracking-[-0.005em]">
        <Clock dobMs={data.overall.meanDobMs} decimals={8} dim={3} baselineMs={baselineMs} />
      </div>
      <p className="mt-5 text-xl italic text-[var(--ink-soft)]">years old, on average</p>

      <p className="mx-auto mt-8 max-w-xl text-pretty text-base leading-relaxed text-[var(--ink-soft)]">
        The average voting member of the {ordinal(data.congress)} Congress is{' '}
        <span className="text-[var(--ink)]">about {delta} years older</span> than the average
        American adult.
        <sup
          className="ml-0.5 cursor-help"
          title="Mean age of U.S. adults 18 and older: 49 years (U.S. Census Bureau, Vintage 2025 National Population Estimates)."
        >
          †
        </sup>
      </p>
    </header>
  )
}
