import { ageYears, dobToMs } from '../../src/lib/age'
import { monthDayYear } from '../../src/lib/format'
import type { ContextLine } from '../../src/lib/types'
import { MILESTONES, type Milestone } from './milestones'

const byId = new Map(MILESTONES.map((m) => [m.id, m]))
const ms = (id: string): Milestone => {
  const m = byId.get(id)
  if (!m) throw new Error(`unknown milestone ${id}`)
  return m
}

const CLOSER_PAIRS: [string, string][] = [
  ['ballpoint', 'iphone'],
  ['sputnik', 'iphone'],
  ['transistor', 'facebook'],
  ['nasa', 'google'],
  ['polio', 'wall'],
]

const AGE_AT = ['moon', 'arpanet', 'wall', 'web', 'google', 'facebook', 'iphone']

export function generateContextLines(meanDobMsVal: number, voterCount: number): ContextLine[] {
  const lines: ContextLine[] = []
  const meanPhrase = monthDayYear(meanDobMsVal)
  const base = `Based on the mean birth date of the ${voterCount} voting members of Congress: ${meanPhrase}.`
  const fmt = (m: Milestone) => `${m.noun[0].toUpperCase()}${m.noun.slice(1)}: ${monthDayYear(dobToMs(m.date))} (${m.source}).`

  for (const [aId, bId] of CLOSER_PAIRS) {
    const a = ms(aId); const b = ms(bId)
    const da = Math.abs(meanDobMsVal - dobToMs(a.date))
    const db = Math.abs(dobToMs(b.date) - meanDobMsVal)
    if (da < db) {
      lines.push({
        text: `The average member of Congress was born closer to ${a.noun} than ${b.noun}.`,
        footnote: `${base} ${fmt(a)} ${fmt(b)}`,
      })
    }
  }

  for (const id of AGE_AT) {
    const m = ms(id)
    const yrs = Math.floor(ageYears(meanDobMsVal, dobToMs(m.date)))
    if (yrs >= 1) {
      lines.push({
        text: `The average member of Congress was ${yrs} years old when ${m.clause}.`,
        footnote: `${base} ${fmt(m)}`,
      })
    }
  }

  return lines
}
