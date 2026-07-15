import { describe, expect, it } from 'vitest'
import { buildSparql, extractDobs, verifyBirthdays } from './wikidata'

const binding = (id: string, date: string, precision: number, rank = 'NormalRank') => ({
  bioguide: { value: id },
  dob: { value: `${date}T00:00:00Z` },
  precision: { value: String(precision) },
  rank: { value: `http://wikiba.se/ontology#${rank}` },
})
const resp = (bindings: any[]) => ({ results: { bindings } })

describe('wikidata verification', () => {
  it('builds a single VALUES query containing every id', () => {
    const q = buildSparql(['G000386', 'P000197'])
    expect(q).toContain('"G000386" "P000197"')
    expect(q).toContain('wdt:P1157')
    expect(q).toContain('psv:P569')
  })
  it('drops deprecated, prefers preferred, dedupes', () => {
    const m = extractDobs(resp([
      binding('A1', '1950-01-01', 11, 'DeprecatedRank'),
      binding('A1', '1951-02-02', 11, 'PreferredRank'),
      binding('A1', '1952-03-03', 11, 'NormalRank'),
      binding('A1', '1951-02-02', 11, 'PreferredRank'),
    ]))
    expect(m.get('A1')).toEqual([{ date: '1951-02-02', precision: 11, rank: 'PreferredRank' }])
  })
  it('verifies day precision exactly, year precision by year', () => {
    const dobs = extractDobs(resp([binding('A1', '1950-06-15', 11), binding('A2', '1960-01-01', 9)]))
    const errs = verifyBirthdays(
      [
        { bioguide: 'A1', name: 'A One', birthday: '1950-06-15' },
        { bioguide: 'A2', name: 'A Two', birthday: '1960-09-30' },
      ],
      dobs,
    )
    expect(errs).toEqual([])
  })
  it('reports mismatches, missing entries, and ambiguity', () => {
    const dobs = extractDobs(resp([
      binding('A1', '1950-06-16', 11),
      binding('A3', '1970-01-01', 11),
      binding('A3', '1971-01-01', 11),
    ]))
    const errs = verifyBirthdays(
      [
        { bioguide: 'A1', name: 'A One', birthday: '1950-06-15' },
        { bioguide: 'A2', name: 'A Two', birthday: '1960-09-30' },
        { bioguide: 'A3', name: 'A Three', birthday: '1970-01-01' },
      ],
      dobs,
    )
    expect(errs).toHaveLength(3)
    expect(errs[0]).toContain('1950-06-16')
    expect(errs[1]).toContain('not found')
    expect(errs[2]).toContain('multiple')
  })
})
