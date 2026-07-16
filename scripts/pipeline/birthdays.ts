import type { Chamber, Member, Party } from '../../src/lib/types'

/**
 * Shared birthdays: the birthday paradox, with Congress as the sample.
 *
 * Two numbers are deliberately kept side by side, and they disagree:
 *
 *   - `stats`    — what the roster ACTUALLY does.
 *   - `expected` — what a uniform-random birthday draw WOULD do at this n.
 *
 * The actual collisions run ahead of the uniform expectation, and so do the empty
 * days, because human births are not uniform: they cluster seasonally (late-summer
 * peak, holiday trough). Clustering concentrates people onto fewer days, which
 * simultaneously creates more shared birthdays and leaves more days bare. Do not
 * "fix" one of these to match the other — the gap between them is the finding.
 */

/** Calendar days a birthday can land on, Feb 29 included. Denominator for `emptyDays`. */
export const CALENDAR_DAYS = 366

/**
 * The uniform-random baseline is a 365-day model — the textbook birthday problem.
 * Feb 29 is a real birthday (we count it in `days`), but it is not a uniform-random
 * outcome, and folding it into the baseline would compare the roster against a model
 * nobody states. Actual = 366 basis, expected = 365 basis, by intent.
 */
export const UNIFORM_DAYS = 365

export interface BirthdayMember {
  bioguide: string
  name: string
  party: Party
  chamber: Chamber
  state: string
  birthYear: number
}

export interface BirthdayDay {
  /** "MM-DD" — year-free, so Feb 29 survives as its own day */
  md: string
  members: BirthdayMember[]
}

export interface BirthdayStats {
  totalMembers: number
  distinctDaysUsed: number
  /** CALENDAR_DAYS - distinctDaysUsed: days on which no voting member was born */
  emptyDays: number
  /** sum of C(count,2) — every unordered pair sharing a day */
  sharingPairs: number
  /** headcount on days holding 2 or more */
  membersSharing: number
  daysWith2plus: number
  daysWith3plus: number
  daysWith4plus: number
  daysWith5plus: number
  /** md is null only for an empty roster */
  maxDay: { md: string | null; count: number }
}

export interface BirthdayExpected {
  /** 365 * (1 - 1/365)^n — days no one lands on, under a uniform draw */
  expectedEmptyDays: number
  /** n*(n-1)/2 / 365 — pairs sharing a day, under a uniform draw */
  expectedSharingPairs: number
}

export interface BirthdaySummary {
  days: BirthdayDay[]
  stats: BirthdayStats
  expected: BirthdayExpected
}

function gate(cond: boolean, msg: string): void {
  if (!cond) throw new Error(`GATE FAILED: ${msg}`)
}

/** Unordered pairs within a group of `n`. Guarded below 2 so n=0 yields 0, not -0. */
const pairs = (n: number) => (n < 2 ? 0 : (n * (n - 1)) / 2)

export function expectedBaseline(n: number): BirthdayExpected {
  return {
    expectedEmptyDays: UNIFORM_DAYS * (1 - 1 / UNIFORM_DAYS) ** n,
    expectedSharingPairs: pairs(n) / UNIFORM_DAYS,
  }
}

const toBirthdayMember = (m: Member): BirthdayMember => ({
  bioguide: m.bioguide,
  name: m.name,
  party: m.party,
  chamber: m.chamber,
  state: m.state,
  birthYear: Number(m.birthday.slice(0, 4)),
})

/**
 * Group the voting roster onto the calendar. Non-voting members (the five delegates
 * and the resident commissioner) are excluded to match every other figure on the site.
 */
