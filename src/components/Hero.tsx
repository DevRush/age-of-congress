import data from '@/data/congress.json'
import population from '@/data/population.json'
import { ageYears } from '@/lib/age'
import { ordinal } from '@/lib/format'
import { Clock } from './Clock'

/**
 * The front page. A slim masthead bar names the publication and states the
 * edition; below it the whole emotional payload is a single enormous, live-
 * ticking serif number — the average age of Congress carried to nine absurd
 * decimal places, the last two dimmed so the figure appears to keep running
 * past any point that could possibly matter.
 *
 * The decimals taper: each one is set smaller than the last on a curve that
 * flattens out, so the figure narrows away to the right like a road at the
 * horizon. The ninth decimal turns over about thirty times a second and is
 * frankly unreadable — that is the joke, and the taper is what lets it be a
 * blur at the vanishing point rather than noise shouting at full size.
 *
 * This is the page's one loud gesture; everything else stays quiet.
 */
export function Hero() {
  const baselineMs = Date.parse(data.generatedAt)
  const meanAge = ageYears(data.overall.meanDobMs, baselineMs)
  const delta = Math.round(meanAge - population.adultMeanAge18)

  return (
    // The dek closes the hero and the first section rule sits close underneath
    // it, so the page turns straight from the figure into the reporting.
    <header className="pb-2 sm:pb-4">
      {/* Masthead — wordmark on the left, edition folio on the right. */}
      <div className="flex items-baseline justify-between gap-4 border-b border-[var(--ink)] pt-6 pb-3">
        <h1 className="smallcaps text-[0.9375rem] font-extrabold tracking-[0.16em] text-[var(--ink)] sm:text-[1.0625rem]">
          The Age of Congress
        </h1>
        <span className="meta text-[0.6875rem] leading-tight tracking-[0.02em] text-[var(--ink-soft)] sm:text-[0.75rem]">
          {ordinal(data.congress)} Congress · {data.overall.count} voting members
        </span>
      </div>

      {/* The graphic: kicker, the figure, its label, and the deadpan dek. */}
      <div className="text-center">
        <p className="smallcaps mt-[clamp(3rem,8vw,5.5rem)] text-[0.8125rem] tracking-[0.18em] text-[var(--ink-soft)] sm:text-[0.875rem]">
          How old is Congress?
        </p>

        <div className="serif mt-5 whitespace-nowrap text-[clamp(2.75rem,12vw,9.25rem)] font-medium leading-[0.84] tracking-[-0.01em]">
          <Clock dobMs={data.overall.meanDobMs} decimals={9} dim={2} baselineMs={baselineMs} taper />
        </div>
        <p className="serif mt-5 text-xl italic text-[var(--ink-soft)] sm:text-2xl">
          years old, on average
        </p>

        <p className="mx-auto mt-8 max-w-xl text-pretty text-[0.9375rem] leading-relaxed text-[var(--ink-soft)] sm:text-base">
          The average voting member of the {ordinal(data.congress)} Congress is{' '}
          <span className="font-semibold text-[var(--ink)]">about {delta} years older</span> than the
          average American adult.
          <sup
            className="ml-0.5 cursor-help"
            title="Mean age of U.S. adults 18 and older: 49 years (U.S. Census Bureau, Vintage 2025 National Population Estimates)."
          >
            †
          </sup>
        </p>
      </div>
    </header>
  )
}
