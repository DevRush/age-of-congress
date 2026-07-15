import congress from '@/data/congress.json'
import historical from '@/data/historical.json'
import { ageYears } from '@/lib/age'
import { linePath, scaleLinear } from '@/lib/chart'
import type { HistoricalPoint } from '@/lib/types'

/**
 * "The Long View" — the thesis made visible. Every Congress since the first,
 * plotted by the average age of its members on the day it convened: the Senate
 * as a heavy ink line, the House a step below in soft gray. Two centuries of a
 * slow, uneven climb from the mid-forties to today's record highs.
 *
 * The graphic is a static server-rendered SVG (no client JS): the geometry is
 * fixed at build time from `historical.json`, and the only "live" marks are the
 * two open dots at the right edge, the sitting members' average age as of the
 * edition date — the same figures the clocks above tick toward.
 *
 * Coverage-aware rendering: for the earliest Congresses (through the 1840s) the
 * birth dates of more than a tenth of members are unknown, so those stretches
 * are drawn dashed and pale and sit inside a faintly shaded "incomplete records"
 * band. Everything from the 28th Congress on is solid.
 *
 * The palette stays strictly monochrome — the page reserves saturated hue for
 * party. The two chambers are told apart by ink weight (dark vs. gray) and by
 * direct labels at the right, never by color alone.
 */

// Plot geometry, in SVG user units.
const W = 780
const H = 400
const M = { top: 30, right: 116, bottom: 46, left: 46 }

// Domains. The x-axis runs a hair past the last Congress so the "today" dots
// clear the final data point; the y-axis is a fixed 40–70 age band with a
// little headroom above the record highs.
const X0 = 1789
const X1 = 2028
const Y0 = 40
const Y1 = 70

const x = scaleLinear(X0, X1, M.left, W - M.right)
const y = scaleLinear(Y0, Y1, H - M.bottom, M.top)

const Y_TICKS = [40, 45, 50, 55, 60, 65, 70]
const X_TICKS = [1800, 1850, 1900, 1950, 2000]

// Where reliable birth records begin. Congresses whose coverage falls below
// this are drawn as the pale, dashed "incomplete records" era.
const COVERAGE_FLOOR = 0.9

