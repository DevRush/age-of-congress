import { describe, expect, it } from 'vitest'
import {
  ADULT_BINS,
  CD_GEO_PREFIX,
  EXPECTED_DISTRICTS,
  NATIONAL_ADULT_MEDIAN,
  NATIONAL_ADULT_MEDIAN_TOLERANCE,
  adultMedianFromBins,
  assertDistrictAges,
  buildDistrictRows,
  districtGapStats,
  parseB01001,
  type DistrictAge,
  type ParsedB01001,
} from './districts'
import type { Member } from '../../src/lib/types'
import { dobToMs } from '../../src/lib/age'

// ---- fixture helpers -------------------------------------------------------

const VARS = Array.from({ length: 49 }, (_, i) => i + 1)
const v = (n: number) => String(n).padStart(3, '0')
const HEADER = ['GEO_ID', ...VARS.flatMap((n) => [`B01001_E${v(n)}`, `B01001_M${v(n)}`])].join('|')

/** Build one pipe-delimited row: `est` maps B01001 variable number -> estimate. */
function row(geoid: string, est: Record<number, number>): string {
  return [geoid, ...VARS.flatMap((n) => [String(est[n] ?? 0), '0'])].join('|')
}

const dat = (...rows: string[]) => [HEADER, ...rows].join('\n')

/** Counts array aligned to ADULT_BINS, all zero except the given bin indexes. */
function bins(spec: Record<number, number>): number[] {
  return ADULT_BINS.map((_, i) => spec[i] ?? 0)
}

const member = (over: Partial<Member> & Pick<Member, 'bioguide' | 'state'>): Member => ({
  name: 'Test Member',
  party: 'D',
  chamber: 'house',
  district: 1,
  birthday: '1960-01-01',
  dobMs: dobToMs('1960-01-01'),
  firstElectedYear: 2000,
  termsServed: 1,
  isVoting: true,
  ...over,
})

// ---- the 18+ median itself -------------------------------------------------

describe('adultMedianFromBins', () => {
  it('interpolates linearly inside the bin holding the halfway person', () => {
    // everyone in [40,45): median sits exactly mid-bin
    expect(adultMedianFromBins(bins({ 7: 100 }))).toBeCloseTo(42.5, 6)
  })

  it('splits across bins proportionally', () => {
    // 60 in [25,30), 40 in [45,50) -> half=50 lands 50/60 through the first bin
    const m = adultMedianFromBins(bins({ 4: 60, 8: 40 }))
    expect(m).toBeCloseTo(25 + (50 / 60) * 5, 6)
  })

  it('sums the male and female halves of each bin', () => {
    // 40 male + 60 female in the same [40,45) bin == 100 in that bin
    const parsed = parseB01001(dat(row(`${CD_GEO_PREFIX}0101`, { 14: 40, 38: 60 })))
    expect(parsed.districts[0].adultMedianAge).toBeCloseTo(42.5, 6)
  })

  it('IGNORES the under-18 brackets entirely', () => {
    // a million children must not move the adult median
    const adultsOnly = parseB01001(dat(row(`${CD_GEO_PREFIX}0101`, { 14: 100 })))
    const withKids = parseB01001(
      dat(row(`${CD_GEO_PREFIX}0101`, { 3: 1_000_000, 4: 500_000, 27: 1_000_000, 14: 100 })),
    )
    expect(withKids.districts[0].adultMedianAge).toBeCloseTo(adultsOnly.districts[0].adultMedianAge, 6)
    expect(withKids.districts[0].adultMedianAge).toBeCloseTo(42.5, 6)
  })

  it('models the open-ended 85+ bracket as [85,100)', () => {
    const last = ADULT_BINS[ADULT_BINS.length - 1]
    expect([last.lo, last.hi]).toEqual([85, 100])
    expect(last.male).toBe(25)
    expect(last.female).toBe(49)
  })

  it('covers exactly the 18+ variables (male 007-025, female 031-049)', () => {
    expect(ADULT_BINS.map((b) => b.male)).toEqual([7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25])
    expect(ADULT_BINS.map((b) => b.female)).toEqual([31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49])
    expect(ADULT_BINS[0].lo).toBe(18)
  })

  it('returns null for an empty population', () => {
    expect(adultMedianFromBins(bins({}))).toBeNull()
  })

  it('returns null when a bracket carries a Census sentinel value', () => {
    expect(adultMedianFromBins(bins({ 7: -666666666 }))).toBeNull()
  })
})

// ---- parsing + the filters that keep the scale honest ----------------------

