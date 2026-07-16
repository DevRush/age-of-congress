import { describe, expect, it } from 'vitest'
import {
  CALENDAR_DAYS,
  UNIFORM_DAYS,
  assertBirthdaySummary,
  computeBirthdays,
  expectedBaseline,
} from './birthdays'
import type { Member } from '../../src/lib/types'
import { dobToMs } from '../../src/lib/age'

// ---- fixture helpers -------------------------------------------------------

let seq = 0
const member = (birthday: string, over: Partial<Member> = {}): Member => {
  seq += 1
  return {
    bioguide: `X${String(seq).padStart(5, '0')}`,
    name: `Member ${seq}`,
    party: 'D',
    chamber: 'house',
    state: 'CA',
    district: 1,
    birthday,
    dobMs: dobToMs(birthday),
    firstTookOfficeYear: 2000,
    termsServed: 1,
    isVoting: true,
    ...over,
  }
}

/** n voting members all born on distinct days, to drive the stats arithmetic. */
const distinctDays = (n: number): Member[] =>
  Array.from({ length: n }, (_, i) => {
    const day = String((i % 28) + 1).padStart(2, '0')
    const month = String(Math.floor(i / 28) + 1).padStart(2, '0')
    return member(`19${50 + (i % 40)}-${month}-${day}`)
  })

// ---- grouping --------------------------------------------------------------

describe('computeBirthdays — days', () => {
  it('groups voting members by MM-DD and sorts by md', () => {
    const { days } = computeBirthdays([
      member('1970-12-25'),
      member('1955-03-04'),
      member('1980-03-04'),
    ])
    expect(days.map((d) => d.md)).toEqual(['03-04', '12-25'])
    expect(days[0].members).toHaveLength(2)
    expect(days[1].members).toHaveLength(1)
  })

  it('projects only the fields the calendar needs, with birthYear as a number', () => {
    const { days } = computeBirthdays([
      member('1962-07-04', { bioguide: 'A000001', name: 'Ada Rep', party: 'R', chamber: 'senate', state: 'TX' }),
    ])
    expect(days[0].members[0]).toEqual({
      bioguide: 'A000001',
      name: 'Ada Rep',
      party: 'R',
      chamber: 'senate',
      state: 'TX',
      birthYear: 1962,
    })
  })

  it('keeps Feb 29 as its own day', () => {
    const { days, stats } = computeBirthdays([member('1960-02-29'), member('1948-02-28')])
    expect(days.map((d) => d.md)).toEqual(['02-28', '02-29'])
    expect(stats.distinctDaysUsed).toBe(2)
  })

  it('excludes non-voting members (delegates, resident commissioner)', () => {
    const { stats } = computeBirthdays([
      member('1970-05-05'),
      member('1970-05-05', { isVoting: false, state: 'DC' }),
    ])
    expect(stats.totalMembers).toBe(1)
    expect(stats.sharingPairs).toBe(0)
  })

  it('omits calendar days nobody was born on', () => {
    const { days } = computeBirthdays([member('1970-01-01')])
    expect(days).toHaveLength(1)
    expect(days[0].md).toBe('01-01')
  })

  it('orders members within a day deterministically by name', () => {
    const { days } = computeBirthdays([
      member('1970-06-06', { name: 'Zoe Last' }),
      member('1971-06-06', { name: 'Al First' }),
    ])
    expect(days[0].members.map((m) => m.name)).toEqual(['Al First', 'Zoe Last'])
  })
})

// ---- stats -----------------------------------------------------------------

describe('computeBirthdays — stats', () => {
  it('counts distinct days used and the empty remainder out of 366', () => {
    const { stats } = computeBirthdays(distinctDays(10))
    expect(stats.distinctDaysUsed).toBe(10)
    expect(stats.emptyDays).toBe(CALENDAR_DAYS - 10)
    expect(CALENDAR_DAYS).toBe(366)
  })

  it('counts sharing pairs as the sum of C(count,2) over days', () => {
    // one day of 3 -> 3 pairs, one day of 2 -> 1 pair, one loner -> 0
    const { stats } = computeBirthdays([
      member('1970-04-01'), member('1971-04-01'), member('1972-04-01'),
      member('1970-08-08'), member('1981-08-08'),
      member('1990-09-09'),
    ])
    expect(stats.sharingPairs).toBe(4)
    expect(stats.membersSharing).toBe(5)
    expect(stats.totalMembers).toBe(6)
  })

  it('counts the ≥N buckets cumulatively', () => {
    const { stats } = computeBirthdays([
      // a day of 4
      member('1970-01-02'), member('1971-01-02'), member('1972-01-02'), member('1973-01-02'),
      // a day of 2
      member('1970-02-03'), member('1971-02-03'),
      // a loner
      member('1970-03-04'),
    ])
    expect(stats.daysWith2plus).toBe(2)
    expect(stats.daysWith3plus).toBe(1)
    expect(stats.daysWith4plus).toBe(1)
    expect(stats.daysWith5plus).toBe(0)
  })

  it('reports the busiest day, breaking ties by earliest md', () => {
    const { stats } = computeBirthdays([
      member('1970-10-24'), member('1971-10-24'), member('1972-10-24'),
      member('1970-05-05'), member('1971-05-05'), member('1972-05-05'),
      member('1970-01-01'),
    ])
    expect(stats.maxDay).toEqual({ md: '05-05', count: 3 })
  })

  it('is empty-safe', () => {
    const { days, stats } = computeBirthdays([])
    expect(days).toEqual([])
    expect(stats.totalMembers).toBe(0)
    expect(stats.distinctDaysUsed).toBe(0)
    expect(stats.emptyDays).toBe(366)
    expect(stats.sharingPairs).toBe(0)
    expect(stats.maxDay).toEqual({ md: null, count: 0 })
  })

  it('keeps the per-day counts summing to totalMembers', () => {
    const members = distinctDays(40)
    const { days, stats } = computeBirthdays(members)
    expect(days.reduce((a, d) => a + d.members.length, 0)).toBe(stats.totalMembers)
    expect(stats.totalMembers).toBe(40)
  })
})

