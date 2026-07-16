import { EST_OFFSET_MS } from './age'

/**
 * Truncate to one decimal, then always show that decimal. This is the age
 * convention the live clocks use: a member is 58 until their 59th birthday, so a
 * printed average is floored, never rounded up into an age the roster has not
 * reached. Using it everywhere an average or share is printed keeps a single
 * figure from reading as 58.8 in one place and 58.9 in another, and keeps a set
 * of shares from rounding up past the total they actually sum to.
 */
export function trunc1(n: number): string {
  return (Math.trunc(n * 10) / 10).toFixed(1)
}

export function ordinal(n: number): string {
  const rem100 = n % 100
  if (rem100 >= 11 && rem100 <= 13) return `${n}th`
  const suffix = ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'
  return `${n}${suffix}`
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

export function monthDayYear(ms: number): string {
  const d = new Date(ms - EST_OFFSET_MS) // back to the calendar date as written
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`
}
