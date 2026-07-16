import { expect, it } from 'vitest'
import { monthDayYear, ordinal, trunc1 } from './format'
import { dobToMs } from './age'

it('trunc1 truncates to one decimal (floors, never rounds up)', () => {
  expect(trunc1(58.857)).toBe('58.8') // would round to 58.9 — must not
  expect(trunc1(30.783)).toBe('30.7') // would round to 30.8 — must not
  expect(trunc1(65.602)).toBe('65.6')
  expect(trunc1(7.851)).toBe('7.8')
  expect(trunc1(60)).toBe('60.0') // always shows the decimal
})

it('ordinal', () => {
  expect(ordinal(119)).toBe('119th')
  expect(ordinal(101)).toBe('101st')
  expect(ordinal(112)).toBe('112th')
  expect(ordinal(103)).toBe('103rd')
  expect(ordinal(102)).toBe('102nd')
})
it('monthDayYear renders the EST-anchored calendar date', () => {
  expect(monthDayYear(dobToMs('1966-06-01'))).toBe('June 1, 1966')
})
