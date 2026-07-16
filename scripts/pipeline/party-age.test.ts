import { describe, expect, it } from 'vitest'
import raw from './__fixtures__/members-fixture.json'
import { parseMembers } from './parse-members'
import {
  assertPartyAge,
  betai,
  computePartyAge,
  editionAge,
  studentTwoSidedP,
  welchTest,
} from './party-age'
import type { Member, Party } from '../../src/lib/types'
import { dobToMs } from '../../src/lib/age'

const { members } = parseMembers(raw as any[])

// A synthetic voting member — enough fields for computePartyAge, which only
// reads party, chamber, birthday and isVoting.
function mk(bioguide: string, party: Party, chamber: 'senate' | 'house', birthYear: number): Member {
  const birthday = `${birthYear}-06-15`
  return {
    bioguide,
    name: `Member ${bioguide}`,
    party,
    chamber,
    state: 'CA',
    birthday,
    dobMs: dobToMs(birthday),
    firstTookOfficeYear: 2015,
    termsServed: 3,
    isVoting: true,
  }
}

describe('editionAge', () => {
  it('is atYear minus birth year — the Decades/Histogram convention', () => {
    expect(editionAge(mk('X', 'D', 'house', 1960), 2026)).toBe(66)
  })
})

describe('betai / studentTwoSidedP', () => {
  it('incomplete beta is symmetric at the midpoint', () => {
    expect(betai(2, 2, 0.5)).toBeCloseTo(0.5, 10)
  })
  it('t=0 gives p=1; large t gives p≈0', () => {
    expect(studentTwoSidedP(0, 100)).toBeCloseTo(1, 10)
    expect(studentTwoSidedP(50, 100)).toBeLessThan(1e-6)
  })
  it('matches a known Student-t two-sided p (t=2.086, df=20 ≈ 0.05)', () => {
    // 2.086 is the 0.975 quantile of t_20; two-sided p should be ≈ 0.05.
    expect(studentTwoSidedP(2.086, 20)).toBeCloseTo(0.05, 3)
  })
})

describe('welchTest', () => {
  it('identical samples give a zero difference and p ≈ 1', () => {
    const a = [60, 62, 64, 66, 68]
    const w = welchTest('t', a, [...a])
    expect(w.meanDiff).toBeCloseTo(0, 10)
    expect(w.p).toBeCloseTo(1, 10)
    expect(w.cohenD).toBeCloseTo(0, 10)
  })
  it('a large, clear separation is significant', () => {
    const young = Array.from({ length: 30 }, (_, i) => 40 + (i % 5))
    const old = Array.from({ length: 30 }, (_, i) => 70 + (i % 5))
    const w = welchTest('t', old, young)
    expect(w.meanDiff).toBeGreaterThan(25)
    expect(w.p).toBeLessThan(1e-6)
    expect(w.cohenD).toBeGreaterThan(2)
  })
  it('a tiny gap in large samples is not significant (the site\'s actual finding)', () => {
    // Two ~equal age distributions offset by well under a year.
    const d = Array.from({ length: 250 }, (_, i) => 45 + (i % 40))
    const r = Array.from({ length: 260 }, (_, i) => 45 + (i % 40) + (i % 3 === 0 ? 1 : 0))
    const w = welchTest('t', d, r)
    expect(Math.abs(w.meanDiff)).toBeLessThan(1)
    expect(w.p).toBeGreaterThan(0.05)
    expect(Math.abs(w.cohenD)).toBeLessThan(0.2)
  })
})

