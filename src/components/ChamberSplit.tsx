import data from '@/data/congress.json'
import { ageYears } from '@/lib/age'
import { Clock } from './Clock'

/**
 * One chamber as a bold, free-standing stat card: a standing-head rule across
 * the top, a tracked sans label, then a big live serif mean age ticking to seven
 * places (last two dimmed), the "years old, on average" descriptor so the
 * vocabulary carries down from the hero, a quiet metadata line with the static
 * median and member count, and the chamber's oldest sitting member as a clean
 * circular avatar.
 *
 * The head rule encodes the chamber the same way "The Long View" chart does —
 * the Senate in heavy ink, the House a step below in soft gray — so ink weight
 * means the same thing everywhere on the page, and the reader learns the
 * convention here before meeting it in the chart.
 *
 * The card stays monochrome: party color is reserved for the Rankings and the
 * histogram, where it separates one member from the next.
 */
function Chamber({ label, stats, oldest, countLine, rule }: {
  label: string
  stats: { meanDobMs: number; medianDobMs: number }
  oldest: { name: string; photo: string; birthday: string }
  countLine: string
  rule: string
}) {
  const baselineMs = Date.parse(data.generatedAt)
  const median = ageYears(stats.medianDobMs, baselineMs).toFixed(1)

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--surface-line)] bg-[var(--surface)]">
      <div aria-hidden className="h-[3px]" style={{ background: rule }} />
      <div className="px-6 py-9 text-center sm:px-8 sm:py-10 lg:px-10">
        <h3 className="smallcaps text-[0.8125rem] tracking-[0.16em] text-[var(--ink-soft)]">
          {label}
        </h3>

        <div className="serif mt-4 text-[clamp(2.75rem,8vw,4.5rem)] font-medium leading-[0.9] tracking-[-0.015em] text-[var(--ink)]">
          <Clock dobMs={stats.meanDobMs} decimals={7} dim={2} baselineMs={baselineMs} />
        </div>
        <p className="serif mt-2 text-base italic text-[var(--ink-soft)]">years old, on average</p>

        <p className="meta mt-3 text-[0.75rem] tracking-[0.01em] text-[var(--ink-soft)]">
          Median {median} · {countLine}
        </p>

        <div className="mt-7 flex items-center justify-center gap-3">
          <img
            src={oldest.photo.replace('-320', '-160')}
            alt=""
            width={48}
            height={48}
            className="h-12 w-12 shrink-0 rounded-full object-cover ring-1 ring-[var(--rule-strong)]"
            style={{ objectPosition: '50% 22%' }}
          />
          <div className="text-left">
            <p className="smallcaps text-[0.625rem] tracking-[0.14em] text-[var(--ink-faint)]">
              Oldest member
            </p>
            <p className="text-[0.9375rem] leading-snug">
              <span className="font-semibold">{oldest.name}</span>
              <span className="text-[var(--ink-soft)]">, b. {oldest.birthday.slice(0, 4)}</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Two chambers, two separate cards, a real gutter between them. They are
 * genuinely separate institutions, so they are drawn as separate objects rather
 * than as two halves of one panel — the structure states the fact. The pair
 * stays the second thing the eye lands on after the hero counter.
 */
export function ChamberSplit() {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6">
      <Chamber
        label="The Senate"
        stats={data.senate}
        oldest={data.oldest.senate[0]}
        countLine={`${data.senate.count} sitting senators`}
        rule="var(--ink)"
      />
      <Chamber
        label="The House"
        stats={data.house}
        oldest={data.oldest.house[0]}
        countLine={`${data.house.count} voting representatives`}
        rule="var(--ink-soft)"
      />
    </div>
  )
}
