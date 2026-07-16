import data from '@/data/congress.json'
import population from '@/data/population.json'
import districts from '@/data/districts.json'
import birthdays from '@/data/birthdays.json'
import historical from '@/data/historical.json'
import partyAge from '@/data/party-age.json'
import type { Party } from '@/lib/types'
import { coverageSince, ordinal } from '@/lib/coverage'
import type { HistoricalPoint } from '@/lib/types'

/**
 * The citability layer: a newspaper's fine-print methodology box. It is set
 * quiet and small on purpose — the page has already spent its one loud gesture
 * on the hero clock. Each definition sits under a tracked small-caps sidehead
 * in a standing masthead grid, the way a broadsheet prints its own colophon, so
 * a reporter can find the exact source and convention at a glance. Every figure
 * is live from the same data the rest of the page reads, so the counts here can
 * never drift from the counts above.
 */

const link =
  'underline decoration-1 underline-offset-2 decoration-[color:var(--rule)] transition-colors hover:text-[var(--ink)]'

function Row({ term, children }: { term: string; children: React.ReactNode }) {
  return (
    <div className="sm:grid sm:grid-cols-[5.5rem_1fr] sm:gap-x-6">
      <dt className="smallcaps mb-1.5 text-[0.6875rem] font-medium tracking-[0.12em] text-[var(--ink)] sm:mb-0 sm:pt-[0.15rem]">
        {term}
      </dt>
      <dd>{children}</dd>
    </div>
  )
}

/**
 * The coverage sentence is the one figure in this box that used to be asserted
 * rather than read. It said "From 1850 onward, coverage exceeds 99%" — which the
 * committed record beside it contradicted in eight Congresses. It now states the
 * measured floor and the honest count of Congresses that miss the bar it quotes.
 */
const COVERAGE_FROM = 1850
const COVERAGE_BAR = 0.99

