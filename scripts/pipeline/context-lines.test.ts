import { describe, expect, it } from 'vitest'
import { dobToMs } from '../../src/lib/age'
import { generateContextLines } from './context-lines'

describe('context lines', () => {
  const lines1966 = generateContextLines(dobToMs('1966-06-01'), 530)

  it('emits the ballpoint-vs-iPhone line for a 1966 mean', () => {
    expect(lines1966.map((l) => l.text)).toContain(
      'The average member of Congress was born closer to the first ballpoint pen sold in America than the iPhone.',
    )
  })
  it('emits the Apollo 11 age line', () => {
    expect(lines1966.map((l) => l.text)).toContain(
      'The average member of Congress was 3 years old when Apollo 11 landed on the Moon.',
    )
  })
  it('every footnote cites the mean birth date and sources', () => {
    for (const l of lines1966) {
      expect(l.footnote).toContain('June 1, 1966')
      expect(l.footnote).toContain('530')
    }
  })
  it('drops lines whose truth condition fails for a younger Congress', () => {
    const lines1990 = generateContextLines(dobToMs('1990-01-01'), 530)
    const texts = lines1990.map((l) => l.text)
    expect(texts.join(' ')).not.toContain('Apollo 11')
    expect(texts.join(' ')).not.toContain('Sputnik than')
  })
  it('produces at least 6 lines for the real 1966 mean', () => {
    expect(lines1966.length).toBeGreaterThanOrEqual(6)
  })
})
