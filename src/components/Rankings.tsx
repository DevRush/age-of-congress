import data from '@/data/congress.json'
import { termsPhrase, tookOfficePhrase } from '@/lib/tenure'
import { Clock } from './Clock'

/**
 * The leaderboard. This is the one section, with the histogram, where party color
 * is allowed onto the page — carried in two coordinated places per member: a
 * rounded party–state pill, and a matching ring around the circular portrait,
 * weighted enough to hold the face and to be scanned down a column at a glance.
 * Everything else stays in the paper's monochrome: light rules between rows and a
 * right-hand column of ages aligned to the digit.
 *
 * Ages run to one decimal. They are still live Clocks — computed in the reader's
 * browser, so a cached page can never show a stale age — but at one decimal a
 * figure only moves every few weeks and should sit still. The age is the point of
 * a list ranked by age, so it is the largest, heaviest thing in the row — set
 * well above the name and metadata, full ink, tabular — and it anchors the right
 * edge as a ledger the eye can run straight down. The tenure is the second fact
 * and stays in the ink beside the name; everything else recedes.
 *
 * Numbering is earned here — these lists are a genuine ranked order (by age), so
 * the rank figure leading each row carries real information, not decoration.
 */

// Senate cards in the roster carry no `district`; House cards do. Widen the
// JSON-inferred element type so a single Row can render either chamber.
type Card = (typeof data.oldest.senate)[number] & { district?: number }

const baselineMs = Date.parse(data.generatedAt)

const PARTY_VAR: Record<string, string> = {
  D: 'var(--dem)',
  R: 'var(--rep)',
  I: 'var(--ind)',
}

/** "D–IA" for a senator, "D–TX-35" for a representative; district 0 is at-large ("AL"). */
function partyState(m: Card): string {
  const district =
    m.district !== undefined && m.district !== null
      ? `-${m.district === 0 ? 'AL' : m.district}`
      : ''
  return `${m.party}–${m.state}${district}`
}

/**
 * A rounded party–state tag. The hue is concentrated into a tinted pill — enough
 * to scan a column by color, restrained enough not to shout across forty rows.
 */
function PartyChip({ m, compact = false }: { m: Card; compact?: boolean }) {
  const hue = PARTY_VAR[m.party]
  return (
    <span
      className={`smallcaps tnum inline-block whitespace-nowrap rounded-full font-semibold tracking-[0.04em] ${
        compact ? 'px-1.5 py-px text-[0.625rem]' : 'px-2 py-0.5 text-[0.6875rem]'
      }`}
      style={{
        color: hue,
        backgroundColor: `color-mix(in srgb, ${hue} 11%, transparent)`,
      }}
    >
      {partyState(m)}
    </span>
  )
}

/**
 * One member. The big variant leads the oldest lists; the compact variant forms
 * the subordinate "youngest" strip beneath. The circular portrait wears a party-
 * colored ring, set on a thin paper gap so the hue reads as a ring and not as a
 * halo bleeding into the photograph; the age sits in a fixed right column so the
 * figures align into a single ledger.
 */
