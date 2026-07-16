'use client'

import { useState } from 'react'
import data from '@/data/congress.json'
import population from '@/data/population.json'
import { binByAge, dotPositions, silhouetteCounts } from '@/lib/histogram'
import type { Chamber, Party } from '@/lib/types'

/**
 * "The Shape of Congress" — a unit histogram where every member is a single dot,
 * stacked into five-year age bins and colored by party (the page's only place,
 * with the Rankings, where saturated hue is allowed onto the field). Behind the
 * dots sits a neutral-gray "silhouette": the U.S. adult population rescaled to
 * the same number of seats and drawn on the same vertical scale — the shape the
 * chart *would* take if Congress mirrored the country's ages.
 *
 * The argument is the offset between the two shapes: the colored dots pile up in
 * the 55–79 range, while the gray silhouette's mass sits a generation younger and
 * the under-40 bins stay all but empty. A chamber toggle re-tallies in place.
 */

const PARTY_VAR: Record<Party, string> = {
  D: 'var(--dem)',
  R: 'var(--rep)',
  I: 'var(--ind)',
}

const VIEWS = [
  { key: 'all', label: 'All', long: 'voting members', minAge: 25 },
  { key: 'senate', label: 'Senate', long: 'senators', minAge: 30 },
  { key: 'house', label: 'House', long: 'representatives', minAge: 25 },
] as const

type ViewKey = (typeof VIEWS)[number]['key']
type Entry = { birthYear: number; party: Party; chamber: Chamber }

// Plot geometry (SVG user units). Densely packed dots read as a crowd; the wide,
// short field is deliberately newspaper-graphic in proportion.
//
// The whole field is drawn about a third larger than the type around it asks
// for, and that is the point: this chart carries the page's actual argument —
// the offset between the colored pile and the gray silhouette — so it is given
// the room of a lead graphic rather than a supporting figure. The scale is
// bounded by the 984px text column: at 14 bins the plot lands near 930px, so it
// sits at full size on a desktop and still scrolls inside its own container on a
// phone without ever widening the page.
const PAD = 32 // left/right margin
const BIN_W = 62 // horizontal room per age bin
const DOT = 9.5 // vertical distance between stacked dot centers
const COL = 9.5 // horizontal distance between dots in a row
const R = 3.5 // dot radius
const PLOT_H = 180 // height available to the tallest stack
const TOP = 16 // headroom above the tallest stack
const BASE = TOP + PLOT_H // y of the baseline
const LABEL_Y = BASE + 20
const SVG_H = BASE + 38
const TICK_SIZE = 11.5 // axis + annotation type

