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
  /**
   * Alice is the fixture's chamber-switcher: a House term from 1975, a Senate
   * term from 1981, and she sits in the Senate now. Both tenure figures are
   * lifetime totals that carry her House service across into her Senate row —
   * which is exactly why src/lib/tenure.ts refuses to let either be printed
   * under a chamber-specific label. Pin the semantics here: if these ever become
   * current-chamber figures (1 term, 1981), the label has to be rewritten too,
   * and this test is what forces that conversation.
   */
  it('firstTookOfficeYear/termsServed are LIFETIME totals that cross chambers', () => {
    const alice = by('S000001')
    expect(alice.chamber).toBe('senate')
    expect(alice.firstTookOfficeYear).toBe(1975) // her House arrival, not her Senate one (1981)
    expect(alice.termsServed).toBe(2) // both terms, not just the Senate one
  })
  it('firstTookOfficeYear is the term-start year, not the election year', () => {
    // The fixture's first term starts 1975-01-14 — the member won it in Nov 1974.
    expect(by('S000001').firstTookOfficeYear).toBe(1975)
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
