import type { ReactNode } from 'react'
import { Section } from '@/components/Section'

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
      {/* ───────────────────────────────────────────────────────────
          Hero (Task 13) — the headline, the live age Clock (Task 12),
          and the framing deck mount here. The markup below is a shell
          placeholder and is replaced wholesale in Task 13.
         ─────────────────────────────────────────────────────────── */}
      <header className="pt-16">
        <p className="smallcaps text-[0.8125rem] text-[var(--ink-soft)]">
          The 119th United States Congress
        </p>
        <h1 className="mt-3 text-5xl font-medium leading-[1.03] tracking-[-0.015em] sm:text-6xl">
          The Age of Congress
        </h1>
        {/* Live Clock (Task 12) + framing deck copy arrive in Task 13 */}
      </header>

      {/* ContextStrip (Task 13) — the one-line "older than…" comparisons */}

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
