import { describe, expect, it } from 'vitest'
import { parseCensusCsv, summarizePopulation } from './parse-census'

const CSV = [
  'SEX,AGE,ESTIMATESBASE2020,POPESTIMATE2020,POPESTIMATE2021,POPESTIMATE2022,POPESTIMATE2023,POPESTIMATE2024,POPESTIMATE2025',
  '0,30,0,0,0,0,0,0,2000',
  '0,50,0,0,0,0,0,0,2000',
  '0,17,0,0,0,0,0,0,5000',
  '0,999,0,0,0,0,0,0,999999',
  '1,30,0,0,0,0,0,0,777',
].join('\n')

describe('census parsing', () => {
  const rows = parseCensusCsv(CSV)
  it('keeps only SEX=0 single ages 0–100', () => {
    expect(rows).toEqual([
      { age: 30, pop: 2000 },
      { age: 50, pop: 2000 },
      { age: 17, pop: 5000 },
    ])
  })
  it('computes 18+ mean/median with age midpoints', () => {
    const p = summarizePopulation(rows)
    expect(p.adultMeanAge18).toBeCloseTo(40.5, 5) // (30.5+50.5)/2
    expect(p.adultMedianAge18).toBeCloseTo(40.5, 0)
  })
  it('bins 25+ into 5-year bins with a 95+ tail', () => {
    const p = summarizePopulation(rows)
    expect(p.bins.find((b) => b.label === '30–34')!.count).toBe(2000)
    expect(p.bins[0].label).toBe('25–29')
    expect(p.bins[p.bins.length - 1].label).toBe('95+')
  })
})