export function Histogram() {
  const [view, setView] = useState<ViewKey>('all')
  const cfg = VIEWS.find((v) => v.key === view)!
  const atYear = new Date(data.generatedAt).getUTCFullYear()

  const entries = (data.histogram as Entry[]).filter(
    (e) => view === 'all' || e.chamber === view,
  )
  const bins = binByAge(entries, atYear)
  const silhouette = silhouetteCounts(
    population.bins.filter((b) => b.min <= 90),
    entries.length,
    cfg.minAge,
  )

  // Pack the dots to fill the frame for this view: fewer members (the Senate)
  // get a narrower stack so their shape still stands up. Both the dots and the
  // silhouette share this `perRow`, so the two shapes stay directly comparable.
  const maxCount = Math.max(
    ...bins.map((b) => b.counts.D + b.counts.R + b.counts.I),
    ...silhouette,
  )
  let perRow = Math.min(6, Math.max(2, Math.round(maxCount / 15)))
  const capRows = Math.floor(PLOT_H / DOT)
  while (Math.ceil(maxCount / perRow) > capRows) perRow++

  const width = bins.length * BIN_W + PAD * 2
  const binLeft = (i: number) => PAD + i * BIN_W
  const silY = (c: number) => BASE - (c / perRow) * DOT

  // Filled silhouette (stepped area down to the baseline) plus a crisper top edge.
  const areaPath =
    `M ${binLeft(0)} ${BASE} ` +
    silhouette
      .map((c, i) => `L ${binLeft(i)} ${silY(c)} L ${binLeft(i + 1)} ${silY(c)}`)
      .join(' ') +
    ` L ${binLeft(silhouette.length)} ${BASE} Z`
  const topPath =
    `M ${binLeft(0)} ${silY(silhouette[0])} ` +
    silhouette
      .map((c, i) => `L ${binLeft(i)} ${silY(c)} L ${binLeft(i + 1)} ${silY(c)}`)
      .join(' ')

  return (
    // The figure column is exactly as wide as the graphic and centers itself, so
    // on desktop the controls, the plot, and the caption sit as one centered
    // unit rather than the plot floating inside a wider frame. `maxWidth` only
    // caps: on a phone the column is simply the screen, and the plot keeps
    // scrolling inside its own overflow container below.
    <figure className="mx-auto my-0" style={{ maxWidth: width }}>
      {/* Controls + legend share one row on wide screens, stack on narrow. */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div
          role="group"
          aria-label="Filter by chamber"
          className="inline-flex self-start gap-1 rounded-full border border-[var(--surface-line)] bg-[var(--surface)] p-1"
        >
          {VIEWS.map((v) => {
            const active = v.key === view
            return (
              <button
                key={v.key}
                type="button"
                aria-pressed={active}
                onClick={() => setView(v.key)}
                className="smallcaps rounded-full px-3.5 py-1 text-[0.6875rem] tracking-[0.1em] transition-colors"
                style={{
                  background: active ? 'var(--ink)' : 'transparent',
                  color: active ? 'var(--paper)' : 'var(--ink-soft)',
                }}
              >
                {v.label}
              </button>
            )
          })}
        </div>

        <Legend />
      </div>

      <div className="overflow-x-auto">
        <svg
          width={width}
          height={SVG_H}
          viewBox={`0 0 ${width} ${SVG_H}`}
          role="img"
          aria-label={`Age distribution of ${entries.length} ${cfg.long}, one dot per member, colored by party, against the gray silhouette of the U.S. adult population ${cfg.minAge} and older.`}
          style={{ maxWidth: 'none' }}
        >
          {/* Population silhouette, behind everything. */}
          <path d={areaPath} fill="var(--ind)" fillOpacity={0.13} />
          <path
            d={topPath}
            fill="none"
            stroke="var(--ind)"
            strokeOpacity={0.55}
            strokeWidth={1.5}
            strokeLinejoin="round"
          />

          {/* Baseline. */}
          <line
            x1={PAD}
            y1={BASE}
            x2={width - PAD}
            y2={BASE}
            stroke="var(--rule)"
            strokeWidth={1}
          />

          {/* Member dots: Democrats fill from the baseline up, then any
              independents, then Republicans — so each column reads as a stacked
              party split as well as a headcount. */}
          {bins.map((bin, bi) => {
            const stack: Party[] = [
              ...Array<Party>(bin.counts.D).fill('D'),
              ...Array<Party>(bin.counts.I).fill('I'),
              ...Array<Party>(bin.counts.R).fill('R'),
            ]
            const usedW = (perRow - 1) * COL
            const offset = (BIN_W - usedW) / 2
            return dotPositions(stack.length, perRow).map((p, di) => (
              <circle
                key={`${bi}-${di}`}
                cx={binLeft(bi) + offset + p.col * COL}
                cy={BASE - R - p.row * DOT}
                r={R}
                fill={PARTY_VAR[stack[di]]}
              />
            ))
          })}

          {/* Age-bin labels. */}
          {bins.map((bin, bi) => (
            <text
              key={bin.label}
              x={binLeft(bi) + BIN_W / 2}
              y={LABEL_Y}
              textAnchor="middle"
              fontSize={TICK_SIZE}
              fill="var(--ink-soft)"
            >
              {bin.label}
            </text>
          ))}
          <text
            x={width - PAD}
            y={SVG_H - 4}
            textAnchor="end"
            fontSize={TICK_SIZE}
            fontStyle="italic"
            fill="var(--ink-soft)"
          >
            age →
          </text>
        </svg>
      </div>

      <figcaption className="mt-4 max-w-prose text-[0.8125rem] leading-relaxed text-[var(--ink-soft)]">
        Each dot is one of the {entries.length} {cfg.long}, stacked by age and
        colored by party. The gray silhouette is the U.S. adult population{' '}
        {cfg.minAge} and older, rescaled to the same {entries.length} seats — the
        shape Congress would take if its ages matched the country&rsquo;s.
      </figcaption>
    </figure>
  )
}

/** Small-caps key: party dots plus the gray population silhouette. */
function Legend() {
  return (
    <ul className="smallcaps flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[0.6875rem] tracking-[0.08em] text-[var(--ink-soft)]">
      {(
        [
          ['D', 'Democrats'],
          ['R', 'Republicans'],
          ['I', 'Independents'],
        ] as const
      ).map(([p, label]) => (
        <li key={p} className="flex items-center gap-1.5">
          <span
            aria-hidden
            className="inline-block h-[9px] w-[9px] rounded-full"
            style={{ background: PARTY_VAR[p] }}
          />
          {label}
        </li>
      ))}
      <li className="flex items-center gap-1.5">
        <span
          aria-hidden
          className="inline-block h-[11px] w-[16px]"
          style={{
            background: 'color-mix(in srgb, var(--ind) 13%, transparent)',
            borderTop: '1.5px solid color-mix(in srgb, var(--ind) 55%, transparent)',
          }}
        />
        U.S. adult population
      </li>
    </ul>
  )
}