function Row({ m, compact = false }: { m: Card; compact?: boolean }) {
  const img = compact ? m.photo.replace('-320', '-160') : m.photo
  const hue = PARTY_VAR[m.party]
  const size = compact ? 30 : 48
  return (
    <li
      className={`flex items-center border-t border-[var(--rule)] ${
        compact ? 'gap-2.5 py-2' : 'gap-3.5 py-2.5'
      }`}
    >
      <span
        className={`shrink-0 text-right tabular-nums text-[var(--ink-faint)] ${
          compact ? 'w-4 text-[0.75rem]' : 'w-6 text-[0.9375rem] font-medium'
        }`}
      >
        {m.rank}
      </span>

      <img
        src={img}
        alt={m.name}
        width={size}
        height={size}
        loading="lazy"
        decoding="async"
        className="shrink-0 rounded-full object-cover"
        style={{
          width: size,
          height: size,
          objectPosition: '50% 20%',
          boxShadow: `0 0 0 1.5px var(--paper), 0 0 0 ${compact ? 3.5 : 4.5}px color-mix(in srgb, ${hue} 60%, transparent)`,
        }}
      />

      <div className="min-w-0 flex-1">
        <p
          className={`truncate font-semibold leading-tight ${
            compact ? 'text-[0.875rem]' : 'text-[1.0625rem]'
          }`}
        >
          {m.name}
        </p>
        <p
          className={`mt-1 flex items-center gap-2 truncate text-[var(--ink-soft)] ${
            compact ? 'text-[0.6875rem]' : 'text-[0.75rem]'
          }`}
        >
          <PartyChip m={m} compact={compact} />
          {/* The tenure is the point of the row — how long this has been true —
              so it steps up out of the metadata line into the ink, and it leads.
              Both figures are lifetime totals across both chambers (see
              @/lib/tenure), which is why the scope travels inside the bolded
              phrase rather than being left to the column heading above: this
              line sits under "The Ten Oldest Senators", and ten of the forty
              members on these lists got there from the other chamber. Leading
              with it also fixes the truncation: at 390px this line clips, and
              what must survive the ellipsis is the figure that carries its own
              scope, not the one that would be left dangling under a heading
              that contradicts it. */}
          <span className="truncate">
            <span className="font-semibold text-[var(--ink)]">
              {termsPhrase(m.termsServed)}
            </span>{' '}
            · {tookOfficePhrase(m.firstTookOfficeYear)}
          </span>
        </p>
      </div>

      <span
        className={`serif shrink-0 pl-2 text-right font-semibold tabular-nums leading-none tracking-[-0.01em] text-[var(--ink)] ${
          compact ? 'text-[1.0625rem]' : 'text-[1.375rem] sm:text-[1.5rem]'
        }`}
      >
        <Clock dobMs={m.dobMs} decimals={1} dim={0} baselineMs={baselineMs} />
      </span>
    </li>
  )
}

/**
 * One chamber: the ten oldest as full rows, then a small-caps turn into the ten
 * youngest as a quieter, mirrored strip.
 */
function ChamberColumn({
  title,
  oldest,
  youngest,
}: {
  title: string
  oldest: Card[]
  youngest: Card[]
}) {
  return (
    <div>
      <h3 className="mb-3 text-[1.375rem] font-bold leading-tight tracking-[-0.015em]">
        {title}
      </h3>
      <ol>
        {oldest.map((m) => (
          <Row key={m.bioguide} m={m} />
        ))}
      </ol>

      {/* A deliberate hole in the column: the turn from oldest to youngest is the
          only place the ranking reverses, and the white space is what marks it. */}
      <h4 className="smallcaps mt-16 mb-2 text-[0.75rem] tracking-[0.14em] text-[var(--ink-faint)]">
        …and the ten youngest
      </h4>
      <ol>
        {youngest.map((m) => (
          <Row key={m.bioguide} m={m} compact />
        ))}
      </ol>
    </div>
  )
}

/**
 * The two chambers set side by side and split by a gutter rule — a vertical
 * hairline on wide screens, a horizontal one once they stack.
 */
export function Rankings() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2">
      <div className="md:pr-10 lg:pr-14">
        <ChamberColumn
          title="The Ten Oldest Senators"
          oldest={data.oldest.senate}
          youngest={data.youngest.senate}
        />
      </div>
      <div className="mt-14 border-t border-[var(--rule)] pt-14 md:mt-0 md:border-t-0 md:border-l md:border-[var(--rule)] md:pt-0 md:pl-10 lg:pl-14">
        <ChamberColumn
          title="The Ten Oldest Representatives"
          oldest={data.oldest.house}
          youngest={data.youngest.house}
        />
      </div>
    </div>
  )
}