// ---- the uniform-random baseline ------------------------------------------

describe('expectedBaseline', () => {
  it('computes the classic empty-day and collision expectations for n', () => {
    const e = expectedBaseline(530)
    expect(e.expectedEmptyDays).toBeCloseTo(365 * (1 - 1 / 365) ** 530, 9)
    expect(e.expectedSharingPairs).toBeCloseTo((530 * 529) / 2 / 365, 9)
    // the real roster's neighbourhood — a sanity anchor, not a hardcode
    expect(e.expectedEmptyDays).toBeCloseTo(85.3, 1)
    expect(e.expectedSharingPairs).toBeCloseTo(384.1, 1)
  })

  it('uses a 365-day uniform basis (Feb 29 is not a uniform-random day)', () => {
    expect(UNIFORM_DAYS).toBe(365)
    expect(expectedBaseline(0)).toEqual({ expectedEmptyDays: 365, expectedSharingPairs: 0 })
  })

  it('grows collisions quadratically: 23 people ≈ the 50% birthday-paradox point', () => {
    // 23*22/2/365 = 0.693 expected pairs -> P(no shared) = e^-0.693 ≈ 0.5
    expect(expectedBaseline(23).expectedSharingPairs).toBeCloseTo(0.693, 3)
  })

  it('is exposed on the summary for the given roster', () => {
    const { expected } = computeBirthdays(distinctDays(30))
    expect(expected.expectedSharingPairs).toBeCloseTo((30 * 29) / 2 / 365, 9)
  })
})

// ---- gates -----------------------------------------------------------------

describe('assertBirthdaySummary', () => {
  const voting = () => distinctDays(12)

  it('passes a well-formed summary', () => {
    const members = voting()
    expect(() => assertBirthdaySummary(computeBirthdays(members), members)).not.toThrow()
  })

  it('fails when totalMembers disagrees with the roster count', () => {
    const members = voting()
    const s = computeBirthdays(members)
    s.stats.totalMembers = 11
    expect(() => assertBirthdaySummary(s, members)).toThrow(/GATE FAILED.*totalMembers/s)
  })

  it('fails when a member is missing from days', () => {
    const members = voting()
    const s = computeBirthdays(members)
    s.days[0].members = []
    expect(() => assertBirthdaySummary(s, members)).toThrow(/GATE FAILED/)
  })

  it('fails when a member appears twice across days', () => {
    const members = voting()
    const s = computeBirthdays(members)
    s.days[1].members = [...s.days[1].members, s.days[0].members[0]]
    expect(() => assertBirthdaySummary(s, members)).toThrow(/GATE FAILED.*(twice|once|duplicate)/s)
  })

  it('fails when distinctDaysUsed is not the number of days emitted', () => {
    const members = voting()
    const s = computeBirthdays(members)
    s.stats.distinctDaysUsed = 367
    expect(() => assertBirthdaySummary(s, members)).toThrow(/GATE FAILED.*distinctDaysUsed/s)
  })

  it('fails when emptyDays is not the 366-day remainder', () => {
    const members = voting()
    const s = computeBirthdays(members)
    s.stats.emptyDays = 300
    expect(() => assertBirthdaySummary(s, members)).toThrow(/GATE FAILED.*emptyDays/s)
  })

  it('fails when sharingPairs is negative', () => {
    const members = voting()
    const s = computeBirthdays(members)
    s.stats.sharingPairs = -1
    expect(() => assertBirthdaySummary(s, members)).toThrow(/GATE FAILED.*sharingPairs/s)
  })

  it('fails when the per-day counts do not sum to totalMembers', () => {
    const members = voting()
    const s = computeBirthdays(members)
    s.days[0].members = [...s.days[0].members, s.days[0].members[0]]
    s.stats.totalMembers = 13
    expect(() => assertBirthdaySummary(s, members.concat())).toThrow(/GATE FAILED/)
  })

  it('ignores non-voting members when checking the roster count', () => {
    const members = [...voting(), member('1970-07-07', { isVoting: false, state: 'PR' })]
    expect(() => assertBirthdaySummary(computeBirthdays(members), members)).not.toThrow()
  })
})
