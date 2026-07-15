'use client'
import { useEffect, useState } from 'react'
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

function Digits({ s, dimmed = false }: { s: string; dimmed?: boolean }) {
  return (
    <>
      {[...s].map((c, i) => (
        <span key={i} className="digit" style={dimmed ? { opacity: 0.4 } : undefined}>{c}</span>
      ))}
    </>
  )
}

export function Clock({ dobMs, decimals, dim = 2, baselineMs, className }: {
  dobMs: number
  decimals: number
  dim?: number
  baselineMs: number
  className?: string
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
      <Digits s={frac.slice(0, decimals - dim)} />
      <Digits s={frac.slice(decimals - dim)} dimmed />
      {reduced && <span className="sr-only"> (static — motion reduced)</span>}
    </span>
  )
}
