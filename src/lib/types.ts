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
