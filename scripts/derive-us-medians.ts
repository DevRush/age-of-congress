import { execFileSync } from 'node:child_process'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

/**
 * One-time derivation of the U.S. adult (18+) median age, 1980 → present, for
 * the second line on "The Long View". Run manually (`npx tsx
 * scripts/derive-us-medians.ts`); the output is committed.
 *
 * Deliberately NOT part of the nightly pipeline: these are population estimates
 * for years that are over, and history does not change nightly. Re-deriving
 * them on the cron would add five upstream URLs to the set of things that can
 * turn the build red (the lesson of the hex-layout incident) in exchange for no
 * freshness at all. The one figure that does move — the current year's adult
 * median — is already re-derived every night into population.json, and a build
 * gate in build-data.ts holds this file's endpoint to it.
 *
 * Why 18+ and not the all-ages median the Census headlines: the all-ages figure
 * counts children, and this site deliberately compares Congress to the adults
 * who could actually vote for it (see population.json / the hero's dek). The
 * 18+ series has no published historical table anywhere — it is derived here
 * from single-year-of-age estimates, by the same linear interpolation
 * convention throughout, so the line is internally consistent across five
 * decades of differently-shaped Census files.
 *
 * Sources (all keyless www2.census.gov flat files):
 *   1980       e8081rqi.zip — quarterly postcensal, fixed-width, 2-digit years
 *   1990–1999  us-est90int-07.csv — monthly intercensal, quoted CSV
 *   2000–2009  us-est00int-alldata.csv — monthly intercensal, plain CSV
 *   2010–2019  nc-est2020-agesex-res.csv — vintage-2020 annual, SEX/AGE columns
 *   2020–2025  nc-est2025-agesex-res.csv — vintage-2025 annual, same shape
 * July 1 estimates are used for every year.
 */

const BASE = 'https://www2.census.gov/programs-surveys/popest'
export const SOURCES = {
  y1980: `${BASE}/datasets/1980-1990/national/asrh/e8081rqi.zip`,
  y1990s: `${BASE}/tables/1990-2000/intercensal/national/us-est90int-07.csv`,
  y2000s: `${BASE}/datasets/2000-2010/intercensal/national/us-est00int-alldata.csv`,
  y2010s: `${BASE}/datasets/2010-2020/national/asrh/nc-est2020-agesex-res.csv`,
  y2020s: `${BASE}/datasets/2020-2025/national/asrh/nc-est2025-agesex-res.csv`,
} as const

export type AgeRow = { age: number; pop: number }

/**
 * Median age of the population aged `minAge` and over, by linear interpolation
 * within the single year of age that contains the midpoint: treating ages as
 * uniform over [a, a+1), median = a + (N/2 − cumBefore) / pop(a).
 *
 * This is the standard convention, chosen over the repo's coarser bin-midpoint
 * method (parse-census.ts) because a five-decade LINE amplifies the midpoint
 * method's ±0.5-year stair-stepping into visible wobble, while at a single
 * point the two agree to ~0.1 (47.6 here vs population.json's 47.5).
 */
export function linearAdultMedian(rows: AgeRow[], minAge = 18): number {
  const adults = rows.filter((r) => r.age >= minAge).sort((a, b) => a.age - b.age)
  const total = adults.reduce((a, r) => a + r.pop, 0)
  if (total === 0) throw new Error('linearAdultMedian: empty population')
  const half = total / 2
  let cum = 0
  for (const r of adults) {
    if (cum + r.pop >= half) return r.age + (half - cum) / r.pop
    cum += r.pop
  }
  throw new Error('linearAdultMedian: midpoint not reached')
}

