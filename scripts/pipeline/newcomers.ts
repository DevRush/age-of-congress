import { ageYears, dobToMs } from '../../src/lib/age'
import type { NewcomerPoint } from '../../src/lib/types'
import { congressNumber, conveningDate } from './historical'
import { STATES_50 } from './parse-members'

/**
 * The arithmetic behind "Why It Stays Old": for each Congress, the median age of
 * the representatives ARRIVING — people whose first House term began there.
 *
 * The claim this series carries is the one that kills the lazy explanation for
 * the gerontocracy: turnover did not fall, the arrivals got older. That claim is
 * only as good as the definition of "arrival", so the definition is pinned by
 * tests rather than prose:
 *
 *   - A person's arrival is their EARLIEST voting House term — `type: "rep"`,
 *     in one of the fifty states. A territorial delegate never arrives, and a
 *     representative who later becomes a senator does not arrive twice.
 *   - A member who left and returned counts once, at the genuine first arrival —
 *     `min(start)`, not each start.
 *   - The cohort's ages are measured at its Congress's CONVENING date, the same
 *     basis The Long View uses, so the two charts can never disagree about what
 *     "age in 1979" means. A member seated mid-Congress by special election is
 *     part of that Congress's cohort, aged to the same fixed date.
 *   - `n` counts every arrival; the median is taken over those with a known
 *     birth date, and is null only when a whole cohort lacks them.
 */
export function computeNewcomers(peopleRaw: any[], todayIso: string): NewcomerPoint[] {
  const current = congressNumber(todayIso)

  // Each person's first voting House term, filed under the Congress it began in.
  const arrivalsByCongress = new Map<number, (string | null)[]>()
  for (const p of peopleRaw) {
    const starts: string[] = (p.terms ?? [])
      .filter((t: any) => t?.type === 'rep' && typeof t.start === 'string' && STATES_50.has(t.state))
      .map((t: any) => t.start as string)
      .sort()
    if (starts.length === 0) continue
    const n = congressNumber(starts[0])
    if (n < 1 || n > current) continue
    const list = arrivalsByCongress.get(n) ?? []
    list.push(p.bio?.birthday ?? null)
    arrivalsByCongress.set(n, list)
  }

  const out: NewcomerPoint[] = []
  for (let n = 1; n <= current; n++) {
    const conv = conveningDate(n)
    const convMs = dobToMs(conv)
    const cohort = arrivalsByCongress.get(n) ?? []
    const ages = cohort
      .filter((b): b is string => b !== null)
      .map((b) => ageYears(dobToMs(b), convMs))
      .sort((a, b) => a - b)
    const mid =
      ages.length === 0
        ? null
        : ages.length % 2
          ? ages[(ages.length - 1) / 2]
          : (ages[ages.length / 2 - 1] + ages[ages.length / 2]) / 2
    out.push({ congress: n, year: Number(conv.slice(0, 4)), n: cohort.length, medianAge: mid })
  }
  return out
}
