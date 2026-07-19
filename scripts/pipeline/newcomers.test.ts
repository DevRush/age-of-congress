import { describe, expect, it } from 'vitest'
import { ageYears, dobToMs } from '../../src/lib/age'
import { conveningDate } from './historical'
import { computeNewcomers } from './newcomers'

/**
 * New-member medians. A "new member" of Congress n is a person whose earliest
 * voting House term (type "rep", in one of the fifty states) begins in n's span;
 * the age is measured at n's convening date — the same basis The Long View uses.
 * The fixtures below pin down the four rules the published definition turns on:
 * returners count once at their first arrival, a move to the Senate is not a new
 * arrival, non-voting delegates never count, and a missing birth date still
 * counts a body while dropping out of the median.
 */

const conv1 = conveningDate(1) // 1789-03-04
const rep = (state: string, start: string, end = '1799-03-03') => ({ type: 'rep', state, start, end })
const sen = (state: string, start: string, end = '1799-03-03') => ({ type: 'sen', state, start, end })
const person = (bioguide: string, birthday: string | null, terms: unknown[]) => ({
  id: { bioguide },
  bio: birthday ? { birthday } : {},
  terms,
})

describe('computeNewcomers', () => {
  it('covers every Congress 1..current, in order', () => {
    const pts = computeNewcomers([person('A000001', '1750-01-01', [rep('VA', conv1)])], '1795-01-01')
    expect(pts.map((p) => p.congress)).toEqual([1, 2, 3])
    expect(pts.every((p) => p.year === Number(conveningDate(p.congress).slice(0, 4)))).toBe(true)
  })

  it('takes the median age of a cohort at its convening date, and counts missing birthdays without medianing them', () => {
    // Ages 30 / 40 / 50 at the 1st Congress's convening; a fourth arrival has no
    // birth date. n counts four; the median is 40, the middle of the three known.
    const people = [
      person('A000030', '1759-03-04', [rep('VA', conv1)]),
      person('A000040', '1749-03-04', [rep('NY', conv1)]),
      person('A000050', '1739-03-04', [rep('MA', conv1)]),
      person('A000000', null, [rep('PA', conv1)]),
    ]
    const p1 = computeNewcomers(people, '1795-01-01').find((p) => p.congress === 1)!
    expect(p1.n).toBe(4)
    expect(p1.medianAge!).toBeCloseTo(ageYears(dobToMs('1749-03-04'), dobToMs(conv1)), 5)
    expect(p1.medianAge!).toBeCloseTo(40, 0)
  })

  it('counts a returning member at their genuine first arrival, not their return', () => {
    // First rep term at the 1st Congress, then a gap, then a return at the 3rd.
    const returner = person('R000001', '1750-01-01', [
      rep('VA', conveningDate(3)),
      rep('VA', conv1, '1791-03-03'),
    ])
    const pts = computeNewcomers([returner], '1795-01-01')
    expect(pts.find((p) => p.congress === 1)!.n).toBe(1)
    expect(pts.find((p) => p.congress === 3)!.n).toBe(0)
  })

  it('does not treat a move from the House to the Senate as a new arrival', () => {
    const mover = person('M000001', '1750-01-01', [rep('VA', conv1, '1791-03-03'), sen('VA', conveningDate(2))])
    const pts = computeNewcomers([mover], '1795-01-01')
    expect(pts.find((p) => p.congress === 1)!.n).toBe(1)
    expect(pts.find((p) => p.congress === 2)!.n).toBe(0)
  })

  it('never counts a pure senator as a House arrival', () => {
    const pts = computeNewcomers([person('S000001', '1750-01-01', [sen('NY', conv1)])], '1795-01-01')
    expect(pts.every((p) => p.n === 0)).toBe(true)
  })

  it('excludes non-voting delegates — a rep term whose state is not one of the fifty', () => {
    const delegate = person('D000001', '1750-01-01', [rep('PR', conv1)])
    const pts = computeNewcomers([delegate], '1795-01-01')
    expect(pts.every((p) => p.n === 0)).toBe(true)
  })

  it('counts a member first seated at a later Congress against that later Congress', () => {
    const pts = computeNewcomers([person('L000001', '1750-01-01', [rep('VA', conveningDate(2))])], '1795-01-01')
    expect(pts.find((p) => p.congress === 1)!.n).toBe(0)
    expect(pts.find((p) => p.congress === 2)!.n).toBe(1)
  })

  it('leaves medianAge null for a Congress whose only arrival lacks a birth date', () => {
    const p2 = computeNewcomers([person('N000001', null, [rep('VA', conveningDate(2))])], '1795-01-01').find(
      (p) => p.congress === 2,
    )!
    expect(p2.n).toBe(1)
    expect(p2.medianAge).toBeNull()
  })
})
