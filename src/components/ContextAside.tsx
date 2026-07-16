import lines from '@/data/context-lines.json'
import type { ContextLine } from '@/lib/types'

/**
 * A quiet grace note, set just after "The Decades" to give the bare headcounts a
 * sense of scale: if the average member was born in the mid-1960s, how far back
 * is that, really? The lines answer in objects rather than years — a ballpoint
 * pen, the Moon landing, the iPhone.
 *
 * This is NOT the old ContextStrip. That component rotated these lines on a timer
 * between the hero and the chambers and was deleted for being a distraction; the
 * owner liked the writing, not the carousel. So this is deliberately static: a few
 * fixed lines in a margin note, nothing moving, nothing between the hero and the
 * chambers. No timer, no client state — a server-rendered aside.
 *
 * The lines come straight from context-lines.json, which the pipeline regenerates
 * each build and where every line is true by construction: a line is only emitted
 * when the comparison it states actually holds for the current mean birth date.
 * Each carries its full sourcing, preserved here on the line's title (hover/tap)
 * and named in a visible source note beneath.
 */

/**
 * Pick a small, varied, evocative set — the flagship "closer to X than Y" line,
 * a "was N years old when …" line, and the iPhone line that lands closest to
 * now — chosen by what the text says rather than by fixed index, so the selection
 * survives the daily rebuild even if the mean birth date nudges a figure. Falls
 * back to the first lines if the roster ever thins the set out.
 */
function selectLines(all: ContextLine[]): ContextLine[] {
  const closer = all.find((l) => /closer to/i.test(l.text))
  const ageAt = all.find((l) => /years old when/i.test(l.text))
  const iphone = [...all].reverse().find((l) => /iphone/i.test(l.text) && /years old/i.test(l.text))
  const picked = [closer, ageAt, iphone].filter((l): l is ContextLine => Boolean(l))
  const uniq = [...new Map(picked.map((l) => [l.text, l])).values()]
  return (uniq.length >= 2 ? uniq : all).slice(0, 3)
}

export function ContextAside() {
  const shown = selectLines(lines as ContextLine[])
  if (shown.length === 0) return null

  return (
    <aside className="mx-auto mt-12 max-w-prose border-l-2 border-[var(--rule-strong)] pl-5 sm:pl-6">
      <p className="smallcaps text-[0.625rem] tracking-[0.14em] text-[var(--ink-faint)]">
        For a sense of scale
      </p>
      <ul className="mt-3 space-y-2.5">
        {shown.map((l) => (
          <li
            key={l.text}
            title={l.footnote}
            className="serif cursor-help text-balance text-[1.0625rem] leading-snug text-[var(--ink-soft)]"
          >
            {l.text}
          </li>
        ))}
      </ul>
      <p className="meta mt-4 text-[0.6875rem] leading-relaxed text-[var(--ink-faint)]">
        Each line is drawn from the mean birth date of the current roster and is shown only when it
        holds; hover or tap a line for its sources.
      </p>
    </aside>
  )
}
