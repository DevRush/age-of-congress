import type { ReactNode } from 'react'

/**
 * Broadsheet section wrapper: a hairline rule opens each section, a tracked
 * small-caps kicker labels it (NYT graphics-desk convention), and content
 * sits below with generous breathing room. An optional footnote renders a
 * muted source/caption line at the foot of the section.
 *
 * The kicker stays strictly monochrome — the only saturated hues on the page
 * are the party colors, reserved for data.
 */
export function Section({
  title,
  children,
  id,
  footnote,
}: {
  title: string
  children: ReactNode
  id?: string
  footnote?: ReactNode
}) {
  return (
    <section id={id} className="rule mt-16 scroll-mt-10 pt-5">
      <h2 className="smallcaps text-[0.8125rem] font-medium text-[var(--ink-soft)]">
        {title}
      </h2>
      <div className="mt-7">{children}</div>
      {footnote ? (
        <p className="mt-9 max-w-prose text-[0.75rem] italic leading-relaxed text-[var(--ink-soft)]">
          {footnote}
        </p>
      ) : null}
    </section>
  )
}
