'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * The hover/focus readout for "The Map".
 *
 * This island deliberately does NOT own the 435 hexes. The map is server-
 * rendered as plain SVG and this component finds it in the DOM by id and
 * delegates from its container. Wrapping the SVG as `children` of a client
 * component would have been the idiomatic-looking choice and the wrong one: the
 * paths would then be serialized into the RSC flight payload as well as the
 * HTML, shipping ~120KB of geometry to the browser twice. Every fact the readout
 * needs already travels in the markup as `data-*` attributes on each path, so
 * the interactive layer costs a listener and nothing else.
 *
 * The resting state carries the headline, so the panel is never dead space and
 * its height never changes — the map below it cannot be nudged by a hover.
 */

type Active = {
  label: string
  name: string
  party: string
  age: string
  median: string
  gap: string
}

const PARTY_VAR: Record<string, string> = { D: 'var(--dem)', R: 'var(--rep)', I: 'var(--ind)' }
const PARTY_NAME: Record<string, string> = { D: 'Democrat', R: 'Republican', I: 'Independent' }

function read(el: SVGElement): Active {
  const d = el.dataset
  return {
    label: d.label ?? '',
    name: d.name ?? '',
    party: d.party ?? '',
    age: d.age ?? '',
    median: d.median ?? '',
    gap: d.gap ?? '',
  }
}

