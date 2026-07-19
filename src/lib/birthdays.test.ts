import { describe, expect, it } from 'vitest'
import data from '@/data/birthdays.json'
import {
  AGE_RAMP,
  CALENDAR_DAYS,
  DAYS_IN_MONTH,
  MEMBER_ENTRY_SEP,
  MEMBER_FIELD_SEP,
  ageFill,
  buildCalendar,
  byBirthYear,
  encodeMembers,
  describeChambers,
  describeParties,
  excess,
  formatList,
  formatMd,
  numberWord,
  partyTally,
  uniformBaseline,
} from './birthdays'
import type { BirthdayDay, BirthdayMember } from './birthdays'

const days = data.days as BirthdayDay[]
const stats = data.stats

const member = (over: Partial<BirthdayMember> = {}): BirthdayMember => ({
  bioguide: 'X000001',
  name: 'A Member',
  party: 'D',
  chamber: 'house',
  state: 'CA',
  birthYear: 1960,
  ...over,
})

describe('the calendar', () => {
  it('is 366 dates — a birthday can fall on February 29', () => {
    expect(CALENDAR_DAYS).toBe(366)
    expect(DAYS_IN_MONTH[1]).toBe(29)
  })

  it('lays out 12 months of 31 slots, nulling the ones that are not dates', () => {
    const rows = buildCalendar(days)
    expect(rows.length).toBe(12)
    for (const row of rows) expect(row.cells.length).toBe(31)

    const real = rows.flatMap((r) => r.cells).filter((c) => c !== null)
    expect(real.length).toBe(366)

    // The six slots that are not days: Feb 30/31, and the 31st of Apr/Jun/Sep/Nov.
    const holes = rows.flatMap((r) => r.cells).filter((c) => c === null)
    expect(holes.length).toBe(31 * 12 - 366)
    expect(holes.length).toBe(6)

    const feb = rows[1]
    expect(feb.cells[28]).not.toBeNull() // February 29 is a date
    expect(feb.cells[29]).toBeNull() // February 30 is not
    expect(feb.cells[30]).toBeNull()
    for (const m of [3, 5, 8, 10]) expect(rows[m].cells[30]).toBeNull() // Apr/Jun/Sep/Nov 31
  })

  it('keeps February 29 populated rather than dropping it', () => {
    const feb29 = buildCalendar(days)[1].cells[28]
    expect(feb29?.md).toBe('02-29')
    expect(feb29?.count).toBeGreaterThan(0)
  })

  // ── Cross-checks against the pipeline's own stats. These move with the daily
  //    cron rather than freezing today's numbers, and they fail loudly if the
  //    calendar this module rebuilds ever disagrees with the file it rebuilt it
  //    from — which is the one bug that would be invisible on the page.
  it('accounts for every member exactly once', () => {
    const total = buildCalendar(days)
      .flatMap((r) => r.cells)
      .reduce((a, c) => a + (c?.count ?? 0), 0)
    expect(total).toBe(stats.totalMembers)
  })

  it('reconstructs the empty days the data file never ships', () => {
    const cells = buildCalendar(days).flatMap((r) => r.cells)
    const empty = cells.filter((c) => c !== null && c.count === 0)
    const used = cells.filter((c) => c !== null && c.count > 0)
    expect(empty.length).toBe(stats.emptyDays)
    expect(used.length).toBe(stats.distinctDaysUsed)
    expect(empty.length + used.length).toBe(366)
    // The file carries only the occupied days; the emptiness is derived.
    expect(days.length).toBe(stats.distinctDaysUsed)
  })

  it('agrees with the reported busiest day', () => {
    const cells = buildCalendar(days).flatMap((r) => r.cells)
    const max = Math.max(...cells.map((c) => c?.count ?? 0))
    expect(max).toBe(stats.maxDay.count)
    const peaks = cells.filter((c) => c?.count === max)
    expect(peaks.map((c) => c?.md)).toEqual([stats.maxDay.md])
  })

  it('agrees with the reported sharing counts', () => {
    const counts = buildCalendar(days)
      .flatMap((r) => r.cells)
      .map((c) => c?.count ?? 0)
    // A sharing pair is any two members on the same date: sum of C(n,2).
    const pairs = counts.reduce((a, n) => a + (n * (n - 1)) / 2, 0)
    expect(pairs).toBe(stats.sharingPairs)
    const sharing = counts.filter((n) => n >= 2).reduce((a, n) => a + n, 0)
    expect(sharing).toBe(stats.membersSharing)
    expect(counts.filter((n) => n >= 2).length).toBe(stats.daysWith2plus)
    expect(counts.filter((n) => n >= 3).length).toBe(stats.daysWith3plus)
    expect(counts.filter((n) => n >= 4).length).toBe(stats.daysWith4plus)
    expect(counts.filter((n) => n >= 5).length).toBe(stats.daysWith5plus)
  })
})

