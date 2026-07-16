import type { Chamber, Member, Party } from '../../src/lib/types'

/**
 * "Across the Aisle" — the one figure on this page that is about party rather
 * than about a person, and the most politically load-bearing thing the site
 * publishes. The finding it has to state correctly is counterintuitive and
 * bipartisan: the two parties' AVERAGE ages are statistically indistinguishable,
 * and the age skew everyone assumes is partisan lives entirely in the extreme
 * tail — and even there, only in the House.
 *
 * Everything here is recomputed from the live voting roster every build, so no
 * number can go stale, and the descriptive counts on the page are read straight
 * out of this file. Two conventions are pinned so the section can never quietly
 * disagree with the rest of the page:
 *
 *   - Age is the edition-year convention — the age each member reaches during the
 *     edition year, `atYear - birthYear` — the SAME convention "The Decades" and
 *     "The Shape of Congress" already use. That is what makes the age bands here
 *     (65+, 70+, …) line up exactly with the bars in those sections.
 *   - Party is the member's CURRENT-term party. The three Independents (Sanders,
 *     King, and one representative) are tallied as their own group, never folded
 *     into whichever party they caucus with — folding them in would be a thumb on
 *     the scale of the very comparison this section is careful about.
 */

const PARTIES: Party[] = ['D', 'R', 'I']
const BAND_THRESHOLDS = [65, 70, 75, 80] as const

export interface PartyStat {
  party: Party
  n: number
  meanAge: number
}

export interface Band {
  threshold: number
  D: number
  R: number
  I: number
  total: number
}

export interface TailMember {
  bioguide: string
  name: string
  party: Party
  chamber: Chamber
  state: string
  age: number
}

/**
 * Welch's two-sample t-test, D vs R, on one group of ages. Welch (unequal
 * variance) rather than Student because there is no reason to assume the two
 * parties' age spreads are identical. `p` is two-sided; `cohenD` is the pooled
 * standardized mean difference — the effect size that keeps a large-n p-value
 * honest (a huge sample can make a trivial gap "significant").
 */
export interface Welch {
  group: string
  nD: number
  nR: number
  meanD: number
  meanR: number
  meanDiff: number // D - R, in years
  t: number
  df: number
  p: number
  cohenD: number
}

export interface PartyAgeSummary {
  atYear: number
  convention: string
  overall: PartyStat[]
  senate: PartyStat[]
  house: PartyStat[]
  /** Age bands over the whole voting roster. */
  bands: Band[]
  /** The same bands over the House alone — where the tail skew is robust. */
  houseBands: Band[]
  /** The 80-and-older group, split by party, with its members named. */
  over80: { total: number; D: number; R: number; I: number; members: TailMember[] }
  /** Welch t-test of the D-vs-R mean-age gap, overall and in the Senate. */
  welch: { overall: Welch; senate: Welch }
}

function gate(cond: boolean, msg: string): void {
  if (!cond) throw new Error(`GATE FAILED: ${msg}`)
}

const birthYear = (m: Member): number => Number(m.birthday.slice(0, 4))
/** Edition-year age: the age the member reaches during `atYear`. */
export const editionAge = (m: Member, atYear: number): number => atYear - birthYear(m)

const mean = (xs: number[]): number => xs.reduce((a, b) => a + b, 0) / xs.length
/** Sample variance (n − 1). */
function sampleVar(xs: number[], m: number): number {
  return xs.reduce((a, x) => a + (x - m) ** 2, 0) / (xs.length - 1)
}

function partyStats(members: Member[], atYear: number): PartyStat[] {
  return PARTIES.map((party) => {
    const ages = members.filter((m) => m.party === party).map((m) => editionAge(m, atYear))
    return { party, n: ages.length, meanAge: ages.length ? mean(ages) : 0 }
  }).filter((s) => s.n > 0)
}

function band(members: Member[], atYear: number, threshold: number): Band {
  const over = members.filter((m) => editionAge(m, atYear) >= threshold)
  const by = (p: Party) => over.filter((m) => m.party === p).length
  return { threshold, D: by('D'), R: by('R'), I: by('I'), total: over.length }
}