export function computeBirthdays(members: readonly Member[]): BirthdaySummary {
  const voting = members.filter((m) => m.isVoting)

  const byMd = new Map<string, BirthdayMember[]>()
  for (const m of voting) {
    const md = m.birthday.slice(5, 10) // "YYYY-MM-DD" -> "MM-DD"
    if (!/^\d{2}-\d{2}$/.test(md)) {
      throw new Error(`GATE FAILED: unparseable birthday "${m.birthday}" for ${m.bioguide}`)
    }
    const bucket = byMd.get(md)
    if (bucket) bucket.push(toBirthdayMember(m))
    else byMd.set(md, [toBirthdayMember(m)])
  }

  const days: BirthdayDay[] = [...byMd.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([md, list]) => ({
      md,
      // stable within a day so the daily cron's JSON diff stays quiet
      members: list.sort((a, b) => a.name.localeCompare(b.name) || a.bioguide.localeCompare(b.bioguide)),
    }))

  const counts = days.map((d) => d.members.length)
  const atLeast = (k: number) => counts.filter((c) => c >= k).length
  // days are md-sorted, so the first max encountered is the earliest md — ties break early
  const maxCount = counts.length ? Math.max(...counts) : 0
  const maxMd = counts.length ? days[counts.indexOf(maxCount)].md : null

  const stats: BirthdayStats = {
    totalMembers: voting.length,
    distinctDaysUsed: days.length,
    emptyDays: CALENDAR_DAYS - days.length,
    sharingPairs: counts.reduce((a, c) => a + pairs(c), 0),
    membersSharing: counts.filter((c) => c >= 2).reduce((a, c) => a + c, 0),
    daysWith2plus: atLeast(2),
    daysWith3plus: atLeast(3),
    daysWith4plus: atLeast(4),
    daysWith5plus: atLeast(5),
    maxDay: { md: maxMd, count: maxCount },
  }

  return { days, stats, expected: expectedBaseline(voting.length) }
}

/**
 * Hard gates. A roster shift may legitimately move every number here, but it must
 * never break the arithmetic: the calendar is a partition of the voting roster.
 */
export function assertBirthdaySummary(summary: BirthdaySummary, members: readonly Member[]): void {
  const { days, stats } = summary
  const votingCount = members.filter((m) => m.isVoting).length

  gate(
    stats.totalMembers === votingCount,
    `birthdays totalMembers ${stats.totalMembers} != voting roster ${votingCount}`,
  )

  const seen = new Map<string, number>()
  for (const d of days) for (const m of d.members) seen.set(m.bioguide, (seen.get(m.bioguide) ?? 0) + 1)

  const duplicated = [...seen].filter(([, n]) => n > 1).map(([b, n]) => `${b}×${n}`)
  gate(duplicated.length === 0, `member(s) appear more than once across days: ${duplicated.join(', ')}`)

  const missing = members.filter((m) => m.isVoting && !seen.has(m.bioguide)).map((m) => m.bioguide)
  gate(missing.length === 0, `voting member(s) missing from the calendar: ${missing.join(', ')}`)
  gate(seen.size === votingCount, `calendar holds ${seen.size} distinct members, roster has ${votingCount}`)

  const summed = days.reduce((a, d) => a + d.members.length, 0)
  gate(summed === stats.totalMembers, `per-day counts sum to ${summed}, totalMembers says ${stats.totalMembers}`)

  gate(
    stats.distinctDaysUsed === days.length,
    `distinctDaysUsed ${stats.distinctDaysUsed} != ${days.length} emitted days`,
  )
  gate(stats.distinctDaysUsed <= CALENDAR_DAYS, `distinctDaysUsed ${stats.distinctDaysUsed} exceeds ${CALENDAR_DAYS}`)
  gate(stats.emptyDays === CALENDAR_DAYS - stats.distinctDaysUsed, `emptyDays ${stats.emptyDays} is not the ${CALENDAR_DAYS}-day remainder`)
  gate(stats.sharingPairs >= 0, `sharingPairs ${stats.sharingPairs} is negative`)
  gate(stats.membersSharing <= stats.totalMembers, `membersSharing ${stats.membersSharing} exceeds totalMembers ${stats.totalMembers}`)
  gate(stats.maxDay.count <= stats.totalMembers, `maxDay count ${stats.maxDay.count} exceeds totalMembers`)
}
