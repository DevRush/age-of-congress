import data from '@/data/congress.json'
import { Clock } from './Clock'

/**
 * The leaderboard. This is the one section, with the histogram, where party color
 * is allowed onto the page — carried in two coordinated places per member: a
 * rounded party–state pill, and a matching hairline ring around the circular
 * portrait, so a whole column can be scanned by color at a glance. Everything
 * else stays in the paper's monochrome: light rules between rows and a right-hand
 * column of live ages all ticking at once and aligned to the digit.
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
 * colored ring; the live age sits in a fixed right column so the ticking figures
 * align into a single running ledger.
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
          boxShadow: `0 0 0 1.5px var(--paper), 0 0 0 ${compact ? 2.5 : 3}px color-mix(in srgb, ${hue} 60%, transparent)`,
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
          <span className="truncate">
            first elected {m.firstElectedYear} · {m.termsServed}{' '}
            {m.termsServed === 1 ? 'term' : 'terms'}
          </span>
        </p>
      </div>

      <span
        className={`serif shrink-0 text-right tabular-nums tracking-[-0.01em] text-[var(--ink)] ${
          compact ? 'text-[0.875rem]' : 'text-[1rem] sm:text-[1.125rem]'
        }`}
      >
        <Clock dobMs={m.dobMs} decimals={7} dim={2} baselineMs={baselineMs} />
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

      <h4 className="smallcaps mt-9 mb-2 text-[0.75rem] tracking-[0.14em] text-[var(--ink-faint)]">
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
