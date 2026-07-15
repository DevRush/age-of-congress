import { USER_AGENT } from './http'

export const WDQS = 'https://query.wikidata.org/sparql'

export interface WdDob { date: string; precision: number; rank: string }

export function buildSparql(bioguides: string[]): string {
  return `SELECT ?bioguide ?dob ?precision ?rank WHERE {
  VALUES ?bioguide { ${bioguides.map((b) => JSON.stringify(b)).join(' ')} }
  ?person wdt:P1157 ?bioguide .
  ?person p:P569 ?st .
  ?st psv:P569 ?v .
  ?v wikibase:timeValue ?dob ; wikibase:timePrecision ?precision .
  ?st wikibase:rank ?rank .
}`
}

export function extractDobs(resp: any): Map<string, WdDob[]> {
  const map = new Map<string, WdDob[]>()
  for (const b of resp.results.bindings) {
    const rank = String(b.rank.value).split('#').pop() ?? ''
    if (rank === 'DeprecatedRank') continue
    const id = b.bioguide.value
    const rows = map.get(id) ?? []
    rows.push({ date: b.dob.value.slice(0, 10), precision: Number(b.precision.value), rank })
    map.set(id, rows)
  }
  for (const [id, rows] of map) {
    const preferred = rows.filter((r) => r.rank === 'PreferredRank')
    const use = preferred.length ? preferred : rows
    const seen = new Set<string>()
    map.set(id, use.filter((r) => {
      const k = `${r.date}|${r.precision}`
      if (seen.has(k)) return false
      seen.add(k)
      return true
    }))
  }
  return map
}

export function verifyBirthdays(
  members: { bioguide: string; name: string; birthday: string }[],
  dobs: Map<string, WdDob[]>,
): string[] {
  const errs: string[] = []
  for (const m of members) {
    const rows = dobs.get(m.bioguide)
    if (!rows?.length) { errs.push(`${m.bioguide} ${m.name}: not found in Wikidata`); continue }
    const matches = (w: WdDob) => {
      const len = w.precision >= 11 ? 10 : w.precision === 10 ? 7 : 4
      return w.date.slice(0, len) === m.birthday.slice(0, len)
    }
    if (rows.some(matches)) continue
    const shown = rows.map((r) => r.date).join(', ')
    errs.push(`${m.bioguide} ${m.name}: roster ${m.birthday} not corroborated by Wikidata (${shown})`)
  }
  return errs
}

export async function fetchWikidataDobs(bioguides: string[]): Promise<Map<string, WdDob[]>> {
  const url = `${WDQS}?format=json&query=${encodeURIComponent(buildSparql(bioguides))}`
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT, Accept: 'application/sparql-results+json' } })
  if (!res.ok) throw new Error(`Wikidata query failed: HTTP ${res.status}`)
  return extractDobs(await res.json())
}
