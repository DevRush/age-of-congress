'use client'
import { useEffect, useState } from 'react'
import type { ContextLine } from '@/lib/types'

/**
 * A subordinate band of rotating context: one computed "born closer to…"
 * comparison at a time, set small and quiet beneath the chamber stats so it
 * adds texture without breaking the counter → chambers → rankings spine. It
 * advances on its own every eight seconds, pauses while pointed at or focused,
 * and steps forward on click or Enter. Motion is opt-out: with reduced motion
 * it holds still and waits to be advanced by hand. Each line's sources live in
 * the hover tooltip so the claim can be checked without cluttering the band.
 */
export function ContextStrip({ lines }: { lines: ContextLine[] }) {
  const [i, setI] = useState(0)
  const [paused, setPaused] = useState(false)
  const advance = () => setI((v) => (v + 1) % lines.length)

  useEffect(() => {
    if (paused) return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (mq.matches) return
    const t = setInterval(advance, 8000)
    return () => clearInterval(t)
    // advance is stable in behavior; re-arm the timer on pause or length change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused, lines.length])

  const line = lines[i]

  return (
    <div
      className="mx-auto mt-6 flex cursor-pointer select-none items-center gap-4 rounded-xl border border-[var(--rule)] bg-[var(--surface)] px-5 py-4 outline-none focus-visible:ring-2 focus-visible:ring-[var(--ink-soft)]"
      onClick={advance}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          advance()
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`Historical comparison ${i + 1} of ${lines.length}. Activate for another.`}
      title={line.footnote}
    >
      <span className="smallcaps hidden shrink-0 text-[0.625rem] leading-tight tracking-[0.14em] text-[var(--ink-faint)] sm:block">
        A closer
        <br />
        look
      </span>
      <span aria-hidden className="hidden h-9 w-px shrink-0 bg-[var(--rule-strong)] sm:block" />
      <p key={i} className="ctx-line serif min-w-0 flex-1 text-pretty text-[1.05rem] italic leading-snug sm:text-[1.15rem]">
        {line.text}
        <sup className="not-italic text-[var(--ink-faint)]">‡</sup>
      </p>
      <span className="meta tnum hidden shrink-0 text-[0.6875rem] tracking-[0.02em] text-[var(--ink-faint)] sm:block">
        {i + 1} / {lines.length}
      </span>
    </div>
  )
}
