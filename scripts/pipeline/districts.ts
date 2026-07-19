import { ageYears } from '../../src/lib/age'
import type { Member, Party } from '../../src/lib/types'

/**
 * District age gap: how much older a House member is than the adults they represent.
 *
 * Median age here is the ADULT (18+) median, computed from B01001 (sex by age) by
 * linear interpolation across the 18+ brackets. We deliberately do NOT use B01002
 * ("median age"), because that is an all-ages figure that includes children: it
 * would inflate every gap, non-uniformly, and contradict the 18+ baseline the rest
 * of the site is built on (see population.json / NC-EST2025).
 */

/** ACS 2024 1-year, table-based summary file. Bulk FTP path — no API key required. */
export const B01001_URL =
  'https://www2.census.gov/programs-surveys/acs/summary_file/2024/table-based-SF/data/1YRData/acsdt1y2024-b01001.dat'

/**
 * Summary level 500 + "19" = 119th-Congress districts — an exact match to our roster.
 * A future vintage (5002000US) or the older 5001800US (118th, which would mis-join the
 * five redrawn states by up to 4.4 years) must fail the build loudly, not silently.
 */
export const CD_GEO_PREFIX = '5001900US'
export const NATIONAL_GEO_ID = '0100000US'

export const EXPECTED_DISTRICTS = 435
/** Triple-converges with NC-EST2025 (population.json adultMedianAge18) — assert it. */
export const NATIONAL_ADULT_MEDIAN = 47.5
export const NATIONAL_ADULT_MEDIAN_TOLERANCE = 0.3
/** Any member-vs-district gap outside this is a join or parse failure, not a fact. */
export const GAP_RANGE = { min: -40, max: 60 } as const

/** The map's geometry source. TIGER/Line is a U.S. government work — public domain. */
export const MAP_GEOGRAPHY_CREDIT = {
  layout: 'U.S. Census Bureau TIGER/Line cartographic boundaries (cb_2024_us_cd119_20m)',
  author: 'U.S. Census Bureau',
  url: 'https://www2.census.gov/geo/tiger/GENZ2024/shp/cb_2024_us_cd119_20m.zip',
  license: 'Public domain',
  licenseUrl: 'https://www.census.gov/about/policies/open-gov/open-data.html',
  projection: 'Albers USA (Alaska and Hawaii inset), pre-projected at build',
} as const

export const CENSUS_SOURCE = {
  table: 'B01001 (Sex by Age)',
  survey: 'U.S. Census Bureau, 2024 American Community Survey 1-Year Estimates',
  url: B01001_URL,
  basis: 'Median age of adults 18+, linearly interpolated across the 18+ age brackets',
} as const

export interface AdultBin {
  /** inclusive lower bound */ lo: number
  /** exclusive upper bound */ hi: number
  /** B01001 male variable number */ male: number
  /** B01001 female variable number */ female: number
}

/** The 18+ brackets of B01001. Male 007–025, female 031–049. 85+ is modelled as [85,100). */
export const ADULT_BINS: readonly AdultBin[] = [
  { lo: 18, hi: 20, male: 7, female: 31 }, // 18 and 19
  { lo: 20, hi: 21, male: 8, female: 32 }, // 20
  { lo: 21, hi: 22, male: 9, female: 33 }, // 21
  { lo: 22, hi: 25, male: 10, female: 34 },
  { lo: 25, hi: 30, male: 11, female: 35 },
  { lo: 30, hi: 35, male: 12, female: 36 },
  { lo: 35, hi: 40, male: 13, female: 37 },
  { lo: 40, hi: 45, male: 14, female: 38 },
  { lo: 45, hi: 50, male: 15, female: 39 },
  { lo: 50, hi: 55, male: 16, female: 40 },
  { lo: 55, hi: 60, male: 17, female: 41 },
  { lo: 60, hi: 62, male: 18, female: 42 }, // 60 and 61
  { lo: 62, hi: 65, male: 19, female: 43 },
  { lo: 65, hi: 67, male: 20, female: 44 }, // 65 and 66
  { lo: 67, hi: 70, male: 21, female: 45 },
  { lo: 70, hi: 75, male: 22, female: 46 },
  { lo: 75, hi: 80, male: 23, female: 47 },
  { lo: 80, hi: 85, male: 24, female: 48 },
  { lo: 85, hi: 100, male: 25, female: 49 }, // 85 and over, modelled as [85,100)
]

