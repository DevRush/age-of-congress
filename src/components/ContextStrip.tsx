'use client'
import { useEffect, useState } from 'react'
import type { ContextLine } from '@/lib/types'

/**
 * A single rotating standfirst below the hero: one computed "born closer to…"
 * comparison at a time, drawn in italic display type like a pulled quote. It
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
      className="rule mx-auto mt-2 max-w-3xl cursor-pointer select-none py-9 text-center outline-none focus-visible:ring-1 focus-visible:ring-[var(--ink-soft)] focus-visible:ring-offset-4 focus-visible:ring-offset-[var(--paper)]"
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
      <p
        key={i}
        className="ctx-line mx-auto max-w-2xl text-balance text-xl italic leading-snug sm:text-[1.6rem]"
      >
        {line.text}
        <sup className="not-italic text-[var(--ink-soft)]">‡</sup>
      </p>
      <p className="smallcaps mt-4 text-[0.6875rem] tracking-[0.12em] text-[var(--ink-soft)]">
        {i + 1} / {lines.length} · click or press enter for another
      </p>
    </div>
  )
}
