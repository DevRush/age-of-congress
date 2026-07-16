'use client'
import { useEffect, useState, type CSSProperties } from 'react'
import { agePartsAt } from '@/lib/age'
import { useNow } from './useNow'

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(mq.matches)
    const on = (e: MediaQueryListEvent) => setReduced(e.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return reduced
}

/**
 * Per-digit type scale for a tapered figure.
 *
 * Each decimal is drawn smaller than the one before it on an exponential decay
 * that flattens toward a floor rather than marching down in equal steps: the
 * first decimals fall away quickly, the last ones barely differ, so the figure
 * reads as running off toward a vanishing point instead of simply stopping.
 * That is the hero's whole argument — the count never ends, it just outruns the
 * eye — and the curve says it before the words do.
 *
 * `i` is the zero-based index of the decimal, so the first one already sits a
 * step below the integer and the integer stays unmistakably the largest thing.
 */
const TAPER_DECAY = 0.8
const TAPER_FLOOR = 0.46
function taperScale(i: number): number {
  return TAPER_FLOOR + (1 - TAPER_FLOOR) * TAPER_DECAY ** (i + 1)
}

function Digits({ s, from = 0, dimmed = false, taper = false }: {
  s: string
  /** Index of `s[0]` within the full fractional string — the taper's clock. */
  from?: number
  dimmed?: boolean
  taper?: boolean
}) {
  return (
    <>
      {[...s].map((c, i) => {
        const style: CSSProperties = {}
        if (dimmed) style.opacity = 0.4
        // `em` resolves against the parent figure's font-size, so one rule
        // scales cleanly with the hero's clamp() across every viewport.
        if (taper) style.fontSize = `${taperScale(from + i).toFixed(4)}em`
        return (
          <span key={i} className="digit" style={style}>{c}</span>
        )
      })}
    </>
  )
}

export function Clock({ dobMs, decimals, dim = 2, baselineMs, className, taper = false }: {
  dobMs: number
  decimals: number
  dim?: number
  baselineMs: number
  className?: string
  /** Shrink each decimal progressively. Reserved for the hero figure. */
  taper?: boolean
}) {
  const reduced = usePrefersReducedMotion()
  const live = useNow(!reduced)
  const [frozen] = useState(() => Date.now())
  const now = reduced ? frozen : live || baselineMs
  const { int, frac } = agePartsAt(dobMs, now, decimals)
  return (
    <span className={`tnum ${className ?? ''}`} suppressHydrationWarning>
      {int}
      <span>.</span>
      <Digits s={frac.slice(0, decimals - dim)} taper={taper} />
      <Digits s={frac.slice(decimals - dim)} from={decimals - dim} dimmed taper={taper} />
      {reduced && <span className="sr-only"> (static — motion reduced)</span>}
    </span>
  )
}