/** FIPS -> USPS for the 50 states. DC (11) and PR (72) are intentionally absent: no voting seat. */
export const FIPS_TO_USPS: Record<string, string> = {
  '01': 'AL', '02': 'AK', '04': 'AZ', '05': 'AR', '06': 'CA', '08': 'CO', '09': 'CT', '10': 'DE',
  '12': 'FL', '13': 'GA', '15': 'HI', '16': 'ID', '17': 'IL', '18': 'IN', '19': 'IA', '20': 'KS',
  '21': 'KY', '22': 'LA', '23': 'ME', '24': 'MD', '25': 'MA', '26': 'MI', '27': 'MN', '28': 'MS',
  '29': 'MO', '30': 'MT', '31': 'NE', '32': 'NV', '33': 'NH', '34': 'NJ', '35': 'NM', '36': 'NY',
  '37': 'NC', '38': 'ND', '39': 'OH', '40': 'OK', '41': 'OR', '42': 'PA', '44': 'RI', '45': 'SC',
  '46': 'SD', '47': 'TN', '48': 'TX', '49': 'UT', '50': 'VT', '51': 'VA', '53': 'WA', '54': 'WV',
  '55': 'WI', '56': 'WY',
}

export const USPS_TO_FIPS: Record<string, string> = Object.fromEntries(
  Object.entries(FIPS_TO_USPS).map(([fips, usps]) => [usps, fips]),
)

export interface DistrictAge {
  /** 4-char stateFIPS+district — the join key to the hex layout's GEOID. */
  geoid: string
  /** full Census GEO_ID, e.g. 5001900US4835 */
  censusGeoId: string
  state: string
  /** 0 for at-large */
  district: number
  adultMedianAge: number
}

export interface ParsedB01001 {
  districts: DistrictAge[]
  /** null only if the national row is absent — assertDistrictAges turns that into a hard failure. */
  nationalAdultMedianAge: number | null
  /** "districts not defined" rows (ZZ), which carry sentinel values */
  droppedNotDefined: string[]
  /** non-voting rows: 1198 = DC delegate, 7298 = PR resident commissioner */
  droppedNonVoting: string[]
}

export interface DistrictMember {
  bioguide: string
  name: string
  party: Party
  dobMs: number
}

export interface DistrictRow {
  geoid: string
  state: string
  district: number
  adultMedianAge: number
  member: DistrictMember | null
  /** null for the vacant seats — render neutral, never zero */
  gapYears: number | null
}

const round1 = (n: number) => Math.round(n * 10) / 10

/**
 * Grouped median by linear interpolation: find the bin holding the halfway adult,
 * then interpolate across it. Returns null for an empty or sentinel-poisoned district.
 */
export function adultMedianFromBins(counts: readonly number[]): number | null {
  if (counts.length !== ADULT_BINS.length) {
    throw new Error(`adultMedianFromBins: expected ${ADULT_BINS.length} bins, got ${counts.length}`)
  }
  if (counts.some((c) => c < 0 || !Number.isFinite(c))) return null // Census sentinels (-666666666 etc.)
  const total = counts.reduce((a, b) => a + b, 0)
  if (total <= 0) return null
  const half = total / 2
  let cum = 0
  for (let i = 0; i < ADULT_BINS.length; i++) {
    const c = counts[i]
    if (c > 0 && cum + c >= half) {
      const { lo, hi } = ADULT_BINS[i]
      return lo + ((half - cum) / c) * (hi - lo)
    }
    cum += c
  }
  return null
}

/** True for any congressional-district summary-level row, whatever the vintage. */
const isCdRow = (geoId: string) => /^500\d{4}US/.test(geoId)

export function parseB01001(dat: string): ParsedB01001 {
  const lines = dat.trim().split('\n')
  const header = lines[0].split('|')
  const idx = new Map(header.map((name, i) => [name, i]))
  const col = (v: number) => {
    const name = `B01001_E${String(v).padStart(3, '0')}`
    const i = idx.get(name)
    if (i === undefined) throw new Error(`parseB01001: column ${name} missing from header`)
    return i
  }
  const binCols = ADULT_BINS.map((b) => [col(b.male), col(b.female)] as const)
  const countsOf = (cells: string[]) => binCols.map(([m, f]) => Number(cells[m]) + Number(cells[f]))

  const districts: DistrictAge[] = []
  const droppedNotDefined: string[] = []
  const droppedNonVoting: string[] = []
  let nationalAdultMedianAge: number | null = null

  for (const line of lines.slice(1)) {
    if (!line.trim()) continue
    const cells = line.split('|')
    const geoId = cells[0]

    if (geoId === NATIONAL_GEO_ID) {
      nationalAdultMedianAge = adultMedianFromBins(countsOf(cells))
      continue
    }
    if (!isCdRow(geoId)) continue // states, counties, places… not our unit

    if (!geoId.startsWith(CD_GEO_PREFIX)) {
      throw new Error(
        `GATE FAILED: unexpected congressional-district vintage "${geoId.slice(0, 9)}" — ` +
          `expected ${CD_GEO_PREFIX} (119th Congress). A vintage shift would mis-join the roster; ` +
          `re-verify the district boundaries before changing this.`,
      )
    }

    const code = geoId.slice(9, 13) // stateFIPS + district
    const dd = code.slice(2)
    if (dd === 'ZZ') { droppedNotDefined.push(code); continue } // "district not defined": sentinel values
    if (dd === '98') { droppedNonVoting.push(code); continue } // DC delegate, PR resident commissioner

    const fips = code.slice(0, 2)
    const state = FIPS_TO_USPS[fips]
    if (!state) throw new Error(`GATE FAILED: unknown state FIPS "${fips}" in ${geoId}`)
    if (!/^\d{2}$/.test(dd)) throw new Error(`GATE FAILED: unparseable district code "${code}" in ${geoId}`)

    const median = adultMedianFromBins(countsOf(cells))
    if (median === null) {
      throw new Error(`GATE FAILED: no usable 18+ population for district ${code} (${geoId})`)
    }
    districts.push({ geoid: code, censusGeoId: geoId, state, district: Number(dd), adultMedianAge: round1(median) })
  }

  return { districts, nationalAdultMedianAge, droppedNotDefined, droppedNonVoting }
}