export function HistoryChart() {
  const points = historical as HistoricalPoint[]

  // One path through a chamber's solid-coverage points, or through its
  // low-coverage points. Because the low-coverage Congresses form one contiguous
  // run at the start (1789–1841), each call returns a single unbroken segment.
  // The dashed (low-coverage) run additionally extends to the first solid point
  // so the two paths meet across the coverage boundary instead of leaving a
  // ~5px break between the last dashed Congress (~1841) and the first solid one.
  const seg = (chamber: 'senateMean' | 'houseMean', wantSolid: boolean) => {
    const valid = points.filter((p) => p[chamber] !== null)
    const isSolid = (p: HistoricalPoint) => p.birthdayCoverage >= COVERAGE_FLOOR
    const chosen = valid.filter((p) => isSolid(p) === wantSolid)
    if (!wantSolid) {
      // Bridge to the solid era: append the first solid point (which falls right
      // after the contiguous low-coverage run) so the dashed line reaches it.
      const firstSolid = valid.find(isSolid)
      if (firstSolid) chosen.push(firstSolid)
    }
    return linePath(chosen.map((p) => ({ x: x(p.year), y: y(p[chamber]!) })))
  }

  const last = points[points.length - 1]
  const senateEnd = last.senateMean!
  const houseEnd = last.houseMean!

  // Today's sitting members, aged to the edition date — the numbers the hero
  // clocks tick toward. Plotted as open dots just past the final Congress.
  const baselineMs = Date.parse(congress.generatedAt)
  const todaySenate = ageYears(congress.senate.meanDobMs, baselineMs)
  const todayHouse = ageYears(congress.house.meanDobMs, baselineMs)
  const todayX = x(2026.5)

  // The postwar trough: the youngest Congress of the modern era.
  const modernLow = points
    .filter((p) => p.year >= 1900)
    .reduce((a, b) => ((a.overallMean ?? 99) < (b.overallMean ?? 99) ? a : b))
  const lowX = x(modernLow.year)
  const lowY = y(modernLow.houseMean!)

  // Right edge of the shaded low-coverage band, midway to the first solid Congress.
  const bandRight = x(1842)

  return (
    <figure className="m-0">
      <div className="overflow-x-auto">
        <svg
          width={W}
          height={H}
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label={`Line chart of the average age of each Congress on its first day, from 1789 to today. The Senate rises from about 47 to ${senateEnd.toFixed(0)}; the House from about 44 to ${houseEnd.toFixed(0)}. Both dip to a modern low around ${modernLow.year} before climbing to record highs.`}
          className="min-w-[680px]"
          style={{ maxWidth: 'none' }}
        >
          {/* Incomplete-records band behind everything. */}
          <rect
            x={M.left}
            y={M.top}
            width={bandRight - M.left}
            height={H - M.bottom - M.top}
            fill="var(--ink)"
            opacity={0.035}
          />
          <text
            x={M.left + 6}
            y={M.top + 13}
            fontSize={9.5}
            fontStyle="italic"
            fill="var(--ink-soft)"
          >
            birth records incomplete
          </text>

          {/* Horizontal gridlines + age labels. */}
          {Y_TICKS.map((v) => (
            <g key={v}>
              <line
                x1={M.left}
                x2={W - M.right}
                y1={y(v)}
                y2={y(v)}
                stroke="var(--rule)"
                strokeWidth={1}
              />
              <text
                x={M.left - 9}
                y={y(v) + 3.5}
                textAnchor="end"
                fontSize={10}
                className="tnum"
                fill="var(--ink-soft)"
              >
                {v}
              </text>
            </g>
          ))}
          <text
            x={M.left - 9}
            y={M.top - 12}
            textAnchor="end"
            fontSize={9}
            className="smallcaps"
            fill="var(--ink-soft)"
          >
            age
          </text>

          {/* Year labels along the foot. */}
          {X_TICKS.map((v) => (
            <text
              key={v}
              x={x(v)}
              y={H - M.bottom + 18}
              textAnchor="middle"
              fontSize={10}
              className="tnum"
              fill="var(--ink-soft)"
            >
              {v}
            </text>
          ))}

          {/* Low-coverage era: pale and dashed. */}
          <path
            d={seg('senateMean', false)}
            fill="none"
            stroke="var(--ink)"
            strokeWidth={1.5}
            opacity={0.32}
            strokeDasharray="3 3"
            strokeLinejoin="round"
          />
          <path
            d={seg('houseMean', false)}
            fill="none"
            stroke="var(--ink-soft)"
            strokeWidth={1.5}
            opacity={0.32}
            strokeDasharray="3 3"
            strokeLinejoin="round"
          />

          {/* Solid era: the reliable record. */}
          <path
            d={seg('houseMean', true)}
            fill="none"
            stroke="var(--ink-soft)"
            strokeWidth={1.8}
            strokeLinejoin="round"
          />
          <path
            d={seg('senateMean', true)}
            fill="none"
            stroke="var(--ink)"
            strokeWidth={1.9}
            strokeLinejoin="round"
          />

          {/* Modern-low annotation, anchored to the valley floor (House line). */}
          <line
            x1={lowX}
            x2={lowX}
            y1={lowY + 4}
            y2={lowY + 26}
            stroke="var(--rule)"
            strokeWidth={1}
          />
          <circle cx={lowX} cy={lowY} r={3} fill="var(--ink)" />
          <text
            x={lowX}
            y={lowY + 40}
            textAnchor="middle"
            fontSize={11}
            fill="var(--ink)"
          >
            <tspan className="tnum" fontWeight={600}>
              {modernLow.year}
            </tspan>
          </text>
          <text
            x={lowX}
            y={lowY + 53}
            textAnchor="middle"
            fontSize={10}
            fontStyle="italic"
            fill="var(--ink-soft)"
          >
            the modern low
          </text>

          {/* Solid endpoints at the final Congress. */}
          <circle cx={x(last.year)} cy={y(senateEnd)} r={2.6} fill="var(--ink)" />
          <circle cx={x(last.year)} cy={y(houseEnd)} r={2.6} fill="var(--ink-soft)" />

          {/* Dotted continuation to today's sitting members (open dots). */}
          <path
            d={linePath([
              { x: x(last.year), y: y(senateEnd) },
              { x: todayX, y: y(todaySenate) },
            ])}
            fill="none"
            stroke="var(--ink)"
            strokeWidth={1}
            strokeDasharray="1.5 2.5"
            opacity={0.6}
          />
          <path
            d={linePath([
              { x: x(last.year), y: y(houseEnd) },
              { x: todayX, y: y(todayHouse) },
            ])}
            fill="none"
            stroke="var(--ink-soft)"
            strokeWidth={1}
            strokeDasharray="1.5 2.5"
            opacity={0.6}
          />
          <circle
            cx={todayX}
            cy={y(todaySenate)}
            r={3}
            fill="var(--paper)"
            stroke="var(--ink)"
            strokeWidth={1.5}
          />
          <circle
            cx={todayX}
            cy={y(todayHouse)}
            r={3}
            fill="var(--paper)"
            stroke="var(--ink-soft)"
            strokeWidth={1.5}
          />

          {/* Direct labels at the right — identity is never color-alone. */}
          <text x={W - M.right + 12} y={y(senateEnd) + 4} fill="var(--ink)">
            <tspan className="smallcaps" fontSize={11} fill="var(--ink-soft)">
              Senate{' '}
            </tspan>
            <tspan className="tnum" fontSize={13} fontWeight={600}>
              {senateEnd.toFixed(1)}
            </tspan>
          </text>
          <text x={W - M.right + 12} y={y(houseEnd) + 4} fill="var(--ink-soft)">
            <tspan className="smallcaps" fontSize={11}>
              House{' '}
            </tspan>
            <tspan className="tnum" fontSize={13} fontWeight={600}>
              {houseEnd.toFixed(1)}
            </tspan>
          </text>
        </svg>
      </div>

      <figcaption className="mt-4 max-w-prose text-[0.8125rem] leading-relaxed text-[var(--ink-soft)]">
        Average age of members on each Congress&rsquo;s first day, 1789&ndash;
        {last.year}. Dashed, paler segments mark the early Congresses, where birth
        dates are unknown for more than a tenth of members. The open dots at the
        right are today&rsquo;s sitting members, now averaging{' '}
        {todaySenate.toFixed(1)} in the Senate and {todayHouse.toFixed(1)} in the
        House.
      </figcaption>
    </figure>
  )
}