// ── Welch t-test machinery ────────────────────────────────────────────────
// Regularized incomplete beta via the Lentz continued fraction (Numerical
// Recipes), used for the Student-t two-sided p-value. Self-contained so the
// pipeline pulls in no stats dependency.

function gammln(x: number): number {
  const cof = [
    76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155,
    0.1208650973866179e-2, -0.5395239384953e-5,
  ]
  let y = x
  let tmp = x + 5.5
  tmp -= (x + 0.5) * Math.log(tmp)
  let ser = 1.000000000190015
  for (let j = 0; j < 6; j++) {
    y += 1
    ser += cof[j] / y
  }
  return -tmp + Math.log((2.5066282746310005 * ser) / x)
}

function betacf(a: number, b: number, x: number): number {
  const MAXIT = 200
  const EPS = 3e-12
  const FPMIN = 1e-300
  const qab = a + b
  const qap = a + 1
  const qam = a - 1
  let c = 1
  let d = 1 - (qab * x) / qap
  if (Math.abs(d) < FPMIN) d = FPMIN
  d = 1 / d
  let h = d
  for (let m = 1; m <= MAXIT; m++) {
    const m2 = 2 * m
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2))
    d = 1 + aa * d
    if (Math.abs(d) < FPMIN) d = FPMIN
    c = 1 + aa / c
    if (Math.abs(c) < FPMIN) c = FPMIN
    d = 1 / d
    h *= d * c
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2))
    d = 1 + aa * d
    if (Math.abs(d) < FPMIN) d = FPMIN
    c = 1 + aa / c
    if (Math.abs(c) < FPMIN) c = FPMIN
    d = 1 / d
    const del = d * c
    h *= del
    if (Math.abs(del - 1) < EPS) break
  }
  return h
}

/** Regularized incomplete beta I_x(a,b). */
export function betai(a: number, b: number, x: number): number {
  if (x <= 0) return 0
  if (x >= 1) return 1
  const bt = Math.exp(
    gammln(a + b) - gammln(a) - gammln(b) + a * Math.log(x) + b * Math.log(1 - x),
  )
  return x < (a + 1) / (a + b + 2)
    ? (bt * betacf(a, b, x)) / a
    : 1 - (bt * betacf(b, a, 1 - x)) / b
}

/** Two-sided p-value for a Student-t statistic with `df` degrees of freedom. */
export function studentTwoSidedP(t: number, df: number): number {
  return betai(df / 2, 0.5, df / (df + t * t))
}

export function welchTest(group: string, aAges: number[], bAges: number[]): Welch {
  const nD = aAges.length
  const nR = bAges.length
  const meanD = mean(aAges)
  const meanR = mean(bAges)
  const vD = sampleVar(aAges, meanD)
  const vR = sampleVar(bAges, meanR)
  const seD = vD / nD
  const seR = vR / nR
  const se = Math.sqrt(seD + seR)
  const t = (meanD - meanR) / se
  const df = (seD + seR) ** 2 / (seD ** 2 / (nD - 1) + seR ** 2 / (nR - 1))
  const p = studentTwoSidedP(t, df)
  const pooledSd = Math.sqrt(((nD - 1) * vD + (nR - 1) * vR) / (nD + nR - 2))
  const cohenD = (meanD - meanR) / pooledSd
  return { group, nD, nR, meanD, meanR, meanDiff: meanD - meanR, t, df, p, cohenD }
}

function welchByParty(members: Member[], atYear: number, group: string): Welch {
  const ages = (p: Party) =>
    members.filter((m) => m.party === p).map((m) => editionAge(m, atYear))
  return welchTest(group, ages('D'), ages('R'))
}

