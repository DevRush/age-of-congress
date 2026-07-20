import newcomers from '@/data/newcomers.json'
import type { NewcomerPoint } from '@/lib/types'
import { linePath, scaleLinear } from '@/lib/chart'

/**
 * "Why It Stays Old" — the page stops describing the gerontocracy and explains
 * the machine that produces it.
 *
 * The lazy explanation is incumbents who will not leave. The chart kills it:
 * turnover did not fall, and the median age of the people ARRIVING in the House
 * rose from about 39 (1979) to about 50 (today). The cohort series is ours,
 * computed in the pipeline from the same rosters as everything else, and the
 * two published anchors it must match are gated at build time — the section
 * cannot quietly disagree with its own citations.
 *
 * Around the chart, three peer-reviewed findings complete the inversion: voters
 * mildly prefer YOUNGER candidates, the bottleneck is the nomination pipeline,
 * and the money is older than the politicians. Every claim carries its citation
 * inline, because this is the section most likely to be challenged.
 *
 * It closes on the honest boundary: no peer-reviewed study isolates a causal
 * effect of a legislator's age on effectiveness — position dominates. Printing
 * the limit of the argument is what makes the rest of it credible.
 */

const points = (newcomers as NewcomerPoint[]).filter(
  (p): p is NewcomerPoint & { medianAge: number } => p.medianAge !== null,
)

// The modern era: the 20th century onward, where the climb the section argues
// actually happened (and where cohort sizes make the median stable).
const FROM_YEAR = 1899
const modern = points.filter((p) => p.year >= FROM_YEAR)

// The two ends the copy names — derived, never typed. The low is the young
// post-Watergate era; the latest point is today's arrivals.
const low = modern.reduce((a, b) => (b.medianAge < a.medianAge ? b : a))
const latest = modern[modern.length - 1]

// ── The plot ────────────────────────────────────────────────────────────────
const W = 780
const H = 300
const M = { top: 24, right: 74, bottom: 34, left: 44 }

const X1 = latest.year + 2
const x = scaleLinear(FROM_YEAR, X1, M.left, W - M.right)
const y = scaleLinear(35, 55, H - M.bottom, M.top)

const Y_TICKS = [35, 40, 45, 50, 55]
const X_TICKS = [1900, 1925, 1950, 1975, 2000, 2025]

const path = linePath(modern.map((p) => ({ x: x(p.year), y: y(p.medianAge) })))

