import districtsData from '@/data/districts.json'
import topo from '@/data/hex435.topo.json'
import { ageYears } from '@/lib/age'
import { GAP_CLAMP, RAMP, VACANT_INK, buildCells, formatGap, gapColor } from '@/lib/districtMap'
import { DistrictMapReadout } from './DistrictMapReadout'

/**
 * "The Map" — 435 districts, each shaded by the distance between its member's
 * age and the median age of the adults who live there.
 *
 * The whole figure is server-rendered: the TopoJSON is decoded during the static
 * export and the browser receives finished path strings. The only client code is
 * the readout island, which delegates from this container by id (see
 * DistrictMapReadout for why it does not own the hexes).
 *
 * Hex layout: Daily Kos / Downballot Hexmap v3.1, by Daniel Donner, CC BY 4.0 —
 * credited under the figure and again in the Methodology, as the licence requires.
 */

type District = {
  geoid: string
  state: string
  district: number
  adultMedianAge: number
  member: { bioguide: string; name: string; party: string; dobMs: number } | null
  gapYears: number | null
}

const MAP_ID = 'district-map'

/**
 * The distribution strip runs across the DATA's range, not the color scale's.
 * That mismatch is the point: the ramp clamps at ±30 and the strip keeps going
 * to +45, so the reader can watch the gradient go flat under the far tail and
 * see exactly what the clamp costs — five members whose color stops changing
 * while their gap keeps growing.
 */
const STRIP_MIN = -22
const STRIP_MAX = 47
const BIN = 2.5

const stripPct = (gap: number) => ((gap - STRIP_MIN) / (STRIP_MAX - STRIP_MIN)) * 100

const districts = districtsData.districts as District[]
const asOfMs = Date.parse(districtsData.generatedAt)

/** "TX-35"; district 0 is an at-large seat. */
const labelOf = (d: District) => `${d.state}-${d.district === 0 ? 'AL' : d.district}`

