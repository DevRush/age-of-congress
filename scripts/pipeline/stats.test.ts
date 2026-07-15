import { describe, expect, it } from 'vitest'
import raw from './__fixtures__/members-fixture.json'
import { parseMembers } from './parse-members'
import { chamberStats, overallStats, rankOldest, rankYoungest, withRanks } from './stats'
import { dobToMs } from '../../src/lib/age'

const { members } = parseMembers(raw as any[])

describe('stats', () => {
  it('chamber stats use voting members only', () => {
    const senate = chamberStats(members, 'senate')
    expect(senate.count).toBe(2) // Alice + Dan
    expect(senate.seats).toBe(100)
    const house = chamberStats(members, 'house')
    expect(house.count).toBe(3) // Bob, Eve, Frank — Carol (DC) excluded
    expect(house.seats).toBe(435)
  })
  it('overall = senate + voting house, seats 535', () => {
    const o = overallStats(members)
    expect(o.count).toBe(5)
    expect(o.seats).toBe(535)
  })
  it('rankOldest sorts ascending dob; rankYoungest descending', () => {
    expect(rankOldest(members, 'house', 3).map((m) => m.bioguide)).toEqual(['A000006', 'N000005', 'R000002'])
    expect(rankYoungest(members, 'house', 3).map((m) => m.bioguide)).toEqual(['R000002', 'N000005', 'A000006'])
  })
  it('withRanks shares rank on identical birthdays', () => {
    const twins = [
      { ...members[0], bioguide: 'X1', dobMs: dobToMs('1950-01-01') },
      { ...members[0], bioguide: 'X2', dobMs: dobToMs('1950-01-01') },
      { ...members[0], bioguide: 'X3', dobMs: dobToMs('1960-01-01') },
    ]
    expect(withRanks(twins).map((m) => m.rank)).toEqual([1, 1, 3])
  })
})
