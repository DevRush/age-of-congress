import data from '@/data/congress.json'
import { ageYears } from '@/lib/age'
import { Clock } from './Clock'

/**
 * One chamber, rendered as a miniature of the hero: a standing head, the live
 * mean age ticking to seven places (last two dimmed), the same "years old, on
 * average" descriptor so the vocabulary carries over, a small-caps credit line
 * with the static median and member count, and the chamber's oldest sitting
 * member as a square newspaper cut. Everything stays monochrome — party color
 * is reserved for the Rankings, where it separates one member from the next.
 */
function Chamber({ label, stats, oldest, countLine }: {
  label: string
  stats: { meanDobMs: number; medianDobMs: number }
  oldest: { name: string; photo: string; birthday: string }
  countLine: string
}) {
  const baselineMs = Date.parse(data.generatedAt)
  const median = ageYears(stats.medianDobMs, baselineMs).toFixed(1)

  return (
    <div className="px-0 py-9 text-center first:pt-0 last:pb-0 sm:px-8 sm:py-1 lg:px-14">
      <h3 className="smallcaps text-[0.8125rem] font-medium tracking-[0.14em] text-[var(--ink-soft)]">
        {label}
      </h3>

      <div className="mt-4 text-[clamp(2.25rem,6vw,3.75rem)] font-medium leading-none tracking-[-0.01em]">
        <Clock dobMs={stats.meanDobMs} decimals={7} dim={2} baselineMs={baselineMs} />
      </div>
      <p className="mt-3 text-[0.9375rem] italic text-[var(--ink-soft)]">years old, on average</p>

      <p className="smallcaps mt-3 text-[0.75rem] tracking-[0.1em] text-[var(--ink-soft)]">
        median {median} · {countLine}
      </p>

      <div className="mt-7 flex items-center justify-center gap-3">
        <img
          src={oldest.photo.replace('-320', '-160')}
          alt=""
          width={44}
          height={54}
          className="border border-[var(--rule)] object-cover"
        />
        <div className="text-left">
          <p className="smallcaps text-[0.6875rem] tracking-[0.12em] text-[var(--ink-soft)]">
            Oldest member
          </p>
          <p className="text-[0.9375rem] leading-snug">
            <span className="font-medium">{oldest.name}</span>, b. {oldest.birthday.slice(0, 4)}
          </p>
        </div>
      </div>
    </div>
  )
}

/**
 * The two chambers set side by side, split by a broadsheet gutter rule — a
 * vertical hairline between the columns on wide screens, a horizontal one
 * between them once they stack. Symmetric padding keeps the rule centered in
 * the gutter.
 */
export function ChamberSplit() {
  return (
    <div className="grid grid-cols-1 [&>*+*]:border-t [&>*+*]:border-[var(--rule)] sm:grid-cols-2 sm:[&>*+*]:border-l sm:[&>*+*]:border-t-0">
      <Chamber
        label="The Senate"
        stats={data.senate}
        oldest={data.oldest.senate[0]}
        countLine={`based on ${data.senate.count} sitting senators`}
      />
      <Chamber
        label="The House"
        stats={data.house}
        oldest={data.oldest.house[0]}
        countLine={`based on ${data.house.count} voting representatives`}
      />
    </div>
  )
}
