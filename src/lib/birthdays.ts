/**
 * Derivation for "Shared Birthdays" — the calendar heat map.
 *
 * Everything here is pure and runs at build time. The data file carries only the
 * 261 days that somebody was born on; the 105 empty ones are absent from it by
 * construction, so the calendar has to be built rather than read. That is the
 * whole reason this module exists: the emptiness is a finding, and a finding you
 * have to reconstruct is one you can get wrong silently.
 */

export type BirthdayMember = {
  bioguide: string
  name: string
  party: string
  chamber: string
  state: string
  birthYear: number
}

export type BirthdayDay = { md: string; members: BirthdayMember[] }

export type BirthdayStats = {
  totalMembers: number
  distinctDaysUsed: number
  emptyDays: number
  sharingPairs: number
  membersSharing: number
  daysWith2plus: number
  daysWith3plus: number
  daysWith4plus: number
  daysWith5plus: number
  maxDay: { md: string; count: number }
}

export type BirthdayExpected = { expectedEmptyDays: number; expectedSharingPairs: number }

/** One real date on the calendar. */
export type BirthdayCell = {
  md: string
  month: number
  day: number
  count: number
  members: BirthdayMember[]
}

/** A month: 31 slots, of which the ones past the month's length are not dates. */
export type BirthdayRow = { month: number; name: string; cells: (BirthdayCell | null)[] }

export const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const

/**
 * February has 29 days here, always.
 *
 * The roster is a set of month/day pairs with no year attached, so the calendar
 * this section draws is not any particular year — it is the space of birthdays a
 * person can have. February 29 is one of them: Ben Cline has it. Building the
 * grid on a common year would silently drop him and quietly make the arithmetic
 * (366 dates, 261 used, 105 empty) stop adding up.
 */
export const DAYS_IN_MONTH = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31] as const

/** Every date a birthday can fall on, February 29 included. */
export const CALENDAR_DAYS = DAYS_IN_MONTH.reduce((a, b) => a + b, 0)

/** The widest month, and so the number of columns the grid needs. */
export const CALENDAR_COLUMNS = 31

// ── The scale ────────────────────────────────────────────────────────────────

/**
 * Six steps of one violet, light → dark, for one to six members born on a day.
 *
 * The ramp starts at ONE. There is no step for zero, because zero is not a small
 * amount of something — it is the absence of it, and 105 of the 366 dates are
 * empty. A "shade zero" at the pale end would file those days as the quietest
 * members of the same series and the reader would scan past them; they are drawn
 * as hollow sockets instead, off this scale entirely (see `.bday-empty`). Not
 * having to reserve the pale end for zero is also what lets step 1 start dark
 * enough to be unmistakably a fill — it clears the white page at 2.22:1, where a
 * conventional 0-anchored ramp would have had to start near-invisible.
 *
 * Violet at OKLCH hue 300°, chroma ~0.105 — chosen against everything this page
 * has already spent, and measured rather than eyeballed. Party owns blue (--dem,
 * hue 261°), red (--rep, 29°) and gray (--ind); the district map owns teal (189°)
 * and amber (79°). That leaves green and violet, and green is disqualified on the
 * numbers: under protanopia a moss ramp lands ΔE 4.3 from the map's amber arm and
 * 9.4 from party red, because red-green-amber is precisely the axis red-green
 * color blindness destroys. Violet is the one free family left.
 *
 * Within violet, 300° is not a compromise between the two failure modes but the
 * point where both are avoided. Drift toward blue and the ramp reads as a
 * washed-out Democratic blue whatever the ΔE says. Drift toward magenta and it
 * collapses onto the map's teal under deuteranopia (ΔE 8.8 at 325°, 1.6 at 340°)
 * — and lands on the mauve at ~340° that American election maps use to mean "a
 * blend of the two parties", which on this page of all pages would be an active
 * misreading, and one this very section could invite: October 24 genuinely is a
 * mix of four Democrats and two Republicans. The perceptual math and the
 * political semantics happen to point at the same place. Every step here clears
 * ΔE 21 against all ten of those colors under normal, protanopic and deuteranopic
 * vision — worst case 21.0, the light step against the map's mid teal.
 *
 * Being a single hue with monotone lightness, the ramp does not depend on hue to
 * be read at all: the magnitude is carried by lightness, which survives every
 * form of color blindness intact.
 */
export const AGE_RAMP = [
  'var(--age-1)',
  'var(--age-2)',
  'var(--age-3)',
  'var(--age-4)',
  'var(--age-5)',
  'var(--age-6)',
] as const

/**
 * The fill for a day, or `null` for a day nobody was born on — the caller is
 * expected to draw that absence rather than shade it. Counts above the ramp take
 * its darkest step; at n=531 that is not currently reachable, but a ramp that
 * silently returned `undefined` past its end would be a trap for a later roster.
 */
export function ageFill(count: number): string | null {
  if (count <= 0) return null
  return AGE_RAMP[Math.min(count, AGE_RAMP.length) - 1]
}

// ── The calendar ─────────────────────────────────────────────────────────────

const pad = (n: number) => String(n).padStart(2, '0')

/** "10-24" → "October 24". */
export function formatMd(md: string): string {
  const [m, d] = md.split('-').map(Number)
  return `${MONTH_NAMES[m - 1]} ${d}`
}

/**
 * Expand the roster's 261 occupied days into all 366 dates, laid out as 12 rows
 * of 31 slots. A slot past the end of its month (February 30, April 31) is
 * `null` — not a date at all, and drawn as nothing. That is a different kind of
 * nothing from an empty date, which is a real day with a count of zero, and the
 * grid has to keep the two apart.
 */
