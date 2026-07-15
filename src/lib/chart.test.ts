import { describe, expect, it } from 'vitest'
import { linePath, scaleLinear } from './chart'

describe('chart helpers', () => {
  it('scaleLinear maps domain to range', () => {
    const s = scaleLinear(0, 10, 0, 100)
    expect(s(0)).toBe(0)
    expect(s(5)).toBe(50)
    expect(s(10)).toBe(100)
  })

  it('scaleLinear inverts and extrapolates linearly', () => {
    // Inverted range (SVG y grows downward): domain 40→70 maps to 340→24.
    const y = scaleLinear(40, 70, 340, 24)
    expect(y(40)).toBe(340)
    expect(y(70)).toBe(24)
    expect(y(55)).toBe(182)
  })

  it('linePath builds an M/L path and rounds to one decimal', () => {
    expect(linePath([{ x: 1, y: 2 }, { x: 3, y: 4 }])).toBe('M 1 2 L 3 4')
    expect(linePath([{ x: 1.23, y: 4.56 }])).toBe('M 1.2 4.6')
    expect(linePath([])).toBe('')
  })
})
