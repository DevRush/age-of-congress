import { mkdir, readFile, writeFile } from 'node:fs/promises'
import sharp from 'sharp'
import { ageYears } from '../../src/lib/age'
import type { Member } from '../../src/lib/types'
import { assertBirthdaySummary, computeBirthdays } from './birthdays'
import { generateContextLines } from './context-lines'
import {
  CENSUS_SOURCE,
  GAP_RANGE,
  MAP_GEOGRAPHY_CREDIT,
  assertDistrictAges,
  buildDistrictRows,
  districtGapStats,
  fetchDistrictAges,
} from './districts'
import { computeHistorical, congressNumber, flattenTerms } from './historical'
import { httpGet } from './http'
import { assertPartyAge, computePartyAge } from './party-age'
import overrides from './photo-overrides.json'
import { refreshPopulation } from './parse-census'
import { parseMembers } from './parse-members'
import { resolvePhoto } from './photos'
import { chamberStats, overallStats, rankOldest, rankYoungest, withRanks } from './stats'
import { fetchWikidataDobs, verifyBirthdays } from './wikidata'

const CURRENT_URL = 'https://unitedstates.github.io/congress-legislators/legislators-current.json'
const HISTORICAL_URL = 'https://unitedstates.github.io/congress-legislators/legislators-historical.json'

function gate(cond: boolean, msg: string): void {
  if (!cond) throw new Error(`GATE FAILED: ${msg}`)
}
const close = (a: number, b: number, tol: number) => Math.abs(a - b) <= tol

