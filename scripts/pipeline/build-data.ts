import { mkdir, writeFile } from 'node:fs/promises'
import sharp from 'sharp'
import { ageYears } from '../../src/lib/age'
import type { Member } from '../../src/lib/types'
import { generateContextLines } from './context-lines'
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
  console.log(`OK — ${overall.count} voting members, mean age ${meanAge.toFixed(2)}, ${ranked.length} portraits, ${contextLines.length} context lines, ${historical.length} congresses`)
}

main().catch((e) => { console.error(e); process.exit(1) })
