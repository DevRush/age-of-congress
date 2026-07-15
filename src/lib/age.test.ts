import { describe, expect, it } from 'vitest'
import { MS_PER_YEAR, agePartsAt, ageYears, dobToMs, meanDobMs, medianDobMs } from './age'

const NOW = Date.UTC(2026, 6, 14, 12) // 2026-07-14 12:00 UTC

describe('age math', () => {
  it('computes Grassley ≈ 92.82 on 2026-07-14', () => {
    expect(ageYears(dobToMs('1933-09-17'), NOW)).toBeCloseTo(92.82, 1)
  })
  it('anchors DOB at 00:00 EST (UTC-5)', () => {
    expect(dobToMs('1970-01-01')).toBe(5 * 3_600_000)
  })
  it('mean of ages equals age of mean DOB', () => {
    const dobs = [dobToMs('1933-09-17'), dobToMs('1987-02-16'), dobToMs('1966-06-01')]
    const meanOfAges = dobs.map((d) => ageYears(d, NOW)).reduce((a, b) => a + b) / 3
    expect(ageYears(meanDobMs(dobs), NOW)).toBeCloseTo(meanOfAges, 9)
  })
  it('medianDobMs picks middle / averages middle two', () => {
    expect(medianDobMs([3, 1, 2])).toBe(2)
    expect(medianDobMs([4, 1, 3, 2])).toBe(3) // round((2+3)/2)=3
  })
  it('agePartsAt truncates and zero-pads', () => {
    const dob = 0
    const now = 60.000000019 * MS_PER_YEAR
    expect(agePartsAt(dob, now, 8)).toEqual({ int: '60', frac: '00000001' })
  })
  it('agePartsAt never rounds up across the integer boundary', () => {
    const now = 60.999999999 * MS_PER_YEAR
    expect(agePartsAt(0, now, 8).int).toBe('60')
    expect(agePartsAt(0, now, 8).frac).toBe('99999999')
  })
})
