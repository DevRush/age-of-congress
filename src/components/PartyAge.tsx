import data from '@/data/party-age.json'
import type { Party } from '@/lib/types'

/**
 * "Across the Aisle" — the page's one party-level figure, and the one place, with
 * the Rankings and the histogram, where saturated party hue is allowed to carry
 * the encoding rather than just tag a member.
 *
 * The finding is deliberately counterintuitive and deliberately non-partisan, and
 * the section is built to say it without a thumb on the scale. Two beats:
 *
 *   1. On AVERAGE the two parties are the same age. The two means are set nearly
 *      on top of each other because that IS the point — the gap is under a year
 *      and statistically indistinguishable. Independents are shown apart, never
 *      folded in.
 *   2. The difference lives entirely in the TAIL. The members who reach 80+ are
 *      counted out one mark apiece, and they tilt Democratic — a live count, not a
 *      p-value. Even that tilt is qualified: it is a House phenomenon, and the
 *      single oldest member of Congress is a Republican.
 *
 * Every figure is read straight out of party-age.json, recomputed each build, so
 * nothing here can drift from the roster. The inferential claim ("statistically
 * indistinguishable") is guarded by a fail-loud gate in the pipeline; the page
 * never prints a raw p-value (see the Methodology note on multiple thresholds).
 *
 * Server-rendered: fixed at build time from the same data the cron refreshes.
 */

const PARTY_VAR: Record<Party, string> = {
  D: 'var(--dem)',
  R: 'var(--rep)',
  I: 'var(--ind)',
}
const PARTY_NAME: Record<Party, string> = {
  D: 'Democrats',
  R: 'Republicans',
  I: 'independents',
}
// The mark order for the tail: Democrats, then the two independents, then
// Republicans — the same D · I · R stacking the histogram uses, so color means
// the same thing in both figures.
const CELL_ORDER: Record<Party, number> = { D: 0, I: 1, R: 2 }

const overall = data.overall as { party: Party; n: number; meanAge: number }[]
const stat = (list: typeof overall, p: Party) => list.find((s) => s.party === p)
const pct = (num: number, den: number) => Math.round((num / den) * 100)