export function DistrictMapReadout({
  mapId,
  pctOlder,
  nationalMedian,
}: {
  mapId: string
  pctOlder: string
  nationalMedian: string
}) {
  const [active, setActive] = useState<Active | null>(null)
  const activeEl = useRef<SVGElement | null>(null)

  useEffect(() => {
    const root = document.getElementById(mapId)
    if (!root) return

    const hexes = Array.from(root.querySelectorAll<SVGElement>('[data-geoid]'))
    if (!hexes.length) return

    const highlight = document.getElementById(`${mapId}-highlight`)

    const mark = (el: SVGElement | null) => {
      if (activeEl.current && activeEl.current !== el) {
        activeEl.current.removeAttribute('data-active')
      }
      activeEl.current = el
      if (el) el.setAttribute('data-active', '')
      // The top-most outline mirrors the active hex's own path.
      if (highlight) {
        const d = el?.getAttribute('d')
        if (d) highlight.setAttribute('d', d)
        else highlight.removeAttribute('d')
      }
    }

    const show = (el: SVGElement) => {
      mark(el)
      setActive(read(el))
    }
    const clear = () => {
      mark(null)
      setActive(null)
    }

    const hexFrom = (t: EventTarget | null) =>
      t instanceof Element ? t.closest<SVGElement>('[data-geoid]') : null

    const onOver = (e: PointerEvent) => {
      const hex = hexFrom(e.target)
      if (hex) show(hex)
    }
    const onLeave = () => clear()
    const onFocusIn = (e: FocusEvent) => {
      const hex = hexFrom(e.target)
      if (hex) {
        show(hex)
        // Roving tabindex: the focused hex becomes the single tab stop.
        for (const h of hexes) h.setAttribute('tabindex', h === hex ? '0' : '-1')
      }
    }
    const onFocusOut = (e: FocusEvent) => {
      if (!root.contains(e.relatedTarget as Node | null)) clear()
    }

    /**
     * Arrow keys walk the map geographically rather than in document order —
     * on a cartogram, "the district to the left" is a spatial claim, and
     * document order (state, then number) would send focus jumping across the
     * country. Candidates are filtered to the pressed half-plane and scored with
     * a penalty on cross-axis drift, which on a hex grid lands on the neighbor
     * a reader expects.
     */
    const onKeyDown = (e: KeyboardEvent) => {
      const dirs: Record<string, [number, number]> = {
        ArrowLeft: [-1, 0],
        ArrowRight: [1, 0],
        ArrowUp: [0, -1],
        ArrowDown: [0, 1],
      }
      const dir = dirs[e.key]
      const from = hexFrom(e.target)
      if (!dir || !from) return
      e.preventDefault()

      const cx = Number(from.dataset.cx)
      const cy = Number(from.dataset.cy)
      let best: SVGElement | null = null
      let bestScore = Infinity
      for (const h of hexes) {
        if (h === from) continue
        const dx = Number(h.dataset.cx) - cx
        const dy = Number(h.dataset.cy) - cy
        const along = dx * dir[0] + dy * dir[1]
        if (along <= 0.5) continue
        const across = Math.abs(dx * dir[1] - dy * dir[0])
        const score = along + across * 3
        if (score < bestScore) {
          bestScore = score
          best = h
        }
      }
      if (best) best.focus()
    }

    root.addEventListener('pointerover', onOver)
    root.addEventListener('pointerleave', onLeave)
    root.addEventListener('focusin', onFocusIn)
    root.addEventListener('focusout', onFocusOut)
    root.addEventListener('keydown', onKeyDown)
    return () => {
      root.removeEventListener('pointerover', onOver)
      root.removeEventListener('pointerleave', onLeave)
      root.removeEventListener('focusin', onFocusIn)
      root.removeEventListener('focusout', onFocusOut)
      root.removeEventListener('keydown', onKeyDown)
    }
  }, [mapId])

  const vacant = active !== null && active.name === ''

  return (
    <div
      aria-live="polite"
      className="flex min-h-[4.25rem] items-center border-y border-[var(--rule)] py-3"
    >
      {active === null ? (
        <p className="serif text-[1rem] leading-snug text-[var(--ink-soft)]">
          <strong className="tnum font-semibold text-[var(--ink)]">{pctOlder}</strong> of
          representatives are older than the median adult in the district they represent.
          Nationally, that median is{' '}
          <strong className="tnum font-semibold text-[var(--ink)]">{nationalMedian}</strong>.{' '}
          <span className="meta text-[0.8125rem] text-[var(--ink-faint)]">
            Point at a district, or tab to the map and use the arrow keys.
          </span>
        </p>
      ) : (
        <div className="flex w-full flex-wrap items-baseline gap-x-5 gap-y-1">
          <p className="flex items-baseline gap-2">
            <span className="smallcaps tnum text-[0.75rem] tracking-[0.1em] text-[var(--ink-faint)]">
              {active.label}
            </span>
            <span className="text-[1.0625rem] font-semibold leading-tight text-[var(--ink)]">
              {vacant ? 'Vacant' : active.name}
            </span>
            {!vacant && active.party ? (
              <span
                className="smallcaps rounded-full px-1.5 py-px text-[0.625rem] font-semibold tracking-[0.04em]"
                style={{
                  color: PARTY_VAR[active.party],
                  backgroundColor: `color-mix(in srgb, ${PARTY_VAR[active.party]} 11%, transparent)`,
                }}
              >
                {PARTY_NAME[active.party] ?? active.party}
              </span>
            ) : null}
          </p>

          {vacant ? (
            <p className="meta text-[0.8125rem] text-[var(--ink-soft)]">
              No sitting member — the seat is unfilled, so there is no age to compare. District
              adults: <span className="tnum text-[var(--ink)]">{active.median}</span>.
            </p>
          ) : (
            <p className="meta ml-auto flex items-baseline gap-x-5 text-[0.8125rem] text-[var(--ink-soft)]">
              <span>
                Member{' '}
                <span className="serif tnum text-[1rem] font-semibold text-[var(--ink)]">
                  {active.age}
                </span>
              </span>
              <span>
                District adults{' '}
                <span className="serif tnum text-[1rem] font-semibold text-[var(--ink)]">
                  {active.median}
                </span>
              </span>
              <span className="smallcaps tracking-[0.08em]">
                Gap{' '}
                <span className="serif tnum text-[1.0625rem] font-semibold not-italic tracking-normal text-[var(--ink)]">
                  {active.gap}
                </span>
              </span>
            </p>
          )}
        </div>
      )}
    </div>
  )
}
