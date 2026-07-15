import { ageYears, dobToMs } from '../../src/lib/age'
import type { HistoricalPoint } from '../../src/lib/types'
import { STATES_50 } from './parse-members'

export interface TermRec { pid: string; start: string; end: string; type: 'sen' | 'rep'; state: string; dobMs: number | null }

export function conveningDate(n: number): string {
  const year = 1789 + 2 * (n - 1)
  return n <= 73 ? `${year}-03-04` : `${year}-01-03`
}

export function congressNumber(isoDate: string): number {
  let n = Math.max(1, Math.floor((Number(isoDate.slice(0, 4)) - 1789) / 2) + 1)
  while (conveningDate(n + 1) <= isoDate) n++
  while (n > 1 && conveningDate(n) > isoDate) n--
  return n
}

export function flattenTerms(people: any[]): TermRec[] {
  const out: TermRec[] = []
  for (const p of people) {
    const dobMs = p.bio?.birthday ? dobToMs(p.bio.birthday) : null
    for (const t of p.terms) {
      out.push({ pid: p.id.bioguide, start: t.start, end: t.end, type: t.type, state: t.state, dobMs })
    }
  }
  return out
}

export function computeHistorical(terms: TermRec[], todayIso: string): HistoricalPoint[] {
  const points: HistoricalPoint[] = []
  const maxCongress = congressNumber(todayIso)
  for (let n = 1; n <= maxCongress; n++) {
    const conv = conveningDate(n)
    const convMs = dobToMs(conv)
    const seen = new Set<string>()
    let sSum = 0, sN = 0, hSum = 0, hN = 0, missing = 0
    for (const t of terms) {
      if (!(t.start < conveningDate(n + 1) && t.end > conv)) continue
      if (t.type === 'rep' && !STATES_50.has(t.state)) continue
      if (seen.has(t.pid)) continue
      seen.add(t.pid)
      if (t.dobMs == null) { missing++; continue }
      const age = ageYears(t.dobMs, convMs)
      if (t.type === 'sen') { sSum += age; sN++ } else { hSum += age; hN++ }
    }
    const serving = sN + hN + missing
    points.push({
      congress: n,
      year: Number(conv.slice(0, 4)),
      convening: conv,
      senateMean: sN ? sSum / sN : null,
      houseMean: hN ? hSum / hN : null,
      overallMean: sN + hN ? (sSum + hSum) / (sN + hN) : null,
      senateN: sN,
      houseN: hN,
      missingBirthday: missing,
      birthdayCoverage: serving ? (sN + hN) / serving : 0,
    })
  }
  return points
}
