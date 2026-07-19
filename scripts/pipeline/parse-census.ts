import { writeFile, mkdir } from 'node:fs/promises'

export const CENSUS_URL = 'https://www2.census.gov/programs-surveys/popest/datasets/2020-2025/national/asrh/nc-est2025-agesex-res.csv'

export interface PopulationBin { label: string; min: number; max: number | null; count: number }
export interface Population {
  asOf: string; source: string; url: string
  adultMeanAge18: number; adultMedianAge18: number
  bins: PopulationBin[]
}

export function parseCensusCsv(csv: string): { age: number; pop: number }[] {
  const lines = csv.trim().split('\n')
  const header = lines[0].split(',')
  const iSex = header.indexOf('SEX')
  const iAge = header.indexOf('AGE')
  const iPop = header.indexOf('POPESTIMATE2025')
  const out: { age: number; pop: number }[] = []
  for (const line of lines.slice(1)) {
    const cols = line.split(',')
    const sex = Number(cols[iSex]); const age = Number(cols[iAge])
    if (sex !== 0 || age > 100) continue
    out.push({ age, pop: Number(cols[iPop]) })
  }
  return out
}

export function summarizePopulation(rows: { age: number; pop: number }[]): Population {
  const adults = rows.filter((r) => r.age >= 18)
  const midpoint = (age: number) => (age >= 100 ? 102 : age + 0.5)
  const total = adults.reduce((a, r) => a + r.pop, 0)
  const mean = adults.reduce((a, r) => a + midpoint(r.age) * r.pop, 0) / total
  let cum = 0; let median = 0
  const sortedAdults = [...adults].sort((a, b) => a.age - b.age)
  for (let i = 0; i < sortedAdults.length; i++) {
    const r = sortedAdults[i]
    cum += r.pop
    if (cum === total / 2) {
      const next = sortedAdults[i + 1]
      median = next ? (midpoint(r.age) + midpoint(next.age)) / 2 : midpoint(r.age)
      break
    }
    if (cum > total / 2) { median = midpoint(r.age); break }
  }
  const bins: PopulationBin[] = []
  for (let min = 25; min <= 90; min += 5) {
    const count = rows.filter((r) => r.age >= min && r.age < min + 5).reduce((a, r) => a + r.pop, 0)
    bins.push({ label: `${min}–${min + 4}`, min, max: min + 4, count })
  }
  bins.push({ label: '95+', min: 95, max: null, count: rows.filter((r) => r.age >= 95).reduce((a, r) => a + r.pop, 0) })
  return {
    asOf: '2025-07-01',
    source: 'U.S. Census Bureau, Vintage 2025 National Population Estimates (NC-EST2025)',
    url: CENSUS_URL,
    adultMeanAge18: Math.round(mean * 10) / 10,
    adultMedianAge18: Math.round(median * 10) / 10,
    bins,
  }
}

/**
 * Fetch, summarize, sanity-gate, and write the population baseline. Called by
 * the daily pipeline (so population.json is re-derived nightly and can never
 * silently diverge from its pinned source) and by `npm run census` directly.
 *
 * Note what a nightly run does NOT fix: the source URL, its POPESTIMATE column,
 * and `asOf` are pinned to one Census vintage, so freshness needs its own gate —
 * build-data fails loudly when the vintage is old enough that a newer one must
 * exist, which is a maintainer's cue to bump all three tokens here.
 */
export async function refreshPopulation(): Promise<Population> {
  const csv = await (await fetch(CENSUS_URL)).text()
  const pop = summarizePopulation(parseCensusCsv(csv))
  if (pop.adultMeanAge18 < 48 || pop.adultMeanAge18 > 50) throw new Error(`implausible adult mean age ${pop.adultMeanAge18}`)
  await mkdir('src/data', { recursive: true })
  await writeFile('src/data/population.json', JSON.stringify(pop, null, 2))
  return pop
}

async function main() {
  const pop = await refreshPopulation()
  console.log(`population.json written — adult mean ${pop.adultMeanAge18}, median ${pop.adultMedianAge18}`)
}

if (process.argv[1]?.endsWith('parse-census.ts')) main()