export function WhyItStaysOld() {
  return (
    <figure className="mx-auto my-0" style={{ maxWidth: W }}>
      <p className="serif max-w-prose text-balance text-[1.25rem] leading-snug tracking-[-0.01em] sm:text-[1.4375rem]">
        It is not that the same people will not leave. The people arriving are older.
      </p>

      <p className="serif mt-3 max-w-prose text-[1.0625rem] leading-relaxed text-[var(--ink-soft)]">
        House turnover has not fallen — the median age of a{' '}
        <em>newly arriving</em> representative has risen from{' '}
        <strong className="tnum font-semibold text-[var(--ink)]">
          {low.medianAge.toFixed(0)}
        </strong>{' '}
        in {low.year} to{' '}
        <strong className="tnum font-semibold text-[var(--ink)]">
          {latest.medianAge.toFixed(0)}
        </strong>{' '}
        today. Replacement no longer makes the chamber younger.
      </p>

      {/* ── The arrivals chart ──────────────────────────────────────────── */}
      <div className="-mx-5 mt-8 overflow-x-auto px-5 sm:mx-0 sm:px-0">
        <svg
          width={W}
          height={H}
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label={`Median age of newly arriving House members by Congress, ${FROM_YEAR} to ${latest.year}: roughly the mid-40s for most of the twentieth century, a low of ${low.medianAge.toFixed(1)} in ${low.year}, and ${latest.medianAge.toFixed(1)} today.`}
          className="block"
          style={{ maxWidth: 'none' }}
        >
          {Y_TICKS.map((v) => (
            <g key={v}>
              <line x1={M.left} x2={W - M.right} y1={y(v)} y2={y(v)} stroke="var(--rule)" strokeWidth={1} />
              <text x={M.left - 9} y={y(v) + 3.5} textAnchor="end" fontSize={10} className="tnum" fill="var(--ink-soft)">
                {v}
              </text>
            </g>
          ))}
          <text x={M.left - 9} y={M.top - 10} textAnchor="end" fontSize={9} className="smallcaps" fill="var(--ink-soft)">
            age
          </text>
          {X_TICKS.map((v) => (
            <text key={v} x={x(v)} y={H - M.bottom + 18} textAnchor="middle" fontSize={10} className="tnum" fill="var(--ink-soft)">
              {v}
            </text>
          ))}

          <path d={path} fill="none" stroke="var(--ink)" strokeWidth={1.8} strokeLinejoin="round" />

          {/* The two ends of the story, ringed and labelled from the data. */}
          <circle cx={x(low.year)} cy={y(low.medianAge)} r={4} fill="var(--paper)" stroke="var(--ink)" strokeWidth={1.6} />
          <text x={x(low.year)} y={y(low.medianAge) + 20} textAnchor="middle" fontSize={10} className="tnum" fill="var(--ink-soft)">
            {low.medianAge.toFixed(1)} in {low.year}
          </text>
          <circle cx={x(latest.year)} cy={y(latest.medianAge)} r={4} fill="var(--ink)" stroke="var(--paper)" strokeWidth={1.4} />
          <text
            x={x(latest.year) + 8}
            y={y(latest.medianAge) - 8}
            textAnchor="start"
            fontSize={10}
            className="tnum"
            fill="var(--ink)"
            fontWeight={600}
          >
            {latest.medianAge.toFixed(1)}
          </text>
        </svg>
      </div>
      <p className="meta mt-2 text-[0.6875rem] text-[var(--ink-faint)]">
        Median age of first-term House members at each Congress&rsquo;s convening date, computed
        from the same rosters as every figure on this page. Validated against published figures
        for {low.year} and {latest.year}.
      </p>

      {/* ── The turn: who is actually choosing this ─────────────────────── */}
      <div aria-hidden className="mt-12 mb-8 flex items-center gap-2.5">
        <span className="h-px flex-1 bg-[var(--rule-strong)]" />
        <span className="smallcaps text-[0.625rem] tracking-[0.14em] text-[var(--ink-faint)]">
          It is not the voters
        </span>
        <span className="h-px flex-1 bg-[var(--rule-strong)]" />
      </div>

      <div className="text-center">
        <p className="smallcaps text-[0.8125rem] tracking-[0.18em] text-[var(--ink-soft)]">
          The median dollar given to federal campaigns comes from a donor aged
        </p>
        <p className="serif tnum mt-2 text-[clamp(4rem,10vw,6.5rem)] font-medium leading-none text-[var(--ink)]">
          66
        </p>
        <p className="meta mx-auto mt-3 max-w-md text-[0.75rem] leading-relaxed text-[var(--ink-faint)]">
          Older than the median voter, the median candidate, or the median member of Congress —
          and donors give disproportionately to candidates near their own age (Bonica &amp;
          Grumbach, <em>Journal of Public Economics</em>, 2025).
        </p>
      </div>

      {/* ── The findings, cited ─────────────────────────────────────────── */}
      <ul className="mx-auto mt-10 max-w-prose space-y-5 text-[0.9375rem] leading-relaxed text-[var(--ink-soft)]">
        <li>
          <strong className="font-semibold text-[var(--ink)]">
            Voters mildly prefer younger candidates.
          </strong>{' '}
          Across sixteen candidate-choice experiments in seven democracies, older hypothetical
          candidates were consistently <em>less</em> likely to be favored (Eshima &amp; Smith,{' '}
          <em>Journal of Politics</em>, 2022).
        </li>
        <li>
          <strong className="font-semibold text-[var(--ink)]">
            The bottleneck is the nomination, not the election.
          </strong>{' '}
          Parties field few young candidates and place the ones they do field in unwinnable
          districts; in the 2020 House races, primary candidates averaged 51.5 years old and
          primary winners 54 (Stockemer, Thompson &amp; Sundstr&ouml;m, <em>Electoral Studies</em>,
          2023; Stockemer &amp; Sundstr&ouml;m, <em>Government and Opposition</em>, 2023).
        </li>
        <li>
          <strong className="font-semibold text-[var(--ink)]">
            Turnover rose while the chamber aged.
          </strong>{' '}
          Average House tenure has fallen since 2010 even as the median age climbed — the chart
          above is why: the seats change hands, and the new hands are older (
          <em>The Age Divide</em>, 2023, corroborated by this page&rsquo;s own series).
        </li>
      </ul>

      <p className="meta mx-auto mt-9 max-w-prose border-l-2 border-[var(--rule-strong)] pl-4 text-[0.75rem] leading-relaxed text-[var(--ink-faint)]">
        The boundary of the argument, stated plainly: no peer-reviewed study isolates a causal
        effect of a legislator&rsquo;s age on legislative effectiveness. Institutional position
        dominates — committee leadership predicts output far better than birth year does. This
        page documents who Congress is, not how well any member does the job.
      </p>
    </figure>
  )
}
