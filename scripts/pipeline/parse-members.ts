import { dobToMs } from '../../src/lib/age'
import type { Member, Party } from '../../src/lib/types'

export const STATES_50 = new Set(['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'])

const PARTY: Record<string, Party> = { Democrat: 'D', Republican: 'R', Independent: 'I' }

export function parseMembers(raw: any[]): { members: Member[]; excludedNoBirthday: string[] } {
  const members: Member[] = []
  const excludedNoBirthday: string[] = []
  for (const p of raw) {
    if (!p.bio?.birthday) {
      excludedNoBirthday.push(p.id.bioguide)
      continue
    }
    const t = p.terms[p.terms.length - 1]
    members.push({
      bioguide: p.id.bioguide,
      name: p.name.official_full ?? `${p.name.first} ${p.name.last}`,
      party: PARTY[t.party] ?? 'I',
      caucus: t.caucus ? PARTY[t.caucus] : undefined,
      chamber: t.type === 'sen' ? 'senate' : 'house',
      state: t.state,
      district: t.type === 'rep' ? t.district : undefined,
      birthday: p.bio.birthday,
      dobMs: dobToMs(p.bio.birthday),
      /**
       * Both figures are LIFETIME and cross both chambers. 43 of the current
       * roster moved from the House to the Senate — Markey's 23 terms are 20
       * House terms and 3 Senate ones — so neither figure describes service in
       * the seat the member currently holds, and neither may be printed under a
       * chamber-specific label. src/lib/tenure.ts owns the wording that keeps
       * that honest.
       *
       * `start` is when the term began, not when the member won it: a member
       * elected in November 1974 has a term starting January 1975. The year is
       * an office-taking year and is labelled as one.
       */
      firstTookOfficeYear: Math.min(...p.terms.map((x: any) => Number(x.start.slice(0, 4)))),
      termsServed: p.terms.length,
      isVoting: t.type === 'sen' || STATES_50.has(t.state),
    })
  }
  return { members, excludedNoBirthday }
}