export function DistrictMap() {
  const { cells, width, height } = buildCells(topo)
  const byGeoid = new Map(districts.map((d) => [d.geoid, d]))

  const seated = districts.filter((d) => d.member !== null && d.gapYears !== null)
  const vacant = districts.filter((d) => d.member === null)
  const pctOlder = `${(districtsData.stats.pctOlder * 100).toFixed(1)}%`
  const nationalMedian = districtsData.nationalAdultMedianAge.toFixed(1)

  // The histogram under the ramp: one bar per 2.5-year bin, colored by the very
  // scale it is explaining.
  const bins = new Map<number, number>()
  for (const d of seated) {
    const b = Math.floor((d.gapYears as number) / BIN) * BIN
    bins.set(b, (bins.get(b) ?? 0) + 1)
  }
  const tallest = Math.max(...bins.values())

  // A gradient that mirrors gapColor exactly, including the flat shoulder past
  // the clamp. Both interpolate in sRGB, so the strip and the map agree.
  const gradient = [
    ...RAMP.filter(([g]) => g > STRIP_MIN && g < GAP_CLAMP).map(
      ([g, hex]) => `${hex} ${stripPct(g).toFixed(2)}%`,
    ),
    `${gapColor(GAP_CLAMP)} ${stripPct(GAP_CLAMP).toFixed(2)}%`,
    `${gapColor(GAP_CLAMP)} 100%`,
  ]
  const gradientCss = `linear-gradient(to right, ${gapColor(STRIP_MIN)} 0%, ${gradient.join(', ')})`

  const extremes = [
    { geoid: '1707', side: 'right' as const },
    { geoid: '1213', side: 'left' as const },
  ].map((e) => {
    const d = byGeoid.get(e.geoid)!
    return { ...e, d, gap: d.gapYears as number, cell: cells.find((c) => c.geoid === e.geoid)! }
  })
  const ringed = new Set(extremes.map((e) => e.geoid))

  return (
    <figure className="my-0">
      {/* ── The scale, explained by the data it encodes ──────────────────── */}
      <div className="mb-7">
        <div className="mb-2 flex items-baseline justify-between">
          <span className="smallcaps text-[0.625rem] tracking-[0.14em] text-[var(--ink-faint)]">
            Younger than district
          </span>
          <span className="smallcaps text-[0.625rem] tracking-[0.14em] text-[var(--ink-faint)]">
            Older than district
          </span>
        </div>

        <div className="relative">
          {/* Every seated district, stacked into its bin — the ramp's own legend. */}
          <div className="relative h-[46px]">
            {[...bins.entries()].map(([b, n]) => (
              <span
                key={b}
                className="absolute bottom-0 rounded-t-[1.5px]"
                style={{
                  left: `${stripPct(b)}%`,
                  width: `${(BIN / (STRIP_MAX - STRIP_MIN)) * 100}%`,
                  height: `${Math.max(2, (n / tallest) * 46)}px`,
                  background: gapColor(b + BIN / 2),
                }}
              />
            ))}
            {/* Zero: the honest midpoint, and the only rule that rises through the strip. */}
            <span
              className="absolute bottom-0 top-0 w-px bg-[var(--ink)]"
              style={{ left: `${stripPct(0)}%` }}
            />
          </div>

          <div
            className="mt-[3px] h-[9px] w-full rounded-[1px]"
            style={{ background: gradientCss }}
          />

          {/* The clamp, stated rather than hidden. */}
          <span
            className="absolute bottom-[9px] top-0 border-l border-dashed border-[var(--ink-faint)]"
            style={{ left: `${stripPct(GAP_CLAMP)}%` }}
            aria-hidden
          />

          <div className="relative mt-1.5 h-[1.1rem]">
            {[-20, -10, 0, 10, 20, 30, 40].map((t) => (
              <span
                key={t}
                className="meta tnum absolute -translate-x-1/2 text-[0.6875rem] text-[var(--ink-faint)]"
                style={{ left: `${stripPct(t)}%` }}
              >
                {t > 0 ? `+${t}` : t < 0 ? `−${Math.abs(t)}` : t}
              </span>
            ))}
          </div>
        </div>

        {/* The two ends, named. They are ringed on the map below. */}
        <div className="relative mt-1 h-[2.4rem] text-[0.6875rem] leading-tight">
          {extremes.map((e) => (
            <span
              key={e.geoid}
              className={`meta absolute top-0 ${e.side === 'left' ? '' : 'text-right'}`}
              style={
                e.side === 'left'
                  ? { left: `${stripPct(e.gap)}%` }
                  : { right: `${100 - stripPct(e.gap)}%` }
              }
            >
              <span aria-hidden className="block h-[7px] w-px bg-[var(--rule-strong)]" />
              <span className="block whitespace-nowrap font-semibold text-[var(--ink)]">
                {formatGap(e.gap)}
              </span>
              <span className="block whitespace-nowrap text-[var(--ink-faint)]">
                {e.d.member?.name.split(' ').slice(-1)[0]}, {labelOf(e.d)}
              </span>
            </span>
          ))}
        </div>

        {/* The clamp note gets a row to itself. Sharing one with the extremes put
            it straight through "Davis, IL-7" at 390px. The dashed line above is
            what it labels, so it needs no arrow of its own. */}
        <div className="relative h-[0.95rem]">
          <span
            className="meta absolute -translate-x-1/2 whitespace-nowrap text-[0.625rem] text-[var(--ink-faint)]"
            style={{ left: `${stripPct(GAP_CLAMP)}%` }}
          >
            color stops changing
          </span>
        </div>

        <p className="meta mt-2 flex items-center gap-1.5 text-[0.6875rem] text-[var(--ink-faint)]">
          {/* Self-contained: this swatch carries its own pattern rather than
              reaching into the map's <defs>, which is a different SVG root. */}
          <svg width="15" height="13" aria-hidden className="shrink-0">
            <defs>
              <pattern
                id="vacant-key"
                patternUnits="userSpaceOnUse"
                width="3.4"
                height="3.4"
                patternTransform="rotate(45)"
              >
                <rect width="3.4" height="3.4" fill="var(--paper)" />
                <line x1="0" y1="0" x2="0" y2="3.4" stroke={VACANT_INK} strokeWidth="1.2" />
              </pattern>
            </defs>
            <rect
              x="0.5"
              y="0.5"
              width="14"
              height="12"
              fill="url(#vacant-key)"
              stroke="var(--rule-strong)"
            />
          </svg>
          Vacant seat &mdash; no member, so no gap to draw
        </p>
      </div>

      <DistrictMapReadout
        mapId={MAP_ID}
        pctOlder={pctOlder}
        nationalMedian={nationalMedian}
      />

      {/* ── The map ───────────────────────────────────────────────────────
          The scroller is the mobile containment: at 390px the cartogram keeps
          its own width and pans inside this box rather than widening the page. */}
      <div className="-mx-5 mt-5 overflow-x-auto px-5 sm:mx-0 sm:px-0">
        <div id={MAP_ID} className="min-w-[560px]">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="block h-auto w-full"
            role="img"
            aria-label={`Hex cartogram of all 435 U.S. House districts, shaded by the difference between each member's age and the median age of adults in their district. ${pctOlder} of members are older than their district's median adult. ${vacant.length} seats are vacant and unshaded.`}
          >
            <defs>
              {/* Vacancy is drawn in texture, never in color. A muted gray fill
                  would land somewhere on this ramp and read as a real, near-zero
                  gap — the one confusion this map cannot afford. Hatching sits
                  off the color channel entirely, so "no member" can never be
                  mistaken for "a member who happens to match their district". */}
              <pattern
                id="vacant-hatch"
                patternUnits="userSpaceOnUse"
                width="5"
                height="5"
                patternTransform="rotate(45)"
              >
                <rect width="5" height="5" fill="var(--paper)" />
                <line x1="0" y1="0" x2="0" y2="5" stroke={VACANT_INK} strokeWidth="1.6" />
              </pattern>
            </defs>

            <g>
              {cells.map((c, i) => {
                const d = byGeoid.get(c.geoid)
                if (!d) return null
                const isVacant = d.member === null
                const age = d.member ? ageYears(d.member.dobMs, asOfMs) : null
                const gap = d.gapYears
                const name = d.member?.name ?? ''
                const label = labelOf(d)
                return (
                  <path
                    key={c.geoid}
                    d={c.d}
                    className="district"
                    tabIndex={i === 0 ? 0 : -1}
                    data-geoid={c.geoid}
                    data-cx={c.cx}
                    data-cy={c.cy}
                    data-label={label}
                    data-name={name}
                    data-party={d.member?.party ?? ''}
                    data-age={age === null ? '' : age.toFixed(1)}
                    data-median={d.adultMedianAge.toFixed(1)}
                    data-gap={gap === null ? '' : formatGap(gap)}
                    fill={isVacant ? 'url(#vacant-hatch)' : gapColor(gap as number)}
                    aria-label={
                      isVacant
                        ? `${label}, vacant seat. District adults median age ${d.adultMedianAge.toFixed(1)}.`
                        : `${label}, ${name}, age ${age?.toFixed(1)}, district adults ${d.adultMedianAge.toFixed(1)}, gap ${formatGap(gap as number)} years.`
                    }
                  />
                )
              })}
            </g>

            {/* The two ends of the distribution, findable on the map. A ring, not
                a label: this cartogram has no clear space wide enough for text
                that would not cover a district. */}
            <g fill="none" pointerEvents="none">
              {extremes.map((e) => (
                <circle
                  key={e.geoid}
                  cx={e.cell.cx}
                  cy={e.cell.cy}
                  r="15"
                  stroke="var(--ink)"
                  strokeWidth="1.6"
                />
              ))}
            </g>

            {/* The active outline lives here, last and on top. SVG has no
                z-index, so a stroke drawn on the hex itself would be half
                painted over by whichever neighbors happen to follow it in
                document order. Restacking the node under the cursor would
                re-fire pointerover; mirroring its path does not. */}
            <path id={`${MAP_ID}-highlight`} className="district-highlight" fill="none" />
          </svg>
        </div>
      </div>

      <figcaption className="serif mt-7 max-w-prose text-[1.0625rem] leading-relaxed text-[var(--ink-soft)]">
        In{' '}
        <strong className="tnum font-semibold text-[var(--ink)]">{pctOlder}</strong> of
        districts the representative is older than the median adult they represent — on average
        by{' '}
        <strong className="tnum font-semibold text-[var(--ink)]">
          {districtsData.stats.meanGap.toFixed(1)}
        </strong>{' '}
        years. The two ringed districts are the ends of the range:{' '}
        <strong className="font-semibold text-[var(--ink)]">Danny K. Davis</strong> of Illinois&rsquo;s
        7th, {formatGap(45)} years older than his district&rsquo;s median adult, and{' '}
        <strong className="font-semibold text-[var(--ink)]">Anna Paulina Luna</strong> of
        Florida&rsquo;s 13th, {formatGap(-19.3)}.
      </figcaption>

      <p className="meta mt-4 text-[0.6875rem] text-[var(--ink-faint)]">
        Hex layout:{' '}
        <a
          className="underline decoration-1 underline-offset-2 decoration-[color:var(--rule-strong)] transition-colors hover:text-[var(--ink)]"
          href="https://the-db.co/maps"
        >
          Daniel Donner / The Downballot
        </a>
        , licensed{' '}
        <a
          className="underline decoration-1 underline-offset-2 decoration-[color:var(--rule-strong)] transition-colors hover:text-[var(--ink)]"
          href="https://creativecommons.org/licenses/by/4.0/"
        >
          CC BY 4.0
        </a>
        .
      </p>
    </figure>
  )
}