describe('ageFill', () => {
  it('refuses to shade a day nobody was born on', () => {
    expect(ageFill(0)).toBeNull()
    expect(ageFill(-1)).toBeNull()
  })

  it('starts the ramp at one member and deepens from there', () => {
    expect(ageFill(1)).toBe(AGE_RAMP[0])
    expect(ageFill(6)).toBe(AGE_RAMP[5])
    const fills = [1, 2, 3, 4, 5, 6].map(ageFill)
    expect(new Set(fills).size).toBe(6)
  })

  it('clamps past the end of the ramp rather than returning nothing', () => {
    expect(ageFill(7)).toBe(AGE_RAMP[AGE_RAMP.length - 1])
    expect(ageFill(99)).toBe(AGE_RAMP[AGE_RAMP.length - 1])
  })

  it('covers the range the roster actually reaches', () => {
    expect(AGE_RAMP.length).toBeGreaterThanOrEqual(stats.maxDay.count)
  })
})

describe('formatMd', () => {
  it('reads a month-day key as prose', () => {
    expect(formatMd('10-24')).toBe('October 24')
    expect(formatMd('01-01')).toBe('January 1')
    expect(formatMd('02-29')).toBe('February 29')
    expect(formatMd('12-31')).toBe('December 31')
  })
})

describe('formatList', () => {
  it('sets lists the way the page sets them', () => {
    expect(formatList([])).toBe('')
    expect(formatList(['a'])).toBe('a')
    expect(formatList(['a', 'b'])).toBe('a and b')
    expect(formatList(['a', 'b', 'c'])).toBe('a, b, and c')
  })
})

describe('numberWord', () => {
  it('spells out small integers and leaves the rest as figures', () => {
    expect(numberWord(1)).toBe('one')
    expect(numberWord(6)).toBe('six')
    expect(numberWord(12)).toBe('twelve')
    expect(numberWord(13)).toBe('13')
  })
})

describe('describeParties / describeChambers', () => {
  it('names the largest group first', () => {
    const ms = [
      member({ party: 'R' }),
      member({ party: 'D' }),
      member({ party: 'D' }),
      member({ party: 'D' }),
    ]
    expect(describeParties(ms)).toBe('three Democrats and one Republican')
  })

  it('singularizes a group of one', () => {
    expect(describeParties([member({ party: 'I' })])).toBe('one Independent')
    expect(describeChambers([member({ chamber: 'senate' })])).toBe('one senator')
  })

  it('breaks ties in a stable, canonical order', () => {
    const ms = [member({ party: 'R' }), member({ party: 'D' })]
    expect(describeParties(ms)).toBe('one Democrat and one Republican')
    // Same tally, opposite input order — the sentence must not move.
    expect(describeParties([...ms].reverse())).toBe('one Democrat and one Republican')
  })

  it('describes chambers', () => {
    const ms = [
      member({ chamber: 'senate' }),
      member({ chamber: 'house' }),
      member({ chamber: 'house' }),
    ]
    expect(describeChambers(ms)).toBe('two representatives and one senator')
  })

  /**
   * The caption's one hard claim, pinned to the data rather than to a memory of
   * it: the busiest day's split is whatever the file says it is. Reported as 3/3
   * in an early draft; it is not.
   */
  it('derives the busiest day from the data, never from a hardcoded split', () => {
    const peak = days.find((d) => d.md === stats.maxDay.md)!
    expect(peak.members.length).toBe(stats.maxDay.count)
    const tally = partyTally(peak.members)
    const total = tally.reduce((a, t) => a + t.n, 0)
    expect(total).toBe(stats.maxDay.count)
    // Whatever the split is, the prose and the tally cannot disagree.
    const described = describeParties(peak.members)
    for (const { key, n } of tally) {
      expect(described).toContain(numberWord(n))
      expect(described.toLowerCase()).toContain(
        { D: 'democrat', R: 'republican', I: 'independent' }[key as 'D' | 'R' | 'I'],
      )
    }
  })
})