export function computePartyAge(members: readonly Member[], atYear: number): PartyAgeSummary {
  const voting = members.filter((m) => m.isVoting)
  const house = voting.filter((m) => m.chamber === 'house')
  const senate = voting.filter((m) => m.chamber === 'senate')

  const bands = BAND_THRESHOLDS.map((t) => band(voting, atYear, t))
  const houseBands = BAND_THRESHOLDS.map((t) => band(house, atYear, t))

  const over80Members: TailMember[] = voting
    .filter((m) => editionAge(m, atYear) >= 80)
    .map((m) => ({
      bioguide: m.bioguide,
      name: m.name,
      party: m.party,
      chamber: m.chamber,
      state: m.state,
      age: editionAge(m, atYear),
    }))
    .sort((a, b) => b.age - a.age || a.name.localeCompare(b.name))

  const over80 = {
    total: over80Members.length,
    D: over80Members.filter((m) => m.party === 'D').length,
    R: over80Members.filter((m) => m.party === 'R').length,
    I: over80Members.filter((m) => m.party === 'I').length,
    members: over80Members,
  }

  return {
    atYear,
    convention: 'edition-year age (atYear − birthYear); current-term party; Independents shown separately',
    overall: partyStats(voting, atYear),
    senate: partyStats(senate, atYear),
    house: partyStats(house, atYear),
    bands,
    houseBands,
    over80,
    welch: {
      overall: welchByParty(voting, atYear, 'overall'),
      senate: welchByParty(senate, atYear, 'senate'),
    },
  }
}

/**
 * Fail-loud gates. A roster shift may move every number here, but the arithmetic
 * and — critically — the published editorial claim must hold, or the build stops
 * rather than shipping a false statement about the parties.
 */
export function assertPartyAge(summary: PartyAgeSummary, members: readonly Member[]): void {
  const voting = members.filter((m) => m.isVoting)

  // Required: means present for both major parties, on both a chamber and overall.
  const hasParty = (stats: PartyStat[], p: Party) => stats.some((s) => s.party === p && s.n > 0)
  gate(
    hasParty(summary.overall, 'D') && hasParty(summary.overall, 'R'),
    'party means missing for D or R overall',
  )
  gate(
    hasParty(summary.senate, 'D') && hasParty(summary.senate, 'R'),
    'party means missing for D or R in the Senate',
  )
  gate(
    hasParty(summary.house, 'D') && hasParty(summary.house, 'R'),
    'party means missing for D or R in the House',
  )

  // Required: band counts partition correctly, and match a direct recount.
  for (const b of summary.bands) {
    gate(b.D + b.R + b.I === b.total, `band ${b.threshold}+: D+R+I ${b.D + b.R + b.I} != total ${b.total}`)
    const recount = voting.filter((m) => summary.atYear - Number(m.birthday.slice(0, 4)) >= b.threshold).length
    gate(b.total === recount, `band ${b.threshold}+: total ${b.total} != recount ${recount}`)
  }
  // Bands are nested: each higher threshold is a subset of the one below it.
  for (let i = 1; i < summary.bands.length; i++) {
    gate(
      summary.bands[i].total <= summary.bands[i - 1].total,
      `band ${summary.bands[i].threshold}+ (${summary.bands[i].total}) exceeds ${summary.bands[i - 1].threshold}+ (${summary.bands[i - 1].total})`,
    )
  }

  // The 80+ tail is the section's second claim; its split must match the 80 band
  // and its named roster must have exactly that many people.
  const b80 = summary.bands.find((b) => b.threshold === 80)!
  gate(summary.over80.total === b80.total, `over80 total ${summary.over80.total} != band ${b80.total}`)
  gate(summary.over80.D === b80.D && summary.over80.R === b80.R && summary.over80.I === b80.I, 'over80 party split disagrees with the 80+ band')
  gate(summary.over80.members.length === summary.over80.total, 'over80 member list length disagrees with its own total')

  // The published inferential claim — "statistically indistinguishable on
  // average" — must stay TRUE. If a future roster ever made the D-vs-R mean gap
  // significant, the headline would become false; fail loudly so a human revisits
  // the wording rather than letting the page assert something the data no longer
  // supports. Current margin is enormous (p ≈ 0.5, |gap| < 1 yr), so these bounds
  // only trip on a real regime change.
  gate(
    Math.abs(summary.welch.overall.meanDiff) < 3,
    `D-vs-R mean age gap ${summary.welch.overall.meanDiff.toFixed(2)}yr is no longer small — revisit "same age on average"`,
  )
  gate(
    summary.welch.overall.p > 0.05,
    `D-vs-R mean ages are now statistically distinguishable (p=${summary.welch.overall.p.toFixed(3)}) — the headline claim no longer holds`,
  )
}
