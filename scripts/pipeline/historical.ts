import { ageYears, dobToMs } from '../../src/lib/age'
import type { HistoricalPoint } from '../../src/lib/types'
import { STATES_50 } from './parse-members'

export interface TermRec {
  pid: string
  start: string
  end: string
  type: 'sen' | 'rep'
  state: string
  /**
   * The seat this term filled, so a Congress is counted one member per SEAT and
   * not one per PERSON. A representative → state + district; a senator → state +
   * class. When a member dies or resigns mid-Congress and is replaced, both
   * occupants' terms overlap the span but share this key, so exactly one of them
   * is chosen (see `computeHistorical`). Deduping by person instead let both the
   * departed member and the replacement count, which inflated every chamber's
   * headcount and — because replacements skew younger — biased every average low.
   */
  seat: string
  dobMs: number | null
}

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

/** The seat a term filled. Reps: state + district; senators: state + class. */
function seatKey(t: { type: 'sen' | 'rep'; state: string; district?: unknown; class?: unknown }): string {
  return t.type === 'sen' ? `${t.state}|S${t.class}` : `${t.state}|D${t.district}`
}

export function flattenTerms(people: any[]): TermRec[] {
  const out: TermRec[] = []
  for (const p of people) {
    const dobMs = p.bio?.birthday ? dobToMs(p.bio.birthday) : null
    for (const t of p.terms) {
      out.push({ pid: p.id.bioguide, start: t.start, end: t.end, type: t.type, state: t.state, seat: seatKey(t), dobMs })
    }
  }
  return out
}

export function computeHistorical(terms: TermRec[], todayIso: string): HistoricalPoint[] {
  const points: HistoricalPoint[] = []
  const maxCongress = congressNumber(todayIso)
  for (let n = 1; n <= maxCongress; n++) {
    const conv = conveningDate(n)
    const nextConv = conveningDate(n + 1)
    const convMs = dobToMs(conv)

    // Group every term overlapping this Congress's span by the SEAT it filled.
    // Overlap (not instant-containment) is the right membership test because a
    // historical representative's term.start is often the member's actual
    // seating date — weeks or months after the constitutional convening — so an
    // instant test at the convening date would drop them (and once dropped a
    // whole early House reads as empty). Grouping by seat is what then keeps the
    // count honest: a seat contributes one member no matter how many people
    // passed through it during the two years.
    const bySeat = new Map<string, TermRec[]>()
    for (const t of terms) {
      if (!(t.start < nextConv && t.end > conv)) continue
      if (t.type === 'rep' && !STATES_50.has(t.state)) continue
      const g = bySeat.get(t.seat)
      if (g) g.push(t)
      else bySeat.set(t.seat, [t])
    }

    let sSum = 0, sN = 0, hSum = 0, hN = 0, missing = 0
    for (const group of bySeat.values()) {
      // Within a seat, choose the one member to represent it at the convening
      // date: the term that CONTAINS the convening date if one does (the sitting
      // occupant), otherwise the earliest-starting overlapping term (a seat
      // whose whole cohort was seated late — the norm for the earliest
      // Congresses, where every House term begins after March 4). Ties on the
      // start date break by bioguide id so the choice is deterministic.
      const holder = pickSeatHolder(group, conv)
      if (holder.dobMs == null) { missing++; continue }
      const age = ageYears(holder.dobMs, convMs)
      if (holder.type === 'sen') { sSum += age; sN++ } else { hSum += age; hN++ }
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

/** The single member counted for one seat in one Congress. See `computeHistorical`. */
function pickSeatHolder(group: TermRec[], conv: string): TermRec {
  const earlier = (a: TermRec, b: TermRec) =>
    b.start < a.start || (b.start === a.start && b.pid < a.pid) ? b : a
  let containing: TermRec | null = null
  let earliest = group[0]
  for (const t of group) {
    if (t.start <= conv && conv < t.end) containing = containing ? earlier(containing, t) : t
    earliest = earlier(earliest, t)
  }
  return containing ?? earliest
}
