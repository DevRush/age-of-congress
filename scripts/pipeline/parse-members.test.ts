import { describe, expect, it } from 'vitest'
import raw from './__fixtures__/members-fixture.json'
import { parseMembers, STATES_50 } from './parse-members'

describe('parseMembers', () => {
  const { members, excludedNoBirthday } = parseMembers(raw as any[])
  const by = (id: string) => members.find((m) => m.bioguide === id)!

  it('parses all six, excludes none (all have birthdays)', () => {
    expect(members).toHaveLength(6)
    expect(excludedNoBirthday).toEqual([])
  })
  it('derives chamber/party/state from the LAST term', () => {
    const alice = by('S000001')
    expect(alice.chamber).toBe('senate')
    expect(alice.party).toBe('R')
    expect(alice.state).toBe('IA')
    expect(alice.district).toBeUndefined()
  })
  it('first elected year = earliest term start; termsServed = term count', () => {
    expect(by('S000001').firstElectedYear).toBe(1975)
    expect(by('S000001').termsServed).toBe(2)
  })
  it('DC delegate is not voting; VT at-large (district 0) is voting', () => {
    expect(by('D000003').isVoting).toBe(false)
    expect(by('A000006').isVoting).toBe(true)
  })
  it('independent keeps caucus', () => {
    expect(by('I000004').party).toBe('I')
    expect(by('I000004').caucus).toBe('D')
  })
  it('falls back to first+last when official_full missing', () => {
    expect(by('N000005').name).toBe('Eve Newest')
  })
  it('excludes and reports members without birthday', () => {
    const mutated = structuredClone(raw) as any[]
    delete mutated[1].bio.birthday
    const r = parseMembers(mutated)
    expect(r.members).toHaveLength(5)
    expect(r.excludedNoBirthday).toEqual(['R000002'])
  })
  it('STATES_50 has exactly 50 entries and no territories', () => {
    expect(STATES_50.size).toBe(50)
    for (const t of ['DC', 'PR', 'GU', 'VI', 'AS', 'MP']) expect(STATES_50.has(t)).toBe(false)
  })
})
