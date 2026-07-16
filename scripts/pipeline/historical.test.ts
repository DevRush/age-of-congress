import { describe, expect, it } from 'vitest'
import { ageYears, dobToMs } from '../../src/lib/age'
import raw from './__fixtures__/historical-fixture.json'
import { computeHistorical, congressNumber, conveningDate, flattenTerms } from './historical'

describe('convening dates', () => {
  it('March 4 through the 73rd, January 3 from the 74th', () => {
    expect(conveningDate(1)).toBe('1789-03-04')
    expect(conveningDate(73)).toBe('1933-03-04')
    expect(conveningDate(74)).toBe('1935-01-03')
    expect(conveningDate(119)).toBe('2025-01-03')
  })
  it('congressNumber', () => {
    expect(congressNumber('2026-07-14')).toBe(119)
    expect(congressNumber('1933-02-01')).toBe(72)
    expect(congressNumber('1935-01-03')).toBe(74)
    expect(congressNumber('1789-03-04')).toBe(1)
  })
})

describe('computeHistorical', () => {
  const points = computeHistorical(flattenTerms(raw as any[]), '1795-01-01')
  const at = (n: number) => points.find((p) => p.congress === n)!

  it('covers congresses 1..current', () => {
    expect(points.map((p) => p.congress)).toEqual([1, 2, 3])
  })
  it('1st Congress: two reps (one seated late) ~36.4, one senator ~49.7, one missing birthday', () => {
    expect(at(1).houseN).toBe(2)
    expect(at(1).senateN).toBe(1)
    expect(at(1).missingBirthday).toBe(1)
    expect(at(1).houseMean!).toBeCloseTo(36.4, 1)
    expect(at(1).senateMean!).toBeCloseTo(49.7, 1)
    expect(at(1).birthdayCoverage).toBeCloseTo(3 / 4, 5)
  })
  it('counts a representative first seated after the constitutional convening (H000004)', () => {
    // guards the "term seated after constitutional convening" overlap bug
    const lateOnly = (raw as any[]).filter((p) => p.id.bioguide === 'H000004')
    const p1 = computeHistorical(flattenTerms(lateOnly), '1795-01-01').find((p) => p.congress === 1)!
    expect(p1.houseN).toBe(1)
  })
  it('2nd Congress: rep terms ended 1791-03-03, senator continues', () => {
    expect(at(2).houseN).toBe(0)
    expect(at(2).houseMean).toBeNull()
    expect(at(2).senateN).toBe(1)
  })
  it('counts each person once per congress even with duplicate terms', () => {
    const dup = flattenTerms(raw as any[])
    dup.push({ ...dup.find((t) => t.pid === 'H000003')! })
    expect(computeHistorical(dup, '1795-01-01').find((p) => p.congress === 1)!.senateN).toBe(1)
  })
  it('counts a seat once when its member is replaced mid-Congress (death + replacement)', () => {
    // The core bug: deduping by PERSON let a member who left mid-term AND the
    // replacement who filled the seat both count. Deduping by SEAT counts the
    // seat once — and the member sitting on the convening date (here the older
    // incumbent) represents it, so the younger replacement never pulls the
    // average down. Both hold Delaware's single district-1 seat this Congress.
    const people = [
      {
        id: { bioguide: 'X000001' },
        bio: { birthday: '1740-01-01' },
        terms: [{ type: 'rep', start: '1789-03-04', end: '1790-06-01', state: 'DE', district: 1 }],
      },
      {
        id: { bioguide: 'X000002' },
        bio: { birthday: '1765-01-01' },
        terms: [{ type: 'rep', start: '1790-07-01', end: '1791-03-03', state: 'DE', district: 1 }],
      },
    ]
    const p1 = computeHistorical(flattenTerms(people), '1795-01-01').find((p) => p.congress === 1)!
    expect(p1.houseN).toBe(1)
    expect(p1.houseMean!).toBeCloseTo(ageYears(dobToMs('1740-01-01'), dobToMs('1789-03-04')), 5)
  })
})