async function main() {
  const nowMs = Date.now()
  const nowIso = new Date(nowMs).toISOString()
  const today = nowIso.slice(0, 10)

  // The population baseline is re-derived nightly so population.json can never
  // silently diverge from its pinned Census source — but the source itself is
  // pinned to one vintage, so freshness gets its own gate: the Census publishes
  // a new vintage yearly, and once ours is ~18 months old a newer one must
  // exist. Failing here is the maintainer's cue to bump CENSUS_URL, the
  // POPESTIMATE column, and asOf in parse-census.ts. (This will fire around the
  // same time the 120th-Congress district-vintage gate does — one maintenance
  // session, on purpose.)
  console.log('Refreshing population baseline…')
  const population = await refreshPopulation()
  const POPULATION_MAX_AGE_DAYS = 550
  gate(
    nowMs - Date.parse(population.asOf) < POPULATION_MAX_AGE_DAYS * 86_400_000,
    `population baseline is dated ${population.asOf} — a newer Census vintage exists; bump CENSUS_URL, the POPESTIMATE column, and asOf in parse-census.ts`,
  )

  console.log('Fetching rosters…')
  const currentRaw = (await (await fetch(CURRENT_URL)).json()) as any[]
  const historicalRaw = (await (await fetch(HISTORICAL_URL)).json()) as any[]

  const { members, excludedNoBirthday } = parseMembers(currentRaw)
  const senate = chamberStats(members, 'senate')
  const house = chamberStats(members, 'house')
  const overall = overallStats(members)

  gate(senate.count >= 95 && senate.count <= 100, `senate count ${senate.count}`)
  gate(house.count >= 420 && house.count <= 435, `house voting count ${house.count}`)
  const meanAge = ageYears(overall.meanDobMs, nowMs)
  gate(meanAge > 50 && meanAge < 70, `implausible overall mean age ${meanAge.toFixed(2)}`)
  gate(excludedNoBirthday.length <= 5, `too many missing birthdays: ${excludedNoBirthday.join(', ')}`)

  const oldest = { senate: withRanks(rankOldest(members, 'senate')), house: withRanks(rankOldest(members, 'house')) }
  const youngest = { senate: withRanks(rankYoungest(members, 'senate')), house: withRanks(rankYoungest(members, 'house')) }
  const ranked = [...new Map(
    [...oldest.senate, ...oldest.house, ...youngest.senate, ...youngest.house].map((m) => [m.bioguide, m]),
  ).values()]

  console.log(`Cross-verifying ${ranked.length} birth dates against Wikidata…`)
  const errs = verifyBirthdays(ranked, await fetchWikidataDobs(ranked.map((m) => m.bioguide)))
  gate(errs.length === 0, `birth-date verification failed:\n  ${errs.join('\n  ')}`)

  console.log('Fetching portraits…')
  await mkdir('public/images/members', { recursive: true })
  for (const m of ranked) {
    const buf = await resolvePhoto(m.bioguide, overrides as Record<string, string>, httpGet)
    await sharp(buf).resize(320, 391, { fit: 'cover' }).webp({ quality: 82 }).toFile(`public/images/members/${m.bioguide}-320.webp`)
    await sharp(buf).resize(160, 196, { fit: 'cover' }).webp({ quality: 82 }).toFile(`public/images/members/${m.bioguide}-160.webp`)
  }

  console.log('Computing 1789→today averages…')
  const historical = computeHistorical(flattenTerms([...historicalRaw, ...currentRaw]), today)
  const at = (n: number) => historical.find((p) => p.congress === n)!

  // Seat-count sanity — the sharpest catch for the seat-vs-person bug. Counting a
  // member AND the replacement who filled their seat inflated the headcount and,
  // because replacements skew younger, biased every average low (the 119th read
  // 104 senators / 443 reps before the fix). The Senate has never seated more
  // than 100; the House has held its permanent 435 single-member-district size
  // since the 73rd Congress (1933). Earlier Congresses — the growing early House
  // and the 1913–1932 stretch when several states elected members "at large" ON
  // TOP of their districts — carry seats the @unitedstates data labels such that
  // one member per (state, district) key can still top 435, so they take the
  // wider historical ceiling. These bounds are hard: the corrected data must sit
  // under them for every Congress, not on average.
  const houseCap = (congress: number) => (congress >= 73 ? 435 : 442)
  const overseated = historical.filter((p) => p.houseN > houseCap(p.congress))
  gate(
    historical.every((p) => p.senateN <= 100),
    `a Congress seats more than 100 senators: ${historical.filter((p) => p.senateN > 100).map((p) => `${p.congress}=${p.senateN}`).join(', ')}`,
  )
  gate(
    overseated.length === 0,
    `a Congress seats more representatives than its chamber holds: ${overseated.map((p) => `${p.congress}=${p.houseN}`).join(', ')}`,
  )

  // Recent Congresses against the Congressional Research Service (R48535, the
  // 119th) and FiveThirtyEight's member-level set (66th, 97th). Tightened from
  // ±1.5 — the old tolerance was loose enough to swallow a 0.3-year bias, which
  // is exactly what the seat bug produced and how it went unnoticed.
  gate(close(at(119).senateMean!, 63.9, 0.3), `119th senate ${at(119).senateMean?.toFixed(2)} vs CRS 63.9`)
  gate(close(at(119).houseMean!, 57.9, 0.3), `119th house ${at(119).houseMean?.toFixed(2)} vs CRS 57.9`)
  gate(close(at(66).overallMean!, 51.7, 0.4), `66th overall ${at(66).overallMean?.toFixed(2)} vs 538 51.7`)
  gate(close(at(97).overallMean!, 49.5, 0.3), `97th overall ${at(97).overallMean?.toFixed(2)} vs 538 49.5`)
  gate(historical.filter((p) => p.congress >= 31).every((p) => p.birthdayCoverage >= 0.9), 'post-1849 birthday coverage below 90%')

  // "About 18% of members who served before 1850 lack birth dates" was the last
  // hand-asserted statistic in the Methodology. Now it is measured the way the
  // original research measured it — distinct people whose service ended before
  // 1850, counted once each — and written into notes so the page prints the
  // number this gate actually saw.
  const pre1850People = historicalRaw.filter((p: any) => {
    const ends = (p.terms ?? []).map((t: any) => t?.end).filter(Boolean)
    return ends.length > 0 && ends.sort().at(-1)! < '1850'
  })
  const pre1850Missing = pre1850People.filter((p: any) => !p.bio?.birthday).length
  const pre1850 = {
    people: pre1850People.length,
    missingBirthday: pre1850Missing,
    missingShare: pre1850Missing / Math.max(1, pre1850People.length),
  }
  gate(
    pre1850.people > 2000 && pre1850.missingShare > 0.05 && pre1850.missingShare < 0.35,
    `pre-1850 missing-birthday share ${(pre1850.missingShare * 100).toFixed(1)}% (${pre1850Missing}/${pre1850People.length}) is outside the plausible band`,
  )

  const contextLines = generateContextLines(overall.meanDobMs, overall.count)
  gate(contextLines.length >= 4, `only ${contextLines.length} context lines generated`)

  // "Across the Aisle" — party ages on the edition-year convention (same as The
  // Decades / The Shape of Congress), so the bands here line up with those bars.
  const editionYear = new Date(nowMs).getUTCFullYear()
  const partyAge = computePartyAge(members, editionYear)
  assertPartyAge(partyAge, members) // means present for D/R, bands partition, and the "same age" claim still holds

  console.log('Fetching district ages (ACS B01001, adult 18+ basis)…')
  const parsed = await fetchDistrictAges()
  assertDistrictAges(parsed) // 435 districts, 119th-Congress vintage, national ≈47.5
  const { rows: districtRows, unmatchedMembers } = buildDistrictRows(parsed.districts, members, nowMs)
  const gaps = districtGapStats(districtRows)

  gate(unmatchedMembers.length === 0, `House members matched no district: ${unmatchedMembers.join(', ')}`)
  gate(gaps.joined === house.count, `${gaps.joined} districts joined a member but the House roster has ${house.count}`)
  gate(gaps.vacant === 435 - house.count, `${gaps.vacant} district(s) without a member vs ${435 - house.count} House vacancies`)
  gate(
    gaps.minGap >= GAP_RANGE.min && gaps.maxGap <= GAP_RANGE.max,
    `age gap out of sane range: ${gaps.minGap} … ${gaps.maxGap} (expected ${GAP_RANGE.min}…${GAP_RANGE.max})`,
  )

  // The hex layout is committed, not fetched — but a roster/vintage shift must not silently
  // leave a district with no hex to colour, so re-verify the 435↔435 join every build.
  const geoTopo = JSON.parse(await readFile('src/data/districtsGeo.topo.json', 'utf8'))
  const geoIds = new Set<string>(
    (geoTopo.objects.districts.geometries as { properties: { GEOID: string } }[]).map((g) => g.properties.GEOID),
  )
  gate(geoIds.size === 435, `map geometry has ${geoIds.size} districts, expected 435`)
  const missingShape = districtRows.filter((r) => !geoIds.has(r.geoid)).map((r) => r.geoid)
  gate(missingShape.length === 0, `districts with no shape in the map geometry: ${missingShape.join(', ')}`)

  console.log('Grouping birthdays onto the calendar…')
  const birthdays = computeBirthdays(members)
  assertBirthdaySummary(birthdays, members) // partition of the voting roster: no member lost, none doubled
  const bstats = birthdays.stats

  gate(bstats.totalMembers === overall.count, `birthdays cover ${bstats.totalMembers} members, overall stats say ${overall.count}`)
  gate(bstats.maxDay.md !== null, 'no busiest birthday — the calendar is empty')
  // Seasonal clustering means actual collisions should EXCEED the uniform baseline. If they
  // ever fall far short, the grouping has broken (e.g. dates parsed to the wrong day).
  gate(
    bstats.sharingPairs >= birthdays.expected.expectedSharingPairs * 0.5,
    `only ${bstats.sharingPairs} sharing pairs vs a uniform expectation of ` +
      `${birthdays.expected.expectedSharingPairs.toFixed(1)} — birthday grouping looks broken`,
  )

  const toCard = (m: Member & { rank: number }) => ({ ...m, photo: `/images/members/${m.bioguide}-320.webp` })
  const siteData = {
    generatedAt: nowIso,
    congress: congressNumber(today),
    overall,
    senate,
    house,
    notes: {
      senateVacancies: 100 - senate.count,
      houseVacancies: 435 - house.count,
      houseDelegatesExcluded: members.filter((m) => m.chamber === 'house' && !m.isVoting).length,
      excludedNoBirthday,
      pre1850,
    },
    oldest: { senate: oldest.senate.map(toCard), house: oldest.house.map(toCard) },
    youngest: { senate: youngest.senate.map(toCard), house: youngest.house.map(toCard) },
    histogram: members.filter((m) => m.isVoting).map((m) => ({ birthYear: Number(m.birthday.slice(0, 4)), party: m.party, chamber: m.chamber })),
  }

  await mkdir('src/data', { recursive: true })
  await writeFile('src/data/congress.json', JSON.stringify(siteData, null, 2))
  await writeFile('src/data/historical.json', JSON.stringify(historical, null, 2))
  await writeFile('src/data/context-lines.json', JSON.stringify(contextLines, null, 2))
  await writeFile('src/data/party-age.json', JSON.stringify(partyAge, null, 2))
  await writeFile(
    'src/data/districts.json',
    JSON.stringify(
      {
        generatedAt: nowIso, // gapYears are ages as of this instant
        source: CENSUS_SOURCE,
        layout: MAP_GEOGRAPHY_CREDIT, // TIGER/Line, public domain — cited in the Methodology
        nationalAdultMedianAge: parsed.nationalAdultMedianAge,
        stats: gaps,
        districts: districtRows,
      },
      null,
      2,
    ),
  )
  await writeFile(
    'src/data/birthdays.json',
    JSON.stringify(
      {
        generatedAt: nowIso,
        stats: bstats,
        expected: birthdays.expected, // uniform-random baseline — actual runs ahead of it, by intent
        days: birthdays.days,
      },
      null,
      2,
    ),
  )
  console.log(`OK — ${overall.count} voting members, mean age ${meanAge.toFixed(2)}, ${ranked.length} portraits, ${contextLines.length} context lines, ${historical.length} congresses`)
  {
    const d = partyAge.overall.find((p) => p.party === 'D')!
    const r = partyAge.overall.find((p) => p.party === 'R')!
    const w = partyAge.welch.overall
    console.log(
      `   party — D ${d.meanAge.toFixed(1)} (n${d.n}) vs R ${r.meanAge.toFixed(1)} (n${r.n}), ` +
        `gap ${w.meanDiff.toFixed(2)}yr, Welch p=${w.p.toFixed(3)}, d=${w.cohenD.toFixed(3)}; ` +
        `80+ split D${partyAge.over80.D}/R${partyAge.over80.R}/I${partyAge.over80.I} of ${partyAge.over80.total}`,
    )
  }
  console.log(
    `   districts — ${districtRows.length} seats (${gaps.joined} joined, ${gaps.vacant} vacant), ` +
      `national adult median ${parsed.nationalAdultMedianAge?.toFixed(2)}, mean gap ${gaps.meanGap.toFixed(2)}, ` +
      `${(gaps.pctOlder * 100).toFixed(1)}% older than their district, range ${gaps.minGap}…${gaps.maxGap}`,
  )
  console.log(
    `   birthdays — ${bstats.distinctDaysUsed} days used, ${bstats.emptyDays} empty (expected ` +
      `${birthdays.expected.expectedEmptyDays.toFixed(1)}), ${bstats.sharingPairs} sharing pairs (expected ` +
      `${birthdays.expected.expectedSharingPairs.toFixed(1)}), ${bstats.membersSharing} members sharing, ` +
      `busiest ${bstats.maxDay.md} with ${bstats.maxDay.count}`,
  )
}

main().catch((e) => { console.error(e); process.exit(1) })