describe('encodeMembers', () => {
  it('packs a date into the readout wire format', () => {
    expect(
      encodeMembers([
        member({ name: 'Jeff Merkley', party: 'D', chamber: 'senate', birthYear: 1956 }),
        member({ name: 'Vince Fong', party: 'R', chamber: 'house', birthYear: 1979 }),
      ]),
    ).toBe('Jeff Merkley|D|s|1956;Vince Fong|R|h|1979')
  })

  it('encodes an empty day as an empty string', () => {
    expect(encodeMembers([])).toBe('')
  })

  /**
   * The encoding has no escape hatch, so its safety is a property of the roster
   * rather than of the code. Pin it: a member seated tomorrow with a pipe in
   * their name would silently split into gibberish in the readout.
   */
  it('is safe for every name on the current roster', () => {
    const names = days.flatMap((d) => d.members.map((m) => m.name))
    expect(names.length).toBe(stats.totalMembers)
    for (const name of names) {
      expect(name).not.toContain(MEMBER_FIELD_SEP)
      expect(name).not.toContain(MEMBER_ENTRY_SEP)
    }
  })

  it('round-trips the busiest day', () => {
    const peak = days.find((d) => d.md === stats.maxDay.md)!
    const decoded = encodeMembers(peak.members).split(MEMBER_ENTRY_SEP)
    expect(decoded.length).toBe(peak.members.length)
    expect(decoded[0].split(MEMBER_FIELD_SEP).length).toBe(4)
  })
})

describe('byBirthYear', () => {
  it('runs oldest first and does not mutate its input', () => {
    const ms = [member({ birthYear: 1979 }), member({ birthYear: 1948 }), member({ birthYear: 1956 })]
    const copy = [...ms]
    expect(byBirthYear(ms).map((m) => m.birthYear)).toEqual([1948, 1956, 1979])
    expect(ms).toEqual(copy)
  })

  it('breaks a shared birth year by name, so the order is stable', () => {
    const ms = [member({ birthYear: 1954, name: 'Zed' }), member({ birthYear: 1954, name: 'Abe' })]
    expect(byBirthYear(ms).map((m) => m.name)).toEqual(['Abe', 'Zed'])
  })
})

describe('excess', () => {
  it('reports the gap between what happened and what chance predicts', () => {
    const e = excess(105, 84)
    expect(e.delta).toBe(21)
    expect(e.pct).toBeCloseTo(0.25, 10)
  })

  it('signs a shortfall negative', () => {
    expect(excess(80, 100).pct).toBeCloseTo(-0.2, 10)
  })
})

describe('uniformBaseline', () => {
  it('reproduces the baseline the data file ships', () => {
    const b = uniformBaseline(stats.totalMembers)
    expect(b.expectedSharingPairs).toBeCloseTo(data.expected.expectedSharingPairs, 9)
    expect(b.expectedEmptyDays).toBeCloseTo(data.expected.expectedEmptyDays, 9)
  })

  it('is the textbook 365-day model: C(n,2)/365 and 365·(1−1/365)^n', () => {
    const n = 23 // the birthday paradox's own headline number
    const b = uniformBaseline(n)
    expect(b.expectedSharingPairs).toBeCloseTo((23 * 22) / 2 / 365, 12)
    expect(b.expectedEmptyDays).toBeCloseTo(365 * Math.pow(364 / 365, 23), 12)
  })

  /**
   * The section quotes both conventions. The finding is that Congress runs ahead
   * of chance on collisions AND on empty days at once; if that flipped depending
   * on whether the baseline counted February 29, it would not be a finding.
   */
  it('holds the excess under either year convention', () => {
    for (const year of [365, 366]) {
      const b = uniformBaseline(stats.totalMembers, year)
      expect(stats.sharingPairs).toBeGreaterThan(b.expectedSharingPairs)
      expect(stats.emptyDays).toBeGreaterThan(b.expectedEmptyDays)
    }
  })
})