describe('parseB01001', () => {
  it('reads the national row and the district rows', () => {
    const parsed = parseB01001(
      dat(row('0100000US', { 14: 100 }), row(`${CD_GEO_PREFIX}4835`, { 15: 100 })),
    )
    expect(parsed.nationalAdultMedianAge).toBeCloseTo(42.5, 6)
    expect(parsed.districts).toHaveLength(1)
    expect(parsed.districts[0]).toMatchObject({ geoid: '4835', state: 'TX', district: 35 })
  })

  it('drops the "district not defined" ZZ rows and their sentinel values', () => {
    const parsed = parseB01001(
      dat(
        row(`${CD_GEO_PREFIX}0101`, { 14: 100 }),
        row(`${CD_GEO_PREFIX}09ZZ`, { 14: -666666666, 38: -222222222 }),
        row(`${CD_GEO_PREFIX}17ZZ`, { 14: -666666666 }),
        row(`${CD_GEO_PREFIX}33ZZ`, { 14: -666666666 }),
      ),
    )
    expect(parsed.districts.map((d) => d.geoid)).toEqual(['0101'])
    expect(parsed.droppedNotDefined).toEqual(['09ZZ', '17ZZ', '33ZZ'])
  })

  it('drops the 98 non-voting rows (DC delegate, PR resident commissioner)', () => {
    const parsed = parseB01001(
      dat(
        row(`${CD_GEO_PREFIX}0101`, { 14: 100 }),
        row(`${CD_GEO_PREFIX}1198`, { 14: 100 }),
        row(`${CD_GEO_PREFIX}7298`, { 14: 100 }),
      ),
    )
    expect(parsed.districts.map((d) => d.geoid)).toEqual(['0101'])
    expect(parsed.droppedNonVoting).toEqual(['1198', '7298'])
  })

  it('maps at-large districts (code 00) to district 0', () => {
    const parsed = parseB01001(dat(row(`${CD_GEO_PREFIX}1000`, { 14: 100 })))
    expect(parsed.districts[0]).toMatchObject({ geoid: '1000', state: 'DE', district: 0 })
  })

  it('THROWS on a vintage shift away from the 119th-Congress prefix', () => {
    // 5001800US = 118th districts: would silently mis-join 5 redrawn states
    expect(() => parseB01001(dat(row('5001800US4835', { 14: 100 })))).toThrow(/5001900US|vintage/i)
  })

  it('throws if a kept district has no usable population', () => {
    expect(() => parseB01001(dat(row(`${CD_GEO_PREFIX}0101`, {})))).toThrow(/0101/)
  })

  it('ignores non-district summary levels', () => {
    const parsed = parseB01001(dat(row('0400000US48', { 14: 100 }), row(`${CD_GEO_PREFIX}0101`, { 14: 100 })))
    expect(parsed.districts).toHaveLength(1)
  })
})

// ---- gates -----------------------------------------------------------------

describe('assertDistrictAges', () => {
  const ok = (n: number, national = NATIONAL_ADULT_MEDIAN): ParsedB01001 => ({
    districts: Array.from({ length: n }, (_, i) => ({
      geoid: String(i).padStart(4, '0'),
      censusGeoId: `${CD_GEO_PREFIX}${String(i).padStart(4, '0')}`,
      state: 'TX',
      district: i,
      adultMedianAge: 45,
    })) as DistrictAge[],
    nationalAdultMedianAge: national,
    droppedNotDefined: [],
    droppedNonVoting: [],
  })

  it('passes on 435 districts with a ~47.5 national median', () => {
    expect(() => assertDistrictAges(ok(EXPECTED_DISTRICTS))).not.toThrow()
  })

  it('fails loudly when the district count is not 435', () => {
    expect(() => assertDistrictAges(ok(434))).toThrow(/435/)
    expect(() => assertDistrictAges(ok(436))).toThrow(/435/)
  })

  it('fails loudly when the national adult median drifts off 47.5', () => {
    const off = NATIONAL_ADULT_MEDIAN + NATIONAL_ADULT_MEDIAN_TOLERANCE + 0.05
    expect(() => assertDistrictAges(ok(EXPECTED_DISTRICTS, off))).toThrow(/47\.5/)
  })

  it('fails loudly when the national row is absent (the 18+ basis is unverifiable)', () => {
    const p = ok(EXPECTED_DISTRICTS)
    p.nationalAdultMedianAge = null
    expect(() => assertDistrictAges(p)).toThrow(/national row/)
  })

  it('fails on duplicate geoids', () => {
    const p = ok(EXPECTED_DISTRICTS)
    p.districts[1].geoid = p.districts[0].geoid
    expect(() => assertDistrictAges(p)).toThrow(/duplicate/i)
  })
})

// ---- the member join -------------------------------------------------------