const fetchText = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${res.status} for ${url}`)
  return res.text()
}

/** 1980: fixed-width quarterly file, July 1 1980 rows (month 7, 2-digit year 80). */
async function rows1980(): Promise<AgeRow[]> {
  const res = await fetch(SOURCES.y1980)
  if (!res.ok) throw new Error(`${res.status} for ${SOURCES.y1980}`)
  const dir = mkdtempSync(join(tmpdir(), 'e8081-'))
  const zipPath = join(dir, 'e8081rqi.zip')
  writeFileSync(zipPath, Buffer.from(await res.arrayBuffer()))
  const text = execFileSync('unzip', ['-p', zipPath], { maxBuffer: 64 * 1024 * 1024 }).toString()
  const rows: AgeRow[] = []
  for (const line of text.split('\n')) {
    // "2I 780  0    3533692 …" → month cols 2-3, year 4-5, age 6-8, total next.
    if (!line.startsWith('2I')) continue
    const month = line.slice(2, 4).trim()
    const year = line.slice(4, 6)
    const age = line.slice(6, 9).trim()
    if (month !== '7' || year !== '80' || age === '999') continue
    const total = Number(line.slice(9).trim().split(/\s+/)[0])
    rows.push({ age: Number(age), pop: total })
  }
  return rows
}

/** 1990s: quoted monthly CSV — `"July 1, 1994","23",total,male,female`. */
async function rows1990s(): Promise<Map<number, AgeRow[]>> {
  const text = await fetchText(SOURCES.y1990s)
  const byYear = new Map<number, AgeRow[]>()
  for (const line of text.split('\n')) {
    const m = line.match(/^"July 1, (19\d\d)","(\d+)\+?",(\d+),/)
    if (!m) continue
    const year = Number(m[1])
    if (year >= 2000) continue
    const list = byYear.get(year) ?? []
    list.push({ age: Number(m[2]), pop: Number(m[3]) })
    byYear.set(year, list)
  }
  return byYear
}

/** 2000s: plain monthly CSV — MONTH,YEAR,AGE,TOT_POP,…; July rows, 999 = total. */
async function rows2000s(): Promise<Map<number, AgeRow[]>> {
  const text = await fetchText(SOURCES.y2000s)
  const byYear = new Map<number, AgeRow[]>()
  for (const line of text.split('\n').slice(1)) {
    const [month, year, age, pop] = line.split(',')
    if (month !== '7' || Number(age) === 999) continue
    const y = Number(year)
    if (y >= 2010) continue // the 2010 point belongs to the vintage-2020 file
    const list = byYear.get(y) ?? []
    list.push({ age: Number(age), pop: Number(pop) })
    byYear.set(y, list)
  }
  return byYear
}

/** Vintage files: SEX,AGE,…,POPESTIMATE20XX columns; SEX 0 = both, age 100 = 100+. */
function parseVintage(csv: string, years: number[]): Map<number, AgeRow[]> {
  const lines = csv.trim().split('\n')
  const header = lines[0].split(',')
  const iSex = header.indexOf('SEX')
  const iAge = header.indexOf('AGE')
  const cols = new Map(years.map((y) => [y, header.indexOf(`POPESTIMATE${y}`)] as const))
  for (const [y, i] of cols) if (i < 0) throw new Error(`POPESTIMATE${y} column missing`)
  const byYear = new Map<number, AgeRow[]>(years.map((y) => [y, []]))
  for (const line of lines.slice(1)) {
    const c = line.split(',')
    if (Number(c[iSex]) !== 0 || Number(c[iAge]) > 100) continue
    for (const [y, i] of cols) byYear.get(y)!.push({ age: Number(c[iAge]), pop: Number(c[i]) })
  }
  return byYear
}

async function main() {
  const points: { year: number; medianAge18: number }[] = []
  const push = (year: number, rows: AgeRow[]) =>
    points.push({ year, medianAge18: Math.round(linearAdultMedian(rows) * 100) / 100 })

  console.log('1980…')
  push(1980, await rows1980())
  console.log('1990s…')
  for (const [year, rows] of await rows1990s()) push(year, rows)
  console.log('2000s…')
  for (const [year, rows] of await rows2000s()) push(year, rows)
  console.log('2010s…')
  for (const [year, rows] of parseVintage(
    await fetchText(SOURCES.y2010s),
    Array.from({ length: 10 }, (_, i) => 2010 + i),
  ))
    push(year, rows)
  console.log('2020s…')
  for (const [year, rows] of parseVintage(
    await fetchText(SOURCES.y2020s),
    Array.from({ length: 6 }, (_, i) => 2020 + i),
  ))
    push(year, rows)

  points.sort((a, b) => a.year - b.year)

  // Sanity, against independently published/derived anchors: 1980 ≈ 40.1,
  // 2025 ≈ 47.6, everything inside a band no plausible estimate leaves.
  const at = (y: number) => points.find((p) => p.year === y)!
  const assert = (cond: boolean, msg: string) => {
    if (!cond) throw new Error(`SANITY: ${msg}`)
  }
  assert(points.length >= 37, `only ${points.length} points`)
  assert(Math.abs(at(1980).medianAge18 - 40.1) < 0.5, `1980 = ${at(1980).medianAge18}, expected ≈40.1`)
  assert(Math.abs(at(2025).medianAge18 - 47.6) < 0.4, `2025 = ${at(2025).medianAge18}, expected ≈47.6`)
  assert(
    points.every((p) => p.medianAge18 > 38 && p.medianAge18 < 50),
    'a point escaped the plausible band',
  )

  await writeFile(
    'src/data/us-adult-median.json',
    JSON.stringify(
      {
        derivedAt: new Date().toISOString().slice(0, 10),
        method:
          'Median age of U.S. residents 18 and older, July 1 of each year, by linear interpolation within single years of age',
        basis: 'adults 18+ — the same baseline as population.json, not the all-ages median',
        sources: SOURCES,
        points,
      },
      null,
      2,
    ),
  )
  console.log(
    `us-adult-median.json written — ${points.length} points, 1980 ${at(1980).medianAge18} → 2025 ${at(2025).medianAge18}`,
  )
}

if (process.argv[1]?.endsWith('derive-us-medians.ts')) main().catch((e) => { console.error(e); process.exit(1) })
