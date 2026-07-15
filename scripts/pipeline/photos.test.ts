import { describe, expect, it } from 'vitest'
import type { Fetched } from './http'
import { FALLBACK, PRIMARY, resolvePhoto } from './photos'

const jpeg = (tag: string): Fetched => ({ status: 200, contentType: 'image/jpeg', body: Buffer.from(tag) })
const miss: Fetched = { status: 404, contentType: 'text/html', body: Buffer.from('<html>not found</html>') }
const fake = (routes: Record<string, Fetched>) => async (url: string) => routes[url] ?? miss

describe('resolvePhoto', () => {
  it('uses primary when available', async () => {
    const buf = await resolvePhoto('X000001', {}, fake({ [PRIMARY('X000001')]: jpeg('primary') }))
    expect(buf.toString()).toBe('primary')
  })
  it('falls back to bioguide on primary 404', async () => {
    const buf = await resolvePhoto('X000001', {}, fake({ [FALLBACK('X000001')]: jpeg('bioguide') }))
    expect(buf.toString()).toBe('bioguide')
  })
  it('rejects 200 responses that are not images (404-as-HTML trap)', async () => {
    const htmlOk: Fetched = { status: 200, contentType: 'text/html', body: Buffer.from('<html>') }
    await expect(
      resolvePhoto('X000001', {}, fake({ [PRIMARY('X000001')]: htmlOk, [FALLBACK('X000001')]: htmlOk })),
    ).rejects.toThrow(/No portrait/)
  })
  it('uses override as last resort', async () => {
    const buf = await resolvePhoto('X000001', { X000001: 'https://example.gov/x.jpg' }, fake({ 'https://example.gov/x.jpg': jpeg('override') }))
    expect(buf.toString()).toBe('override')
  })
  it('throws with actionable message when all sources miss', async () => {
    await expect(resolvePhoto('X000001', {}, fake({}))).rejects.toThrow(/photo-overrides\.json/)
  })
})