export function assertDistrictAges(parsed: ParsedB01001): void {
  const { districts, nationalAdultMedianAge } = parsed
  if (districts.length !== EXPECTED_DISTRICTS) {
    throw new Error(`GATE FAILED: expected ${EXPECTED_DISTRICTS} districts, parsed ${districts.length}`)
  }
  const seen = new Set<string>()
  for (const d of districts) {
    if (seen.has(d.geoid)) throw new Error(`GATE FAILED: duplicate district geoid ${d.geoid}`)
    seen.add(d.geoid)
    if (!d.censusGeoId.startsWith(CD_GEO_PREFIX)) {
      throw new Error(`GATE FAILED: district ${d.geoid} is not a ${CD_GEO_PREFIX} (119th Congress) geography`)
    }
  }
  if (nationalAdultMedianAge === null) {
    throw new Error(`GATE FAILED: national row ${NATIONAL_GEO_ID} missing from B01001 — cannot verify the 18+ basis`)
  }
  if (Math.abs(nationalAdultMedianAge - NATIONAL_ADULT_MEDIAN) > NATIONAL_ADULT_MEDIAN_TOLERANCE) {
    throw new Error(
      `GATE FAILED: national adult 18+ median ${nationalAdultMedianAge.toFixed(2)} is not ` +
        `${NATIONAL_ADULT_MEDIAN}±${NATIONAL_ADULT_MEDIAN_TOLERANCE} — the interpolation or the 18+ ` +
        `bracket set has drifted (all-ages B01002 would read ~38.9)`,
    )
  }
}

/**
 * Join the 119th-Congress roster onto the districts. Voting House members only:
 * senators have no district, and the six delegates have no voting seat here.
 */
export function buildDistrictRows(
  districts: DistrictAge[],
  members: Member[],
  nowMs: number,
): { rows: DistrictRow[]; unmatchedMembers: string[] } {
  const byGeoid = new Map<string, Member>()
  const seats = new Set(districts.map((d) => d.geoid))
  const unmatchedMembers: string[] = []

  for (const m of members) {
    if (m.chamber !== 'house' || !m.isVoting || m.district === undefined) continue
    const fips = USPS_TO_FIPS[m.state]
    const key = fips ? `${fips}${String(m.district).padStart(2, '0')}` : null
    if (!key || !seats.has(key)) {
      unmatchedMembers.push(`${m.bioguide} ${m.state}-${m.district}`)
      continue
    }
    const prior = byGeoid.get(key)
    if (prior) {
      throw new Error(`GATE FAILED: duplicate members for seat ${key}: ${prior.bioguide} and ${m.bioguide}`)
    }
    byGeoid.set(key, m)
  }

  const rows = districts.map((d) => {
    const m = byGeoid.get(d.geoid)
    return {
      geoid: d.geoid,
      state: d.state,
      district: d.district,
      adultMedianAge: d.adultMedianAge,
      member: m ? { bioguide: m.bioguide, name: m.name, party: m.party, dobMs: m.dobMs } : null,
      // gap is taken against the rounded median so displayed age - median == gap
      gapYears: m ? round1(ageYears(m.dobMs, nowMs) - d.adultMedianAge) : null,
    }
  })
  return { rows, unmatchedMembers }
}

export interface GapStats {
  joined: number
  vacant: number
  meanGap: number
  medianGap: number
  pctOlder: number
  minGap: number
  maxGap: number
}

export function districtGapStats(rows: readonly DistrictRow[]): GapStats {
  const gaps = rows.filter((r) => r.gapYears !== null).map((r) => r.gapYears as number)
  if (!gaps.length) throw new Error('districtGapStats: no joined districts')
  const sorted = [...gaps].sort((a, b) => a - b)
  const mid = sorted.length >> 1
  return {
    joined: gaps.length,
    vacant: rows.length - gaps.length,
    meanGap: gaps.reduce((a, b) => a + b, 0) / gaps.length,
    medianGap: sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2,
    pctOlder: gaps.filter((g) => g > 0).length / gaps.length,
    minGap: sorted[0],
    maxGap: sorted[sorted.length - 1],
  }
}

export async function fetchDistrictAges(
  fetcher: (url: string) => Promise<string> = async (u) => (await fetch(u)).text(),
): Promise<ParsedB01001> {
  return parseB01001(await fetcher(B01001_URL))
}