describe('buildDistrictRows', () => {
  const ages: DistrictAge[] = [
    { geoid: '1707', censusGeoId: `${CD_GEO_PREFIX}1707`, state: 'IL', district: 7, adultMedianAge: 41 },
    { geoid: '1000', censusGeoId: `${CD_GEO_PREFIX}1000`, state: 'DE', district: 0, adultMedianAge: 50 },
    { geoid: '4835', censusGeoId: `${CD_GEO_PREFIX}4835`, state: 'TX', district: 35, adultMedianAge: 40 },
  ]
  const nowMs = dobToMs('2026-07-15')

  it('joins a member to their district and computes the gap', () => {
    const m = member({ bioguide: 'D000096', state: 'IL', district: 7, birthday: '1941-09-06', dobMs: dobToMs('1941-09-06') })
    const { rows } = buildDistrictRows(ages, [m], nowMs)
    const il7 = rows.find((r) => r.geoid === '1707')!
    expect(il7.member).toEqual({ bioguide: 'D000096', name: 'Test Member', party: 'D', dobMs: dobToMs('1941-09-06') })
    // age ~84.9 vs district 41 -> ~+43.9
    expect(il7.gapYears).toBeCloseTo(43.9, 1)
  })

  it('joins at-large members (district 0) to the 00 geoid', () => {
    const m = member({ bioguide: 'M000899', state: 'DE', district: 0, birthday: '1990-08-09', dobMs: dobToMs('1990-08-09') })
    const { rows } = buildDistrictRows(ages, [m], nowMs)
    expect(rows.find((r) => r.geoid === '1000')!.member?.bioguide).toBe('M000899')
  })

  it('leaves vacant seats as member:null and gap:null', () => {
    const { rows } = buildDistrictRows(ages, [], nowMs)
    expect(rows.every((r) => r.member === null && r.gapYears === null)).toBe(true)
    expect(rows).toHaveLength(3)
  })

  it('reports members that match no district instead of dropping them', () => {
    const stray = member({ bioguide: 'X000001', state: 'CA', district: 99 })
    const { unmatchedMembers } = buildDistrictRows(ages, [stray], nowMs)
    expect(unmatchedMembers).toEqual(['X000001 CA-99'])
  })

  it('ignores senators and non-voting delegates', () => {
    const sen = member({ bioguide: 'S000001', state: 'IL', chamber: 'senate', district: undefined })
    const delegate = member({ bioguide: 'G000001', state: 'GU', district: 0, isVoting: false })
    const { rows, unmatchedMembers } = buildDistrictRows(ages, [sen, delegate], nowMs)
    expect(rows.every((r) => r.member === null)).toBe(true)
    expect(unmatchedMembers).toEqual([])
  })

  it('throws when two members claim the same seat', () => {
    const a = member({ bioguide: 'A000001', state: 'IL', district: 7 })
    const b = member({ bioguide: 'B000001', state: 'IL', district: 7 })
    expect(() => buildDistrictRows(ages, [a, b], nowMs)).toThrow(/1707|duplicate/i)
  })

  it('keeps gap arithmetic self-consistent with the rounded median', () => {
    const m = member({ bioguide: 'Z000001', state: 'TX', district: 35, birthday: '1980-01-01', dobMs: dobToMs('1980-01-01') })
    const { rows } = buildDistrictRows(ages, [m], nowMs)
    const r = rows.find((r) => r.geoid === '4835')!
    expect(Number((r.adultMedianAge + r.gapYears!).toFixed(1))).toBeCloseTo(
      Number(((nowMs - m.dobMs) / (365.2425 * 86_400_000)).toFixed(1)),
      1,
    )
  })
})

describe('districtGapStats', () => {
  it('summarises only the joined seats', () => {
    const rows = [
      { geoid: '0101', state: 'AL', district: 1, adultMedianAge: 40, member: null, gapYears: null },
      { geoid: '0102', state: 'AL', district: 2, adultMedianAge: 40, member: { bioguide: 'a', name: 'A', party: 'D' as const, dobMs: 0 }, gapYears: 10 },
      { geoid: '0103', state: 'AL', district: 3, adultMedianAge: 40, member: { bioguide: 'b', name: 'B', party: 'R' as const, dobMs: 0 }, gapYears: 20 },
      { geoid: '0104', state: 'AL', district: 4, adultMedianAge: 40, member: { bioguide: 'c', name: 'C', party: 'R' as const, dobMs: 0 }, gapYears: -6 },
    ]
    const s = districtGapStats(rows)
    expect(s.joined).toBe(3)
    expect(s.vacant).toBe(1)
    expect(s.meanGap).toBeCloseTo(8, 6)
    expect(s.pctOlder).toBeCloseTo(2 / 3, 6)
  })
})
