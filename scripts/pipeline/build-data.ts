import { mkdir, readFile, writeFile } from 'node:fs/promises'
import sharp from 'sharp'
import { ageYears } from '../../src/lib/age'
import type { Member } from '../../src/lib/types'
import { assertBirthdaySummary, computeBirthdays } from './birthdays'
import { generateContextLines } from './context-lines'
import {
  CENSUS_SOURCE,
  GAP_RANGE,
  HEX_LAYOUT_CREDIT,
  assertDistrictAges,
  buildDistrictRows,
  districtGapStats,
  fetchDistrictAges,
} from './districts'
import { computeHistorical, congressNumber, flattenTerms } from './historical'
import { httpGet } from './http'
import overrides from './photo-overrides.json'
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
  gate(close(at(119).senateMean!, 63.9, 1.5), `119th senate ${at(119).senateMean?.toFixed(2)} vs CRS 63.9`)
  gate(close(at(119).houseMean!, 57.9, 1.5), `119th house ${at(119).houseMean?.toFixed(2)} vs CRS 57.9`)
  gate(close(at(66).overallMean!, 51.7, 1.5), `66th overall ${at(66).overallMean?.toFixed(2)} vs 538 51.7`)
  gate(close(at(97).overallMean!, 49.5, 1.5), `97th overall ${at(97).overallMean?.toFixed(2)} vs 538 49.5`)
  gate(historical.filter((p) => p.congress >= 31).every((p) => p.birthdayCoverage >= 0.9), 'post-1849 birthday coverage below 90%')

  const contextLines = generateContextLines(overall.meanDobMs, overall.count)
  gate(contextLines.length >= 4, `only ${contextLines.length} context lines generated`)

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
  const hexTopo = JSON.parse(await readFile('src/data/hex435.topo.json', 'utf8'))
  const hexGeoids = new Set<string>(
    (hexTopo.objects.HexCDv31.geometries as { properties: { GEOID: string } }[]).map((g) => g.properties.GEOID),
  )
  gate(hexGeoids.size === 435, `hex layout has ${hexGeoids.size} districts, expected 435`)
  const missingHex = districtRows.filter((r) => !hexGeoids.has(r.geoid)).map((r) => r.geoid)
  gate(missingHex.length === 0, `districts with no hex in the layout: ${missingHex.join(', ')}`)

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
    },
    oldest: { senate: oldest.senate.map(toCard), house: oldest.house.map(toCard) },
    youngest: { senate: youngest.senate.map(toCard), house: youngest.house.map(toCard) },
    histogram: members.filter((m) => m.isVoting).map((m) => ({ birthYear: Number(m.birthday.slice(0, 4)), party: m.party, chamber: m.chamber })),
  }

  await mkdir('src/data', { recursive: true })
  await writeFile('src/data/congress.json', JSON.stringify(siteData, null, 2))
  await writeFile('src/data/historical.json', JSON.stringify(historical, null, 2))
  await writeFile('src/data/context-lines.json', JSON.stringify(contextLines, null, 2))
  await writeFile(
    'src/data/districts.json',
    JSON.stringify(
      {
        generatedAt: nowIso, // gapYears are ages as of this instant
        source: CENSUS_SOURCE,
        layout: HEX_LAYOUT_CREDIT, // CC BY 4.0 — attribution is required wherever the hexmap renders
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
