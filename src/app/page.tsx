import { Section } from '@/components/Section'
import { Hero } from '@/components/Hero'
import { ChamberSplit } from '@/components/ChamberSplit'
import { Rankings } from '@/components/Rankings'
import { Histogram } from '@/components/Histogram'
import { HistoryChart } from '@/components/HistoryChart'
import { Methodology } from '@/components/Methodology'
import population from '@/data/population.json'

export default function Page() {
  return (
    <main className="mx-auto max-w-5xl px-5 pb-24">
      <Hero />

      <Section title="The Two Chambers">
        <ChamberSplit />
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

      <Section title="Methodology">
        <Methodology />
      </Section>
    </main>
  )
}