export function Methodology() {
  const n = data.notes
  const cov = coverageSince(historical as HistoricalPoint[], COVERAGE_FROM, COVERAGE_BAR)
  return (
    <div className="max-w-2xl text-[0.8125rem] leading-relaxed text-[var(--ink-soft)]">
      <dl className="space-y-6">
        <Row term="Ages">
          Ages are computed from each member&rsquo;s date of birth, anchored at midnight Eastern
          Standard Time, using a mean Gregorian year of 365.2425 days. The clocks on this page
          advance in real time; nothing is estimated between updates.
        </Row>
        <Row term="Members">
          Averages cover voting members only: senators, and representatives of the fifty states. The{' '}
          {n.houseDelegatesExcluded} non-voting House members — the territorial delegates and the
          Resident Commissioner of Puerto Rico — are excluded from House averages. Vacant seats
          reduce the divisor rather than being imputed — figures are currently based on{' '}
          {data.senate.count} sitting senators (of 100 seats) and {data.house.count} voting
          representatives (of 435 seats).
        </Row>
        <Row term="Party">
          &ldquo;Across the Aisle&rdquo; compares members by their current-term party. Party mean
          ages use the same edition-year age convention as the rest of the page. The average
          Democratic&ndash;Republican comparison is a Welch two-sample t-test, which does not assume
          the two parties&rsquo; age spreads are equal; the difference is well within what chance
          produces, so the two averages are treated as indistinguishable. The tail figures &mdash;
          how many members pass 65, 70, 75 and 80 &mdash; are plain counts, and because several
          thresholds were examined they are reported as counts rather than as significance tests.
          The {partyAge.overall.find((p) => (p.party as Party) === 'I')?.n ?? 0} independents (Sanders
          and King in the Senate, and one representative) are shown on their own and are never folded
          into the party they caucus with.
        </Row>
        <Row term="Sources">
          Membership, birth dates, party, and term histories come from the{' '}
          <a className={link} href="https://github.com/unitedstates/congress-legislators">
            @unitedstates congress-legislators dataset
          </a>{' '}
          (CC0), maintained within days of congressional changes; this site rebuilds from it daily.
          The birth date of every member shown with a portrait — the oldest and youngest of each
          chamber — is additionally cross-checked against Wikidata at build time; the site does not
          publish if the two sources disagree.
        </Row>
        <Row term="History">
          Historical averages are computed from the same project&rsquo;s records of the roughly
          12,500 people who have served since 1789: for each Congress, the mean age of members
          serving on its constitutional first day (March 4 through the 73rd Congress, January 3
          thereafter). Birth dates are unknown for about 18% of members who served before 1850 —
          those members are excluded and affected years are drawn lighter. From {COVERAGE_FROM}{' '}
          onward coverage never falls below{' '}
          {(cov.worst.birthdayCoverage * 100).toFixed(1)}% (the {ordinal(cov.worst.congress)}{' '}
          Congress, {cov.worst.year}); it is short of {(COVERAGE_BAR * 100).toFixed(0)}% in{' '}
          {cov.below} of the {cov.total} Congresses since. Values were validated against
          Congressional Research Service figures for recent Congresses and
          FiveThirtyEight&rsquo;s member-level dataset (66th&ndash;118th Congresses).
        </Row>
        <Row term="Districts">
          The map compares each representative against the people they represent. District
          age is the median age of adults 18 and older, derived from{' '}
          <a className={link} href={districts.source.url}>
            {districts.source.survey}
          </a>
          , table {districts.source.table}, by interpolating across the published 18+ age
          brackets; the national figure on that basis is{' '}
          {districts.nationalAdultMedianAge.toFixed(1)} years. Boundaries are the
          119th-Congress districts, which match this roster seat for seat. The gap is the
          member&rsquo;s age at the edition date minus that median, so it moves with the
          roster rather than with the reader&rsquo;s clock. Of {districts.districts.length}{' '}
          districts, {districts.stats.joined} have a sitting member and{' '}
          {districts.stats.vacant} are vacant; vacant seats are hatched, not shaded, because
          an empty seat has no age and is not a gap of zero.
        </Row>
        <Row term="Hex map">
          The cartogram gives every district equal area, so the map shows seats rather than
          acreage. Layout:{' '}
          <a className={link} href={districts.layout.url}>
            {districts.layout.layout}
          </a>{' '}
          by {districts.layout.author}, used under{' '}
          <a className={link} href={districts.layout.licenseUrl}>
            {districts.layout.license}
          </a>
          .
        </Row>
        <Row term="Birthdays">
          Birth dates come from the same{' '}
          <a className={link} href="https://github.com/unitedstates/congress-legislators">
            @unitedstates congress-legislators dataset
          </a>{' '}
          (CC0) as every other figure here, and the comparison covers voting members only
          &mdash; {birthdays.stats.totalMembers} of them, on the same basis as the averages
          above. The calendar carries all 366 dates a birthday can fall on; the roster
          currently occupies {birthdays.stats.distinctDaysUsed} of them and leaves{' '}
          {birthdays.stats.emptyDays} empty. The random baseline against which those are
          measured is the textbook uniform model, in which every birthday is equally likely
          and February 29 is ignored: n(n−1)/2 ÷ 365 expected sharing pairs, and 365 × (1 −
          1/365)<sup>n</sup> expected days with nobody. Only birth years are shown by name;
          the section makes no claim about why the year is shaped the way it is.
        </Row>
        <Row term="Portraits">
          Portraits are official congressional photographs (public domain), courtesy of the U.S.
          Senate Historical Office and the Collection of the U.S. House of Representatives, via the{' '}
          <a className={link} href="https://github.com/unitedstates/images">
            @unitedstates images project
          </a>
          .
        </Row>
      </dl>

      <div className="rule mt-7 pt-4 text-[0.75rem]">
        <p>
          <sup>†</sup> Population comparison uses the {population.source} (as of {population.asOf});
          &ldquo;average American adult&rdquo; is the mean age of residents 18 and older (
          {population.adultMeanAge18} years).
        </p>
      </div>

      <p className="meta mt-6 text-[0.6875rem] tracking-[0.02em] text-[var(--ink-soft)]">
        Built by{' '}
        <a className={link} href="https://annasrahman.com">
          Annas Rahman
        </a>{' '}
        · updated daily · generated {data.generatedAt.slice(0, 10)}
      </p>
    </div>
  )
}
