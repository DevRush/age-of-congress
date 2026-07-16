import { Section } from '@/components/Section'
import { Hero } from '@/components/Hero'
import { ChamberSplit } from '@/components/ChamberSplit'
import { Decades } from '@/components/Decades'
import { Rankings } from '@/components/Rankings'
import { Histogram } from '@/components/Histogram'
import { HistoryChart } from '@/components/HistoryChart'
import { GenerationGap } from '@/components/GenerationGap'
import { Methodology } from '@/components/Methodology'
import congress from '@/data/congress.json'
import population from '@/data/population.json'

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
          <>
            Age is the age each member reaches during the edition year, computed
            from birth year &mdash; the same convention as The Shape of Congress
            &mdash; so a member&rsquo;s age today sits a year below the figure
            shown until their birthday falls. U.S. life expectancy at birth:
            78.4 years (CDC/NCHS, 2023). &ldquo;Outlived&rdquo; is counted
            strictly against that figure, so it takes 79 years to clear it, not
            78.
          </>
        }
      >
        <Decades />
      </Section>

      <Section title="The Rankings">
        <Rankings />
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
