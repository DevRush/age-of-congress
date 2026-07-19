export type Chamber = 'senate' | 'house'
export type Party = 'D' | 'R' | 'I'

export interface Member {
  bioguide: string
  name: string
  party: Party
  caucus?: Party
  chamber: Chamber
  state: string
  district?: number
  birthday: string // YYYY-MM-DD
  dobMs: number
  /**
   * Lifetime, both chambers — see src/lib/tenure.ts, which owns the only wording
   * allowed to print them. The year is when the first congressional term BEGAN
   * (not the election that produced it), and the count spans the House and the
   * Senate, so neither may be set under a chamber-specific label.
   */
  firstTookOfficeYear: number
  termsServed: number
  isVoting: boolean
}

export interface MemberCard extends Member {
  rank: number
  photo: string
}

export interface ChamberStats {
  meanDobMs: number
  medianDobMs: number
  count: number
  seats: number
}

export interface HistoricalPoint {
  congress: number
  year: number
  convening: string
  senateMean: number | null
  houseMean: number | null
  overallMean: number | null
  senateN: number
  houseN: number
  missingBirthday: number
  birthdayCoverage: number
}

export interface ContextLine {
  text: string
  footnote: string
}

/**
 * One Congress on the "Why It Stays Old" chart: the median age of the
 * representatives whose FIRST House term began at that Congress — the people
 * arriving, not the people serving. `n` counts every such arrival (including
 * members whose birth date is unknown); `medianAge` is the median over those
 * with a birth date, taken at the Congress's convening date, and is null only
 * when the whole cohort's birth dates are missing.
 */
export interface NewcomerPoint {
  congress: number
  year: number
  n: number
  medianAge: number | null
}
