import { describe, expect, it } from 'vitest'
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
  it('1st Congress: one rep aged ~39.2, one senator ~49.7, one missing birthday', () => {
    expect(at(1).houseN).toBe(1)
    expect(at(1).senateN).toBe(1)
    expect(at(1).missingBirthday).toBe(1)
    expect(at(1).houseMean!).toBeCloseTo(39.2, 1)
    expect(at(1).senateMean!).toBeCloseTo(49.7, 1)
    expect(at(1).birthdayCoverage).toBeCloseTo(2 / 3, 5)
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
})