export function buildCalendar(days: readonly BirthdayDay[]): BirthdayRow[] {
  const byMd = new Map(days.map((d) => [d.md, d]))
  return MONTH_NAMES.map((name, i) => {
    const month = i + 1
    const length = DAYS_IN_MONTH[i]
    const cells = Array.from({ length: CALENDAR_COLUMNS }, (_, j) => {
      const day = j + 1
      if (day > length) return null
      const md = `${pad(month)}-${pad(day)}`
      const members = byMd.get(md)?.members ?? []
      return { md, month, day, count: members.length, members }
    })
    return { month, name, cells }
  })
}

// ── Describing a day ─────────────────────────────────────────────────────────

const WORDS = [
  'zero',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
  'eleven',
  'twelve',
]

/** Newsroom convention: spell out small integers, leave the rest as figures. */
export function numberWord(n: number): string {
  return WORDS[n] ?? String(n)
}

/** "a", "a and b", "a, b, and c" — Oxford comma, to match the rest of the page. */
export function formatList(items: readonly string[]): string {
  if (items.length === 0) return ''
  if (items.length === 1) return items[0]
  if (items.length === 2) return `${items[0]} and ${items[1]}`
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`
}

type Naming = { order: readonly string[]; singular: Record<string, string>; plural: Record<string, string> }

const PARTY: Naming = {
  order: ['D', 'R', 'I'],
  singular: { D: 'Democrat', R: 'Republican', I: 'Independent' },
  plural: { D: 'Democrats', R: 'Republicans', I: 'Independents' },
}

const CHAMBER: Naming = {
  order: ['house', 'senate'],
  singular: { house: 'representative', senate: 'senator' },
  plural: { house: 'representatives', senate: 'senators' },
}

/**
 * Tally members by a key, largest group first, ties broken by the naming's own
 * canonical order so the sentence is stable from one build to the next.
 */
function tally(
  members: readonly BirthdayMember[],
  key: (m: BirthdayMember) => string,
  naming: Naming,
): { key: string; n: number }[] {
  const counts = new Map<string, number>()
  for (const m of members) counts.set(key(m), (counts.get(key(m)) ?? 0) + 1)
  return [...counts.entries()]
    .map(([k, n]) => ({ key: k, n }))
    .sort((a, b) => b.n - a.n || naming.order.indexOf(a.key) - naming.order.indexOf(b.key))
}

function describe(
  members: readonly BirthdayMember[],
  key: (m: BirthdayMember) => string,
  naming: Naming,
): string {
  return formatList(
    tally(members, key, naming).map(
      ({ key: k, n }) => `${numberWord(n)} ${n === 1 ? naming.singular[k] ?? k : naming.plural[k] ?? k}`,
    ),
  )
}

/** "four Democrats and two Republicans" — derived, so it cannot go stale. */
export function describeParties(members: readonly BirthdayMember[]): string {
  return describe(members, (m) => m.party, PARTY)
}

/** "four representatives and two senators". */
export function describeChambers(members: readonly BirthdayMember[]): string {
  return describe(members, (m) => m.chamber, CHAMBER)
}

export function partyTally(members: readonly BirthdayMember[]) {
  return tally(members, (m) => m.party, PARTY)
}

/** Oldest first — the order the caption reads them in. */
export function byBirthYear(members: readonly BirthdayMember[]): BirthdayMember[] {
  return [...members].sort((a, b) => a.birthYear - b.birthYear || a.name.localeCompare(b.name))
}

/**
 * The compact wire format the readout island reads back off each date.
 *
 * Deliberately not JSON: an attribute full of JSON is an attribute full of
 * quotes, and every one costs six characters as `&quot;` once it is serialized
 * into the HTML. Across 531 members that is the difference between ~14KB and
 * ~50KB of markup for the same facts. The delimiters are pinned as absent from
 * every member's name by a test, so a future roster cannot quietly break the
 * encoding by seating a member with a pipe in their name.
 */
export const MEMBER_FIELD_SEP = '|'
export const MEMBER_ENTRY_SEP = ';'

export function encodeMembers(members: readonly BirthdayMember[]): string {
  return members
    .map((m) =>
      [m.name, m.party, m.chamber === 'senate' ? 's' : 'h', m.birthYear].join(MEMBER_FIELD_SEP),
    )
    .join(MEMBER_ENTRY_SEP)
}

// ── Actual against chance ────────────────────────────────────────────────────

/**
 * How far an observed count runs ahead of (or behind) the uniform-random
 * baseline. `pct` is the share of the expectation, so +0.102 reads "10.2% more
 * collisions than chance would give you".
 */
export function excess(actual: number, expected: number) {
  return { actual, expected, delta: actual - expected, pct: (actual - expected) / expected }
}

/**
 * The baseline the data file ships, recomputed here so the Methodology can state
 * the formula and the tests can hold the pipeline to it.
 *
 * This is the textbook uniform model on a 365-day year: every birthday equally
 * likely, February 29 ignored. It is the convention the birthday paradox is
 * always quoted in, which is why the pipeline uses it — but the calendar drawn
 * above it has 366 dates, because one member really is a February 29 birthday.
 * `uniformBaseline(n, 366)` is the other convention; the section quotes both so
 * the excess cannot be an artifact of the choice.
 */
export function uniformBaseline(n: number, year = 365) {
  return {
    expectedSharingPairs: (n * (n - 1)) / 2 / year,
    expectedEmptyDays: year * Math.pow(1 - 1 / year, n),
  }
}