export function PartyAge() {
  const d = stat(overall, 'D')!
  const r = stat(overall, 'R')!
  const ind = stat(overall, 'I')
  const gap = Math.abs(d.meanAge - r.meanAge)

  const houseD = stat(data.house as typeof overall, 'D')!
  const houseR = stat(data.house as typeof overall, 'R')!
  const house70 = data.houseBands.find((b) => b.threshold === 70)!

  const { over80 } = data
  const cells = [...over80.members].sort(
    (a, b) => CELL_ORDER[a.party as Party] - CELL_ORDER[b.party as Party] || b.age - a.age,
  )
  const oldest = over80.members[0] // the single oldest member of Congress
  const oldestIsRep = oldest.party === 'R'

  return (
    <figure className="mx-auto my-0" style={{ maxWidth: 680 }}>
      {/* Beat 1 — the parties are the same age. */}
      <p className="serif text-balance text-[1.25rem] leading-snug tracking-[-0.01em] sm:text-[1.4375rem]">
        On average, the two parties are the same age.
      </p>

      <div className="mt-8 grid grid-cols-2">
        <MeanColumn party="D" label="Democrats" mean={d.meanAge} n={d.n} align="right" />
        <MeanColumn party="R" label="Republicans" mean={r.meanAge} n={r.n} align="left" divider />
      </div>

      <p className="mt-6 text-center text-[0.9375rem] text-[var(--ink-soft)]">
        <span className="serif tnum font-semibold text-[var(--ink)]">{gap.toFixed(1)}</span> years
        apart &mdash; a difference too small to call, and{' '}
        <span className="italic">statistically indistinguishable</span>.
      </p>

      {ind ? (
        <p className="meta mx-auto mt-3 max-w-prose text-center text-[0.75rem] text-[var(--ink-faint)]">
          The {ind.n} independents average {ind.meanAge.toFixed(1)} &mdash; too few to compare, and
          counted on their own rather than with the party they caucus with.
        </p>
      ) : null}

      {/* The turn — the same threshold device The Decades uses. */}
      <div aria-hidden className="mt-14 mb-9 flex items-center gap-2.5">
        <span className="h-px flex-1 bg-[var(--rule-strong)]" />
        <span className="smallcaps text-[0.625rem] tracking-[0.14em] text-[var(--ink-faint)]">
          The difference is in the tail
        </span>
        <span className="h-px flex-1 bg-[var(--rule-strong)]" />
      </div>

      {/* Beat 2 — the 80+ tail, counted out one member apiece. */}
      <div
        role="img"
        aria-label={
          `The ${over80.total} voting members who turn 80 or older this year, one square each, ` +
          `colored by party: ${over80.D} Democrats, ${over80.I} independents, ${over80.R} Republicans.`
        }
        className="mx-auto flex max-w-[26rem] flex-wrap justify-center gap-[3px]"
      >
        {cells.map((m) => (
          <span
            key={m.bioguide}
            title={`${m.name}, ${PARTY_NAME[m.party as Party].replace(/s$/, '')} — turns ${m.age} in ${data.atYear}`}
            className="h-[15px] w-[15px] rounded-[2.5px]"
            style={{ backgroundColor: PARTY_VAR[m.party as Party] }}
          />
        ))}
      </div>

      <ul className="smallcaps mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 text-[0.6875rem] tracking-[0.08em] text-[var(--ink-soft)]">
        {(['D', 'I', 'R'] as Party[]).map((p) => (
          <li key={p} className="flex items-center gap-1.5">
            <span
              aria-hidden
              className="inline-block h-[11px] w-[11px] rounded-[2px]"
              style={{ backgroundColor: PARTY_VAR[p] }}
            />
            <span className="tnum font-semibold text-[var(--ink)]">{over80[p]}</span>{' '}
            {PARTY_NAME[p]}
          </li>
        ))}
      </ul>

      <p className="serif mx-auto mt-8 max-w-prose text-balance text-center text-[1.0625rem] leading-relaxed text-[var(--ink-soft)]">
        Of the <Figure n={over80.total} /> members who reach 80 or older this year,{' '}
        <Figure n={over80.D} /> are Democrats. The oldest members &mdash; and only the oldest &mdash;
        skew to one party.
      </p>

      {/* The non-partisan frame, stated plainly. */}
      <p className="mx-auto mt-6 max-w-prose text-[0.9375rem] leading-relaxed text-[var(--ink-soft)]">
        The tilt is a House story and an extreme-tail story at once: {pct(house70.D, houseD.n)}% of
        House Democrats are 70 or older, against {pct(house70.R, houseR.n)}% of Republicans. Below
        the very top of the age curve the two parties track each other almost exactly &mdash;
        gerontocracy, on this evidence, is bipartisan
        {oldestIsRep ? (
          <>
            , and the single oldest member of Congress, {oldest.name}, is a Republican
          </>
        ) : null}
        .
      </p>
    </figure>
  )
}

/**
 * One party's mean age: a tracked party-colored label, the age as a big serif
 * figure in the party hue, then the shared "years old, on average" descriptor so
 * the vocabulary carries down from the hero and the chambers. The two columns are
 * set deliberately close and symmetric — the near-identical figures are the whole
 * argument, so the layout refuses to privilege one over the other.
 */
function MeanColumn({
  party,
  label,
  mean,
  n,
  align,
  divider = false,
}: {
  party: Party
  label: string
  mean: number
  n: number
  align: 'left' | 'right'
  divider?: boolean
}) {
  const hue = PARTY_VAR[party]
  const pad = align === 'right' ? 'sm:pr-8' : 'sm:pl-8'
  const edge = divider ? 'border-l border-[var(--rule)]' : ''
  return (
    <div className={`${edge} ${pad} ${align === 'right' ? 'text-right' : 'text-left'}`}>
      <p className="smallcaps text-[0.75rem] tracking-[0.14em]" style={{ color: hue }}>
        {label}
      </p>
      <p
        className="serif mt-2 text-[clamp(2.5rem,9vw,3.75rem)] font-medium leading-[0.9] tracking-[-0.02em] tnum"
        style={{ color: hue }}
      >
        {mean.toFixed(1)}
      </p>
      <p className="serif mt-2 text-[0.9375rem] italic text-[var(--ink-soft)]">
        years old, on average
      </p>
      <p className="meta mt-1 text-[0.6875rem] tracking-[0.02em] text-[var(--ink-faint)]">
        {n} members
      </p>
    </div>
  )
}

/** A counted figure: the page's display face, full ink, tabular — as in The Decades. */
function Figure({ n }: { n: number }) {
  return <strong className="tnum font-semibold text-[var(--ink)]">{n}</strong>
}
