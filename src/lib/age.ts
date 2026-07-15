export const MS_PER_YEAR = 365.2425 * 86_400_000
export const EST_OFFSET_MS = 5 * 3_600_000

export function dobToMs(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number)
  return Date.UTC(y, m - 1, d) + EST_OFFSET_MS
}

export function ageYears(dobMs: number, nowMs: number): number {
  return (nowMs - dobMs) / MS_PER_YEAR
}

export function meanDobMs(list: number[]): number {
  if (!list.length) throw new Error('meanDobMs: empty list')
  return Math.round(list.reduce((a, b) => a + b, 0) / list.length)
}

export function medianDobMs(list: number[]): number {
  if (!list.length) throw new Error('medianDobMs: empty list')
  const s = [...list].sort((a, b) => a - b)
  const mid = s.length >> 1
  return s.length % 2 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2)
}

export function agePartsAt(dobMs: number, nowMs: number, decimals: number): { int: string; frac: string } {
  const pow = 10 ** decimals
  const scaled = Math.floor(ageYears(dobMs, nowMs) * pow)
  return { int: String(Math.floor(scaled / pow)), frac: String(scaled % pow).padStart(decimals, '0') }
}
