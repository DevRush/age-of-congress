import type { ReactNode } from 'react'
import { Section } from '@/components/Section'
import { Hero } from '@/components/Hero'
import { ContextStrip } from '@/components/ContextStrip'
import contextLines from '@/data/context-lines.json'

/**
 * Provisional caption for a section whose data component lands in a later task.
 * Kept deliberately muted so the shell reads as scaffolding, not finished copy.
 * Each of these is replaced wholesale when its component arrives.
 */
function Placeholder({ children }: { children: ReactNode }) {
  return <p className="text-[0.9375rem] italic text-[var(--ink-soft)]">{children}</p>
}

export default function Page() {
  return (
    <main className="mx-auto max-w-5xl px-5 pb-24">
      <Hero />

      <ContextStrip lines={contextLines} />

      <Section title="The Two Chambers">
        {/* ChamberSplit (Task 14) */}
        <Placeholder>Senate and House averages, set side by side.</Placeholder>
      </Section>

      <Section title="The Rankings">
        {/* Rankings (Task 15) */}
        <Placeholder>The oldest and youngest members, with portraits.</Placeholder>
      </Section>

      <Section title="The Shape of Congress">
        {/* Histogram (Task 16) */}
        <Placeholder>The distribution of ages across all 535 seats.</Placeholder>
      </Section>

      <Section title="The Long View">
        {/* HistoryChart (Task 17) */}
        <Placeholder>How the average age has drifted across the decades.</Placeholder>
      </Section>

      <Section title="Methodology">
        {/* Methodology (Task 18) */}
        <Placeholder>Sources, definitions, and how the figures are computed.</Placeholder>
      </Section>
    </main>
  )
}