describe('computePartyAge', () => {
  const roster: Member[] = [
    // Democrats: one very old (tail), rest middle-aged
    mk('D1', 'D', 'house', 1940), // 86
    mk('D2', 'D', 'senate', 1944), // 82
    mk('D3', 'D', 'house', 1960),
    mk('D4', 'D', 'house', 1965),
    // Republicans: younger tail
    mk('R1', 'R', 'senate', 1945), // 81
    mk('R2', 'R', 'house', 1962),
    mk('R3', 'R', 'house', 1968),
    mk('R4', 'R', 'house', 1972),
    // Independent
    mk('I1', 'I', 'senate', 1941), // 85
    // A non-voting member must be ignored entirely
    { ...mk('DELE', 'D', 'house', 1935), isVoting: false },
  ]
  const s = computePartyAge(roster, 2026)

  it('excludes non-voting members from every tally', () => {
    const totalN = s.overall.reduce((a, x) => a + x.n, 0)
    expect(totalN).toBe(9) // DELE dropped
  })

  it('reports a mean age per present party', () => {
    const d = s.overall.find((x) => x.party === 'D')!
    expect(d.n).toBe(4)
    expect(d.meanAge).toBeCloseTo((86 + 82 + 66 + 61) / 4, 6)
    expect(s.overall.find((x) => x.party === 'I')!.n).toBe(1)
  })

  it('age bands are nested and split by party', () => {
    const b80 = s.bands.find((b) => b.threshold === 80)!
    expect(b80.total).toBe(4) // D1(86), D2(82), R1(81), I1(85)
    expect(b80.D).toBe(2)
    expect(b80.R).toBe(1)
    expect(b80.I).toBe(1)
    const b65 = s.bands.find((b) => b.threshold === 65)!
    expect(b65.total).toBeGreaterThanOrEqual(b80.total)
  })

  it('over80 names exactly the 80+ members, split by party', () => {
    expect(s.over80.total).toBe(4)
    expect(s.over80.D).toBe(2)
    expect(s.over80.members.map((m) => m.bioguide).sort()).toEqual(['D1', 'D2', 'I1', 'R1'])
    // sorted oldest first
    expect(s.over80.members[0].age).toBe(86)
  })

  it('houseBands only count representatives', () => {
    const hb80 = s.houseBands.find((b) => b.threshold === 80)!
    expect(hb80.total).toBe(1) // only D1 (86) in the House is 80+
    expect(hb80.D).toBe(1)
  })

  // This tiny roster is deliberately age-skewed to exercise the tail, so the
  // INFERENTIAL gate rightly rejects it (a 9.5-yr D-vs-R gap is not "the same
  // age"). The balanced-roster block below covers the passing case; here we only
  // confirm the ARITHMETIC gate rejects for the expected reason, not a band bug.
  it('the inferential gate — not an arithmetic one — is what trips on a skewed roster', () => {
    expect(() => assertPartyAge(s, roster)).toThrow(/same age on average|statistically distinguishable/)
  })
})

describe('assertPartyAge gates', () => {
  const balanced: Member[] = [
    ...Array.from({ length: 40 }, (_, i) => mk(`D${i}`, 'D', 'house', 1955 + (i % 30))),
    ...Array.from({ length: 40 }, (_, i) => mk(`R${i}`, 'R', 'house', 1955 + (i % 30))),
    mk('I0', 'I', 'senate', 1950),
    // give each chamber both parties so the per-chamber gate is satisfiable
    mk('DS', 'D', 'senate', 1958),
    mk('RS', 'R', 'senate', 1959),
  ]

  it('accepts a balanced roster', () => {
    expect(() => assertPartyAge(computePartyAge(balanced, 2026), balanced)).not.toThrow()
  })

  it('trips when the D-vs-R mean gap becomes large and significant', () => {
    const skewed: Member[] = [
      ...Array.from({ length: 40 }, (_, i) => mk(`D${i}`, 'D', 'house', 1935 + (i % 10))), // ~86–95
      ...Array.from({ length: 40 }, (_, i) => mk(`R${i}`, 'R', 'house', 1985 + (i % 10))), // ~31–41
      mk('DS', 'D', 'senate', 1940),
      mk('RS', 'R', 'senate', 1985),
    ]
    expect(() => assertPartyAge(computePartyAge(skewed, 2026), skewed)).toThrow(/GATE FAILED/)
  })
})

// Sanity: the real fixture roster runs end-to-end without throwing on the
// arithmetic gates (it is too small/imbalanced for the inferential gate, so we
// only exercise the compute path here).
describe('fixture roster', () => {
  it('computes without arithmetic errors', () => {
    const summary = computePartyAge(members, 2026)
    for (const b of summary.bands) {
      expect(b.D + b.R + b.I).toBe(b.total)
    }
  })
})
