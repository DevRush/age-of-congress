/**
 * The tenure line under a ranked member's name — the one place on this page where
 * a figure has to survive being read underneath a chamber-specific heading.
 *
 * Both figures the line carries are LIFETIME, Congress-wide totals. `termsServed`
 * counts every term a member has served in either chamber, and `firstTookOfficeYear`
 * is the year their first congressional term began. Ten of the forty members on
 * these four lists reached their current seat from the other chamber, so a
 * chamber reading of either figure is simply false: Ed Markey's 23 terms are 20
 * in the House and 3 in the Senate, and "23 terms" set under "The Ten Oldest
 * Senators" claims 138 years of Senate service from a man who joined it in 2013.
 *
 * The heading cannot be trusted to scope the number, so the scope is welded into
 * the label instead: the terms figure always carries "in Congress", and it leads
 * the line, so that if the line truncates on a narrow screen what survives is
 * still both true and scoped.
 *
 * "first took office" is exactly what the year supports, and no more:
 *
 *   - It is not the election year. A member elected in November 1974 takes office
 *     in January 1975, and the term's start date is all the roster records — the
 *     old "first elected 1975" was a year late for every regularly elected member
 *     on the page.
 *   - It is not a "since". Nineteen sitting members have a break in their service
 *     — Kweisi Mfume left the House in 1996 and returned in 2020 — so "in Congress
 *     since 1987" would become a false continuity claim the day one of them ages
 *     onto a list. A "first" stays true whether or not the service ever paused.
 *
 * Keeping the wording here rather than inline in the component is the gate: the
 * raw figures have exactly one route onto the page, and it is a route that cannot
 * spell a chamber.
 */

/** Written into the label rather than left to the section heading — see above. */
export const TENURE_SCOPE = 'in Congress'

/** "23 terms in Congress" / "1 term in Congress" — lifetime, both chambers, and it says so. */
export function termsPhrase(termsServed: number): string {
  return `${termsServed} ${termsServed === 1 ? 'term' : 'terms'} ${TENURE_SCOPE}`
}

/** "first took office 1975" — the year the first congressional term began. */
export function tookOfficePhrase(firstTookOfficeYear: number): string {
  return `first took office ${firstTookOfficeYear}`
}
