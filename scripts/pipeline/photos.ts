import type { Fetched, Fetcher } from './http'

export const PRIMARY = (id: string) => `https://unitedstates.github.io/images/congress/450x550/${id}.jpg`
export const FALLBACK = (id: string) => `https://bioguide.congress.gov/photo/${id.toUpperCase()}.jpg`

const isImage = (r: Fetched) => r.status === 200 && (r.contentType ?? '').startsWith('image/')

export async function resolvePhoto(id: string, overrides: Record<string, string>, get: Fetcher): Promise<Buffer> {
  const candidates = [PRIMARY(id), FALLBACK(id), overrides[id]].filter(Boolean) as string[]
  for (const url of candidates) {
    const r = await get(url)
    if (isImage(r)) return r.body
  }
  throw new Error(`No portrait found for ${id} — add an entry to scripts/pipeline/photo-overrides.json`)
}
