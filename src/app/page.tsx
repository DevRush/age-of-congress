import { Section } from '@/components/Section'
import { Hero } from '@/components/Hero'
import { ChamberSplit } from '@/components/ChamberSplit'
import { Decades } from '@/components/Decades'
import { Rankings } from '@/components/Rankings'
import { DistrictMap } from '@/components/DistrictMap'
import { Histogram } from '@/components/Histogram'
import { HistoryChart } from '@/components/HistoryChart'
import { Birthdays } from '@/components/Birthdays'
import { GenerationGap } from '@/components/GenerationGap'
import { Methodology } from '@/components/Methodology'
import congress from '@/data/congress.json'
import population from '@/data/population.json'
import districts from '@/data/districts.json'
import birthdays from '@/data/birthdays.json'
import { GAP_CLAMP } from '@/lib/districtMap'
import { uniformBaseline } from '@/lib/birthdays'

export default function Page() {
  return (
    <main className="mx-auto max-w-5xl px-5 pb-24">
      <Hero />

      <Section title="The Two Chambers">
        <ChamberSplit />
      </Section>

      <Section
        title="The Decades"
        footnote={
          /* The life-expectancy half of this footnote left with the claim it
             sourced — see the note in Decades.tsx. It cited 78.4 years to
             CDC/NCHS and then explained the strictness of a comparison the
             section no longer makes, which would have made it the last thing on
             the page still asserting a fallacy nothing renders. What remains is
             the age convention, which the counts above genuinely need. */
          <>
            Age is the age each member reaches during the edition year, computed
            from birth year &mdash; the same convention as The Shape of Congress
            &mdash; so a member&rsquo;s age today sits a year below the figure
            shown until their birthday falls.
          </>
        }
      >
        <Decades />
      </Section>

      <Section title="The Rankings">
        <Rankings />
      </Section>

      <Section
        title="The Map"
        footnote={
          <>
            Each hexagon is one of the 435 House districts, shaded by its age gap:
            the representative&rsquo;s age at the edition date minus the median age
            of adults 18 and older living in the district. District medians are
            derived from {districts.source.survey}, table{' '}
            {districts.source.table}, by interpolating across the 18+ age brackets;
            boundaries are the {districts.districts.length} districts of the 119th
            Congress. The scale is clamped at ±{GAP_CLAMP} years and is symmetric
            about zero, so a gap of a given size is shaded with the same strength
            whichever way it runs; {districts.stats.vacant} vacant seats
            (CA-14, FL-20, GA-13, TX-23) have no member and are hatched rather
            than shaded. Hex layout by Daniel Donner / The Downballot, CC BY 4.0.
          </>
        }
      >
        <DistrictMap />
      </Section>

      <Section
        title="The Shape of Congress"
        footnote={
          <>
            Voting members binned by age at the edition date; each dot is one member.
            Population silhouette: {population.source}, rescaled to the member count.
          </>
        }
      >
        <Histogram />
      </Section>

      <Section
        title="The Long View"
        footnote={
          <>
            Two centuries of a slow, uneven climb. Averages are computed from each
            Congress&rsquo;s roster on its convening date; the earliest figures rest
            on incomplete birth records and are drawn accordingly.
          </>
        }
      >
        <HistoryChart />
      </Section>

      <Section
        title="Shared Birthdays"
        footnote={
          <>
            Every date a birthday can fall on, including February 29 &mdash; one member,
            Ben Cline, has it. A &ldquo;sharing pair&rdquo; is any two members born on the
            same month and day, counted once; a day with{' '}
            {birthdays.stats.maxDay.count} members on it therefore contributes{' '}
            {(birthdays.stats.maxDay.count * (birthdays.stats.maxDay.count - 1)) / 2} pairs,
            not {birthdays.stats.maxDay.count}. The random baseline is the textbook uniform
            model &mdash; every birthday equally likely, February 29 ignored: expected pairs
            are n(n−1)/2 ÷ 365 and expected empty days are 365 × (1 − 1/365)
            <sup>n</sup>, which at n = {birthdays.stats.totalMembers} gives{' '}
            {birthdays.expected.expectedSharingPairs.toFixed(1)} and{' '}
            {birthdays.expected.expectedEmptyDays.toFixed(1)}. The calendar drawn above has
            366 days while that baseline has 365; running it on 366 instead gives{' '}
            {uniformBaseline(birthdays.stats.totalMembers, 366).expectedSharingPairs.toFixed(1)}{' '}
            pairs and{' '}
            {uniformBaseline(birthdays.stats.totalMembers, 366).expectedEmptyDays.toFixed(1)}{' '}
            empty days, so the excess holds under either convention and is not an artifact of
            the choice. Voting members only, on the same basis as every other figure here.
          </>
        }
      >
        <Birthdays />
      </Section>

      <Section
        title="The Generation Gap"
        footnote={
          <>
            Generations follow the Pew Research Center&rsquo;s birth-year bands:
            Silent 1928&ndash;1945, Boomer 1946&ndash;1964, Gen X
            1965&ndash;1980, Millennial 1981&ndash;1996, Gen Z
            1997&ndash;2012. The Congress side is the {congress.histogram.length}{' '}
            voting members by birth year. The country side is derived from{' '}
            {population.source} by mapping each band to the ages it spans as of{' '}
            {population.asOf.slice(0, 4)} and summing the five-year bins,
            interpolating within a bin where a band splits it. Those bins begin
            at 25, so the baseline is adults 25 and older rather than all adults
            18 and older; a full 18+ baseline would raise Gen Z&rsquo;s share
            and lower every other one. The five bands cover ages 25&ndash;97,
            leaving adults aged 98 and older &mdash; who predate the Silent
            Generation &mdash; in no band, which is why the country&rsquo;s
            shares stop just short of 100%. The House requires its members
            to be 25 and the Senate 30, so exact parity is impossible by
            construction.
          </>
        }
      >
        <GenerationGap />
      </Section>

      <Section title="Methodology">
        <Methodology />
      </Section>
    </main>
  )
}
