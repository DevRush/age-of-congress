'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * The hover/focus readout for "Shared Birthdays".
 *
 * Like the map's readout, this island does not own the cells. The 366 dates are
 * server-rendered as plain markup and this component finds the grid by id and
 * delegates from it; every fact it needs already travels in the markup as
 * `data-*`, so the interactive layer costs a listener and nothing else.
 *
 * The names ride along in a delimited string rather than JSON: an attribute full
 * of JSON is an attribute full of quotes, and each one costs six characters as
 * `&quot;` in the HTML. `Jeff Merkley|D|s|1956` is a quarter the size of its JSON
 * equivalent across 531 members. A test pins the delimiters as absent from every
 * name so the roster cannot quietly break the encoding.
 *
 * The panel sits BELOW the calendar, which is the one place it can grow without
 * moving the thing the reader is pointing at — the busiest day lists six people,
 * and on a phone that is several lines taller than the resting state.
 */

type Person = { name: string; party: string; chamber: string; birthYear: string }
type Active = { label: string; count: number; people: Person[] }

const PARTY_VAR: Record<string, string> = { D: 'var(--dem)', R: 'var(--rep)', I: 'var(--ind)' }
const PARTY_NAME: Record<string, string> = { D: 'Democrat', R: 'Republican', I: 'Independent' }

function parse(el: HTMLElement): Active {
  const raw = el.dataset.members ?? ''
  const people = raw
    ? raw.split(';').map((entry) => {
        const [name, party, chamber, birthYear] = entry.split('|')
        return { name, party, chamber: chamber === 's' ? 'Senate' : 'House', birthYear }
      })
    : []
  return { label: el.dataset.label ?? '', count: Number(el.dataset.count ?? 0), people }
}

export function BirthdayReadout({
  gridId,
  membersSharing,
  totalMembers,
  emptyDays,
}: {
  gridId: string
  membersSharing: number
  totalMembers: number
  emptyDays: number
}) {
  const [active, setActive] = useState<Active | null>(null)
  const activeEl = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const root = document.getElementById(gridId)
    if (!root) return

    const cells = Array.from(root.querySelectorAll<HTMLElement>('[data-md]'))
    if (!cells.length) return

    const mark = (el: HTMLElement | null) => {
      if (activeEl.current && activeEl.current !== el) {
        activeEl.current.removeAttribute('data-active')
      }
      activeEl.current = el
      if (el) el.setAttribute('data-active', '')
    }

    const show = (el: HTMLElement) => {
      mark(el)
      setActive(parse(el))
    }
    const clear = () => {
      mark(null)
      setActive(null)
    }

    const cellFrom = (t: EventTarget | null) =>
      t instanceof Element ? t.closest<HTMLElement>('[data-md]') : null

    const onOver = (e: PointerEvent) => {
      const cell = cellFrom(e.target)
      if (cell) show(cell)
    }
    const onLeave = () => clear()
    const onFocusIn = (e: FocusEvent) => {
      const cell = cellFrom(e.target)
      if (!cell) return
      show(cell)
      // Roving tabindex: the focused date becomes the grid's single tab stop, so
      // the calendar costs one Tab to enter and one to leave rather than 366.
      for (const c of cells) c.setAttribute('tabindex', c === cell ? '0' : '-1')
    }
    const onFocusOut = (e: FocusEvent) => {
      if (!root.contains(e.relatedTarget as Node | null)) clear()
    }

    /**
     * Arrow keys walk the calendar as a calendar: left/right along the month,
     * up/down across the same day of adjacent months. Where the target date does
     * not exist — February 30, arrowing down from January 31 — focus falls back
     * to the last date of that month rather than dying, which is also what makes
     * February's short row traversable in both directions.
     */
    const onKeyDown = (e: KeyboardEvent) => {
      const from = cellFrom(e.target)
      if (!from) return
      const dirs: Record<string, [number, number]> = {
        ArrowLeft: [0, -1],
        ArrowRight: [0, 1],
        ArrowUp: [-1, 0],
        ArrowDown: [1, 0],
      }
      const dir = dirs[e.key]
      if (!dir) return
      e.preventDefault()

      const month = Number(from.dataset.month) + dir[0]
      const day = Number(from.dataset.day) + dir[1]
      if (month < 1 || month > 12 || day < 1) return

      const inMonth = cells.filter((c) => Number(c.dataset.month) === month)
      if (!inMonth.length) return
      const target =
        inMonth.find((c) => Number(c.dataset.day) === day) ??
        (dir[1] === 0 ? inMonth[inMonth.length - 1] : null)
      target?.focus()
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
  }, [gridId])

  return (
    <div
      aria-live="polite"
      className="mt-4 flex min-h-[4.5rem] items-center border-y border-[var(--rule)] py-3"
    >
      {active === null ? (
        <p className="serif text-[1rem] leading-snug text-[var(--ink-soft)]">
          <strong className="tnum font-semibold text-[var(--ink)]">{membersSharing}</strong> of{' '}
          <strong className="tnum font-semibold text-[var(--ink)]">{totalMembers}</strong> members
          share a birthday with at least one colleague.{' '}
          <strong className="tnum font-semibold text-[var(--ink)]">{emptyDays}</strong> days belong
          to no one.{' '}
          <span className="meta text-[0.8125rem] text-[var(--ink-faint)]">
            Point at a day, or tab to the calendar and use the arrow keys.
          </span>
        </p>
      ) : (
        <div className="w-full">
          <p className="flex items-baseline gap-2.5">
            <span className="smallcaps text-[0.75rem] tracking-[0.1em] text-[var(--ink-faint)]">
              {active.label}
            </span>
            <span className="meta text-[0.8125rem] text-[var(--ink-soft)]">
              {active.count === 0
                ? 'No one'
                : `${active.count} member${active.count === 1 ? '' : 's'}`}
            </span>
          </p>

          {active.count === 0 ? (
            <p className="serif mt-1 text-[0.9375rem] leading-snug text-[var(--ink-soft)]">
              No sitting member was born on this day.
            </p>
          ) : (
            <ul className="mt-1.5 flex flex-wrap gap-x-5 gap-y-1">
              {active.people.map((p) => (
                <li key={p.name} className="flex items-baseline gap-1.5">
                  <span className="text-[0.9375rem] font-semibold leading-tight text-[var(--ink)]">
                    {p.name}
                  </span>
                  <span
                    className="smallcaps rounded-full px-1.5 py-px text-[0.5625rem] font-semibold tracking-[0.04em]"
                    style={{
                      color: PARTY_VAR[p.party],
                      backgroundColor: `color-mix(in srgb, ${PARTY_VAR[p.party]} 11%, transparent)`,
                    }}
                  >
                    {PARTY_NAME[p.party] ?? p.party}
                  </span>
                  <span className="meta tnum text-[0.75rem] text-[var(--ink-faint)]">
                    {p.chamber} &middot; b.&nbsp;{p.birthYear}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
