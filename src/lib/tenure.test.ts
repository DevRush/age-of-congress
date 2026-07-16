import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import congress from '@/data/congress.json'
import { TENURE_SCOPE, termsPhrase, tookOfficePhrase } from './tenure'

/** Any word that would scope a lifetime figure to one chamber. */
const CHAMBER_WORD = /senate|senator|house|representative|congressman|congresswoman/i

describe('termsPhrase', () => {
  it('always names Congress, never a chamber', () => {
    for (let n = 0; n <= 40; n++) {
      expect(termsPhrase(n)).toContain(TENURE_SCOPE)
      expect(termsPhrase(n)).not.toMatch(CHAMBER_WORD)
    }
  })
  it('agrees with itself on number', () => {
    expect(termsPhrase(1)).toBe('1 term in Congress')
    expect(termsPhrase(3)).toBe('3 terms in Congress')
    expect(termsPhrase(23)).toBe('23 terms in Congress')
  })
})

describe('tookOfficePhrase', () => {
  it('claims a first, not a continuous since — nineteen sitting members have a break in service', () => {
    expect(tookOfficePhrase(1975)).toBe('first took office 1975')
    expect(tookOfficePhrase(1975)).not.toMatch(/\bsince\b/i)
  })
  it('claims an office, not an election — a member elected in Nov 1974 takes office in Jan 1975', () => {
    expect(tookOfficePhrase(1975)).not.toMatch(/elect/i)
  })
  it('never names a chamber', () => {
    expect(tookOfficePhrase(2013)).not.toMatch(CHAMBER_WORD)
  })
})

/**
 * The gate that matters.
 *
 * `termsServed` and `firstTookOfficeYear` sum across BOTH chambers, and the
 * Rankings lists are headed "The Ten Oldest Senators" / "…Representatives". The
 * failure this guards is the one that shipped: a lifetime figure printed under a
 * chamber-specific heading with nothing in the label to scope it.
 *
 * Rather than trying to parse the rendered sentence, this pins the only route the
 * raw figures have onto the page. They may reach JSX through `termsPhrase` and
 * `tookOfficePhrase` and no other way; those two are held above to always say
 * "in Congress" and never to spell a chamber. Interpolate `m.termsServed`
 * directly again and this fails.
 */
describe('Rankings may not state the lifetime figures itself', () => {
  const src = readFileSync(new URL('../components/Rankings.tsx', import.meta.url), 'utf8')

  it('routes both figures through the scoped helpers', () => {
    expect(src).toMatch(/termsPhrase\(\s*m\.termsServed\s*\)/)
    expect(src).toMatch(/tookOfficePhrase\(\s*m\.firstTookOfficeYear\s*\)/)
  })

  it('interpolates neither figure raw into the markup', () => {
    expect(src).not.toMatch(/\{\s*m\.termsServed/)
    expect(src).not.toMatch(/\{\s*m\.firstTookOfficeYear/)
  })

  it('does not call a term count "elected", the old label that was a year early', () => {
    expect(src).not.toMatch(/first elected/i)
  })
})

/**
 * And the reason the gate is not theoretical: the committed lists really do carry
 * members whose lifetime terms would be nonsense read as Senate terms.
 */
describe('the committed roster contains members the chamber reading would libel', () => {
  const senators = [...congress.oldest.senate, ...congress.youngest.senate]

  it('has at least one senator whose lifetime terms exceed any possible Senate service', () => {
    const nowYear = new Date(congress.generatedAt).getUTCFullYear()
    const impossible = senators.filter((m) => {
      const ageNow = nowYear - Number(m.birthday.slice(0, 4))
      // Six years a Senate term. If the figure were Senate terms, this member
      // would have been sworn in before they were born.
      return m.termsServed * 6 > ageNow
    })
    expect(impossible.length).toBeGreaterThan(0)
  })
})
